// Tokens copied from the Stitch design system "Pulse Ambient Notification Center" (docs/design/stitch/*.html).
export const COLORS = {
  surface: '#FBF8FC',
  surfaceContainerLowest: '#FFFFFF',
  surfaceContainerLow: '#F5F3F6',
  surfaceContainer: '#F0EDF1',
  surfaceContainerHigh: '#EAE7EB',
  surfaceContainerHighest: '#E4E2E5',
  surfaceVariant: '#E4E2E5',
  parchment: '#FAF7F2',
  onSurface: '#1B1B1E',
  onSurfaceVariant: '#4E453D',
  outline: '#7F756B',
  outlineVariant: '#D1C4B9',
  inverseSurface: '#303033',
  primary: '#705A3E',
  primaryContainer: '#8A7255',
  onPrimaryContainer: '#FFFFFF',
  primaryFixed: '#FCDEBB',
  onPrimaryFixed: '#281804',
  secondary: '#8B4D46',
  secondaryFixed: '#FFDAD5',
  onSecondaryFixed: '#380C09',
  secondaryContainer: '#FFB0A6',
  onSecondaryContainer: '#7A4039',
  tertiary: '#39674B',
  tertiaryContainer: '#528063',
  tertiaryFixed: '#BCEECB',
  onTertiaryFixedVariant: '#224F36',
  // Scene (locked theme: plain wall + wooden floor).
  wall: '#F5EFE6',
  floor: '#D5C3A5',
  floorPlank: '#BFA985',
} as const;

/** Hex + alpha -> rgba(), for Tailwind-style "/30" opacities in the design. */
export function alpha(hex: string, a: number): string {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${a})`;
}

export const FONTS = {
  sans400: 'PlusJakartaSans_400Regular',
  sans500: 'PlusJakartaSans_500Medium',
  sans600: 'PlusJakartaSans_600SemiBold',
  sans700: 'PlusJakartaSans_700Bold',
  mono500: 'JetBrainsMono_500Medium',
  mono600: 'JetBrainsMono_600SemiBold',
} as const;

// Android picks a font file per weight, so each variant names its exact family instead of using fontWeight.
export const TYPE = {
  displayLgMobile: { fontFamily: FONTS.sans700, fontSize: 32, lineHeight: 38, letterSpacing: -0.64 },
  headlineLg: { fontFamily: FONTS.sans700, fontSize: 28, lineHeight: 34, letterSpacing: -0.42 },
  headlineMd: { fontFamily: FONTS.sans600, fontSize: 22, lineHeight: 28, letterSpacing: -0.22 },
  headlineSm: { fontFamily: FONTS.sans600, fontSize: 18, lineHeight: 24 },
  bodyLg: { fontFamily: FONTS.sans400, fontSize: 16, lineHeight: 24 },
  bodyMd: { fontFamily: FONTS.sans400, fontSize: 14, lineHeight: 20 },
  bodySm: { fontFamily: FONTS.sans400, fontSize: 13, lineHeight: 18 },
  labelLg: { fontFamily: FONTS.mono500, fontSize: 13, lineHeight: 16, letterSpacing: -0.13 },
  labelMd: { fontFamily: FONTS.mono500, fontSize: 11, lineHeight: 14, letterSpacing: 0.22 },
  labelSm: { fontFamily: FONTS.mono500, fontSize: 10, lineHeight: 12, letterSpacing: 0.4 },
} as const;

export type TypeVariant = keyof typeof TYPE;

export const SHADOW = {
  card: { boxShadow: '0 4px 16px -2px rgba(90, 75, 60, 0.05), 0 2px 6px -1px rgba(90, 75, 60, 0.03)' },
  cardSm: { boxShadow: '0 2px 8px -1px rgba(90, 75, 60, 0.04)' },
  floating: { boxShadow: '0 10px 24px -4px rgba(90, 75, 60, 0.08), 0 4px 8px -2px rgba(90, 75, 60, 0.04)' },
  nav: { boxShadow: '0 -4px 16px -2px rgba(90, 75, 60, 0.06)' },
} as const;

export const SPACE = { xs: 4, sm: 8, md: 14, lg: 20, xl: 28, margin: 20, gutter: 16 } as const;
