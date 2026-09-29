import { Redirect } from 'expo-router';
import { Button, StyleSheet, Text, View } from 'react-native';

import { NotificationListener } from '../../modules/notification-listener';
import { usePermissionGranted } from '../capture/use-permission';

export default function Onboarding() {
  const granted = usePermissionGranted();
  if (granted) return <Redirect href="/" />;

  // ponytail: text-only until the cat sprites land in M4; the cat will guide this screen then.
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Let the cat keep watch</Text>
      <Text style={styles.body}>
        Pulse reads your notifications so the cat on your home screen can tell you, at a glance, whether anything
        needs you.
      </Text>
      <Text style={styles.body}>
        • Everything stays on this phone.{'\n'}• Banking, UPI, authenticator and password apps are never read.{'\n'}•
        OTPs and long numbers are hidden before anything is saved.{'\n'}• You choose which apps Pulse watches.
      </Text>
      <Text style={styles.hint}>
        Next: turn on Pulse under "Device &amp; app notifications". If the switch is greyed out, open Pulse's App info
        and allow restricted settings first.
      </Text>
      <Button title="Allow notification access" onPress={() => NotificationListener.openPermissionSettings()} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: 24, gap: 16 },
  title: { fontSize: 24, fontWeight: 'bold' },
  body: { fontSize: 16, lineHeight: 24 },
  hint: { fontSize: 14, opacity: 0.7 },
});
