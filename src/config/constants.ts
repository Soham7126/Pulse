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

export const LAST_SEEN_KEY = 'last_seen_utc';
export const AI_ENABLED_KEY = 'ai_enabled';
export const INSTALL_ID_KEY = 'install_id';

// PRD §8 defaults; user-editable settings arrive in M3.
export const DEFAULT_SLEEP_START = '23:00';
export const DEFAULT_SLEEP_END = '07:00';

// Ask Pulse's memory window (PRD: 7-day retention in Phase 1).
export const MEMORY_DAYS = 7;
