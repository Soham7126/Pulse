import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, Share, StyleSheet, TextInput, ToastAndroid, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { NotificationListener } from '../../../modules/notification-listener';
import { aiConfigured, aiEnabled, aiErrorMessage, callProxy } from '../../ai/client';
import { MAX_HISTORY, isDraftResponse, type DraftResponse } from '../../ai/contract';
import { localStamp, toAiItem } from '../../ai/payload';
import { getDb } from '../../db/db';
import { getCapture, listThread, setHandled, type CaptureRow } from '../../db/queries';
import { shortTime } from '../../time/format';
import { CatRoom } from '../../ui/cat-room';
import { ActionButton, AppBadge, Icon, comingSoon, styles as ui } from '../../ui/components';
import { appName, deviceZone, displayName, intentLabel } from '../../ui/pulse-data';
import { T } from '../../ui/text';
import { COLORS, FONTS, SHADOW, alpha } from '../../ui/theme';
import { useNow } from '../../ui/use-live';
import { refreshWidgets } from '../../widget/update';

type Ai =
  | { state: 'off' }
  | { state: 'loading' }
  | { state: 'error'; error: string }
  | { state: 'done'; data: DraftResponse };

export default function NotificationDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const now = useNow();
  const zone = deviceZone();
  const db = getDb();
  const row = getCapture(db, Number(id));
  const thread = row ? listThread(db, row, MAX_HISTORY) : [];

  const [ai, setAi] = useState<Ai>({ state: aiEnabled() && aiConfigured() ? 'loading' : 'off' });
  const [variant, setVariant] = useState(0);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);

  const interpret = useCallback(
    async (v: number) => {
      if (!row || !aiEnabled() || !aiConfigured()) return setAi({ state: 'off' });
      setAi({ state: 'loading' });
      try {
        const data = await callProxy(
          '/draft',
          { item: toAiItem(row, zone), history: thread.map((r) => toAiItem(r, zone)), variant: v, now: localStamp(Date.now(), zone) },
          isDraftResponse,
        );
        setAi({ state: 'done', data });
        setDraft(data.draft ?? '');
      } catch (e) {
        setAi({ state: 'error', error: aiErrorMessage(e) });
      }
    },
    // Only re-run for a different notification; `thread`/`zone` are derived from it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [row?.id],
  );

  useEffect(() => {
    void interpret(0);
  }, [interpret]);

  if (!row) {
    return (
      <SafeAreaView style={[s.screen, ui.center]}>
        <T variant="bodyMd">This notification is no longer stored.</T>
        <ActionButton label="Back" onPress={() => router.back()} style={{ marginTop: 12 }} />
      </SafeAreaView>
    );
  }

  const handled = row.status === 'handled';
  const canReply = row.intent === 'communication' || (!row.intent && row.package_name === 'com.whatsapp');

  const markHandled = (value: boolean) => {
    setHandled(getDb(), row.id, value, Date.now());
    void refreshWidgets(false);
  };

  const reply = async () => {
    const text = draft.trim();
    if (!text) return;
    setSending(true);
    const result = await NotificationListener.reply(row.key, text);
    setSending(false);
    if (result === 'sent') {
      markHandled(true);
      ToastAndroid.show(`Sent via ${appName(row)}`, ToastAndroid.SHORT);
      router.back();
      return;
    }
    // The inline-reply action only exists while the source app's notification is showing.
    Alert.alert(
      "Couldn't reply from Pulse",
      result === 'gone'
        ? `The ${appName(row)} notification was already opened or dismissed, so Pulse can't reply to it directly.`
        : `${appName(row)} doesn't offer a quick reply for this notification.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Share draft', onPress: () => void Share.share({ message: text }) },
      ],
    );
  };

  const high = row.priority === 'high';

  return (
    <SafeAreaView style={s.screen} edges={['top']}>
      <View style={s.header}>
        <Pressable style={[s.back, ui.center]} onPress={() => router.back()}>
          <Icon name="arrow-back" color={COLORS.onSurface} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <View style={[ui.row, { gap: 6 }]}>
            <AppBadge packageName={row.package_name} label={appName(row)} />
            <T variant="labelSm" color={COLORS.outline} numberOfLines={1} style={{ flexShrink: 1 }}>
              {shortTime(row.posted_at_utc, now, zone)}
              {intentLabel(row) ? ` · ${intentLabel(row)}` : ''}
            </T>
          </View>
          <T variant="headlineSm" numberOfLines={1} style={{ marginTop: 2 }}>
            {displayName(row)}
          </T>
        </View>
        {handled ? (
          <View style={[s.priority, { backgroundColor: COLORS.tertiaryFixed }]}>
            <Icon name="check" size={14} color={COLORS.onTertiaryFixedVariant} />
            <T variant="labelSm" color={COLORS.onTertiaryFixedVariant}>
              Handled
            </T>
          </View>
        ) : row.priority ? (
          <View style={[s.priority, { backgroundColor: high ? COLORS.secondaryContainer : COLORS.surfaceContainer }]}>
            {high ? <Icon name="priority-high" size={14} color={COLORS.onSecondaryFixed} /> : null}
            <T variant="labelSm" color={high ? COLORS.onSecondaryFixed : COLORS.onSurfaceVariant}>
              {row.priority.charAt(0).toUpperCase() + row.priority.slice(1)} Priority
            </T>
          </View>
        ) : null}
      </View>

      <ScrollView contentContainerStyle={s.content}>
        <View style={[s.panel, ui.row, { gap: 12 }]}>
          <CatRoom pose={handled ? 'sleep_curled' : 'awake_sit'} size={52} radius={26} />
          <View style={{ flex: 1 }}>
            <View style={[ui.row, { gap: 6 }]}>
              <View style={[ui.dotSm, { backgroundColor: handled ? COLORS.tertiary : COLORS.secondary }]} />
              <T variant="labelSm" color={handled ? COLORS.tertiary : COLORS.secondary}>
                Cat state: {handled ? 'sleep_curled' : 'awake_sit'}
              </T>
            </View>
            <T variant="bodySm" style={{ marginTop: 2 }}>
              {handled
                ? 'Handled. The cat can rest on this one.'
                : high
                  ? 'Mascot is watching this thread. Something urgent is waiting.'
                  : 'Mascot is keeping an eye on this.'}
            </T>
          </View>
          <View style={[s.paw, ui.center]}>
            <Icon name="pets" size={18} color={COLORS.onSurface} />
          </View>
        </View>

        <View style={[s.panel, s.original]}>
          <View style={[ui.row, { justifyContent: 'space-between' }]}>
            <View style={[ui.row, { gap: 6 }]}>
              <Icon name="terminal" size={16} color={COLORS.onSurface} />
              <T variant="labelSm" weight="semibold">
                ORIGINAL NOTIFICATION
              </T>
            </View>
            <T variant="labelSm" color={COLORS.outline} numberOfLines={1} style={{ flexShrink: 1, marginLeft: 8 }}>
              {row.package_name}
            </T>
          </View>
          <T variant="labelMd">Sender: {displayName(row)}</T>
          <View style={s.originalBubble}>
            <T variant="labelLg" style={{ lineHeight: 20 }}>
              {row.text ? `"${row.text}"` : '(no text)'}
            </T>
          </View>
          <View style={[ui.row, { justifyContent: 'space-between' }]}>
            <T variant="labelSm" color={COLORS.outline}>
              Received: {localStamp(row.posted_at_utc, zone)}
            </T>
            <T variant="labelSm" color={COLORS.outline}>
              {row.text?.length ?? 0} chars · redacted
            </T>
          </View>
        </View>

        <View style={[s.panel, s.aiPanel]}>
          <View style={[ui.row, { justifyContent: 'space-between' }]}>
            <View style={[ui.row, { gap: 8, flex: 1 }]}>
              <View style={[s.sparkle, ui.center]}>
                <Icon name="auto-awesome" size={16} color={COLORS.onPrimaryFixed} />
              </View>
              <T variant="labelSm" weight="semibold" color={COLORS.primary}>
                PULSE AI{'\n'}INTERPRETATION
              </T>
            </View>
            {ai.state === 'done' && row.action_required ? (
              <View style={[ui.pill, { backgroundColor: COLORS.tertiaryFixed }]}>
                <T variant="labelSm" color={COLORS.onTertiaryFixedVariant}>
                  Action Required
                </T>
              </View>
            ) : null}
          </View>

          {ai.state === 'off' ? (
            <View style={{ gap: 10 }}>
              <T variant="bodySm" color={COLORS.onSurfaceVariant}>
                Turn on Pulse AI to get an interpretation and a suggested reply for this message.
              </T>
              <ActionButton label="Open Ask Pulse" icon="smart-toy" compact onPress={() => router.push('/ask')} />
            </View>
          ) : ai.state === 'loading' ? (
            <View style={[ui.row, { gap: 12 }]}>
              <CatRoom pose="awake_sit" size={44} radius={10} />
              <T variant="bodySm" color={COLORS.onSurfaceVariant}>
                Reading the message…
              </T>
            </View>
          ) : ai.state === 'error' ? (
            <View style={{ gap: 10 }}>
              <T variant="bodySm">{ai.error}</T>
              <ActionButton label="Try again" icon="refresh" compact onPress={() => void interpret(variant)} />
            </View>
          ) : (
            <>
              <View style={s.summary}>
                <T variant="bodyLg">{ai.data.summary}</T>
              </View>
              <View style={[ui.row, { alignItems: 'stretch' }]}>
                <View style={s.tile}>
                  <View style={[ui.row, { gap: 6 }]}>
                    <Icon name="psychology" size={14} color={COLORS.onSurfaceVariant} />
                    <T variant="labelSm" color={COLORS.onSurfaceVariant}>
                      DETECTED INTENT
                    </T>
                  </View>
                  <T variant="bodyMd">{ai.data.intent_label}</T>
                </View>
                <View style={s.tile}>
                  <View style={[ui.row, { gap: 6 }]}>
                    <Icon name="timer" size={14} color={COLORS.secondary} />
                    <T variant="labelSm" color={COLORS.secondary}>
                      URGENCY LEVEL
                    </T>
                  </View>
                  <T variant="bodyMd" color={COLORS.secondary}>
                    {ai.data.urgency_label}
                  </T>
                </View>
              </View>
              {ai.data.draft !== null ? (
                <View style={s.draftBox}>
                  <View style={[ui.row, { justifyContent: 'space-between' }]}>
                    <View style={[ui.row, { gap: 6 }]}>
                      <Icon name="edit-note" size={14} color={COLORS.onSurfaceVariant} />
                      <T variant="labelSm" color={COLORS.onSurfaceVariant}>
                        SUGGESTED QUICK DRAFT
                      </T>
                    </View>
                    <Pressable
                      accessibilityLabel="Write a different draft"
                      hitSlop={10}
                      onPress={() => {
                        const next = variant + 1;
                        setVariant(next);
                        void interpret(next);
                      }}
                    >
                      <Icon name="refresh" size={18} color={COLORS.onSurfaceVariant} />
                    </Pressable>
                  </View>
                  <TextInput value={draft} onChangeText={setDraft} multiline style={s.draftInput} maxLength={600} />
                </View>
              ) : null}
              <View style={s.aiFoot}>
                <View style={[ui.row, { gap: 4 }]}>
                  <Icon name="verified-user" size={14} color={COLORS.onSurfaceVariant} />
                  <T variant="labelSm" color={COLORS.onSurfaceVariant}>
                    {Math.round(ai.data.confidence * 100)}% confident
                  </T>
                </View>
                <T variant="labelSm" color={COLORS.outline}>
                  GPT-4o via Pulse proxy
                </T>
              </View>
            </>
          )}
        </View>

        <T variant="labelSm" color={COLORS.onSurfaceVariant} style={{ letterSpacing: 1, marginTop: 4 }}>
          AVAILABLE ACTIONS
        </T>
        {canReply ? (
          <ActionButton
            label={sending ? 'Sending…' : `Reply via ${appName(row)}`}
            icon="send"
            primary
            onPress={() => void reply()}
            style={[s.bigBtn, { opacity: draft.trim() && !sending ? 1 : 0.5 }]}
          />
        ) : null}
        <View style={ui.row}>
          <ActionButton
            label={handled ? 'Restore' : 'Mark Handled'}
            icon={handled ? 'undo' : 'check-circle'}
            onPress={() => {
              markHandled(!handled);
              if (!handled) router.back();
            }}
            style={[s.bigBtn, { flex: 1 }]}
          />
          <ActionButton label="Add to Reminders" icon="add-task" outlined onPress={() => comingSoon('Reminders')} style={[s.bigBtn, { flex: 1 }]} />
        </View>
        <Pressable onPress={() => comingSoon('Snooze')} style={[ui.row, { alignSelf: 'center', gap: 6, paddingVertical: 8 }]}>
          <Icon name="alarm" size={16} color={COLORS.onSurfaceVariant} />
          <T variant="labelMd" color={COLORS.onSurfaceVariant}>
            Snooze 1 hour
          </T>
        </Pressable>

        <View style={[s.panel, { gap: 14 }]}>
          <View style={[ui.row, { justifyContent: 'space-between' }]}>
            <View style={[ui.row, { gap: 6 }]}>
              <Icon name="history" size={16} color={COLORS.onSurface} />
              <T variant="bodyMd" weight="semibold">
                Context Timeline
              </T>
            </View>
            <T variant="labelSm" color={COLORS.outline}>
              Pulse Memory
            </T>
          </View>
          {[...thread].reverse().map((r) => (
            <TimelineItem key={r.id} row={r} now={now} zone={zone} />
          ))}
          <TimelineItem row={row} now={now} zone={zone} current />
        </View>

        <View style={[ui.row, { gap: 6, marginTop: 4 }]}>
          <Icon name="bedtime" size={14} color={COLORS.onSurfaceVariant} />
          <T variant="labelSm" color={COLORS.onSurfaceVariant}>
            Handling this notification lets the cat sleep
          </T>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function TimelineItem({ row, now, zone, current }: { row: CaptureRow; now: number; zone: string; current?: boolean }) {
  const tint = current ? COLORS.secondary : COLORS.outlineVariant;
  return (
    <View style={[ui.row, { alignItems: 'flex-start', gap: 12 }]}>
      <View style={[s.timelineDot, { borderColor: tint, backgroundColor: current ? alpha(COLORS.secondary, 0.25) : COLORS.surfaceContainerHigh }]} />
      <View style={{ flex: 1, gap: 6 }}>
        <T variant="labelSm" color={current ? COLORS.secondary : COLORS.onSurfaceVariant}>
          {shortTime(row.posted_at_utc, now, zone)}
          {current ? ' (Current)' : ''} • {appName(row)}
        </T>
        <View style={[s.timelineBubble, current && { backgroundColor: alpha(COLORS.secondaryContainer, 0.35), borderColor: alpha(COLORS.secondary, 0.3) }]}>
          <T variant="bodySm" color={current ? COLORS.secondary : COLORS.onSurface} numberOfLines={3}>
            <T variant="bodySm" weight="semibold" color={current ? COLORS.secondary : COLORS.onSurface}>
              {displayName(row)}:
            </T>{' '}
            “{row.text ?? ''}”
          </T>
        </View>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.surface },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: alpha(COLORS.surface, 0.95),
    ...SHADOW.cardSm,
  },
  back: { width: 36, height: 36, borderRadius: 18 },
  priority: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999 },
  content: { padding: 16, paddingBottom: 40, gap: 14 },
  panel: {
    backgroundColor: COLORS.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: alpha(COLORS.outlineVariant, 0.4),
    padding: 14,
  },
  paw: { width: 32, height: 32, borderRadius: 16, backgroundColor: COLORS.surfaceContainer },
  original: { backgroundColor: COLORS.surfaceContainerLow, gap: 10 },
  originalBubble: {
    backgroundColor: COLORS.surfaceContainerLowest,
    borderRadius: 20,
    padding: 14,
    borderWidth: 1,
    borderColor: alpha(COLORS.outlineVariant, 0.3),
  },
  aiPanel: { gap: 14, padding: 16 },
  sparkle: { width: 28, height: 28, borderRadius: 14, backgroundColor: COLORS.primaryFixed },
  summary: {
    backgroundColor: COLORS.surfaceContainerLow,
    borderRadius: 24,
    padding: 16,
    borderWidth: 1,
    borderColor: alpha(COLORS.outlineVariant, 0.3),
  },
  tile: {
    flex: 1,
    gap: 6,
    borderRadius: 20,
    padding: 14,
    borderWidth: 1,
    borderColor: alpha(COLORS.outlineVariant, 0.5),
    backgroundColor: COLORS.surfaceContainerLowest,
  },
  draftBox: {
    gap: 6,
    borderRadius: 20,
    padding: 14,
    borderWidth: 1,
    borderColor: alpha(COLORS.outlineVariant, 0.5),
    backgroundColor: COLORS.surfaceContainerLow,
  },
  draftInput: {
    fontFamily: FONTS.sans400,
    fontStyle: 'italic',
    fontSize: 15,
    lineHeight: 22,
    color: COLORS.onSurface,
    padding: 0,
    textAlignVertical: 'top',
  },
  aiFoot: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: alpha(COLORS.outlineVariant, 0.4),
  },
  bigBtn: { paddingVertical: 14 },
  timelineDot: { width: 14, height: 14, borderRadius: 7, borderWidth: 2, marginTop: 2 },
  timelineBubble: {
    backgroundColor: COLORS.surfaceContainerLow,
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: alpha(COLORS.outlineVariant, 0.3),
  },
});
