import React from 'react'
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  type TouchableOpacityProps,
  type ViewStyle,
} from 'react-native'
import { colors, radius, typography } from '@/constants/theme'

interface ButtonProps extends TouchableOpacityProps {
  title: string
  variant?: 'primary' | 'outline' | 'ghost'
  size?: 'sm' | 'md' | 'lg'
  loading?: boolean
  fullWidth?: boolean
  style?: ViewStyle
}

export function Button({
  title,
  variant = 'primary',
  size = 'md',
  loading = false,
  fullWidth = true,
  disabled,
  style,
  ...rest
}: ButtonProps) {
  const isDisabled = disabled || loading

  return (
    <TouchableOpacity
      activeOpacity={0.75}
      disabled={isDisabled}
      style={[
        styles.base,
        styles[variant],
        styles[`size_${size}`],
        fullWidth && styles.fullWidth,
        isDisabled && styles.disabled,
        style,
      ]}
      {...rest}
    >
      {loading ? (
        <ActivityIndicator
          size="small"
          color={variant === 'primary' ? colors.white : colors.primary}
        />
      ) : (
        <Text style={[styles.label, styles[`label_${variant}`], styles[`label_${size}`]]}>
          {title}
        </Text>
      )}
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.transparent,
  },
  fullWidth: { width: '100%' },

  // Variants
  primary: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  outline: {
    backgroundColor: colors.transparent,
    borderColor: colors.primary,
  },
  ghost: {
    backgroundColor: colors.transparent,
    borderColor: colors.transparent,
  },

  // Disabled
  disabled: { opacity: 0.45 },

  // Sizes
  size_sm: { height: 40, paddingHorizontal: 16 },
  size_md: { height: 52, paddingHorizontal: 20 },
  size_lg: { height: 58, paddingHorizontal: 24 },

  // Labels
  label: {
    ...typography.bodyMedium,
    fontWeight: '600',
  },
  label_primary: { color: colors.white },
  label_outline: { color: colors.primary },
  label_ghost:   { color: colors.primary },
  label_sm: { fontSize: 14 },
  label_md: { fontSize: 16 },
  label_lg: { fontSize: 17 },
})
