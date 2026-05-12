import { Platform } from 'react-native'

export const colors = {
  // Backgrounds
  background:       '#0F0F0F',
  surface:          '#1A1A1A',
  card:             '#222226',
  // Borders
  border:           '#2C2C30',
  borderFocus:      '#F97316',
  // Brand
  primary:          '#F97316',   // orange-500
  primaryDark:      '#EA6C0A',
  primaryLight:     'rgba(249, 115, 22, 0.15)',
  // Text
  text:             '#F9F9F9',
  textSecondary:    '#A1A1AA',   // zinc-400
  textMuted:        '#52525B',   // zinc-600
  // States
  error:            '#EF4444',
  errorLight:       'rgba(239, 68, 68, 0.12)',
  success:          '#22C55E',
  successLight:     'rgba(34, 197, 94, 0.12)',
  warning:          '#F59E0B',
  // Misc
  overlay:          'rgba(0, 0, 0, 0.65)',
  white:            '#FFFFFF',
  black:            '#000000',
  transparent:      'transparent',
}

export const spacing = {
  xxs: 2,
  xs:  4,
  sm:  8,
  md:  16,
  lg:  24,
  xl:  32,
  xxl: 48,
  xxxl: 64,
}

export const radius = {
  xs:   4,
  sm:   8,
  md:   12,
  lg:   16,
  xl:   24,
  full: 999,
}

export const fontFamily = Platform.select({
  ios: {
    regular: 'System',
    medium:  'System',
    bold:    'System',
  },
  android: {
    regular: 'Roboto',
    medium:  'Roboto',
    bold:    'Roboto',
  },
  default: {
    regular: 'System',
    medium:  'System',
    bold:    'System',
  },
})!

export const typography = {
  h1: {
    fontSize: 32,
    fontWeight: '700' as const,
    color: colors.text,
    letterSpacing: -0.8,
    lineHeight: 40,
  },
  h2: {
    fontSize: 26,
    fontWeight: '700' as const,
    color: colors.text,
    letterSpacing: -0.5,
    lineHeight: 34,
  },
  h3: {
    fontSize: 20,
    fontWeight: '600' as const,
    color: colors.text,
    lineHeight: 28,
  },
  body: {
    fontSize: 16,
    fontWeight: '400' as const,
    color: colors.text,
    lineHeight: 24,
  },
  bodyMedium: {
    fontSize: 16,
    fontWeight: '500' as const,
    color: colors.text,
    lineHeight: 24,
  },
  bodySmall: {
    fontSize: 14,
    fontWeight: '400' as const,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  label: {
    fontSize: 13,
    fontWeight: '500' as const,
    color: colors.textSecondary,
    letterSpacing: 0.3,
    lineHeight: 18,
  },
  caption: {
    fontSize: 12,
    fontWeight: '400' as const,
    color: colors.textMuted,
    lineHeight: 16,
  },
}
