import { Text, type TextProps } from 'react-native';

import { COLORS, FONTS, TYPE, type TypeVariant } from './theme';

type Weight = 'regular' | 'medium' | 'semibold' | 'bold';

const SANS_BY_WEIGHT: Record<Weight, string> = {
  regular: FONTS.sans400,
  medium: FONTS.sans500,
  semibold: FONTS.sans600,
  bold: FONTS.sans700,
};
const MONO_BY_WEIGHT: Record<Weight, string> = {
  regular: FONTS.mono500,
  medium: FONTS.mono500,
  semibold: FONTS.mono600,
  bold: FONTS.mono600,
};

type Props = TextProps & { variant?: TypeVariant; weight?: Weight; color?: string; italic?: boolean; upper?: boolean };

export function T({ variant = 'bodyMd', weight, color = COLORS.onSurface, italic, upper, style, children, ...rest }: Props) {
  const base = TYPE[variant];
  const isMono = base.fontFamily.startsWith('JetBrains');
  const fontFamily = weight ? (isMono ? MONO_BY_WEIGHT : SANS_BY_WEIGHT)[weight] : base.fontFamily;
  return (
    <Text
      {...rest}
      style={[
        base,
        { fontFamily, color, fontStyle: italic ? 'italic' : 'normal', textTransform: upper ? 'uppercase' : 'none' },
        style,
      ]}
    >
      {children}
    </Text>
  );
}
