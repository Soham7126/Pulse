import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { bucketOf } from '../../classify/buckets';
import { getDb } from '../../db/db';
import { listAppRules, setHandled, type CaptureRow } from '../../db/queries';
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
import { appName, badgeFor, deviceZone, displayName, perAppCounts, readToday } from '../../ui/pulse-data';
import { T } from '../../ui/text';
import { COLORS, SHADOW, alpha } from '../../ui/theme';
import { useNow } from '../../ui/use-live';
import { refreshWidgets } from '../../widget/update';

type Filter = 'overview' | 'focus' | 'cleared';

export default function Today() {
  const now = useNow();
  const zone = deviceZone();
  const today = readToday(now, zone);
  const [filter, setFilter] = useState<Filter>('overview');
  const [drawerOpen, setDrawerOpen] = useState(false);

  const { attention, quiet, handled } = today;
  const upcoming = today.groups.shopping.filter((r) => !attention.includes(r));
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
                  → {attention.length} {attention.length === 1 ? 'needs' : 'need'} your attention
                </T>
              </View>
              <T variant="bodySm" color={COLORS.onSurfaceVariant} style={{ lineHeight: 20 }}>
                {asleep
                  ? 'Nothing needs you right now. Your queue is guarded.'
                  : `${quiet.length} quiet ${quiet.length === 1 ? 'update is' : 'updates are'} collapsed below.`}
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
          handled.length === 0 ? (
            <EmptyState pose="sleep_curled" title="Nothing cleared yet" body="Items you mark as handled will rest here." />
          ) : (
            <View style={{ gap: 12 }}>
              <SectionHeader dot={COLORS.tertiary} title="Handled today" right={`${handled.length} cleared`} />
              {handled.map((r) => (
                <AttentionCard key={r.key} row={r} now={now} zone={zone} />
              ))}
            </View>
          )
        ) : today.rows.length === 0 ? (
          <EmptyState pose="sleep_curled" title="No notifications yet today" body="The cat will wake up when something arrives." />
        ) : (
          <>
            {attention.length > 0 ? (
              <View style={{ gap: 12 }}>
                <SectionHeader
                  dot={COLORS.secondary}
                  title="Needs your attention"
                  right={(() => {
                    const urgent = attention.filter((r) => r.priority === 'high').length;
                    return urgent > 0 ? `${urgent} Urgent` : `${attention.length} ${attention.length === 1 ? 'item' : 'items'}`;
                  })()}
                />
                {(filter === 'focus' ? attention : attention.slice(0, 3)).map((r) => (
                  <AttentionCard key={r.key} row={r} now={now} zone={zone} />
                ))}
              </View>
            ) : null}

            {filter === 'overview' && upcoming.length > 0 ? (
              <View style={{ gap: 12 }}>
                <SectionHeader
                  dot={COLORS.tertiary}
                  title="Today & upcoming"
                  right={`${upcoming.length} ${upcoming.length === 1 ? 'update' : 'updates'}`}
                />
                {upcoming.map((r) => (
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

            {filter === 'overview' && quiet.length > 0 ? (
              <View style={s.drawer}>
                <Pressable style={[ui.row, { justifyContent: 'space-between' }]} onPress={() => setDrawerOpen((o) => !o)}>
                  <View style={[ui.row, { gap: 12, flex: 1 }]}>
                    <View style={[s.drawerIcon, ui.center]}>
                      <Icon name="visibility-off" size={16} color={COLORS.outline} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <T variant="headlineSm">{quiet.length} notifications collapsed</T>
                      <T variant="bodySm" color={COLORS.onSurfaceVariant} numberOfLines={2}>
                        {perAppCounts(quiet)
                          .map((c) => `${c.count} ${c.app}`)
                          .join(', ')}
                      </T>
                    </View>
                  </View>
                  <Icon name={drawerOpen ? 'expand-less' : 'expand-more'} color={COLORS.outline} />
                </Pressable>
                {drawerOpen ? (
                  <View style={s.drawerBody}>
                    {quiet.map((r) => (
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

const BADGE_TONES = {
  urgent: { bg: COLORS.secondaryFixed, fg: COLORS.onSecondaryFixed },
  action: { bg: COLORS.primaryFixed, fg: COLORS.onPrimaryFixed },
  plain: { bg: COLORS.surfaceContainer, fg: COLORS.onSurfaceVariant },
} as const;

function AttentionCard({ row, now, zone }: { row: CaptureRow; now: number; zone: string }) {
  const isWork = bucketOf(row) === 'work';
  const handled = row.status === 'handled';
  const badge = badgeFor(row);
  const note = row.urgency_note ?? (row.priority === 'high' ? row.action_text : null);
  return (
    <Card accent={handled ? COLORS.tertiary : row.priority === 'high' || !isWork ? COLORS.secondary : COLORS.primary}>
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
        {handled ? (
          <Pill text="Handled" bg={COLORS.tertiaryFixed} fg={COLORS.onTertiaryFixedVariant} icon="check" />
        ) : (
          <Pill text={badge.text} bg={BADGE_TONES[badge.tone].bg} fg={BADGE_TONES[badge.tone].fg} />
        )}
      </View>
      {row.text ? (
        <View style={ui.quote}>
          <T variant="bodyMd" italic numberOfLines={4}>
            “{row.text}”
          </T>
          {note && !handled ? (
            <View style={[ui.row, { gap: 4, marginTop: 6 }]}>
              <Icon name="priority-high" size={14} color={COLORS.secondary} />
              <T variant="labelSm" color={COLORS.secondary} style={{ flex: 1 }}>
                {note}
              </T>
            </View>
          ) : null}
        </View>
      ) : null}
      <View style={[ui.row, { marginTop: 12, paddingTop: 4 }]}>
        <ActionButton
          label={row.intent === 'communication' || (!row.intent && !isWork) ? 'Reply' : 'Open'}
          icon={row.intent === 'communication' || (!row.intent && !isWork) ? 'reply' : 'open-in-new'}
          primary
          onPress={() => router.push({ pathname: '/notification/[id]', params: { id: String(row.id) } })}
          style={{ flex: 1 }}
        />
        <ActionButton
          label={handled ? 'Restore' : 'Mark Handled'}
          icon={handled ? 'undo' : 'check-circle'}
          onPress={() => {
            setHandled(getDb(), row.id, !handled, Date.now());
            void refreshWidgets(false);
          }}
        />
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
