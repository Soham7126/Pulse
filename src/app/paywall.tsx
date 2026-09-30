import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, ToastAndroid, View } from 'react-native';
import type { PurchasesPackage } from 'react-native-purchases';
import { SafeAreaView } from 'react-native-safe-area-context';

import { settlePaywall } from '../entitlements/paywall-bridge';
import { loadProPackage, purchasePro, restorePro } from '../entitlements/revenuecat';
import { CatRoom } from '../ui/cat-room';
import { ActionButton, Icon, styles as ui } from '../ui/components';
import { T } from '../ui/text';
import { COLORS, SHADOW, alpha } from '../ui/theme';

const FEATURES: { label: string; free: boolean }[] = [
  { label: 'Inbox & briefing', free: true },
  { label: 'Animated cat widget', free: true },
  { label: 'Privacy guard', free: true },
  { label: 'AI urgency sorting', free: false },
  { label: 'Ask Pulse', free: false },
  { label: 'AI reply drafts', free: false },
];

/** Pulse Pro paywall. Price and purchase come from RevenueCat (`default` offering, `$rc_monthly`, `pro` entitlement). */
export default function Paywall() {
  const [pkg, setPkg] = useState<PurchasesPackage | null | undefined>(undefined);
  const [busy, setBusy] = useState(false);
  const settled = useRef(false);

  useEffect(() => {
    loadProPackage()
      .then(setPkg)
      .catch(() => setPkg(null));
    // Closed without a purchase (✕ or back): tell unlockPro() it's still free.
    return () => {
      if (!settled.current) settlePaywall(false);
    };
  }, []);

  const finish = (pro: boolean) => {
    settled.current = true;
    settlePaywall(pro);
    router.back();
  };

  const buy = async () => {
    if (!pkg || busy) return;
    setBusy(true);
    try {
      const result = await purchasePro(pkg);
      if (result === 'pro') return finish(true);
      if (result === 'not_pro') ToastAndroid.show('Purchase done, but Pro is not active yet. Try Restore.', ToastAndroid.LONG);
    } catch {
      ToastAndroid.show('The purchase did not go through. Try again.', ToastAndroid.SHORT);
    } finally {
      setBusy(false);
    }
  };

  const restore = async () => {
    setBusy(true);
    try {
      if (await restorePro()) return finish(true);
      ToastAndroid.show('No Pulse Pro purchase to restore.', ToastAndroid.SHORT);
    } catch {
      ToastAndroid.show('Could not restore purchases. Try again.', ToastAndroid.SHORT);
    } finally {
      setBusy(false);
    }
  };

  return (
    <SafeAreaView style={s.screen}>
      <View style={s.topBar}>
        <Pressable style={[s.close, ui.center]} hitSlop={10} onPress={() => router.back()} accessibilityLabel="Close">
          <Icon name="close" size={24} color={COLORS.onSurface} />
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={s.content}>
        <CatRoom pose="awake_sit" size={96} radius={20} />
        <T variant="headlineMd" style={s.title}>
          Let the cat watch your notifications
        </T>
        <T variant="bodyMd" color={COLORS.onSurfaceVariant} style={{ textAlign: 'center' }}>
          Pulse Pro unlocks Pulse AI: it sorts what needs you, answers questions and drafts your replies.
        </T>

        <View style={[s.table, SHADOW.card]}>
          <View style={s.proColumn} />
          <View style={s.row}>
            <T variant="bodyMd" weight="semibold" style={s.label}>
              Features
            </T>
            <T variant="labelMd" weight="semibold" color={COLORS.onSurfaceVariant} style={[s.col, { textAlign: 'center' }]}>
              FREE
            </T>
            <View style={s.col}>
              <View style={s.proPill}>
                <T variant="labelMd" weight="semibold" color="#FFFFFF">
                  PRO
                </T>
              </View>
            </View>
          </View>
          {FEATURES.map((f) => (
            <View key={f.label} style={s.row}>
              <T variant="bodySm" style={s.label}>
                {f.label}
              </T>
              <View style={s.col}>
                {f.free ? <Icon name="check" size={20} color={COLORS.onSurfaceVariant} /> : <View style={s.dash} />}
              </View>
              <View style={s.col}>
                <Icon name="check" size={20} color={COLORS.primaryContainer} />
              </View>
            </View>
          ))}
        </View>
      </ScrollView>

      <View style={[s.footer, SHADOW.nav]}>
        {pkg === undefined ? (
          <ActivityIndicator color={COLORS.primary} />
        ) : pkg === null ? (
          <T variant="bodySm" color={COLORS.secondary} style={{ textAlign: 'center' }}>
            Pulse Pro isn't available right now. Check your connection and try again.
          </T>
        ) : (
          <T variant="bodyMd" color={COLORS.onSurfaceVariant} style={{ textAlign: 'center' }}>
            Pulse Pro for just{' '}
            <T variant="bodyMd" weight="semibold">
              {pkg.product.priceString}/month
            </T>
          </T>
        )}
        <ActionButton
          label={busy ? 'Please wait…' : 'Continue'}
          primary
          onPress={() => void buy()}
          style={[s.continue, { opacity: pkg && !busy ? 1 : 0.5 }]}
        />
        <Pressable hitSlop={8} onPress={() => void restore()} disabled={busy}>
          <T variant="labelMd" color={COLORS.primary} style={{ textAlign: 'center' }}>
            Restore Purchases
          </T>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.surface },
  topBar: { flexDirection: 'row', paddingHorizontal: 12, paddingTop: 4 },
  close: { width: 40, height: 40, borderRadius: 20 },
  content: { alignItems: 'center', paddingHorizontal: 20, paddingTop: 0, paddingBottom: 12, gap: 10 },
  title: { textAlign: 'center', marginTop: 6 },
  table: {
    alignSelf: 'stretch',
    marginTop: 8,
    backgroundColor: COLORS.surfaceContainerLowest,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: alpha(COLORS.outlineVariant, 0.3),
    paddingVertical: 8,
    overflow: 'hidden',
  },
  proColumn: {
    position: 'absolute',
    top: 6,
    bottom: 6,
    right: 16,
    width: 64,
    borderRadius: 16,
    backgroundColor: alpha(COLORS.primaryFixed, 0.55),
  },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 7, paddingHorizontal: 16 },
  label: { flex: 1, paddingRight: 8 },
  col: { width: 64, alignItems: 'center' },
  proPill: { backgroundColor: COLORS.primaryContainer, paddingHorizontal: 10, paddingVertical: 3, borderRadius: 8 },
  dash: { width: 14, height: 2, borderRadius: 1, backgroundColor: COLORS.outlineVariant },
  footer: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 12,
    gap: 10,
    backgroundColor: COLORS.surfaceContainerLowest,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  continue: { paddingVertical: 14 },
});
