import { Link, Redirect } from 'expo-router';
import { useEffect, useState } from 'react';
import { Button, FlatList, StyleSheet, Text, View } from 'react-native';
import { requestPinWidget } from 'react-native-android-widget';

import { usePermissionGranted } from '../capture/use-permission';
import { getDb } from '../db/db';
import { listCaptures, type CaptureRow } from '../db/queries';

// The headless task writes from another context, so the M1 debug list polls instead of subscribing.
const POLL_MS = 1000;

export default function Index() {
  const granted = usePermissionGranted();
  const [rows, setRows] = useState<CaptureRow[]>([]);

  useEffect(() => {
    if (!granted) return;
    const load = () => setRows(listCaptures(getDb()));
    load();
    const id = setInterval(load, POLL_MS);
    return () => clearInterval(id);
  }, [granted]);

  if (!granted) return <Redirect href="/onboarding" />;

  return (
    <View style={styles.container}>
      <View style={styles.actions}>
        <Link href="/apps" asChild>
          <Button title="Choose apps" />
        </Link>
        <Button title="Add widget" onPress={() => requestPinWidget({ widgetName: 'Hello' })} />
      </View>
      <Text style={styles.heading}>Captured ({rows.length}), debug</Text>
      <FlatList
        data={rows}
        keyExtractor={(r) => r.key}
        ListEmptyComponent={<Text style={styles.empty}>Nothing captured yet.</Text>}
        renderItem={({ item }) => (
          <View style={styles.row}>
            <Text style={styles.app}>
              {item.label ?? item.package_name} · {new Date(item.posted_at_utc).toLocaleTimeString()}
            </Text>
            {item.title ? <Text>{item.title}</Text> : null}
            {item.text ? <Text style={styles.text}>{item.text}</Text> : null}
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, gap: 12 },
  actions: { flexDirection: 'row', gap: 12 },
  heading: { fontSize: 16, fontWeight: 'bold' },
  empty: { opacity: 0.6 },
  row: { paddingVertical: 8, borderBottomWidth: StyleSheet.hairlineWidth, borderColor: '#ccc' },
  app: { fontSize: 12, opacity: 0.7 },
  text: { opacity: 0.85 },
});
