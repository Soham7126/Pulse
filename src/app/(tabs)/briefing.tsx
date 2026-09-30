import { router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { DEFAULT_SLEEP_END, DEFAULT_SLEEP_START } from '../../config/constants';
import { getDb } from '../../db/db';
import { setHandled, type CaptureRow } from '../../db/queries';
import { clockLabel, shortTime } from '../../time/format';
import { CatRoom } from '../../ui/cat-room';
import {
  ActionButton,
  AppBadge,
  Avatar,
  Card,
  Icon,
  IconTile,
  SectionHeader,
  appTint,
  comingSoon,
  styles as ui,
} from '../../ui/components';
import { appName, deviceZone, displayName, perAppCounts, readAway } from '../../ui/pulse-data';
import { T } from '../../ui/text';
import { COLORS, SHADOW, alpha } from '../../ui/theme';
import { useNow } from '../../ui/use-live';
import { refreshWidgets } from '../../widget/update';

const openDetail = (r: CaptureRow) => router.push({ pathname: '/notification/[id]', params: { id: String(r.id) } });

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

export default function Briefing() {
  const now = useNow();
  const zone = deviceZone();
  const away = readAway(now, zone);
  const { people, work, shopping, quiet } = away.groups;
  const worth = people.length + work.length + shopping.length;
  const latest = away.rows[0];

  return (
    <SafeAreaView style={s.screen} edges={['top']}>
      <View style={s.header}>
        <View style={[ui.row, { gap: 12 }]}>
          <Pressable style={[s.back, ui.center]} onPress={() => router.navigate('/')}>
            <Icon name="arrow-back" color={COLORS.onSurface} />
          </Pressable>
          <View>
            <T variant="headlineSm">Personal Briefing</T>
            <View style={[ui.row, { gap: 6, marginTop: 2 }]}>
              <View style={[ui.dotSm, { backgroundColor: COLORS.tertiary }]} />
              <T variant="labelSm" color={COLORS.onSurfaceVariant}>
                {latest ? `Last update ${shortTime(latest.posted_at_utc, now, zone)}` : 'Listening'}
              </T>
            </View>
          </View>
        </View>
        <Pressable style={[s.iconBtn, ui.center]} onPress={() => router.push('/apps')}>
          <Icon name="tune" />
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={s.content}>
        <Card style={{ padding: 20 }}>
          <View style={[ui.row, { justifyContent: 'space-between', alignItems: 'flex-start' }]}>
            <View style={{ flex: 1, gap: 4, paddingRight: 12 }}>
              <View style={s.sleepChip}>
                <Icon name="bedtime" size={13} color={COLORS.primary} />
                <T variant="labelMd" weight="semibold" color={COLORS.primary} style={{ flexShrink: 1 }}>
                  SLEEP • {clockLabel(DEFAULT_SLEEP_START)} – {clockLabel(DEFAULT_SLEEP_END)}
                </T>
              </View>
              <T variant="headlineLg" style={{ paddingTop: 4 }}>
                While you were away
              </T>
            </View>
            <View>
              <CatRoom pose={away.pose} size={64} radius={12} />
              <View style={s.onlineDot}>
                <View style={[ui.dotSm, { backgroundColor: '#FFFFFF' }]} />
              </View>
            </View>
          </View>

          <View style={s.metrics}>
            <View style={{ flex: 1 }}>
              <T variant="labelSm" weight="medium" color={COLORS.onSurfaceVariant}>
                TOTAL RECEIVED
              </T>
              <T variant="displayLgMobile" color={COLORS.secondary}>
                {away.rows.length}{' '}
                <T variant="bodyMd" color={COLORS.onSurfaceVariant}>
                  {away.rows.length === 1 ? 'notification' : 'notifications'}
                </T>
              </T>
            </View>
            <View style={{ flex: 1, alignItems: 'flex-end' }}>
              <T variant="labelSm" weight="semibold" color={COLORS.tertiary}>
                REDUCED DOWN TO
              </T>
              <T variant="headlineLg" color={COLORS.tertiary} style={{ textAlign: 'right' }}>
                {worth}{' '}
                <T variant="bodySm" weight="medium" color={COLORS.tertiary}>
                  worth a look
                </T>
              </T>
            </View>
          </View>

          <View style={s.banner}>
            <View style={[s.bannerIcon, ui.center]}>
              <Icon name="auto-awesome" size={18} color={COLORS.onPrimaryFixed} />
            </View>
            <T variant="bodySm" style={{ flex: 1, lineHeight: 18 }}>
              <T variant="bodySm" weight="semibold">
                {away.rows.length === 0
                  ? 'Nothing arrived since you last looked.'
                  : `${plural(away.rows.length, 'notification', 'notifications')} arrived, ${worth} worth knowing.`}
              </T>{' '}
              {quiet.length > 0 ? `The other ${quiet.length} are grouped quietly below.` : 'Your queue is calm.'}
            </T>
          </View>
        </Card>

        {people.length > 0 ? (
          <View style={{ gap: 12 }}>
            <SectionHeader
              dot={COLORS.tertiary}
              title="People"
              badge={{
                text: plural(people.length, 'conversation', 'conversations'),
                bg: COLORS.tertiaryFixed,
                fg: COLORS.onTertiaryFixedVariant,
              }}
              right="Actionable"
            />
            {people.map((r) => (
              <PersonCard key={r.key} row={r} now={now} zone={zone} />
            ))}
          </View>
        ) : null}

        {work.length > 0 ? (
          <View style={{ gap: 12 }}>
            <SectionHeader
              dot={COLORS.primary}
              title="Work"
              badge={{ text: plural(work.length, 'update', 'updates'), bg: COLORS.primaryFixed, fg: COLORS.onPrimaryFixed }}
              right="Sync & Career"
            />
            {work.map((r) => (
              <Card key={r.key} style={[{ padding: 14, borderRadius: 12 }, SHADOW.cardSm]}>
                <View style={[ui.row, { justifyContent: 'space-between' }]}>
                  <View style={ui.row}>
                    <IconTile name="work" tint={appTint(r.package_name)} size={28} />
                    <T variant="bodyMd" weight="semibold">
                      {appName(r)}
                    </T>
                  </View>
                  <T variant="labelSm" color={COLORS.outline}>
                    {shortTime(r.posted_at_utc, now, zone)}
                  </T>
                </View>
                <T variant="bodySm" color={COLORS.onSurfaceVariant} style={{ marginTop: 8 }} numberOfLines={3}>
                  <T variant="bodySm" weight="medium">
                    {displayName(r)}
                  </T>
                  {r.text ? ` ${r.text}` : ''}
                </T>
                <View style={[ui.row, { marginTop: 8 }]}>
                  <ActionButton label={`Open ${appName(r)}`} compact onPress={() => openDetail(r)} />
                  <ActionButton label="Snooze" compact outlined onPress={() => comingSoon('Snooze')} />
                </View>
              </Card>
            ))}
          </View>
        ) : null}

        {shopping.length > 0 ? (
          <View style={{ gap: 12 }}>
            <SectionHeader
              dot={COLORS.secondary}
              title="Shopping & deliveries"
              badge={{ text: plural(shopping.length, 'event', 'events'), bg: COLORS.secondaryFixed, fg: COLORS.onSecondaryFixed }}
              right="From your apps"
            />
            {shopping.map((r) => (
              <Card key={r.key} style={[ui.row, { padding: 14, borderRadius: 12, gap: 12 }, SHADOW.cardSm]}>
                <IconTile name="local-shipping" tint={appTint(r.package_name)} />
                <View style={{ flex: 1, minWidth: 0 }}>
                  <View style={[ui.row, { justifyContent: 'space-between' }]}>
                    <T variant="bodyMd" weight="semibold" numberOfLines={1} style={{ flex: 1 }}>
                      {displayName(r)}
                    </T>
                    <T variant="labelSm" weight="semibold" color={COLORS.tertiary}>
                      {shortTime(r.posted_at_utc, now, zone)}
                    </T>
                  </View>
                  <T variant="bodySm" color={COLORS.onSurfaceVariant} numberOfLines={1}>
                    {r.text ?? appName(r)}
                  </T>
                </View>
                <Pressable style={[s.chevron, ui.center]} onPress={() => openDetail(r)}>
                  <Icon name="chevron-right" size={18} color={COLORS.onSurface} />
                </Pressable>
              </Card>
            ))}
          </View>
        ) : null}

        {quiet.length > 0 ? (
          <View style={s.noise}>
            <View style={[ui.row, { justifyContent: 'space-between' }]}>
              <View style={ui.row}>
                <View style={[s.noiseIcon, ui.center]}>
                  <Icon name="filter-list-off" size={15} color={COLORS.outline} />
                </View>
                <T variant="labelMd" weight="semibold" color={COLORS.onSurfaceVariant} style={{ letterSpacing: 0.8 }}>
                  COLLAPSED NOISE
                </T>
              </View>
              <View style={[ui.pill, { backgroundColor: COLORS.surfaceContainerHighest }]}>
                <T variant="labelSm" color={COLORS.onSurfaceVariant}>
                  {quiet.length} items quieted
                </T>
              </View>
            </View>
            <View style={[ui.row, { flexWrap: 'wrap' }]}>
              {perAppCounts(quiet).map((c, i) => (
                <View key={c.app} style={s.noisePill}>
                  <View style={[ui.dotSm, { backgroundColor: i === 0 ? COLORS.secondaryContainer : COLORS.outline }]} />
                  <T variant="labelSm" color={COLORS.onSurface}>
                    {c.count} {c.app}
                  </T>
                </View>
              ))}
            </View>
          </View>
        ) : null}

        {away.rows.length > 0 ? (
          <View style={{ gap: 10 }}>
            <ActionButton
              label={`Mark all ${quiet.length} noise as handled`}
              icon="check-circle"
              primary
              onPress={() => {
                const db = getDb();
                for (const r of quiet) setHandled(db, r.id, true, Date.now());
                void refreshWidgets();
              }}
              style={{ paddingVertical: 14 }}
            />
            <ActionButton label="Export to daily notes" icon="ios-share" onPress={() => comingSoon('Export')} style={{ paddingVertical: 14 }} />
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

function PersonCard({ row, now, zone }: { row: CaptureRow; now: number; zone: string }) {
  return (
    <Card style={[{ padding: 14, borderRadius: 12 }, SHADOW.cardSm]}>
      <View style={[ui.row, { justifyContent: 'space-between', alignItems: 'flex-start' }]}>
        <View style={[ui.row, { gap: 10, flex: 1 }]}>
          <Avatar name={displayName(row)} />
          <View style={{ flex: 1 }}>
            <View style={[ui.row, { gap: 6 }]}>
              <T variant="bodyMd" weight="semibold" numberOfLines={1} style={{ flexShrink: 1 }}>
                {displayName(row)}
              </T>
              <AppBadge packageName={row.package_name} label={appName(row)} />
            </View>
            <T variant="labelSm" color={COLORS.outline}>
              {shortTime(row.posted_at_utc, now, zone)}
            </T>
          </View>
        </View>
      </View>
      {row.text ? (
        <View style={s.bubble}>
          <T variant="bodyMd" color={COLORS.onSurfaceVariant} numberOfLines={4}>
            {row.text}
          </T>
        </View>
      ) : null}
      <View style={[ui.row, { marginTop: 10 }]}>
        <ActionButton label={`Reply via ${appName(row)}`} icon="reply" compact onPress={() => openDetail(row)} />
        <ActionButton label="Quick Reply" compact outlined onPress={() => openDetail(row)} />
      </View>
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
    paddingVertical: 14,
    backgroundColor: alpha(COLORS.surface, 0.9),
    ...SHADOW.cardSm,
  },
  back: { width: 36, height: 36, borderRadius: 18, backgroundColor: COLORS.surfaceContainerLow },
  iconBtn: { width: 36, height: 36, borderRadius: 18 },
  content: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 32, gap: 24 },
  sleepChip: {
    flexDirection: 'row',
    alignSelf: 'flex-start',
    maxWidth: '100%',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: COLORS.surfaceContainer,
  },
  onlineDot: {
    position: 'absolute',
    right: -4,
    bottom: -4,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: COLORS.tertiaryContainer,
    borderWidth: 2,
    borderColor: COLORS.surfaceContainerLowest,
    alignItems: 'center',
    justifyContent: 'center',
  },
  metrics: {
    marginTop: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: alpha(COLORS.outlineVariant, 0.2),
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    gap: 12,
  },
  banner: {
    marginTop: 14,
    borderRadius: 12,
    backgroundColor: COLORS.parchment,
    borderWidth: 1,
    borderColor: alpha(COLORS.outlineVariant, 0.3),
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  bannerIcon: { width: 32, height: 32, borderRadius: 16, backgroundColor: COLORS.primaryFixed },
  bubble: {
    marginTop: 10,
    backgroundColor: COLORS.parchment,
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: alpha(COLORS.outlineVariant, 0.2),
  },
  chevron: { width: 32, height: 32, borderRadius: 16, backgroundColor: COLORS.surfaceContainer },
  noise: {
    borderRadius: 16,
    backgroundColor: COLORS.surfaceContainerLow,
    borderWidth: 1,
    borderColor: alpha(COLORS.outlineVariant, 0.2),
    padding: 16,
    gap: 12,
  },
  noiseIcon: { width: 24, height: 24, borderRadius: 6, backgroundColor: alpha(COLORS.outline, 0.15) },
  noisePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: COLORS.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: alpha(COLORS.outlineVariant, 0.3),
  },
});
