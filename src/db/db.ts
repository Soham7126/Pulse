import { openDatabaseSync, type SQLiteDatabase } from 'expo-sqlite';

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
  db = opened;
  return db;
}
