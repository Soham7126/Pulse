import { AI_ENABLED_KEY, INSTALL_ID_KEY } from '../config/constants';
import { getDb } from '../db/db';
import { getSetting, setSetting } from '../db/queries';
import { canUse } from '../entitlements';

// Public URL of the Cloudflare Worker (not a secret). The OpenAI key lives only in the Worker.
const PROXY_URL = process.env.EXPO_PUBLIC_AI_PROXY_URL?.replace(/\/$/, '');
const TIMEOUT_MS = 25_000;

export class AiError extends Error {
  constructor(public readonly kind: 'off' | 'not_pro' | 'not_configured' | 'offline' | 'rate_limited' | 'server' | 'bad_response') {
    super(kind);
  }
}

export const aiConfigured = (): boolean => Boolean(PROXY_URL);

/** The user's AI toggle (G4). Off by default: nothing leaves the phone until they turn it on. */
export const aiEnabled = (): boolean => getSetting(getDb(), AI_ENABLED_KEY) === '1';
export const setAiEnabled = (on: boolean): void => setSetting(getDb(), AI_ENABLED_KEY, on ? '1' : '0');

/** Pulse AI runs only when the user switched it on AND has Pro (RevenueCat entitlement). */
export const aiActive = (): boolean => aiEnabled() && canUse('ai');

// ponytail: random id only for the proxy's per-install rate limit; not an identity.
function installId(): string {
  const db = getDb();
  const existing = getSetting(db, INSTALL_ID_KEY);
  if (existing) return existing;
  const id = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
  setSetting(db, INSTALL_ID_KEY, id);
  return id;
}

/** Every LLM call goes through here: toggle checked, proxy only, response validated before use. */
export async function callProxy<T>(path: '/classify' | '/ask' | '/draft', body: unknown, isValid: (v: unknown) => v is T): Promise<T> {
  if (!canUse('ai')) throw new AiError('not_pro');
  if (!aiEnabled()) throw new AiError('off');
  if (!PROXY_URL) throw new AiError('not_configured');
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  let res: Response;
  try {
    res = await fetch(`${PROXY_URL}${path}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-pulse-install': installId() },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
  } catch {
    throw new AiError('offline');
  } finally {
    clearTimeout(timer);
  }
  if (res.status === 429) throw new AiError('rate_limited');
  if (!res.ok) throw new AiError('server');
  const data: unknown = await res.json().catch(() => null);
  if (!isValid(data)) throw new AiError('bad_response');
  return data;
}

export function aiErrorMessage(e: unknown): string {
  const kind = e instanceof AiError ? e.kind : 'server';
  switch (kind) {
    case 'not_pro':
      return 'Pulse AI is part of Pulse Pro.';
    case 'off':
      return 'Pulse AI is off. Turn it on in Apps to use this.';
    case 'not_configured':
      return 'The AI proxy is not set up yet.';
    case 'offline':
      return "Couldn't reach Pulse AI. Check your connection and try again.";
    case 'rate_limited':
      return 'Pulse AI is busy. Try again in a few minutes.';
    default:
      return 'Pulse AI had a problem answering. Try again.';
  }
}
