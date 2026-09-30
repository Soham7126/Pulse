import type { PoseId } from '../cat/sprite';
import type { CaptureRow } from '../db/queries';
import { appName, deviceZone, displayName, readToday } from '../ui/pulse-data';

export type WidgetRow = { icon: string; who: string; what: string };

/** Only what the widget displays (architecture §8): never the full DB. */
export type WidgetSnapshot = { pose: PoseId; total: number; worth: number; top: WidgetRow[] };

// Intent icons for the medium widget rows (plain emoji: widgets can't load the app's icon font).
const ICONS: Record<NonNullable<CaptureRow['intent']>, string> = {
  communication: '💬',
  work: '💼',
  event: '📅',
  delivery: '📦',
  shopping: '🛍️',
  finance: '💳',
  security: '🔐',
  noise: '🔔',
};

function toRow(r: CaptureRow): WidgetRow {
  const icon = r.intent ? ICONS[r.intent] : '💬';
  // Prefer GPT-4o's action ("Send DBMS assignment") over the raw text, like the design ("Rahul · Reply about…").
  const what = r.action_text ?? r.text ?? '';
  return r.intent === 'communication' || !r.intent
    ? { icon, who: displayName(r), what }
    : { icon, who: appName(r), what: r.action_text ?? r.title ?? r.text ?? '' };
}

export function readWidgetSnapshot(nowUtc = Date.now()): WidgetSnapshot {
  const { rows, attention, pose } = readToday(nowUtc, deviceZone());
  return { pose, total: rows.length, worth: attention.length, top: attention.slice(0, 3).map(toRow) };
}
