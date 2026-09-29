import { describe, expect, it } from '@jest/globals';

import { APP_MAP, defaultMode, isHardBlocked } from '../src/capture/packages';
import { FLAG_FOREGROUND_SERVICE, FLAG_GROUP_SUMMARY, FLAG_ONGOING_EVENT } from '../src/config/constants';
import { dropReason } from '../src/ingest/filter';

const allowMapped = (pkg: string) => pkg in APP_MAP;
const n = (packageName: string, flags = 0, category: string | null = null) => ({ packageName, flags, category });

describe('dropReason', () => {
  it('keeps a normal WhatsApp message', () => {
    expect(dropReason(n('com.whatsapp', 0x10, 'msg'), allowMapped)).toBeNull();
  });

  it('drops the WhatsApp group summary so one message counts once', () => {
    // Real pair seen on device: message + summary posted 10ms apart.
    const message = n('com.whatsapp', 0x10, 'msg');
    const summary = n('com.whatsapp', 0x10 | FLAG_GROUP_SUMMARY, 'msg');
    const kept = [message, summary].filter((x) => dropReason(x, allowMapped) === null);
    expect(kept).toHaveLength(1);
    expect(dropReason(summary, allowMapped)).toBe('group_summary');
  });

  it('drops ongoing and foreground-service notifications', () => {
    expect(dropReason(n('com.whatsapp', FLAG_ONGOING_EVENT), allowMapped)).toBe('ongoing');
    expect(dropReason(n('com.whatsapp', FLAG_FOREGROUND_SERVICE), allowMapped)).toBe('ongoing');
  });

  it('drops media/progress/system categories', () => {
    expect(dropReason(n('com.whatsapp', 0, 'transport'), allowMapped)).toBe('category');
    expect(dropReason(n('com.whatsapp', 0, 'progress'), allowMapped)).toBe('category');
  });

  it('drops system packages', () => {
    expect(dropReason(n('com.android.systemui'), () => true)).toBe('system');
  });

  it('drops apps that are not allowed', () => {
    expect(dropReason(n('com.antivirus'), allowMapped)).toBe('not_allowed');
  });

  it('blocks sensitive apps before anything else, even if "allowed"', () => {
    expect(dropReason(n('com.phonepe.app'), () => true)).toBe('blocked');
    expect(dropReason(n('com.google.android.apps.authenticator2', FLAG_GROUP_SUMMARY), () => true)).toBe('blocked');
  });
});

describe('isHardBlocked', () => {
  it('matches listed packages and bank/UPI/password name patterns', () => {
    expect(isHardBlocked('com.sbi.lotusintouch')).toBe(true);
    expect(isHardBlocked('com.somebank.mobile')).toBe(true);
    expect(isHardBlocked('in.example.upi')).toBe(true);
    expect(isHardBlocked('com.example.passwordsafe')).toBe(true);
  });

  it('does not block PRD apps', () => {
    for (const pkg of Object.keys(APP_MAP)) expect(isHardBlocked(pkg)).toBe(false);
  });
});

describe('defaultMode', () => {
  it('allows PRD apps, denies unknown apps, blocks sensitive apps', () => {
    expect(defaultMode('com.whatsapp')).toBe('allow');
    expect(defaultMode('com.antivirus')).toBe('deny');
    expect(defaultMode('com.phonepe.app')).toBe('blocked');
  });
});

describe('APP_MAP', () => {
  it('maps every PRD app (A3)', () => {
    const labels = new Set(Object.values(APP_MAP).map((a) => a.label));
    for (const label of ['WhatsApp', 'Gmail', 'LinkedIn', 'Instagram', 'Messages', 'Amazon', 'Flipkart']) {
      expect(labels.has(label)).toBe(true);
    }
    expect(APP_MAP['in.amazon.mShop.android.shopping']).toBeDefined();
    expect(APP_MAP['com.amazon.mShop.android.shopping']).toBeDefined();
  });
});
