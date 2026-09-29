import type { Bucket } from '../classify/buckets';
import type { PoseId } from '../cat/sprite';
import type { CaptureRow } from '../db/queries';
import { appName, deviceZone, displayName, readToday } from '../ui/pulse-data';

export type WidgetRow = { icon: string; who: string; what: string };

/** Only what the widget displays (architecture §8): never the full DB. */
export type WidgetSnapshot = { pose: PoseId; total: number; worth: number; top: WidgetRow[] };

// Intent icons for the medium widget rows (plain emoji: widgets can't load the app's icon font).
const ICONS: Record<Exclude<Bucket, 'quiet'>, string> = { people: '💬', work: '💼', shopping: '📦' };

function toRow(r: CaptureRow, bucket: Exclude<Bucket, 'quiet'>): WidgetRow {
  // People rows lead with the sender; app rows lead with the app, like the design ("Amazon · Delivery…").
  return bucket === 'people'
    ? { icon: ICONS.people, who: displayName(r), what: r.text ?? appName(r) }
    : { icon: ICONS[bucket], who: appName(r), what: r.title ?? r.text ?? '' };
}

export function readWidgetSnapshot(nowUtc = Date.now()): WidgetSnapshot {
  const { rows, groups, pose } = readToday(nowUtc, deviceZone());
  const worth = [
    ...groups.people.map((r) => ({ r, b: 'people' as const })),
    ...groups.work.map((r) => ({ r, b: 'work' as const })),
    ...groups.shopping.map((r) => ({ r, b: 'shopping' as const })),
  ].sort((a, b) => b.r.posted_at_utc - a.r.posted_at_utc);
  return { pose, total: rows.length, worth: worth.length, top: worth.slice(0, 3).map(({ r, b }) => toRow(r, b)) };
}
