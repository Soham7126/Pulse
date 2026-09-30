import { describe, expect, it } from '@jest/globals';

import { SPRITES } from '../src/cat/sprites';
import { MAX_WIDGET_ROWS, buildWidgetPayload } from '../src/widget/payload';

const row = (over: Partial<Parameters<typeof buildWidgetPayload>[0]['attention'][number]> = {}) => ({
  id: 1,
  package_name: 'com.whatsapp',
  label: 'WhatsApp',
  title: 'Rahul',
  text: 'Can you send the DBMS file tonight?',
  intent: 'work' as const,
  action_text: 'Send the DBMS file',
  ...over,
});

describe('buildWidgetPayload', () => {
  it('asleep: no rows, sleeping sprite, nothing needs you', () => {
    const p = buildWidgetPayload({ total: 3, attention: [], pose: 'sleep_curled' });
    expect(p.awake).toBe(false);
    expect(p.rows).toEqual([]);
    expect(p.sprite.frames).toEqual(SPRITES.sleep_curled!.frames);
  });

  it('messages lead with the sender even when GPT-4o calls the intent "work" (the "WhatsApp · C…" bug)', () => {
    const p = buildWidgetPayload({ total: 3, attention: [row()], pose: 'awake_sit' });
    expect(p.rows[0]).toEqual({ id: 1, icon: '💼', who: 'Rahul', what: 'Send the DBMS file' });
    expect(p.headline).toBe('1 thing needs you');
    expect(p.footer).toBe('3 notifications → 1 important');
  });

  it('other apps lead with the app name', () => {
    const p = buildWidgetPayload({
      total: 1,
      attention: [row({ package_name: 'in.amazon.mShop.android.shopping', label: 'Amazon', title: 'Out for delivery', intent: 'delivery', action_text: null })],
      pose: 'awake_sit',
    });
    expect(p.rows[0]).toMatchObject({ icon: '📦', who: 'Amazon', what: 'Out for delivery' });
  });

  it('caps rows and pluralises', () => {
    const many = Array.from({ length: 5 }, (_, i) => row({ id: i }));
    const p = buildWidgetPayload({ total: 9, attention: many, pose: 'awake_sit' });
    expect(p.rows).toHaveLength(MAX_WIDGET_ROWS);
    expect(p.headline).toBe('5 things need you');
  });

  it('carries only display fields (no notification key or package names)', () => {
    const json = JSON.stringify(buildWidgetPayload({ total: 1, attention: [row()], pose: 'awake_sit' }));
    expect(json).not.toContain('com.whatsapp');
    expect(json).not.toContain('Can you send');
  });
});
