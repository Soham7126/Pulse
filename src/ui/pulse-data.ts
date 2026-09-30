import { bucketOf, byAttention, groupByBucket, needsAttention, type Bucket } from '../classify/buckets';
import type { PoseId } from '../cat/sprite';
import { LAST_SEEN_KEY, MEMORY_DAYS } from '../config/constants';
import { getDb } from '../db/db';
import { getSetting, listCaptures, type CaptureRow } from '../db/queries';
import { deviceZone, startOfLocalDay } from '../time/format';

export { deviceZone };

// ponytail: generous caps for a 7-day on-device log; paginate if real volumes get near them.
const DAY_LIMIT = 500;
const MEMORY_LIMIT = 5000;

export type Snapshot = {
  rows: CaptureRow[];
  /** Active (unhandled) rows grouped for the Briefing sections. */
  groups: Record<Bucket, CaptureRow[]>;
  /** Needs your attention: sorted high priority first, then newest. */
  attention: CaptureRow[];
  /** Active, not needing attention, not shopping/delivery: the collapsed drawer. */
  quiet: CaptureRow[];
  handled: CaptureRow[];
  pose: PoseId;
};

function snapshot(rows: CaptureRow[]): Snapshot {
  const active = rows.filter((r) => r.status !== 'handled');
  const attention = active.filter(needsAttention).sort(byAttention);
  return {
    rows,
    groups: groupByBucket(active),
    attention,
    quiet: active.filter((r) => !needsAttention(r) && bucketOf(r) !== 'shopping'),
    handled: rows.filter((r) => r.status === 'handled'),
    // ponytail: stand-in for computePose (M4): awake while something needs you, else asleep.
    pose: attention.length > 0 ? 'awake_sit' : 'sleep_curled',
  };
}

export function readToday(nowUtc: number, zone: string): Snapshot {
  return snapshot(listCaptures(getDb(), DAY_LIMIT, startOfLocalDay(nowUtc, zone)));
}

/** Since the app last went to the background; falls back to the start of today on first run. */
export function readAway(nowUtc: number, zone: string): Snapshot & { sinceUtc: number } {
  const stored = Number(getSetting(getDb(), LAST_SEEN_KEY));
  const sinceUtc = stored > 0 ? stored : startOfLocalDay(nowUtc, zone);
  return { ...snapshot(listCaptures(getDb(), DAY_LIMIT, sinceUtc)), sinceUtc };
}

/** Last 7 days (Ask Pulse's memory), newest first. */
export function readMemoryRows(nowUtc: number): CaptureRow[] {
  return listCaptures(getDb(), MEMORY_LIMIT, nowUtc - MEMORY_DAYS * 24 * 60 * 60 * 1000);
}

export function readMemory(nowUtc: number): { count: number; apps: string[] } {
  const rows = readMemoryRows(nowUtc);
  return { count: rows.length, apps: [...new Set(rows.map(appName))] };
}

export const displayName = (r: CaptureRow): string => r.title ?? r.label ?? r.package_name;
export const appName = (r: CaptureRow): string => r.label ?? r.package_name;

/** "5 Instagram, 2 Antivirus" */
export function perAppCounts(rows: CaptureRow[]): { app: string; count: number }[] {
  const counts = new Map<string, number>();
  for (const r of rows) counts.set(appName(r), (counts.get(appName(r)) ?? 0) + 1);
  return [...counts].map(([app, count]) => ({ app, count })).sort((a, b) => b.count - a.count);
}

const INTENT_LABELS: Record<NonNullable<CaptureRow['intent']>, string> = {
  communication: 'Conversation',
  event: 'Event',
  delivery: 'Delivery',
  finance: 'Finance',
  security: 'Security',
  shopping: 'Shopping',
  work: 'Work',
  noise: 'Noise',
};

/** Badge for a card: urgency beats intent; unclassified rows say they're still being sorted. */
export function badgeFor(r: CaptureRow): { text: string; tone: 'urgent' | 'action' | 'plain' } {
  if (!r.classifier || !r.intent) return { text: 'Sorting…', tone: 'plain' };
  if (r.priority === 'high') return { text: 'Urgent', tone: 'urgent' };
  if (r.action_required) return { text: r.intent === 'communication' ? 'Requires response' : 'Actionable', tone: 'action' };
  return { text: INTENT_LABELS[r.intent], tone: 'plain' };
}

export const intentLabel = (r: CaptureRow): string | null => (r.intent ? INTENT_LABELS[r.intent] : null);
