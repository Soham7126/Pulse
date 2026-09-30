// Shared app <-> proxy contract. Pure TS (no RN imports): the Cloudflare Worker in proxy/ imports this file too.

export const INTENTS = ['communication', 'event', 'delivery', 'finance', 'security', 'shopping', 'work', 'noise'] as const;
export const PRIORITIES = ['high', 'medium', 'low', 'noise'] as const;
export const URGENCIES = ['now', 'today', 'soon', 'none'] as const;
export const CONFIDENCE_LEVELS = ['high', 'medium', 'low'] as const;

export type AiIntent = (typeof INTENTS)[number];
export type AiPriority = (typeof PRIORITIES)[number];
export type AiUrgency = (typeof URGENCIES)[number];

/** Minimal-data policy (G4): only these fields leave the phone, text already redacted and trimmed. */
export const MAX_TEXT = 300;
export const MAX_QUESTION = 300;
export const MAX_CLASSIFY_BATCH = 10;
export const MAX_ASK_ITEMS = 150;
export const MAX_HISTORY = 5;

export type AiItem = { id: string; app: string; sender: string | null; text: string | null; when: string };

export type ClassifyRequest = { items: AiItem[] };
export type Classification = {
  id: string;
  intent: AiIntent;
  priority: AiPriority;
  action_required: boolean;
  action_text: string | null;
  urgency: AiUrgency;
  urgency_note: string | null;
  confidence: number;
};
export type ClassifyResponse = { results: Classification[] };

export type AskRequest = { question: string; now: string; items: AiItem[] };
export type AskResponse = { answer: string; citation_ids: string[]; confidence: (typeof CONFIDENCE_LEVELS)[number] };

export type DraftRequest = { item: AiItem; history: AiItem[]; variant: number; now: string };
export type DraftResponse = {
  summary: string;
  intent_label: string;
  urgency_label: string;
  draft: string | null;
  confidence: number;
};

export const trimText = (s: string | null, max = MAX_TEXT): string | null =>
  s === null ? null : s.length > max ? `${s.slice(0, max - 1)}…` : s;

// ---- Validation (used by the proxy on requests and by the app on responses) ----

type Obj = Record<string, unknown>;
const isObj = (v: unknown): v is Obj => typeof v === 'object' && v !== null && !Array.isArray(v);
const isStr = (v: unknown, max = Infinity): v is string => typeof v === 'string' && v.length <= max;
const isNullableStr = (v: unknown, max = Infinity) => v === null || isStr(v, max);
const oneOf = <T extends readonly string[]>(list: T, v: unknown): v is T[number] => list.includes(v as string);

export function isAiItem(v: unknown): v is AiItem {
  return (
    isObj(v) &&
    isStr(v.id, 64) &&
    isStr(v.app, 80) &&
    isNullableStr(v.sender, 120) &&
    isNullableStr(v.text, MAX_TEXT) &&
    isStr(v.when, 40)
  );
}

export function isClassifyRequest(v: unknown): v is ClassifyRequest {
  return isObj(v) && Array.isArray(v.items) && v.items.length > 0 && v.items.length <= MAX_CLASSIFY_BATCH && v.items.every(isAiItem);
}

export function isAskRequest(v: unknown): v is AskRequest {
  return (
    isObj(v) &&
    isStr(v.question, MAX_QUESTION) &&
    v.question.trim().length > 0 &&
    isStr(v.now, 40) &&
    Array.isArray(v.items) &&
    v.items.length <= MAX_ASK_ITEMS &&
    v.items.every(isAiItem)
  );
}

export function isDraftRequest(v: unknown): v is DraftRequest {
  return (
    isObj(v) &&
    isAiItem(v.item) &&
    isStr(v.now, 40) &&
    Array.isArray(v.history) &&
    v.history.length <= MAX_HISTORY &&
    v.history.every(isAiItem) &&
    typeof v.variant === 'number' &&
    v.variant >= 0 &&
    v.variant <= 20
  );
}

export function isClassification(v: unknown): v is Classification {
  return (
    isObj(v) &&
    isStr(v.id, 64) &&
    oneOf(INTENTS, v.intent) &&
    oneOf(PRIORITIES, v.priority) &&
    typeof v.action_required === 'boolean' &&
    isNullableStr(v.action_text, 120) &&
    oneOf(URGENCIES, v.urgency) &&
    isNullableStr(v.urgency_note, 80) &&
    typeof v.confidence === 'number' &&
    v.confidence >= 0 &&
    v.confidence <= 1
  );
}

export function isClassifyResponse(v: unknown): v is ClassifyResponse {
  return isObj(v) && Array.isArray(v.results) && v.results.every(isClassification);
}

export function isAskResponse(v: unknown): v is AskResponse {
  return (
    isObj(v) &&
    isStr(v.answer, 2000) &&
    Array.isArray(v.citation_ids) &&
    v.citation_ids.every((c) => isStr(c, 64)) &&
    oneOf(CONFIDENCE_LEVELS, v.confidence)
  );
}

export function isDraftResponse(v: unknown): v is DraftResponse {
  return (
    isObj(v) &&
    isStr(v.summary, 600) &&
    isStr(v.intent_label, 80) &&
    isStr(v.urgency_label, 80) &&
    isNullableStr(v.draft, 600) &&
    typeof v.confidence === 'number' &&
    v.confidence >= 0 &&
    v.confidence <= 1
  );
}

// ---- JSON Schemas for OpenAI Structured Outputs (strict: every field required, no extras) ----

const nullableString = { type: ['string', 'null'] };

export const CLASSIFY_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['results'],
  properties: {
    results: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['id', 'intent', 'priority', 'action_required', 'action_text', 'urgency', 'urgency_note', 'confidence'],
        properties: {
          id: { type: 'string' },
          intent: { type: 'string', enum: [...INTENTS] },
          priority: { type: 'string', enum: [...PRIORITIES] },
          action_required: { type: 'boolean' },
          action_text: nullableString,
          urgency: { type: 'string', enum: [...URGENCIES] },
          urgency_note: nullableString,
          confidence: { type: 'number' },
        },
      },
    },
  },
} as const;

export const ASK_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['answer', 'citation_ids', 'confidence'],
  properties: {
    answer: { type: 'string' },
    citation_ids: { type: 'array', items: { type: 'string' } },
    confidence: { type: 'string', enum: [...CONFIDENCE_LEVELS] },
  },
} as const;

export const DRAFT_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['summary', 'intent_label', 'urgency_label', 'draft', 'confidence'],
  properties: {
    summary: { type: 'string' },
    intent_label: { type: 'string' },
    urgency_label: { type: 'string' },
    draft: nullableString,
    confidence: { type: 'number' },
  },
} as const;
