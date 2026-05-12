import React, { useRef } from 'react'
import {
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native'
import { colors, radius, typography } from '@/constants/theme'

interface OtpInputProps {
  value: string
  onChange: (value: string) => void
  length?: number
  error?: boolean
}

export function OtpInput({ value, onChange, length = 6, error = false }: OtpInputProps) {
  const inputRef = useRef<TextInput>(null)

  const handleChange = (text: string) => {
    const cleaned = text.replace(/\D/g, '').slice(0, length)
    onChange(cleaned)
  }

  const digits = Array(length).fill('')
  value.split('').forEach((d, i) => { digits[i] = d })

  return (
    <TouchableOpacity
      activeOpacity={1}
      onPress={() => inputRef.current?.focus()}
      style={styles.wrapper}
    >
      {/* Hidden TextInput captures keyboard input */}
      <TextInput
        ref={inputRef}
        value={value}
        onChangeText={handleChange}
        keyboardType="number-pad"
        maxLength={length}
        autoFocus
        caretHidden
        style={styles.hiddenInput}
        importantForAccessibility="no"
      />

      {/* Visual boxes */}
      <View style={styles.boxes}>
        {digits.map((digit, index) => {
          const isActive = index === value.length && value.length < length
          const isFilled = index < value.length
          const borderColor = error
            ? colors.error
            : isActive
            ? colors.primary
            : isFilled
            ? colors.borderFocus
            : colors.border

          return (
            <View
              key={index}
              style={[
                styles.box,
                { borderColor },
                isActive && styles.boxActive,
              ]}
            >
              <Text style={[styles.digit, error && styles.digitError]}>
                {digit}
              </Text>
              {isActive && <View style={styles.cursor} />}
            </View>
          )
        })}
      </View>
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  wrapper: { alignItems: 'center' },
  hiddenInput: {
    position: 'absolute',
    width: 1,
    height: 1,
    opacity: 0,
  },
  boxes: {
    flexDirection: 'row',
    gap: 10,
  },
  box: {
    width: 48,
    height: 58,
    borderRadius: radius.md,
    borderWidth: 1.5,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  boxActive: {
    backgroundColor: colors.card,
  },
  digit: {
    ...typography.h3,
    color: colors.text,
    textAlign: 'center',
  },
  digitError: {
    color: colors.error,
  },
  // Animated cursor bar
  cursor: {
    position: 'absolute',
    bottom: 10,
    width: 20,
    height: 2,
    backgroundColor: colors.primary,
    borderRadius: 1,
  },
})
