import type { Intent } from '../classify/types';

export type AppInfo = { label: string; defaultIntent: Intent };

// PRD apps (architecture §13). Verify package names against what the test phone actually emits.
export const APP_MAP: Readonly<Record<string, AppInfo>> = {
  'com.whatsapp': { label: 'WhatsApp', defaultIntent: 'communication' },
  'com.google.android.gm': { label: 'Gmail', defaultIntent: 'communication' },
  'com.linkedin.android': { label: 'LinkedIn', defaultIntent: 'work' },
  'com.instagram.android': { label: 'Instagram', defaultIntent: 'noise' },
  'com.google.android.apps.messaging': { label: 'Messages', defaultIntent: 'communication' },
  'in.amazon.mShop.android.shopping': { label: 'Amazon', defaultIntent: 'shopping' },
  'com.amazon.mShop.android.shopping': { label: 'Amazon', defaultIntent: 'shopping' },
  'com.flipkart.android': { label: 'Flipkart', defaultIntent: 'shopping' },
};

// Banking/UPI, authenticators and password managers. Never stored, not user-overridable in Phase 1.
export const HARD_BLOCKED_PACKAGES: ReadonlySet<string> = new Set([
  // Authenticators
  'com.google.android.apps.authenticator2',
  'com.azure.authenticator',
  'com.authy.authy',
  // Password managers
  'com.x8bit.bitwarden',
  'com.lastpass.lpandroid',
  'com.agilebits.onepassword',
  'com.dashlane',
  'keepass2android.keepass2android',
  'com.google.android.apps.passwordmanager',
  // Banking / UPI (India)
  'com.sbi.lotusintouch',
  'com.snapwork.hdfc',
  'com.csam.icici.bank.imobile',
  'com.axis.mobile',
  'com.msf.kbank.mobile',
  'com.phonepe.app',
  'com.google.android.apps.nbu.paisa.user',
  'net.one97.paytm',
  'in.org.npci.upiapp',
  'com.dreamplug.androidapp',
]);

// ponytail: package-name heuristic for banks not in the list; add app-label matching if real misses show up.
const BLOCKED_NAME_PATTERN = /bank|upi|authenticator|password|passwd|vault/i;

export function isHardBlocked(packageName: string): boolean {
  return HARD_BLOCKED_PACKAGES.has(packageName) || BLOCKED_NAME_PATTERN.test(packageName);
}
