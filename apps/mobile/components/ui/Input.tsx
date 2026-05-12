import React, { useState } from 'react'
import {
  StyleSheet,
  Text,
  TextInput,
  type TextInputProps,
  TouchableOpacity,
  View,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { colors, radius, spacing, typography } from '@/constants/theme'

interface InputProps extends TextInputProps {
  label?: string
  error?: string
  prefix?: React.ReactNode
  suffix?: React.ReactNode
  hint?: string
}

export function Input({
  label,
  error,
  prefix,
  suffix,
  hint,
  secureTextEntry,
  style,
  ...rest
}: InputProps) {
  const [focused, setFocused] = useState(false)
  const [hidden, setHidden] = useState(secureTextEntry ?? false)

  const borderColor = error
    ? colors.error
    : focused
    ? colors.borderFocus
    : colors.border

  return (
    <View style={styles.wrapper}>
      {label && <Text style={styles.label}>{label}</Text>}

      <View style={[styles.container, { borderColor }]}>
        {prefix && <View style={styles.adornment}>{prefix}</View>}

        <TextInput
          style={[styles.input, style]}
          placeholderTextColor={colors.textMuted}
          selectionColor={colors.primary}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          secureTextEntry={hidden}
          autoCapitalize="none"
          autoCorrect={false}
          {...rest}
        />

        {secureTextEntry ? (
          <TouchableOpacity
            style={styles.adornment}
            onPress={() => setHidden(h => !h)}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons
              name={hidden ? 'eye-off-outline' : 'eye-outline'}
              size={20}
              color={colors.textMuted}
            />
          </TouchableOpacity>
        ) : suffix ? (
          <View style={styles.adornment}>{suffix}</View>
        ) : null}
      </View>

      {error  && <Text style={styles.error}>{error}</Text>}
      {!error && hint && <Text style={styles.hint}>{hint}</Text>}
    </View>
  )
}

const styles = StyleSheet.create({
  wrapper: { gap: 6 },
  label: {
    ...typography.label,
    color: colors.textSecondary,
  },
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderRadius: radius.md,
    minHeight: 52,
    paddingHorizontal: spacing.md,
  },
  input: {
    flex: 1,
    ...typography.body,
    color: colors.text,
    paddingVertical: spacing.sm + 2,
  },
  adornment: {
    justifyContent: 'center',
    marginRight: spacing.xs,
  },
  error: {
    ...typography.caption,
    color: colors.error,
    marginTop: 2,
  },
  hint: {
    ...typography.caption,
    color: colors.textMuted,
    marginTop: 2,
  },
})
