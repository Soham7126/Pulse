import type { SQLiteDatabase } from 'expo-sqlite';

import { defaultMode, type AppMode } from '../capture/packages';

export type AppRule = { package_name: string; label: string | null; mode: AppMode };
export type CaptureRow = {
  key: string;
  package_name: string;
  label: string | null;
  title: string | null;
  text: string | null;
  posted_at_utc: number;
};

/** Returns the app's mode, creating its rule with the default the first time the app is seen. */
export function ensureAppRule(db: SQLiteDatabase, packageName: string, label: string | null): AppMode {
  const row = db.getFirstSync<{ mode: AppMode }>('SELECT mode FROM app_rules WHERE package_name = ?', packageName);
  if (row) return row.mode;
  const mode = defaultMode(packageName);
  db.runSync('INSERT INTO app_rules (package_name, label, mode) VALUES (?, ?, ?)', packageName, label, mode);
  return mode;
}

export function listAppRules(db: SQLiteDatabase): AppRule[] {
  return db.getAllSync<AppRule>(
    'SELECT package_name, label, mode FROM app_rules ORDER BY COALESCE(label, package_name) COLLATE NOCASE',
  );
}

export function setAppMode(db: SQLiteDatabase, packageName: string, mode: 'allow' | 'deny'): void {
  // Hard-blocked apps are not user-overridable in Phase 1.
  db.runSync("UPDATE app_rules SET mode = ? WHERE package_name = ? AND mode != 'blocked'", mode, packageName);
}

/** Insert or update-in-place by notification key. Returns true when the key is new. Text must already be redacted. */
export function upsertCapture(db: SQLiteDatabase, row: Omit<CaptureRow, 'label'>): boolean {
  const existed = db.getFirstSync('SELECT 1 FROM capture_log WHERE key = ?', row.key) !== null;
  db.runSync(
    `INSERT INTO capture_log (key, package_name, title, text, posted_at_utc) VALUES (?, ?, ?, ?, ?)
     ON CONFLICT(key) DO UPDATE SET title = excluded.title, text = excluded.text, posted_at_utc = excluded.posted_at_utc`,
    row.key,
    row.package_name,
    row.title,
    row.text,
    row.posted_at_utc,
  );
  return !existed;
}

export function listCaptures(db: SQLiteDatabase, limit = 100, sinceUtc = 0): CaptureRow[] {
  return db.getAllSync<CaptureRow>(
    `SELECT c.key, c.package_name, r.label, c.title, c.text, c.posted_at_utc
     FROM capture_log c LEFT JOIN app_rules r ON r.package_name = c.package_name
     WHERE c.posted_at_utc >= ?
     ORDER BY c.posted_at_utc DESC LIMIT ?`,
    sinceUtc,
    limit,
  );
}

export function getSetting(db: SQLiteDatabase, key: string): string | null {
  return db.getFirstSync<{ value: string }>('SELECT value FROM settings WHERE key = ?', key)?.value ?? null;
}

export function setSetting(db: SQLiteDatabase, key: string, value: string): void {
  db.runSync(
    'INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value',
    key,
    value,
  );
}
