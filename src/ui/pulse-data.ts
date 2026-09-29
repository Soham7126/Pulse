import { DateTime } from 'luxon';

import { groupByBucket, type Bucket } from '../classify/buckets';
import type { PoseId } from '../cat/sprite';
import { LAST_SEEN_KEY, MEMORY_DAYS } from '../config/constants';
import { getDb } from '../db/db';
import { getSetting, listCaptures, type CaptureRow } from '../db/queries';
import { startOfLocalDay } from '../time/format';

// ponytail: generous caps for a 7-day on-device log; paginate if real volumes get near them.
const DAY_LIMIT = 500;
const MEMORY_LIMIT = 5000;

export const deviceZone = (): string => DateTime.local().zoneName;

export type Snapshot = {
  rows: CaptureRow[];
  groups: Record<Bucket, CaptureRow[]>;
  pose: PoseId;
};

// ponytail: stand-in for computePose (M4): awake when anything from people/work/shopping is present, else asleep.
function poseFor(groups: Record<Bucket, CaptureRow[]>): PoseId {
  return groups.people.length + groups.work.length + groups.shopping.length > 0 ? 'awake_sit' : 'sleep_curled';
}

function snapshot(rows: CaptureRow[]): Snapshot {
  const groups = groupByBucket(rows);
  return { rows, groups, pose: poseFor(groups) };
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

export function readMemory(nowUtc: number): { count: number; apps: string[] } {
  const rows = listCaptures(getDb(), MEMORY_LIMIT, nowUtc - MEMORY_DAYS * 24 * 60 * 60 * 1000);
  const apps = [...new Set(rows.map((r) => r.label ?? r.package_name))];
  return { count: rows.length, apps };
}

export const displayName = (r: CaptureRow): string => r.title ?? r.label ?? r.package_name;
export const appName = (r: CaptureRow): string => r.label ?? r.package_name;

/** "5 Instagram, 2 Antivirus" */
export function perAppCounts(rows: CaptureRow[]): { app: string; count: number }[] {
  const counts = new Map<string, number>();
  for (const r of rows) counts.set(appName(r), (counts.get(appName(r)) ?? 0) + 1);
  return [...counts].map(([app, count]) => ({ app, count })).sort((a, b) => b.count - a.count);
}
