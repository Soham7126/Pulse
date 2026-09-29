import { useState } from 'react';
import { FlatList, Pressable, StyleSheet, Switch, View } from 'react-native';
import { requestPinWidget } from 'react-native-android-widget';
import { SafeAreaView } from 'react-native-safe-area-context';

import { NotificationListener } from '../../../modules/notification-listener';
import { getDb } from '../../db/db';
import { listAppRules, setAppMode } from '../../db/queries';
import { ActionButton, Card, Icon, Pill, appTint, styles as ui } from '../../ui/components';
import { T } from '../../ui/text';
import { COLORS, SHADOW, alpha } from '../../ui/theme';

export default function Apps() {
  const [rules, setRules] = useState(() => listAppRules(getDb()));

  const toggle = (packageName: string, on: boolean) => {
    setAppMode(getDb(), packageName, on ? 'allow' : 'deny');
    setRules(listAppRules(getDb()));
  };

  return (
    <SafeAreaView style={s.screen} edges={['top']}>
      <View style={s.header}>
        <View style={[ui.row, { gap: 10 }]}>
          <View style={[s.brand, ui.center]}>
            <Icon name="dashboard-customize" size={18} color={COLORS.onPrimaryFixed} />
          </View>
          <View>
            <T variant="headlineSm">Apps</T>
            <T variant="labelSm" color={COLORS.onSurfaceVariant}>
              Choose what the cat listens to
            </T>
          </View>
        </View>
      </View>

      <FlatList
        contentContainerStyle={s.content}
        data={rules}
        keyExtractor={(r) => r.package_name}
        onFocus={() => setRules(listAppRules(getDb()))}
        ListHeaderComponent={
          <View style={{ gap: 16, marginBottom: 12 }}>
            <Card style={{ gap: 12 }}>
              <View style={[ui.row, { justifyContent: 'space-between' }]}>
                <T variant="headlineSm">Notification access</T>
                <Pill text="Granted" bg={COLORS.tertiaryFixed} fg={COLORS.onTertiaryFixedVariant} dot={COLORS.tertiary} />
              </View>
              <T variant="bodySm" color={COLORS.onSurfaceVariant}>
                Banking, UPI, authenticator and password apps are never read and never listed. OTPs are hidden before
                anything is saved.
              </T>
              <View style={ui.row}>
                <ActionButton
                  label="Add widget"
                  icon="widgets"
                  primary
                  onPress={() => requestPinWidget({ widgetName: 'Hello' })}
                  style={{ flex: 1 }}
                />
                <ActionButton label="Access settings" icon="open-in-new" onPress={() => NotificationListener.openPermissionSettings()} />
              </View>
            </Card>
            <T variant="labelMd" weight="semibold" color={COLORS.onSurfaceVariant} upper style={{ letterSpacing: 1.2, paddingHorizontal: 4 }}>
              Apps that have notified you
            </T>
          </View>
        }
        ListEmptyComponent={
          <T variant="bodySm" color={COLORS.onSurfaceVariant} style={{ paddingHorizontal: 4 }}>
            Apps appear here after they post their first notification.
          </T>
        }
        ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
        renderItem={({ item }) => (
          <Pressable onPress={() => toggle(item.package_name, item.mode !== 'allow')} style={[s.appRow, SHADOW.cardSm]}>
            <View style={[s.appIcon, ui.center, { backgroundColor: alpha(appTint(item.package_name), 0.12) }]}>
              <T variant="headlineSm" color={appTint(item.package_name)}>
                {(item.label ?? item.package_name).charAt(0).toUpperCase()}
              </T>
            </View>
            <View style={{ flex: 1 }}>
              <T variant="bodyMd" weight="semibold">
                {item.label ?? item.package_name}
              </T>
              <T variant="labelSm" color={COLORS.outline} numberOfLines={1}>
                {item.package_name}
              </T>
            </View>
            <Switch
              value={item.mode === 'allow'}
              onValueChange={(on) => toggle(item.package_name, on)}
              trackColor={{ false: '#ECE7DE', true: COLORS.tertiaryContainer }}
              thumbColor={COLORS.parchment}
            />
          </Pressable>
        )}
      />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.surface },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: alpha(COLORS.surface, 0.9),
    ...SHADOW.cardSm,
  },
  brand: { width: 32, height: 32, borderRadius: 16, backgroundColor: COLORS.primaryFixed },
  content: { padding: 20, paddingBottom: 32 },
  appRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: 16,
    backgroundColor: COLORS.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: alpha(COLORS.outlineVariant, 0.2),
  },
  appIcon: { width: 40, height: 40, borderRadius: 12 },
});
