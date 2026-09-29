import type { RawNotification } from '../../modules/notification-listener';
import { isHardBlocked } from '../capture/packages';
import {
  DROPPED_CATEGORIES,
  FLAG_FOREGROUND_SERVICE,
  FLAG_GROUP_SUMMARY,
  FLAG_ONGOING_EVENT,
  SYSTEM_PACKAGES,
} from '../config/constants';

export type DropReason = 'blocked' | 'not_allowed' | 'system' | 'ongoing' | 'group_summary' | 'category';

type FilterInput = Pick<RawNotification, 'packageName' | 'flags' | 'category'>;

/**
 * First ingest step. Returns why a notification is dropped, or null to keep it.
 * The hard-block check runs first so blocked apps never reach any later step.
 */
export function dropReason(n: FilterInput, isAllowed: (packageName: string) => boolean): DropReason | null {
  if (isHardBlocked(n.packageName)) return 'blocked';
  if (SYSTEM_PACKAGES.has(n.packageName)) return 'system';
  if (!isAllowed(n.packageName)) return 'not_allowed';
  // WhatsApp/Gmail post a bundle "summary" alongside each real notification; counting it doubles every message.
  if (n.flags & FLAG_GROUP_SUMMARY) return 'group_summary';
  if (n.flags & (FLAG_ONGOING_EVENT | FLAG_FOREGROUND_SERVICE)) return 'ongoing';
  if (n.category !== null && DROPPED_CATEGORIES.has(n.category)) return 'category';
  return null;
}
