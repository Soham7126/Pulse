import { router } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { MEMORY_DAYS } from '../../config/constants';
import { CatRoom } from '../../ui/cat-room';
import { Card, Icon, comingSoon, styles as ui, type IconName } from '../../ui/components';
import { readMemory } from '../../ui/pulse-data';
import { T } from '../../ui/text';
import { COLORS, FONTS, SHADOW, alpha } from '../../ui/theme';
import { useNow } from '../../ui/use-live';

const SUGGESTIONS: { icon: IconName; tint: string; text: string }[] = [
  { icon: 'task-alt', tint: COLORS.secondary, text: 'Did anyone ask me to do something?' },
  { icon: 'local-shipping', tint: COLORS.primary, text: 'What deliveries am I expecting?' },
  { icon: 'work-outline', tint: COLORS.tertiary, text: 'Did I get any job-related messages?' },
  { icon: 'bedtime', tint: COLORS.primaryContainer, text: 'What happened while I was sleeping?' },
];

export default function Ask() {
  const now = useNow();
  const memory = readMemory(now);
  const [question, setQuestion] = useState('');

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
        <ScrollView contentContainerStyle={s.content} keyboardShouldPersistTaps="handled">
          <Card style={{ padding: 20, borderColor: alpha(COLORS.onSurface, 0.06) }}>
            <View style={[ui.row, { gap: 16 }]}>
              <View>
                <CatRoom pose={memory.count > 0 ? 'awake_sit' : 'sleep_curled'} size={80} borderColor={COLORS.primaryFixed} />
                <View style={s.indexDot} />
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
                  from the last {MEMORY_DAYS} days.
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
            <View style={[ui.row, { justifyContent: 'space-between', marginBottom: 10, paddingHorizontal: 2 }]}>
              <T variant="labelMd" weight="semibold" color={COLORS.onSurfaceVariant} upper style={{ letterSpacing: 1.2 }}>
                Suggested memory queries
              </T>
              <T variant="labelSm" color={COLORS.outline}>
                Semantic Search
              </T>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingRight: 20 }}>
              {SUGGESTIONS.map((q) => (
                <Pressable
                  key={q.text}
                  onPress={() => setQuestion(q.text)}
                  style={({ pressed }) => [s.suggestion, SHADOW.cardSm, { transform: [{ scale: pressed ? 0.95 : 1 }] }]}
                >
                  <Icon name={q.icon} size={14} color={q.tint} />
                  <T variant="labelMd">{q.text}</T>
                </Pressable>
              ))}
            </ScrollView>
          </View>

          <View style={s.hint}>
            <View style={[s.hintIcon, ui.center]}>
              <Icon name="smart-toy" size={16} color={COLORS.onPrimaryFixed} />
            </View>
            <T variant="bodySm" color={COLORS.onSurfaceVariant} style={{ flex: 1, lineHeight: 18 }}>
              Answers will come only from the notifications above, with sources you can tap. Ask Pulse switches on in a
              later update.
            </T>
          </View>
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
            onSubmitEditing={() => comingSoon('Ask Pulse')}
          />
          <Pressable style={[s.composerIcon, ui.center]} onPress={() => comingSoon('Voice questions')}>
            <Icon name="mic" size={20} />
          </Pressable>
          <Pressable style={[s.send, ui.center]} onPress={() => comingSoon('Ask Pulse')}>
            <Icon name="arrow-upward" size={20} color={COLORS.onPrimaryContainer} />
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
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
    backgroundColor: COLORS.tertiaryContainer,
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
  hint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: 16,
    backgroundColor: COLORS.parchment,
    borderWidth: 1,
    borderColor: alpha(COLORS.outlineVariant, 0.3),
  },
  hintIcon: { width: 28, height: 28, borderRadius: 14, backgroundColor: COLORS.primaryFixed },
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
