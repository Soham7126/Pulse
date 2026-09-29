import { requireNativeModule } from 'expo';

// Must match TASK_NAME in PulseHeadlessTaskService.kt.
export const NOTIFICATION_TASK = 'PulseNotification';

export type RawNotification = {
  packageName: string;
  key: string;
  postTime: number;
  flags: number;
  category: string | null;
  title: string | null;
  text: string | null;
};

type NotificationListenerNative = {
  isPermissionGranted(): boolean;
  openPermissionSettings(): void;
};

export const NotificationListener = requireNativeModule<NotificationListenerNative>('NotificationListener');
