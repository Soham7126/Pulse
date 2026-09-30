import { DateTime } from 'luxon';

import { trimText, type AiItem } from './contract';

type Source = { id: number; label: string | null; package_name: string; title: string | null; text: string | null; posted_at_utc: number };

/** Local wall-clock stamp the model can reason about ("tonight", "tomorrow"): "2026-09-30 20:42 Wed". */
export const localStamp = (utc: number, zone: string): string =>
  DateTime.fromMillis(utc, { zone }).setLocale('en-US').toFormat('yyyy-LL-dd HH:mm ccc');

/**
 * Minimal-data policy (G4): app name, sender, redacted text trimmed to 300 chars, local time.
 * Never the notification key (it embeds phone numbers) or anything else from the row.
 */
export function toAiItem(r: Source, zone: string): AiItem {
  return {
    id: String(r.id),
    app: (r.label ?? r.package_name).slice(0, 80),
    sender: trimText(r.title, 120),
    text: trimText(r.text),
    when: localStamp(r.posted_at_utc, zone),
  };
}
