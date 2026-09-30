import { openDatabaseSync, type SQLiteDatabase } from 'expo-sqlite';

import { seedDefaultApps } from './queries';

// Each entry upgrades the schema by one version (tracked in PRAGMA user_version). Append only.
const MIGRATIONS: readonly string[] = [
  `CREATE TABLE app_rules (
     package_name TEXT PRIMARY KEY,
     label        TEXT,
     mode         TEXT NOT NULL
   );
   -- ponytail: M1 raw debug list; replaced by the full notifications table (architecture §4) in M2.
   CREATE TABLE capture_log (
     key           TEXT PRIMARY KEY,
     package_name  TEXT NOT NULL,
     title         TEXT,
     text          TEXT,
     posted_at_utc INTEGER NOT NULL
   );
   CREATE INDEX idx_capture_time ON capture_log(posted_at_utc);`,
  `CREATE TABLE settings (key TEXT PRIMARY KEY, value TEXT);`,
  // Classification (GPT-4o via the proxy) and handled state. NULL classifier = not classified yet.
  `ALTER TABLE capture_log ADD COLUMN intent TEXT;
   ALTER TABLE capture_log ADD COLUMN priority TEXT;
   ALTER TABLE capture_log ADD COLUMN action_required INTEGER;
   ALTER TABLE capture_log ADD COLUMN action_text TEXT;
   ALTER TABLE capture_log ADD COLUMN urgency TEXT;
   ALTER TABLE capture_log ADD COLUMN urgency_note TEXT;
   ALTER TABLE capture_log ADD COLUMN confidence REAL;
   ALTER TABLE capture_log ADD COLUMN classifier TEXT;
   ALTER TABLE capture_log ADD COLUMN status TEXT NOT NULL DEFAULT 'active';
   ALTER TABLE capture_log ADD COLUMN handled_at_utc INTEGER;
   CREATE INDEX idx_capture_pending ON capture_log(classifier, posted_at_utc);`,
];

let db: SQLiteDatabase | null = null;

// Shared by the UI and the headless task (the task may run with no UI in a fresh JS runtime).
export function getDb(): SQLiteDatabase {
  if (db) return db;
  const opened = openDatabaseSync('pulse.db');
  opened.execSync('PRAGMA journal_mode = WAL');
  const version = opened.getFirstSync<{ user_version: number }>('PRAGMA user_version')?.user_version ?? 0;
  for (let v = version; v < MIGRATIONS.length; v++) {
    opened.withTransactionSync(() => {
      opened.execSync(MIGRATIONS[v]);
      opened.execSync(`PRAGMA user_version = ${v + 1}`);
    });
  }
  seedDefaultApps(opened);
  db = opened;
  return db;
}
