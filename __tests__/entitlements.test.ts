import { describe, expect, it } from '@jest/globals';

import { PRO_ENTITLEMENT, hasPro } from '../src/entitlements/pro';

const info = (active: Record<string, { isActive: boolean }>) => ({ entitlements: { active } });

describe('hasPro', () => {
  it('is false for a free user (no active entitlements)', () => {
    expect(hasPro(info({}))).toBe(false);
  });

  it('is true once the pro entitlement is active (after the test purchase)', () => {
    expect(hasPro(info({ [PRO_ENTITLEMENT]: { isActive: true } }))).toBe(true);
  });

  it('ignores other entitlements and inactive pro', () => {
    expect(hasPro(info({ premium_skins: { isActive: true } }))).toBe(false);
    expect(hasPro(info({ [PRO_ENTITLEMENT]: { isActive: false } }))).toBe(false);
  });
});
