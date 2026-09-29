import { useState } from 'react';
import { FlatList, StyleSheet, Switch, Text, View } from 'react-native';

import { getDb } from '../db/db';
import { listAppRules, setAppMode } from '../db/queries';

export default function Apps() {
  const [rules, setRules] = useState(() => listAppRules(getDb()));

  const toggle = (packageName: string, on: boolean) => {
    setAppMode(getDb(), packageName, on ? 'allow' : 'deny');
    setRules(listAppRules(getDb()));
  };

  return (
    <FlatList
      contentContainerStyle={styles.list}
      data={rules}
      keyExtractor={(r) => r.package_name}
      ListHeaderComponent={
        <Text style={styles.hint}>
          Apps appear here after they post a notification. Banking, UPI, authenticator and password apps are never
          read and never listed.
        </Text>
      }
      renderItem={({ item }) => (
        <View style={styles.row}>
          <View style={styles.name}>
            <Text>{item.label ?? item.package_name}</Text>
            <Text style={styles.pkg}>{item.package_name}</Text>
          </View>
          <Switch value={item.mode === 'allow'} onValueChange={(on) => toggle(item.package_name, on)} />
        </View>
      )}
    />
  );
}

const styles = StyleSheet.create({
  list: { padding: 16 },
  hint: { opacity: 0.7, marginBottom: 12 },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10 },
  name: { flex: 1 },
  pkg: { fontSize: 12, opacity: 0.6 },
});
