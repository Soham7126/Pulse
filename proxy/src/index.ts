// Pulse AI proxy (architecture §10). Holds the OpenAI key, validates every request against the shared contract,
// rate-limits, forwards redacted minimal text to GPT-4o, returns JSON only. Stores and logs nothing.
import {
  ASK_SCHEMA,
  CLASSIFY_SCHEMA,
  DRAFT_SCHEMA,
  isAskRequest,
  isAskResponse,
  isClassifyRequest,
  isClassifyResponse,
  isDraftRequest,
  isDraftResponse,
  type AiItem,
} from '../../src/ai/contract';

type Env = { OPENAI_API_KEY: string };

const MODEL = 'gpt-4o';
const MAX_BODY_BYTES = 64 * 1024;
const WINDOW_MS = 10 * 60 * 1000;
const MAX_PER_WINDOW = 120;

// ponytail: per-isolate memory, so limits reset when Cloudflare recycles the isolate; move to KV/Durable Objects if abused.
const hits = new Map<string, { start: number; count: number }>();
function limited(key: string, now: number): boolean {
  const h = hits.get(key);
  if (!h || now - h.start > WINDOW_MS) {
    hits.set(key, { start: now, count: 1 });
    return false;
  }
  h.count += 1;
  return h.count > MAX_PER_WINDOW;
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

const itemLine = (i: AiItem) => `[${i.id}] ${i.when} · ${i.app}${i.sender ? ` · ${i.sender}` : ''}: ${i.text ?? '(no text)'}`;

const CLASSIFY_PROMPT = `You classify phone notifications for Pulse, a calm notification assistant for students and young professionals in India.
For each item return:
- intent: communication | event | delivery | finance | security | shopping | work | noise
- priority: high = needs the user soon (a direct request with a deadline or time pressure, an urgent personal matter, a security alert about their own account);
  medium = a personal message or work item that expects a reply or action, not urgent; low = informational, worth a glance;
  noise = promotions, likes, follows, social engagement, generic app updates.
- action_required: true only if the user is expected to do or reply something.
- action_text: short imperative (max 60 chars) like "Send the DBMS assignment", else null.
- urgency: now | today | soon | none. urgency_note: max 40 chars like "Due tonight", else null. Only mention a time or date if the text states it.
- confidence: 0..1.
Text may contain •••• where digits were redacted. Messages may be in English, Hindi or Hinglish. Never invent facts. Return one result per input id.`;

const ASK_PROMPT = `You answer the user's question using ONLY the notifications provided (each starts with [id]).
If nothing relevant is there, say so plainly. Be concise: at most 3 short sentences, friendly, no markdown.
Use the provided local time for words like "today" or "tonight". citation_ids = ids you actually used. confidence reflects how well the notifications support the answer.`;

const DRAFT_PROMPT = `You help the user handle one notification.
summary: one sentence saying what the sender wants, in plain English.
intent_label: 2-4 words (e.g. "Action request / academic deadline").
urgency_label: short (e.g. "Due tonight" or "No rush"), using the provided local time. Only mention a deadline time if the text states it.
draft: a short reply the user could send (max 200 chars), matching the sender's language and tone (Hinglish is fine), no placeholders like [name].
Use null for draft if replying makes no sense (e.g. a delivery update). A higher variant number means: give a noticeably different phrasing.
confidence: 0..1. Text may contain •••• where digits were redacted; never guess them.`;

async function openai(env: Env, instructions: string, input: string, name: string, schema: object, temperature: number) {
  const res = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: { authorization: `Bearer ${env.OPENAI_API_KEY}`, 'content-type': 'application/json' },
    body: JSON.stringify({
      model: MODEL,
      instructions,
      input,
      temperature,
      max_output_tokens: 1200,
      store: false,
      text: { format: { type: 'json_schema', name, schema, strict: true } },
    }),
  });
  if (!res.ok) throw new Error(`upstream ${res.status}`);
  const body = (await res.json()) as { output?: { type: string; content?: { type: string; text?: string }[] }[] };
  const part = body.output?.find((o) => o.type === 'message')?.content?.find((c) => c.type === 'output_text');
  if (!part?.text) throw new Error('no output');
  return JSON.parse(part.text) as unknown;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (request.method !== 'POST') return json({ error: 'method' }, 405);
    const now = Date.now();
    const install = request.headers.get('x-pulse-install') ?? 'anon';
    const ip = request.headers.get('cf-connecting-ip') ?? 'unknown';
    if (limited(`i:${install}`, now) || limited(`ip:${ip}`, now)) return json({ error: 'rate_limited' }, 429);
    if (Number(request.headers.get('content-length') ?? 0) > MAX_BODY_BYTES) return json({ error: 'too_large' }, 413);

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return json({ error: 'bad_json' }, 400);
    }

    const path = new URL(request.url).pathname;
    try {
      if (path === '/classify' && isClassifyRequest(body)) {
        const out = await openai(env, CLASSIFY_PROMPT, body.items.map(itemLine).join('\n'), 'classification', CLASSIFY_SCHEMA, 0);
        return isClassifyResponse(out) ? json(out) : json({ error: 'bad_model_output' }, 502);
      }
      if (path === '/ask' && isAskRequest(body)) {
        const input = `Local time now: ${body.now}\nQuestion: ${body.question}\n\nNotifications:\n${body.items.map(itemLine).join('\n')}`;
        const out = await openai(env, ASK_PROMPT, input, 'answer', ASK_SCHEMA, 0.2);
        return isAskResponse(out) ? json(out) : json({ error: 'bad_model_output' }, 502);
      }
      if (path === '/draft' && isDraftRequest(body)) {
        const history = body.history.length ? `\nEarlier messages from this sender:\n${body.history.map(itemLine).join('\n')}` : '';
        const input = `Local time now: ${body.now}\nVariant: ${body.variant}\nNotification:\n${itemLine(body.item)}${history}`;
        const out = await openai(env, DRAFT_PROMPT, input, 'interpretation', DRAFT_SCHEMA, body.variant === 0 ? 0.4 : 0.9);
        return isDraftResponse(out) ? json(out) : json({ error: 'bad_model_output' }, 502);
      }
      return json({ error: 'bad_request' }, 400);
    } catch {
      // No details: upstream errors can echo request content.
      return json({ error: 'upstream' }, 502);
    }
  },
};
