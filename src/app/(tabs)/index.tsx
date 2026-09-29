import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { bucketFor } from '../../classify/buckets';
import { getDb } from '../../db/db';
import { listAppRules, type CaptureRow } from '../../db/queries';
import { greeting, headerDate, shortTime } from '../../time/format';
import { CatRoom } from '../../ui/cat-room';
import {
  ActionButton,
  Card,
  Icon,
  IconTile,
  Pill,
  SectionHeader,
  appTint,
  comingSoon,
  styles as ui,
} from '../../ui/components';
import { appName, deviceZone, displayName, perAppCounts, readToday } from '../../ui/pulse-data';
import { T } from '../../ui/text';
import { COLORS, SHADOW, alpha } from '../../ui/theme';
import { useNow } from '../../ui/use-live';

type Filter = 'overview' | 'focus' | 'cleared';

export default function Today() {
  const now = useNow();
  const zone = deviceZone();
  const today = readToday(now, zone);
  const [filter, setFilter] = useState<Filter>('overview');
  const [drawerOpen, setDrawerOpen] = useState(false);

  const attention = [...today.groups.people, ...today.groups.work].sort((a, b) => b.posted_at_utc - a.posted_at_utc);
  const listening = listAppRules(getDb()).filter((r) => r.mode === 'allow').length;
  const asleep = today.pose === 'sleep_curled';
  const latest = today.rows[0];

  return (
    <SafeAreaView style={s.screen} edges={['top']}>
      <View style={s.header}>
        <View style={ui.row}>
          <View style={[s.brand, ui.center]}>
            <Icon name="pets" size={18} color={COLORS.onPrimaryFixed} />
          </View>
          <T variant="headlineSm">Pulse</T>
          <T variant="labelSm" color={COLORS.onSurfaceVariant}>
            {headerDate(now, zone)}
          </T>
        </View>
        <Pressable style={[s.iconBtn, ui.center]} onPress={() => router.push('/apps')}>
          <Icon name="tune" />
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={s.content}>
        <View style={{ gap: 12 }}>
          <View>
            <T variant="displayLgMobile">{greeting(now, zone)}</T>
            <T variant="bodySm" color={COLORS.onSurfaceVariant} style={{ marginTop: 2 }}>
              Listening to {listening} {listening === 1 ? 'app' : 'apps'} ·{' '}
              {latest ? `last update ${shortTime(latest.posted_at_utc, now, zone)}` : 'all quiet so far'}
            </T>
          </View>

          <Card style={s.hero}>
            <View style={{ flex: 1, gap: 8, maxWidth: 210 }}>
              {asleep ? (
                <Pill text="Calm state" bg={COLORS.tertiaryFixed} fg={COLORS.onTertiaryFixedVariant} dot={COLORS.tertiary} />
              ) : (
                <Pill text="Something new" bg={COLORS.primaryFixed} fg={COLORS.onPrimaryFixed} dot={COLORS.primary} />
              )}
              <View>
                <T variant="headlineSm">
                  {today.rows.length} {today.rows.length === 1 ? 'notification' : 'notifications'}
                </T>
                <T variant="bodySm" weight="medium" color={COLORS.primary}>
                  → {attention.length} from people & work
                </T>
              </View>
              <T variant="bodySm" color={COLORS.onSurfaceVariant} style={{ lineHeight: 20 }}>
                {asleep
                  ? 'Nothing from people, work or shopping yet today. Your queue is guarded.'
                  : `${today.groups.quiet.length} quiet ${today.groups.quiet.length === 1 ? 'update is' : 'updates are'} collapsed below.`}
              </T>
            </View>
            <View style={{ alignItems: 'center' }}>
              <CatRoom pose={today.pose} size={96} />
              <T variant="labelSm" color={COLORS.outline} style={{ marginTop: 6 }}>
                {asleep ? 'Cat is asleep' : 'Cat is awake'}
              </T>
            </View>
          </Card>

          <View style={[ui.row, { paddingTop: 4 }]}>
            <Chip label="Overview" active={filter === 'overview'} onPress={() => setFilter('overview')} />
            <Chip label="Focus" count={attention.length} active={filter === 'focus'} onPress={() => setFilter('focus')} />
            <Chip label="All Cleared" active={filter === 'cleared'} onPress={() => setFilter('cleared')} />
          </View>
        </View>

        {filter === 'cleared' ? (
          <EmptyState pose="sleep_curled" title="Nothing cleared yet" body="Items you mark as handled will rest here." />
        ) : today.rows.length === 0 ? (
          <EmptyState pose="sleep_curled" title="No notifications yet today" body="The cat will wake up when something arrives." />
        ) : (
          <>
            {attention.length > 0 ? (
              <View style={{ gap: 12 }}>
                <SectionHeader
                  dot={COLORS.secondary}
                  title="Needs your attention"
                  right={`${attention.length} ${attention.length === 1 ? 'message' : 'messages'}`}
                />
                {(filter === 'focus' ? attention : attention.slice(0, 3)).map((r) => (
                  <AttentionCard key={r.key} row={r} now={now} zone={zone} />
                ))}
              </View>
            ) : null}

            {filter === 'overview' && today.groups.shopping.length > 0 ? (
              <View style={{ gap: 12 }}>
                <SectionHeader
                  dot={COLORS.tertiary}
                  title="Today & upcoming"
                  right={`${today.groups.shopping.length} ${today.groups.shopping.length === 1 ? 'update' : 'updates'}`}
                />
                {today.groups.shopping.map((r) => (
                  <Card key={r.key} style={[ui.row, { alignItems: 'flex-start', gap: 14 }, SHADOW.cardSm]}>
                    <IconTile name="local-shipping" tint={COLORS.primary} />
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <View style={[ui.row, { justifyContent: 'space-between' }]}>
                        <T variant="labelSm" color={COLORS.outline}>
                          {appName(r)} · Shopping
                        </T>
                        <View style={s.timeTag}>
                          <T variant="labelSm" color={COLORS.onSurfaceVariant}>
                            {shortTime(r.posted_at_utc, now, zone)}
                          </T>
                        </View>
                      </View>
                      <T variant="headlineSm" numberOfLines={1} style={{ marginTop: 4 }}>
                        {displayName(r)}
                      </T>
                      {r.text ? (
                        <T variant="bodySm" color={COLORS.onSurfaceVariant} numberOfLines={2} style={{ marginTop: 2 }}>
                          {r.text}
                        </T>
                      ) : null}
                    </View>
                  </Card>
                ))}
              </View>
            ) : null}

            {filter === 'overview' && today.groups.quiet.length > 0 ? (
              <View style={s.drawer}>
                <Pressable style={[ui.row, { justifyContent: 'space-between' }]} onPress={() => setDrawerOpen((o) => !o)}>
                  <View style={[ui.row, { gap: 12, flex: 1 }]}>
                    <View style={[s.drawerIcon, ui.center]}>
                      <Icon name="visibility-off" size={16} color={COLORS.outline} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <T variant="headlineSm">{today.groups.quiet.length} notifications collapsed</T>
                      <T variant="bodySm" color={COLORS.onSurfaceVariant} numberOfLines={2}>
                        {perAppCounts(today.groups.quiet)
                          .map((c) => `${c.count} ${c.app}`)
                          .join(', ')}
                      </T>
                    </View>
                  </View>
                  <Icon name={drawerOpen ? 'expand-less' : 'expand-more'} color={COLORS.outline} />
                </Pressable>
                {drawerOpen ? (
                  <View style={s.drawerBody}>
                    {today.groups.quiet.map((r) => (
                      <View key={r.key} style={[ui.row, { justifyContent: 'space-between', paddingVertical: 4 }]}>
                        <T variant="bodySm" color={COLORS.onSurfaceVariant} numberOfLines={1} style={{ flex: 1 }}>
                          {appName(r)}: {r.title ?? r.text ?? 'Notification'}
                        </T>
                        <T variant="labelSm" color={COLORS.outline}>
                          {shortTime(r.posted_at_utc, now, zone)}
                        </T>
                      </View>
                    ))}
                    <View style={[ui.row, { paddingTop: 8 }]}>
                      <ActionButton label="Review all quiet items" onPress={() => comingSoon('Reviewing quiet items')} outlined style={{ flex: 1 }} />
                      <ActionButton label="Keep collapsed" onPress={() => setDrawerOpen(false)} />
                    </View>
                  </View>
                ) : null}
              </View>
            ) : null}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function Chip({ label, count, active, onPress }: { label: string; count?: number; active: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [s.chip, active ? s.chipActive : s.chipIdle, { transform: [{ scale: pressed ? 0.95 : 1 }] }]}
    >
      <T variant="labelMd" color={active ? COLORS.surface : COLORS.onSurfaceVariant}>
        {label}
      </T>
      {count !== undefined && count > 0 ? (
        <View style={s.chipCount}>
          <T variant="labelSm" color={COLORS.onPrimaryFixed}>
            {count}
          </T>
        </View>
      ) : null}
    </Pressable>
  );
}

function AttentionCard({ row, now, zone }: { row: CaptureRow; now: number; zone: string }) {
  const isWork = bucketFor(row.package_name) === 'work';
  return (
    <Card accent={isWork ? COLORS.primary : COLORS.secondary}>
      <View style={[ui.row, { justifyContent: 'space-between', alignItems: 'flex-start' }]}>
        <View style={[ui.row, { gap: 10, flex: 1 }]}>
          <View style={[s.kindIcon, ui.center, { backgroundColor: isWork ? COLORS.primaryFixed : COLORS.tertiaryFixed }]}>
            <Icon name={isWork ? 'work' : 'chat'} size={18} color={isWork ? COLORS.onPrimaryFixed : COLORS.onTertiaryFixedVariant} />
          </View>
          <View style={{ flex: 1 }}>
            <View style={[ui.row, { gap: 6, flexWrap: 'wrap' }]}>
              <T variant="headlineSm" numberOfLines={1}>
                {displayName(row)}
              </T>
              <T variant="bodySm" color={COLORS.outline}>
                · {appName(row)}
              </T>
            </View>
            <T variant="labelSm" color={COLORS.outline}>
              {shortTime(row.posted_at_utc, now, zone)}
            </T>
          </View>
        </View>
        <Pill
          text={isWork ? 'Work' : 'Conversation'}
          bg={isWork ? COLORS.primaryFixed : COLORS.secondaryFixed}
          fg={isWork ? COLORS.onPrimaryFixed : COLORS.onSecondaryFixed}
        />
      </View>
      {row.text ? (
        <View style={ui.quote}>
          <T variant="bodyMd" italic numberOfLines={4}>
            “{row.text}”
          </T>
        </View>
      ) : null}
      <View style={[ui.row, { marginTop: 12, paddingTop: 4 }]}>
        <ActionButton
          label={isWork ? 'Open' : 'Reply'}
          icon={isWork ? 'open-in-new' : 'reply'}
          primary
          onPress={() => comingSoon(isWork ? 'Opening the source app' : 'Reply')}
          style={{ flex: 1 }}
        />
        <ActionButton label="Mark Handled" icon="check-circle" onPress={() => comingSoon('Mark handled')} />
      </View>
    </Card>
  );
}

function EmptyState({ pose, title, body }: { pose: 'sleep_curled' | 'awake_sit'; title: string; body: string }) {
  return (
    <Card style={{ alignItems: 'center', gap: 10, paddingVertical: 24 }}>
      <CatRoom pose={pose} size={112} />
      <T variant="headlineSm">{title}</T>
      <T variant="bodySm" color={COLORS.onSurfaceVariant} style={{ textAlign: 'center' }}>
        {body}
      </T>
    </Card>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.surface },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: alpha(COLORS.surface, 0.9),
    ...SHADOW.cardSm,
  },
  brand: { width: 32, height: 32, borderRadius: 16, backgroundColor: COLORS.primaryFixed },
  iconBtn: { width: 36, height: 36, borderRadius: 18 },
  content: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 32, gap: 24 },
  hero: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 6, borderRadius: 999 },
  chipActive: { backgroundColor: COLORS.inverseSurface },
  chipIdle: { backgroundColor: COLORS.surfaceContainerLowest, borderWidth: 1, borderColor: alpha(COLORS.outlineVariant, 0.4) },
  chipCount: { backgroundColor: COLORS.primaryFixed, paddingHorizontal: 6, borderRadius: 999 },
  kindIcon: { width: 32, height: 32, borderRadius: 16 },
  timeTag: { backgroundColor: COLORS.surfaceContainer, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  drawer: {
    backgroundColor: COLORS.surfaceContainerLow,
    borderWidth: 1,
    borderColor: alpha(COLORS.outlineVariant, 0.25),
    borderRadius: 16,
    padding: 16,
  },
  drawerIcon: { width: 28, height: 28, borderRadius: 14, backgroundColor: COLORS.surfaceContainerHighest },
  drawerBody: { marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: alpha(COLORS.outlineVariant, 0.2), gap: 4 },
});
