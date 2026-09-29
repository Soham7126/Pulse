import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import type { ComponentProps, ReactNode } from 'react';
import { Pressable, StyleSheet, ToastAndroid, View, type StyleProp, type ViewStyle } from 'react-native';

import { T } from './text';
import { COLORS, SHADOW, alpha } from './theme';

export type IconName = ComponentProps<typeof MaterialIcons>['name'];

export function Icon({ name, size = 20, color = COLORS.onSurfaceVariant }: { name: IconName; size?: number; color?: string }) {
  return <MaterialIcons name={name} size={size} color={color} />;
}

/** Actions whose feature is not built yet. Honest feedback instead of a fake result. */
export function comingSoon(what: string): void {
  ToastAndroid.show(`${what} is coming in a later update`, ToastAndroid.SHORT);
}

export function Card({ children, style, accent }: { children: ReactNode; style?: StyleProp<ViewStyle>; accent?: string }) {
  return (
    <View
      style={[
        styles.card,
        SHADOW.card,
        accent ? { borderLeftWidth: 4, borderLeftColor: accent } : null,
        style,
      ]}
    >
      {children}
    </View>
  );
}

export function SectionHeader({
  dot,
  title,
  badge,
  right,
}: {
  dot: string;
  title: string;
  badge?: { text: string; bg: string; fg: string };
  right?: string;
}) {
  return (
    <View style={styles.sectionHeader}>
      <View style={styles.row}>
        <View style={[styles.dot, { backgroundColor: dot }]} />
        <T variant="labelMd" weight="semibold" color={COLORS.onSurfaceVariant} upper style={{ letterSpacing: 1.2 }}>
          {title}
        </T>
        {badge ? (
          <View style={[styles.pill, { backgroundColor: badge.bg }]}>
            <T variant="labelSm" color={badge.fg}>
              {badge.text}
            </T>
          </View>
        ) : null}
      </View>
      {right ? (
        <T variant="labelSm" color={COLORS.outline}>
          {right}
        </T>
      ) : null}
    </View>
  );
}

export function Pill({ text, bg, fg, icon, dot }: { text: string; bg: string; fg: string; icon?: IconName; dot?: string }) {
  return (
    <View style={[styles.pill, { backgroundColor: bg }]}>
      {dot ? <View style={[styles.dotSm, { backgroundColor: dot }]} /> : null}
      {icon ? <Icon name={icon} size={13} color={fg} /> : null}
      <T variant="labelSm" color={fg}>
        {text}
      </T>
    </View>
  );
}

export function ActionButton({
  label,
  icon,
  primary,
  onPress,
  compact,
  outlined,
  style,
}: {
  label: string;
  icon?: IconName;
  primary?: boolean;
  onPress: () => void;
  compact?: boolean;
  outlined?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const fg = primary ? COLORS.onPrimaryContainer : outlined ? COLORS.outline : COLORS.onSurfaceVariant;
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        compact ? styles.btnCompact : styles.btn,
        {
          backgroundColor: primary ? COLORS.primaryContainer : outlined ? 'transparent' : COLORS.surfaceVariant,
          borderWidth: outlined ? 1 : 0,
          borderColor: alpha(COLORS.outlineVariant, 0.5),
          transform: [{ scale: pressed ? 0.95 : 1 }],
        },
        style,
      ]}
    >
      {icon ? <Icon name={icon} size={compact ? 15 : 16} color={fg} /> : null}
      <T variant={compact ? 'labelSm' : 'bodyMd'} weight={primary ? 'medium' : undefined} color={fg}>
        {label}
      </T>
    </Pressable>
  );
}

const AVATAR_TONES = [
  { bg: COLORS.primaryFixed, fg: COLORS.onPrimaryFixed },
  { bg: COLORS.secondaryFixed, fg: COLORS.onSecondaryFixed },
  { bg: COLORS.tertiaryFixed, fg: COLORS.onTertiaryFixedVariant },
];

export function Avatar({ name, size = 36 }: { name: string; size?: number }) {
  const tone = AVATAR_TONES[(name.charCodeAt(0) || 0) % AVATAR_TONES.length];
  return (
    <View style={[styles.center, { width: size, height: size, borderRadius: size / 2, backgroundColor: tone.bg }]}>
      <T variant="headlineSm" color={tone.fg}>
        {name.trim().charAt(0).toUpperCase() || '?'}
      </T>
    </View>
  );
}

// Brand tints the design uses for source badges (e.g. WhatsApp green on 10% green).
const APP_TINTS: Record<string, string> = {
  'com.whatsapp': '#128C7E',
  'com.google.android.gm': '#EA4335',
  'com.linkedin.android': '#0077B5',
  'com.instagram.android': '#C13584',
  'com.google.android.apps.messaging': '#1A73E8',
  'in.amazon.mShop.android.shopping': '#D47000',
  'com.amazon.mShop.android.shopping': '#D47000',
  'com.flipkart.android': '#2874F0',
};

export function appTint(packageName: string): string {
  return APP_TINTS[packageName] ?? COLORS.onSurfaceVariant;
}

export function AppBadge({ packageName, label }: { packageName: string; label: string }) {
  const tint = appTint(packageName);
  return (
    <View style={[styles.appBadge, { backgroundColor: alpha(tint, 0.1) }]}>
      <T variant="labelSm" weight="medium" color={tint}>
        {label}
      </T>
    </View>
  );
}

export function IconTile({ name, tint, size = 40 }: { name: IconName; tint: string; size?: number }) {
  return (
    <View style={[styles.center, { width: size, height: size, borderRadius: 12, backgroundColor: alpha(tint, 0.12) }]}>
      <Icon name={name} size={size * 0.55} color={tint} />
    </View>
  );
}

export const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.surfaceContainerLowest,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: alpha(COLORS.outlineVariant, 0.2),
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  center: { alignItems: 'center', justifyContent: 'center' },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 4 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  dotSm: { width: 6, height: 6, borderRadius: 3 },
  pill: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 3, borderRadius: 999 },
  appBadge: { paddingHorizontal: 6, paddingVertical: 1, borderRadius: 4 },
  btn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 9, paddingHorizontal: 16, borderRadius: 999 },
  btnCompact: { flexDirection: 'row', alignItems: 'center', gap: 4, height: 32, paddingHorizontal: 12, borderRadius: 999 },
  quote: {
    marginTop: 12,
    backgroundColor: alpha(COLORS.surfaceContainerLow, 0.6),
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: alpha(COLORS.outlineVariant, 0.15),
  },
});
