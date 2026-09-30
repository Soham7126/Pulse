import { JetBrainsMono_500Medium, JetBrainsMono_600SemiBold } from '@expo-google-fonts/jetbrains-mono';
import {
  PlusJakartaSans_400Regular,
  PlusJakartaSans_500Medium,
  PlusJakartaSans_600SemiBold,
  PlusJakartaSans_700Bold,
  useFonts,
} from '@expo-google-fonts/plus-jakarta-sans';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { AppState } from 'react-native';

import { classifyPending } from '../ai/classify';
import { LAST_SEEN_KEY } from '../config/constants';
import { getDb } from '../db/db';
import { setSetting } from '../db/queries';
import { COLORS } from '../ui/theme';
import { refreshWidgets } from '../widget/update';

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    PlusJakartaSans_400Regular,
    PlusJakartaSans_500Medium,
    PlusJakartaSans_600SemiBold,
    PlusJakartaSans_700Bold,
    JetBrainsMono_500Medium,
    JetBrainsMono_600SemiBold,
  });

  useEffect(() => {
    const catchUp = () => void classifyPending().then((n) => (n > 0 ? refreshWidgets(false) : undefined));
    catchUp();
    const sub = AppState.addEventListener('change', (state) => {
      // "While you were away" = everything since the app last went to the background.
      if (state === 'background') setSetting(getDb(), LAST_SEEN_KEY, String(Date.now()));
      // Classify anything captured while AI was off or the phone was offline.
      if (state === 'active') catchUp();
    });
    return () => sub.remove();
  }, []);

  if (!fontsLoaded) return null;

  return (
    <>
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: COLORS.surface } }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="onboarding" />
        <Stack.Screen name="notification/[id]" />
      </Stack>
    </>
  );
}
