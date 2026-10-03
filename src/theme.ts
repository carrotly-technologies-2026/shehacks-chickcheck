import { TextStyle } from 'react-native';

/** Tokens taken from the Figma file "HackYeah 2026" (frames iPhone 16 - 1..3 and the variables page). */
export const colors = {
  top: '#A98972',
  bottom: '#89604D',
  white: '#FFFFFF',
  w80: 'rgba(255,255,255,0.80)',
  w64: 'rgba(255,255,255,0.64)',
  w40: 'rgba(255,255,255,0.40)',
  w24: 'rgba(255,255,255,0.24)',
  w14: 'rgba(255,255,255,0.14)',
  w08: 'rgba(255,255,255,0.08)',
  // accents borrowed from the moodboard (blush rings, awareness pink)
  blush: '#F7CFD8',
  rose: '#EE9DB2',
  roseDeep: '#D7708F',
  ink: '#3D2519',
  sage: '#BFE3C9',
  amber: '#F4CB8E',
  // illustration
  skinHi: '#F6E7DD',
  skinLo: '#E5C5B2',
  skinLine: '#C4927C',
  hair: '#5E3B2C',
  hairDark: '#3E261C',
};

export const gradient = [colors.top, colors.bottom] as const;

export const fonts = {
  light: 'Inter_300Light',
  regular: 'Inter_400Regular',
  medium: 'Inter_500Medium',
  semibold: 'Inter_600SemiBold',
  bold: 'Inter_700Bold',
  button: 'HostGrotesk_500Medium',
};

/** Type scale. `display`, `title`, `body` and `button` are the exact Figma text styles. */
export const type = {
  display: { fontFamily: fonts.bold, fontSize: 32, lineHeight: 48, letterSpacing: -0.352, color: colors.white },
  title: { fontFamily: fonts.medium, fontSize: 16, lineHeight: 24, letterSpacing: -0.176, color: colors.white },
  body: { fontFamily: fonts.light, fontSize: 14, lineHeight: 21, letterSpacing: -0.154, color: colors.white },
  button: { fontFamily: fonts.button, fontSize: 16, lineHeight: 24, color: colors.white },
  lead: { fontFamily: fonts.medium, fontSize: 18, lineHeight: 26, letterSpacing: -0.2, color: colors.white },
  numeral: { fontFamily: fonts.semibold, fontSize: 60, lineHeight: 72, letterSpacing: -2, color: colors.white },
  caption: { fontFamily: fonts.regular, fontSize: 12, lineHeight: 16, color: colors.w64 },
  overline: { fontFamily: fonts.medium, fontSize: 11, lineHeight: 14, letterSpacing: 2, textTransform: 'uppercase', color: colors.w64 },
} satisfies Record<string, TextStyle>;

/** Horizontal margin used by the Figma frames (327px text column in a 393px frame). */
export const GUTTER = 33;
export const PHONE_W = 393;
export const PHONE_H = 852;
