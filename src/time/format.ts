import { DateTime } from 'luxon';

// All helpers take the zone explicitly so they are pure and testable in any timezone.
const at = (utc: number, zone: string) => DateTime.fromMillis(utc, { zone }).setLocale('en-US');

export function startOfLocalDay(nowUtc: number, zone: string): number {
  return at(nowUtc, zone).startOf('day').toMillis();
}

export function greeting(nowUtc: number, zone: string): string {
  const h = at(nowUtc, zone).hour;
  if (h >= 5 && h < 12) return 'Good morning';
  if (h >= 12 && h < 17) return 'Good afternoon';
  return 'Good evening';
}

/** "Thursday, Oct 24" */
export function headerDate(nowUtc: number, zone: string): string {
  return at(nowUtc, zone).toFormat('cccc, LLL d');
}

/** Design-style short times: "just now", "22m ago", "3h ago", "11:15 PM", "Yesterday 10:48 PM", "Mon 12 Oct". */
export function shortTime(utc: number, nowUtc: number, zone: string): string {
  const then = at(utc, zone);
  const now = at(nowUtc, zone);
  const mins = Math.floor(now.diff(then, 'minutes').minutes);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  if (mins < 6 * 60) return `${Math.floor(mins / 60)}h ago`;
  const days = Math.round(now.startOf('day').diff(then.startOf('day'), 'days').days);
  if (days === 0) return then.toFormat('h:mm a');
  if (days === 1) return `Yesterday ${then.toFormat('h:mm a')}`;
  return then.toFormat('ccc d LLL');
}

/** "23:00" -> "11:00 PM" (wall-clock label; no date math). */
export function clockLabel(hhmm: string): string {
  return DateTime.fromFormat(hhmm, 'HH:mm', { locale: 'en-US' }).toFormat('h:mm a');
}
