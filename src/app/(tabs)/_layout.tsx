import { Redirect } from 'expo-router';
import { TabList, TabSlot, TabTrigger, Tabs, type TabTriggerSlotProps } from 'expo-router/ui';
import { forwardRef } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { usePermissionGranted } from '../../capture/use-permission';
import { Icon, type IconName } from '../../ui/components';
import { T } from '../../ui/text';
import { COLORS, SHADOW, alpha } from '../../ui/theme';

type TabButtonProps = TabTriggerSlotProps & { icon: IconName; label: string };

const TabButton = forwardRef<View, TabButtonProps>(function TabButton({ icon, label, isFocused, ...props }, ref) {
  const fg = isFocused ? COLORS.onPrimaryFixed : COLORS.onSurfaceVariant;
  return (
    <Pressable
      ref={ref}
      {...props}
      style={({ pressed }) => [
        styles.tab,
        isFocused && styles.tabActive,
        { transform: [{ scale: pressed ? 0.95 : 1 }] },
      ]}
    >
      <Icon name={icon} size={22} color={fg} />
      <T variant="labelSm" weight={isFocused ? 'semibold' : undefined} color={fg} style={{ marginTop: 2 }}>
        {label}
      </T>
    </Pressable>
  );
});

export default function TabsLayout() {
  const granted = usePermissionGranted();
  const insets = useSafeAreaInsets();
  if (!granted) return <Redirect href="/onboarding" />;

  return (
    <Tabs style={{ flex: 1, backgroundColor: COLORS.surface }}>
      <TabSlot />
      <TabList style={[styles.bar, SHADOW.nav, { paddingBottom: 12 + insets.bottom }]}>
        <TabTrigger name="today" href="/" asChild>
          <TabButton icon="spa" label="Today" />
        </TabTrigger>
        <TabTrigger name="briefing" href="/briefing" asChild>
          <TabButton icon="chrome-reader-mode" label="Briefing" />
        </TabTrigger>
        <TabTrigger name="ask" href="/ask" asChild>
          <TabButton icon="smart-toy" label="Ask Pulse" />
        </TabTrigger>
        <TabTrigger name="apps" href="/apps" asChild>
          <TabButton icon="dashboard-customize" label="Apps" />
        </TabTrigger>
      </TabList>
    </Tabs>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingTop: 8,
    paddingHorizontal: 16,
    backgroundColor: alpha(COLORS.surfaceContainerLowest, 0.97),
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
  },
  tab: { alignItems: 'center', justifyContent: 'center', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999 },
  tabActive: { backgroundColor: COLORS.primaryFixed, paddingHorizontal: 16 },
});
