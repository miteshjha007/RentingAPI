import React from 'react'
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  View,
  type ViewStyle,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { colors } from '@/constants/theme'

interface SafeScreenProps {
  children: React.ReactNode
  scroll?: boolean
  style?: ViewStyle
  contentStyle?: ViewStyle
  edges?: ('top' | 'bottom' | 'left' | 'right')[]
}

export function SafeScreen({
  children,
  scroll = false,
  style,
  contentStyle,
  edges = ['top', 'bottom'],
}: SafeScreenProps) {
  return (
    <SafeAreaView style={[styles.safe, style]} edges={edges}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        {scroll ? (
          <ScrollView
            style={styles.flex}
            contentContainerStyle={[styles.scrollContent, contentStyle]}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {children}
          </ScrollView>
        ) : (
          <View style={[styles.flex, contentStyle]}>{children}</View>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
  },
  flex: { flex: 1 },
  scrollContent: {
    flexGrow: 1,
  },
})
