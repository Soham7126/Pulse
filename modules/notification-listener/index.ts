import { requireNativeModule } from 'expo';

// Must match TASK_NAME in PulseHeadlessTaskService.kt.
export const NOTIFICATION_TASK = 'PulseNotification';

export type RawNotification = {
  packageName: string;
  appLabel: string | null;
  key: string;
  postTime: number;
  flags: number;
  category: string | null;
  title: string | null;
  text: string | null;
};

export type ReplyResult = 'sent' | 'gone' | 'no_reply_action' | 'not_connected';

type NotificationListenerNative = {
  isPermissionGranted(): boolean;
  openPermissionSettings(): void;
  /** Sends `text` through the notification's inline-reply action. Only while it is still showing. */
  reply(key: string, text: string): Promise<ReplyResult>;
};

export const NotificationListener = requireNativeModule<NotificationListenerNative>('NotificationListener');
