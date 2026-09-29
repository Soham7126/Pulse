import { useEffect, useState } from 'react';
import { AppState } from 'react-native';

import { NotificationListener } from '../../modules/notification-listener';

/** Notification-access state, re-checked every time the app returns to the foreground (grant or revoke). */
export function usePermissionGranted(): boolean {
  const [granted, setGranted] = useState(NotificationListener.isPermissionGranted);
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') setGranted(NotificationListener.isPermissionGranted());
    });
    return () => sub.remove();
  }, []);
  return granted;
}
