import { describe, expect, it } from '@jest/globals';

import {
  CLASSIFY_SCHEMA,
  MAX_CLASSIFY_BATCH,
  MAX_TEXT,
  isAskRequest,
  isAskResponse,
  isClassification,
  isClassifyRequest,
  isDraftRequest,
  isDraftResponse,
  trimText,
  type AiItem,
} from '../src/ai/contract';

const item: AiItem = { id: '12', app: 'WhatsApp', sender: 'Rahul', text: 'Can you send the DBMS project tonight?', when: '2026-09-30 20:42 Wed' };

describe('requests (proxy-side validation)', () => {
  it('accepts a normal classify batch and rejects empty/oversized/extra-long ones', () => {
    expect(isClassifyRequest({ items: [item] })).toBe(true);
    expect(isClassifyRequest({ items: [] })).toBe(false);
    expect(isClassifyRequest({ items: Array(MAX_CLASSIFY_BATCH + 1).fill(item) })).toBe(false);
    expect(isClassifyRequest({ items: [{ ...item, text: 'x'.repeat(MAX_TEXT + 1) }] })).toBe(false);
    expect(isClassifyRequest({ items: [{ ...item, id: 5 }] })).toBe(false);
  });

  it('validates ask and draft requests', () => {
    expect(isAskRequest({ question: 'Did anyone ask me to do something?', now: '2026-09-30 21:00 Wed', items: [item] })).toBe(true);
    expect(isAskRequest({ question: '   ', now: 'x', items: [] })).toBe(false);
    expect(isDraftRequest({ item, history: [], variant: 0, now: '2026-09-30 21:00 Wed' })).toBe(true);
    expect(isDraftRequest({ item, history: [], variant: 99, now: 'x' })).toBe(false);
  });
});

describe('responses (app-side validation)', () => {
  const good = {
    id: '12',
    intent: 'communication',
    priority: 'high',
    action_required: true,
    action_text: 'Send the DBMS project',
    urgency: 'today',
    urgency_note: 'Due tonight',
    confidence: 0.92,
  };

  it('accepts a well-formed classification and rejects unknown enums / bad confidence', () => {
    expect(isClassification(good)).toBe(true);
    expect(isClassification({ ...good, intent: 'gossip' })).toBe(false);
    expect(isClassification({ ...good, priority: 'urgent' })).toBe(false);
    expect(isClassification({ ...good, confidence: 1.5 })).toBe(false);
    expect(isClassification({ ...good, action_text: undefined })).toBe(false);
  });

  it('validates ask and draft responses', () => {
    expect(isAskResponse({ answer: 'Yes. Rahul asked…', citation_ids: ['12'], confidence: 'high' })).toBe(true);
    expect(isAskResponse({ answer: 'x', citation_ids: [12], confidence: 'high' })).toBe(false);
    expect(isDraftResponse({ summary: 's', intent_label: 'i', urgency_label: 'u', draft: null, confidence: 0.5 })).toBe(true);
    expect(isDraftResponse({ summary: 's', intent_label: 'i', urgency_label: 'u', draft: 'x', confidence: 2 })).toBe(false);
  });
});

describe('strict schema', () => {
  it('requires every property (OpenAI strict mode)', () => {
    const itemSchema = CLASSIFY_SCHEMA.properties.results.items;
    expect([...itemSchema.required].sort()).toEqual(Object.keys(itemSchema.properties).sort());
    expect(itemSchema.additionalProperties).toBe(false);
  });
});

describe('trimText', () => {
  it('caps text at the limit with an ellipsis and passes null through', () => {
    expect(trimText('a'.repeat(400))).toHaveLength(MAX_TEXT);
    expect(trimText('short')).toBe('short');
    expect(trimText(null)).toBeNull();
  });
});
