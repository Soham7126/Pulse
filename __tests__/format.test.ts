import { describe, expect, it } from '@jest/globals';
import { DateTime } from 'luxon';

import { bucketFor, groupByBucket } from '../src/classify/buckets';
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

describe('buckets', () => {
  it('routes PRD apps by default intent and everything else to quiet', () => {
    expect(bucketFor('com.whatsapp')).toBe('people');
    expect(bucketFor('com.linkedin.android')).toBe('work');
    expect(bucketFor('com.flipkart.android')).toBe('shopping');
    expect(bucketFor('com.instagram.android')).toBe('quiet');
    expect(bucketFor('com.antivirus')).toBe('quiet');
  });

  it('groups rows', () => {
    const g = groupByBucket([{ package_name: 'com.whatsapp' }, { package_name: 'com.instagram.android' }]);
    expect(g.people).toHaveLength(1);
    expect(g.quiet).toHaveLength(1);
  });
});
