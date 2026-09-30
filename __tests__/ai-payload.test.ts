import { describe, expect, it } from '@jest/globals';
import { DateTime } from 'luxon';

import { MAX_TEXT, isAiItem } from '../src/ai/contract';
import { localStamp, toAiItem } from '../src/ai/payload';

const row = {
  id: 42,
  key: '0|com.whatsapp|1|919876543210@s.whatsapp.net|10123',
  package_name: 'com.whatsapp',
  label: 'WhatsApp',
  title: 'Rahul',
  text: 'Can you send the DBMS project tonight? OTP ••••',
  posted_at_utc: DateTime.fromISO('2026-09-30T20:42', { zone: 'Asia/Kolkata' }).toMillis(),
};

describe('toAiItem (minimal-data policy)', () => {
  it('sends only id, app, sender, redacted text and local time — never the key or package', () => {
    const item = toAiItem(row, 'Asia/Kolkata');
    expect(Object.keys(item).sort()).toEqual(['app', 'id', 'sender', 'text', 'when']);
    expect(JSON.stringify(item)).not.toContain('919876543210');
    expect(JSON.stringify(item)).not.toContain('com.whatsapp');
    expect(item).toEqual({
      id: '42',
      app: 'WhatsApp',
      sender: 'Rahul',
      text: 'Can you send the DBMS project tonight? OTP ••••',
      when: '2026-09-30 20:42 Wed',
    });
    expect(isAiItem(item)).toBe(true);
  });

  it('trims long text to the contract limit', () => {
    expect(toAiItem({ ...row, text: 'x'.repeat(1000) }, 'Asia/Kolkata').text).toHaveLength(MAX_TEXT);
  });

  it.each([
    ['Asia/Kolkata', '2026-09-30 20:42 Wed'],
    ['America/New_York', '2026-09-30 11:12 Wed'],
    ['Pacific/Auckland', '2026-10-01 04:12 Thu'],
  ])('stamps the receipt in local time: %s', (zone, expected) => {
    expect(localStamp(row.posted_at_utc, zone)).toBe(expected);
  });
});
