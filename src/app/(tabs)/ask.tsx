import { router } from 'expo-router';
import { useRef, useState } from 'react';
import { KeyboardAvoidingView, Pressable, ScrollView, Share, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { aiActive, aiConfigured, aiErrorMessage, callProxy } from '../../ai/client';
import { MAX_ASK_ITEMS, MAX_QUESTION, isAskResponse, type AskResponse } from '../../ai/contract';
import { localStamp, toAiItem } from '../../ai/payload';
import { unlockPulseAi } from '../../ai/unlock';
import { MEMORY_DAYS } from '../../config/constants';
import type { CaptureRow } from '../../db/queries';
import { shortTime } from '../../time/format';
import { CatRoom } from '../../ui/cat-room';
import { Card, Icon, styles as ui, type IconName } from '../../ui/components';
import { appName, deviceZone, displayName, readMemory, readMemoryRows } from '../../ui/pulse-data';
import { T } from '../../ui/text';
import { COLORS, FONTS, SHADOW, alpha } from '../../ui/theme';
import { useNow } from '../../ui/use-live';

const SUGGESTIONS: { icon: IconName; tint: string; text: string }[] = [
  { icon: 'task-alt', tint: COLORS.secondary, text: 'Did anyone ask me to do something?' },
  { icon: 'local-shipping', tint: COLORS.primary, text: 'What deliveries am I expecting?' },
  { icon: 'work-outline', tint: COLORS.tertiary, text: 'Did I get any job-related messages?' },
  { icon: 'bedtime', tint: COLORS.primaryContainer, text: 'What happened while I was sleeping?' },
];

type Turn = {
  id: number;
  question: string;
  askedAt: number;
  state: 'loading' | 'done' | 'error';
  answer?: AskResponse;
  sources?: CaptureRow[];
  error?: string;
};

const CONFIDENCE_TEXT: Record<AskResponse['confidence'], string> = {
  high: 'High Confidence',
  medium: 'Medium Confidence',
  low: 'Low Confidence',
};

export default function Ask() {
  const now = useNow();
  const zone = deviceZone();
  const memory = readMemory(now);
  const [question, setQuestion] = useState('');
  const [turns, setTurns] = useState<Turn[]>([]);
  const scroll = useRef<ScrollView>(null);

  const ask = async (text: string) => {
    const q = text.trim().slice(0, MAX_QUESTION);
    if (!q) return;
    // Free users: paywall first (the question is kept and answered right after the purchase).
    if (!aiActive() && !(await unlockPulseAi())) {
      setQuestion(q);
      return;
    }
    const id = Date.now();
    setQuestion('');
    setTurns((t) => [...t, { id, question: q, askedAt: id, state: 'loading' }]);
    requestAnimationFrame(() => scroll.current?.scrollToEnd({ animated: true }));

    const rows = readMemoryRows(Date.now()).slice(0, MAX_ASK_ITEMS);
    const byId = new Map(rows.map((r) => [String(r.id), r]));
    try {
      const answer = await callProxy(
        '/ask',
        { question: q, now: localStamp(Date.now(), zone), items: rows.map((r) => toAiItem(r, zone)) },
        isAskResponse,
      );
      const sources = answer.citation_ids.map((c) => byId.get(c)).filter((r): r is CaptureRow => Boolean(r));
      setTurns((t) => t.map((x) => (x.id === id ? { ...x, state: 'done', answer, sources } : x)));
    } catch (e) {
      setTurns((t) => t.map((x) => (x.id === id ? { ...x, state: 'error', error: aiErrorMessage(e) } : x)));
    }
    requestAnimationFrame(() => scroll.current?.scrollToEnd({ animated: true }));
  };

  // Read every render (the tick re-renders each second), so unlocking or switching Pulse AI applies immediately.
  const canAsk = aiActive() && aiConfigured();

  return (
    <SafeAreaView style={s.screen} edges={['top']}>
      <View style={s.header}>
        <View style={[ui.row, { gap: 8, flex: 1 }]}>
          <View style={{ padding: 6 }}>
            <Icon name="pets" size={22} color={COLORS.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <T variant="headlineSm">Ask Pulse</T>
            <T variant="labelMd" weight="medium" color={COLORS.onSurfaceVariant}>
              Search your personal notification memory
            </T>
          </View>
        </View>
        <Pressable style={[s.iconBtn, ui.center]} onPress={() => router.push('/apps')}>
          <Icon name="tune" />
        </Pressable>
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior="height">
        <ScrollView ref={scroll} contentContainerStyle={s.content} keyboardShouldPersistTaps="handled">
          <Card style={{ padding: 20, borderColor: alpha(COLORS.onSurface, 0.06) }}>
            <View style={[ui.row, { gap: 16 }]}>
              <View>
                <CatRoom pose={memory.count > 0 ? 'awake_sit' : 'sleep_curled'} size={80} borderColor={COLORS.primaryFixed} />
                <View style={[s.indexDot, { backgroundColor: canAsk ? COLORS.tertiaryContainer : COLORS.outlineVariant }]} />
              </View>
              <View style={s.bubble}>
                <View style={s.bubbleTail} />
                <View style={[ui.row, { gap: 6, marginBottom: 4 }]}>
                  <Icon name="chrome-reader-mode" size={14} color={COLORS.primary} />
                  <T variant="labelSm" weight="semibold" color={COLORS.primary}>
                    MEMORY STORE
                  </T>
                </View>
                <T variant="bodySm" style={{ lineHeight: 18 }}>
                  I remember{' '}
                  <T variant="bodySm" weight="semibold" color={COLORS.primary}>
                    {memory.count} {memory.count === 1 ? 'notification' : 'notifications'}
                  </T>{' '}
                  from the last {MEMORY_DAYS} days.{canAsk ? ' Ask me anything.' : ''}
                </T>
              </View>
            </View>
            <View style={s.memoryFooter}>
              <View style={[ui.row, { gap: 4, flex: 1 }]}>
                <Icon name="check-circle" size={12} color={COLORS.tertiary} />
                <T variant="labelSm" color={COLORS.onSurfaceVariant} numberOfLines={2} style={{ flex: 1 }}>
                  {memory.apps.length > 0 ? `${memory.apps.join(', ')} indexed` : 'Nothing indexed yet'}
                </T>
              </View>
              <T variant="labelSm" color={COLORS.outline}>
                Past {MEMORY_DAYS}d
              </T>
            </View>
          </Card>

          <View>
            <T variant="labelMd" weight="semibold" color={COLORS.onSurfaceVariant} upper style={{ letterSpacing: 1.2, marginBottom: 10, paddingHorizontal: 2 }}>
              Suggested memory queries
            </T>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingRight: 20 }}>
              {SUGGESTIONS.map((q) => (
                <Pressable
                  key={q.text}
                  onPress={() => void ask(q.text)}
                  style={({ pressed }) => [s.suggestion, SHADOW.cardSm, { transform: [{ scale: pressed ? 0.95 : 1 }] }]}
                >
                  <Icon name={q.icon} size={14} color={q.tint} />
                  <T variant="labelMd">{q.text}</T>
                </Pressable>
              ))}
            </ScrollView>
          </View>

          {turns.map((t) => (
            <View key={t.id} style={{ gap: 16 }}>
              <View style={s.userRow}>
                <View style={s.userBubble}>
                  <T variant="bodyMd" weight="medium" color="#FFFFFF">
                    {t.question}
                  </T>
                  <T variant="labelSm" color={alpha('#FFFFFF', 0.7)} style={{ textAlign: 'right', marginTop: 4 }}>
                    {shortTime(t.askedAt, now, zone)}
                  </T>
                </View>
                <View style={[s.you, ui.center]}>
                  <T variant="labelSm" weight="semibold" color={COLORS.onSecondaryFixed}>
                    You
                  </T>
                </View>
              </View>
              <AnswerCard turn={t} now={now} zone={zone} onRetry={() => ask(t.question)} />
            </View>
          ))}
        </ScrollView>

        <View style={[s.composer, SHADOW.floating]}>
          <Pressable style={[s.composerIcon, ui.center]} onPress={() => router.push('/apps')}>
            <Icon name="tune" size={20} />
          </Pressable>
          <TextInput
            value={question}
            onChangeText={setQuestion}
            placeholder="Ask about any notification, person or app"
            placeholderTextColor={COLORS.outline}
            style={s.input}
            returnKeyType="send"
            editable={aiConfigured()}
            maxLength={MAX_QUESTION}
            onSubmitEditing={() => ask(question)}
          />
          <Pressable
            style={[s.send, ui.center, { opacity: question.trim() ? 1 : 0.5 }]}
            disabled={!aiConfigured() || !question.trim()}
            onPress={() => ask(question)}
          >
            <Icon name="arrow-upward" size={20} color={COLORS.onPrimaryContainer} />
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function AnswerCard({ turn, now, zone, onRetry }: { turn: Turn; now: number; zone: string; onRetry: () => void }) {
  if (turn.state === 'loading') {
    return (
      <Card style={[ui.row, { gap: 12 }]}>
        <CatRoom pose="awake_sit" size={48} radius={10} />
        <T variant="bodySm" color={COLORS.onSurfaceVariant} style={{ flex: 1 }}>
          Looking through your notifications…
        </T>
      </Card>
    );
  }
  if (turn.state === 'error' || !turn.answer) {
    return (
      <Card style={{ gap: 10 }}>
        <T variant="bodyMd">{turn.error}</T>
        <Pressable onPress={onRetry} style={[ui.row, { gap: 4 }]}>
          <Icon name="refresh" size={16} color={COLORS.primary} />
          <T variant="labelMd" color={COLORS.primary}>
            Try again
          </T>
        </Pressable>
      </Card>
    );
  }
  const { answer, sources = [] } = turn;
  return (
    <View style={[s.answer, SHADOW.floating]}>
      <View style={s.answerHead}>
        <View style={[ui.row, { gap: 8, flex: 1 }]}>
          <View style={[s.botIcon, ui.center]}>
            <Icon name="smart-toy" size={14} color={COLORS.onPrimaryFixed} />
          </View>
          <T variant="labelSm" weight="semibold" color={COLORS.primary} style={{ flex: 1 }}>
            PULSE SYNTHESIS • {sources.length} {sources.length === 1 ? 'MATCH' : 'MATCHES'} FOUND
          </T>
        </View>
        <View style={[ui.pill, { backgroundColor: COLORS.surfaceContainer }]}>
          <View style={[ui.dotSm, { backgroundColor: answer.confidence === 'low' ? COLORS.secondary : COLORS.tertiary }]} />
          <T variant="labelSm" color={COLORS.onSurfaceVariant}>
            {CONFIDENCE_TEXT[answer.confidence]}
          </T>
        </View>
      </View>
      <T variant="bodyMd" style={{ lineHeight: 22 }}>
        {answer.answer}
      </T>
      {sources.length > 0 ? (
        <View style={{ gap: 10 }}>
          <View style={[ui.row, { justifyContent: 'space-between' }]}>
            <T variant="labelSm" color={COLORS.outline}>
              CITATIONS & VERIFIED SOURCES
            </T>
            <T variant="labelSm" color={COLORS.outline}>
              {sources.length} {sources.length === 1 ? 'Notification' : 'Notifications'}
            </T>
          </View>
          {sources.map((r) => (
            <Pressable
              key={r.id}
              onPress={() => router.push({ pathname: '/notification/[id]', params: { id: String(r.id) } })}
              style={s.source}
            >
              <View style={[s.sourceIcon, ui.center, { backgroundColor: r.intent === 'communication' ? COLORS.tertiaryFixed : COLORS.secondaryFixed }]}>
                <Icon name={r.intent === 'communication' ? 'chat' : 'notifications'} size={16} color={COLORS.onSurface} />
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <View style={[ui.row, { gap: 6, flexWrap: 'wrap' }]}>
                  <T variant="labelSm" weight="semibold">
                    {appName(r)}
                  </T>
                  <T variant="labelMd" numberOfLines={1} style={{ flexShrink: 1 }}>
                    {displayName(r)}
                  </T>
                  <T variant="labelSm" color={COLORS.outline}>
                    {shortTime(r.posted_at_utc, now, zone)}
                  </T>
                </View>
                {r.text ? (
                  <T variant="bodySm" color={COLORS.onSurfaceVariant} numberOfLines={1} style={{ marginTop: 2 }}>
                    “{r.text}”
                  </T>
                ) : null}
              </View>
              <View style={s.view}>
                <T variant="labelMd">View</T>
                <Icon name="arrow-forward" size={14} color={COLORS.onSurface} />
              </View>
            </Pressable>
          ))}
        </View>
      ) : null}
      <View style={s.answerFoot}>
        <Pressable onPress={() => Share.share({ message: answer.answer })} style={[ui.row, { gap: 6 }]}>
          <Icon name="content-copy" size={16} color={COLORS.outline} />
          <T variant="labelMd" color={COLORS.outline}>
            Copy
          </T>
        </Pressable>
      </View>
    </View>
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
  iconBtn: { width: 36, height: 36, borderRadius: 18 },
  content: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 24, gap: 20 },
  indexDot: {
    position: 'absolute',
    right: 4,
    bottom: 4,
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: COLORS.surfaceContainerLowest,
  },
  bubble: {
    flex: 1,
    backgroundColor: COLORS.surfaceContainerLow,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: alpha(COLORS.onSurface, 0.04),
  },
  bubbleTail: {
    position: 'absolute',
    left: -8,
    top: '50%',
    marginTop: -8,
    width: 0,
    height: 0,
    borderTopWidth: 8,
    borderBottomWidth: 8,
    borderRightWidth: 8,
    borderTopColor: 'transparent',
    borderBottomColor: 'transparent',
    borderRightColor: COLORS.surfaceContainerLow,
  },
  memoryFooter: {
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: alpha(COLORS.onSurface, 0.06),
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  suggestion: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: COLORS.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: alpha(COLORS.onSurface, 0.08),
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  userRow: { flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'flex-end', gap: 8 },
  userBubble: {
    backgroundColor: COLORS.primaryContainer,
    borderRadius: 16,
    borderTopRightRadius: 4,
    paddingHorizontal: 16,
    paddingVertical: 12,
    maxWidth: '85%',
  },
  you: { width: 32, height: 32, borderRadius: 16, backgroundColor: COLORS.secondaryFixed, marginBottom: 4 },
  answer: {
    backgroundColor: COLORS.surfaceContainerLowest,
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: alpha(COLORS.primary, 0.2),
    gap: 16,
  },
  answerHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: alpha(COLORS.onSurface, 0.06),
  },
  botIcon: { width: 24, height: 24, borderRadius: 12, backgroundColor: COLORS.primaryFixed },
  source: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: COLORS.surfaceContainerLow,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: alpha(COLORS.onSurface, 0.06),
  },
  sourceIcon: { width: 36, height: 36, borderRadius: 18 },
  view: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: alpha(COLORS.onSurface, 0.15),
    backgroundColor: COLORS.surfaceContainerLowest,
  },
  answerFoot: { paddingTop: 12, borderTopWidth: 1, borderTopColor: alpha(COLORS.onSurface, 0.06), flexDirection: 'row' },
  composer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginHorizontal: 16,
    marginBottom: 12,
    paddingLeft: 8,
    paddingRight: 6,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: COLORS.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: alpha(COLORS.onSurface, 0.08),
  },
  composerIcon: { width: 40, height: 40, borderRadius: 20 },
  input: { flex: 1, fontFamily: FONTS.sans400, fontSize: 15, color: COLORS.onSurface, paddingVertical: 8 },
  send: { width: 48, height: 48, borderRadius: 24, backgroundColor: COLORS.primaryContainer },
});
