import { useEffect, useState } from 'react';
import { AppState, Button, StyleSheet, Text, View } from 'react-native';

import { NotificationListener } from '../../modules/notification-listener';

export default function Index() {
  const [granted, setGranted] = useState(NotificationListener.isPermissionGranted);

  // Re-check when returning from system settings.
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') setGranted(NotificationListener.isPermissionGranted());
    });
    return () => sub.remove();
  }, []);

  return (
    <View style={styles.container}>
      <Text>Notification access: {granted ? 'granted' : 'not granted'}</Text>
      <Button title="Open notification access settings" onPress={NotificationListener.openPermissionSettings} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
});
