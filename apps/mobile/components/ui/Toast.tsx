import React, { useEffect, useRef } from 'react'
import { Animated, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { useToastStore, type Toast, type ToastType } from '@/store/toastStore'
import { colors, radius, spacing, typography } from '@/constants/theme'

// ── Per-type visual config ────────────────────────────────────────────────────

const CONFIG: Record<ToastType, {
  bg:     string
  border: string
  text:   string
  icon:   keyof typeof Ionicons.glyphMap
}> = {
  success: {
    bg:     'rgba(34, 197, 94, 0.12)',
    border: 'rgba(34, 197, 94, 0.35)',
    text:   '#4ade80',
    icon:   'checkmark-circle',
  },
  error: {
    bg:     'rgba(239, 68, 68, 0.12)',
    border: 'rgba(239, 68, 68, 0.35)',
    text:   '#f87171',
    icon:   'alert-circle',
  },
  warning: {
    bg:     'rgba(245, 158, 11, 0.12)',
    border: 'rgba(245, 158, 11, 0.35)',
    text:   '#fbbf24',
    icon:   'warning',
  },
  info: {
    bg:     'rgba(99, 102, 241, 0.12)',
    border: 'rgba(99, 102, 241, 0.35)',
    text:   '#818cf8',
    icon:   'information-circle',
  },
}

// ── Single animated toast item ────────────────────────────────────────────────

function ToastItem({ toast, onDismiss }: { toast: Toast; onDismiss: () => void }) {
  const translateY = useRef(new Animated.Value(-80)).current
  const opacity    = useRef(new Animated.Value(0)).current
  const cfg        = CONFIG[toast.type]

  useEffect(() => {
    // Slide in
    Animated.parallel([
      Animated.spring(translateY, {
        toValue: 0, damping: 18, stiffness: 200, useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 1, duration: 180, useNativeDriver: true,
      }),
    ]).start()

    // Auto-dismiss
    const timer = setTimeout(() => slideOut(), toast.duration)
    return () => clearTimeout(timer)
  }, [])

  const slideOut = () => {
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: -80, duration: 220, useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 0, duration: 200, useNativeDriver: true,
      }),
    ]).start(onDismiss)
  }

  return (
    <Animated.View style={{ transform: [{ translateY }], opacity }}>
      <View style={[styles.toast, { backgroundColor: cfg.bg, borderColor: cfg.border }]}>
        <Ionicons name={cfg.icon} size={20} color={cfg.text} style={styles.icon} />

        <Text style={[styles.message, { color: cfg.text }]} numberOfLines={3}>
          {toast.message}
        </Text>

        <TouchableOpacity
          onPress={slideOut}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="close" size={16} color={cfg.text} style={{ opacity: 0.7 }} />
        </TouchableOpacity>
      </View>
    </Animated.View>
  )
}

// ── Toast container — rendered at root level in _layout.tsx ──────────────────

export function ToastContainer() {
  const { queue, dismiss } = useToastStore()
  const insets             = useSafeAreaInsets()

  if (queue.length === 0) return null

  // Only show the first queued toast; rest wait their turn
  const current = queue[0]

  return (
    <View
      style={[
        styles.container,
        { top: insets.top + spacing.sm },
      ]}
      pointerEvents="box-none"
    >
      <ToastItem
        key={current.id}
        toast={current}
        onDismiss={() => dismiss(current.id)}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    position:  'absolute',
    left:      spacing.md,
    right:     spacing.md,
    zIndex:    9999,
    elevation: 9999,
  },
  toast: {
    flexDirection:  'row',
    alignItems:     'center',
    borderRadius:   radius.lg,
    borderWidth:    1,
    paddingVertical:   spacing.sm + 2,
    paddingHorizontal: spacing.md,
    gap:            spacing.sm,
    // Subtle shadow for depth
    shadowColor:   '#000',
    shadowOffset:  { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius:  8,
    elevation:     8,
  },
  icon: { flexShrink: 0 },
  message: {
    ...typography.bodySmall,
    flex:       1,
    fontWeight: '500',
    lineHeight: 20,
  },
})
