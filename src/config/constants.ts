// android.app.Notification flag bits (stable platform constants).
export const FLAG_ONGOING_EVENT = 0x2;
export const FLAG_FOREGROUND_SERVICE = 0x40;
export const FLAG_GROUP_SUMMARY = 0x200;

// Notification categories that are never "something for the user": media controls, progress, system status.
export const DROPPED_CATEGORIES: ReadonlySet<string> = new Set([
  'transport',
  'service',
  'sys',
  'progress',
  'navigation',
  'status',
]);

export const SYSTEM_PACKAGES: ReadonlySet<string> = new Set(['android', 'com.android.systemui']);

export const REDACTION_MASK = '••••';
