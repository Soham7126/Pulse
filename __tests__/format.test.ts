import { describe, expect, it } from '@jest/globals';
import { DateTime } from 'luxon';

import { bucketFor, bucketOf, byAttention, groupByBucket, needsAttention, type Classifiable } from '../src/classify/buckets';
import { clockLabel, greeting, headerDate, shortTime, startOfLocalDay } from '../src/time/format';

const ZONES = ['Asia/Kolkata', 'America/New_York', 'Pacific/Auckland'];
const local = (iso: string, zone: string) => DateTime.fromISO(iso, { zone }).toMillis();

describe.each(ZONES)('time format in %s', (zone) => {
  it('greets by local hour', () => {
    expect(greeting(local('2026-10-22T08:00', zone), zone)).toBe('Good morning');
    expect(greeting(local('2026-10-22T14:00', zone), zone)).toBe('Good afternoon');
    expect(greeting(local('2026-10-22T20:30', zone), zone)).toBe('Good evening');
    expect(greeting(local('2026-10-22T02:00', zone), zone)).toBe('Good evening');
  });

  it('formats the header date in the local zone', () => {
    expect(headerDate(local('2026-10-22T23:50', zone), zone)).toBe('Thursday, Oct 22');
  });

  it('short times: minutes, hours, today, yesterday', () => {
    const now = local('2026-10-22T20:00', zone);
    expect(shortTime(now - 20_000, now, zone)).toBe('just now');
    expect(shortTime(local('2026-10-22T19:38', zone), now, zone)).toBe('22m ago');
    expect(shortTime(local('2026-10-22T17:00', zone), now, zone)).toBe('3h ago');
    expect(shortTime(local('2026-10-22T09:15', zone), now, zone)).toBe('9:15 AM');
    expect(shortTime(local('2026-10-21T22:48', zone), now, zone)).toBe('Yesterday 10:48 PM');
  });

  it('11:50 PM receipt across midnight: relative first, then "yesterday"', () => {
    const receipt = local('2026-10-22T23:50', zone);
    expect(shortTime(receipt, local('2026-10-23T00:05', zone), zone)).toBe('15m ago');
    expect(shortTime(receipt, local('2026-10-23T08:00', zone), zone)).toBe('Yesterday 11:50 PM');
  });

  it('start of local day is local midnight', () => {
    const noon = local('2026-10-22T12:00', zone);
    expect(DateTime.fromMillis(startOfLocalDay(noon, zone), { zone }).toFormat('yyyy-LL-dd HH:mm')).toBe('2026-10-22 00:00');
  });
});

describe('DST (America/New_York, 2026-11-01 falls back)', () => {
  const zone = 'America/New_York';
  it('day start and "yesterday" stay correct across the 25-hour day', () => {
    const now = local('2026-11-01T20:00', zone);
    expect(DateTime.fromMillis(startOfLocalDay(now, zone), { zone }).toFormat('HH:mm')).toBe('00:00');
    expect(shortTime(local('2026-10-31T22:00', zone), now, zone)).toBe('Yesterday 10:00 PM');
    expect(shortTime(local('2026-11-01T01:30', zone), now, zone)).toBe('1:30 AM');
  });
});

describe('clockLabel', () => {
  it('turns HH:mm into a 12h label', () => {
    expect(clockLabel('23:00')).toBe('11:00 PM');
    expect(clockLabel('07:00')).toBe('7:00 AM');
  });
});

const row = (over: Partial<Classifiable> = {}): Classifiable => ({
  package_name: 'com.whatsapp',
  intent: null,
  priority: null,
  action_required: null,
  classifier: null,
  status: 'active',
  posted_at_utc: 0,
  ...over,
});
const classified = (intent: Classifiable['intent'], priority: Classifiable['priority'], action = 0) =>
  row({ classifier: 'llm', intent, priority, action_required: action });

describe('buckets', () => {
  it('routes unclassified rows by the source app', () => {
    expect(bucketFor('com.whatsapp')).toBe('people');
    expect(bucketFor('com.linkedin.android')).toBe('work');
    expect(bucketFor('com.flipkart.android')).toBe('shopping');
    expect(bucketFor('com.instagram.android')).toBe('quiet');
    expect(bucketFor('com.antivirus')).toBe('quiet');
  });

  it('routes classified rows by GPT-4o intent and priority', () => {
    expect(bucketOf(classified('communication', 'high', 1))).toBe('people');
    expect(bucketOf(classified('communication', 'noise'))).toBe('quiet');
    expect(bucketOf(classified('delivery', 'low'))).toBe('shopping');
    expect(bucketOf(classified('shopping', 'noise'))).toBe('quiet');
    expect(bucketOf(classified('security', 'high', 1))).toBe('work');
    expect(bucketOf({ ...classified('noise', 'noise'), package_name: 'com.whatsapp' })).toBe('quiet');
  });

  it('groups rows', () => {
    const g = groupByBucket([row(), row({ package_name: 'com.instagram.android' })]);
    expect(g.people).toHaveLength(1);
    expect(g.quiet).toHaveLength(1);
  });
});

describe('needsAttention', () => {
  it('high priority or medium-with-action needs attention; low/noise do not', () => {
    expect(needsAttention(classified('communication', 'high'))).toBe(true);
    expect(needsAttention(classified('work', 'medium', 1))).toBe(true);
    expect(needsAttention(classified('communication', 'medium', 0))).toBe(false);
    expect(needsAttention(classified('shopping', 'low', 1))).toBe(false);
    expect(needsAttention(classified('noise', 'noise'))).toBe(false);
  });

  it('handled items never need attention', () => {
    expect(needsAttention({ ...classified('communication', 'high', 1), status: 'handled' })).toBe(false);
    expect(needsAttention({ ...row(), status: 'handled' })).toBe(false);
  });

  it('unclassified people/work items count until GPT-4o answers', () => {
    expect(needsAttention(row())).toBe(true);
    expect(needsAttention(row({ package_name: 'com.instagram.android' }))).toBe(false);
  });

  it('orders high priority first, then newest', () => {
    const old = { ...classified('communication', 'high'), posted_at_utc: 1 };
    const fresh = { ...classified('communication', 'medium', 1), posted_at_utc: 9 };
    const newestHigh = { ...classified('work', 'high'), posted_at_utc: 5 };
    expect([fresh, old, newestHigh].sort(byAttention)).toEqual([newestHigh, old, fresh]);
  });
});
