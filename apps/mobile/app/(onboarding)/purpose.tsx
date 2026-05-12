import React, { useState } from 'react'
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native'
import { useRouter } from 'expo-router'
import { LinearGradient } from 'expo-linear-gradient'
import { Ionicons } from '@expo/vector-icons'
import { SafeScreen } from '@/components/ui/SafeScreen'
import { Button } from '@/components/ui/Button'
import { colors, spacing, typography, radius } from '@/constants/theme'
import { updateProfile } from '@/lib/supabase'
import { useAuthStore } from '@/store/authStore'
import { toast } from '@/store/toastStore'
import { log } from '@/lib/logger'

type Role = 'renter' | 'owner'

interface RoleOption {
  value: Role
  icon: keyof typeof Ionicons.glyphMap
  title: string
  subtitle: string
  description: string
  gradient: [string, string]
}

const ROLE_OPTIONS: RoleOption[] = [
  {
    value: 'renter',
    icon: 'search',
    title: "I'm looking for a place",
    subtitle: 'Renter',
    description: 'Browse rooms, flats, PGs, hostels & more across India',
    gradient: ['rgba(249,115,22,0.18)', 'rgba(249,115,22,0.04)'],
  },
  {
    value: 'owner',
    icon: 'key',
    title: 'I own a property',
    subtitle: 'Owner',
    description: 'List your property and connect with verified tenants',
    gradient: ['rgba(99,102,241,0.18)', 'rgba(99,102,241,0.04)'],
  },
]

export default function PurposeScreen() {
  const router = useRouter()
  const { user, setProfile, refreshProfile } = useAuthStore()
  const [selected, setSelected] = useState<Role | null>(null)
  const [loading, setLoading] = useState(false)

  const handleContinue = async () => {
    if (!selected || !user) return
    setLoading(true)

    log.auth.info('Setting user role', { userId: user.id, role: selected })

    const { error } = await updateProfile(user.id, { role: selected })

    if (error) {
      log.auth.error('Failed to set role', error)
      toast.error('Could not save your choice. Please try again.')
      setLoading(false)
      return
    }

    toast.success(selected === 'owner' ? 'Welcome, Owner! 🏠' : 'Welcome! Start exploring. 🔍')

    await refreshProfile()
    setLoading(false)
    log.nav.info('Role set — navigating to home', { role: selected })

    if (selected === 'owner') {
      router.replace('/(owner)/dashboard')
    } else {
      router.replace('/(renter)/home')
    }
  }

  return (
    <SafeScreen contentStyle={styles.screen}>
      {/* Top header */}
      <View style={styles.header}>
        <View style={styles.stepDot} />
        <View style={styles.stepDot} />
        <View style={[styles.stepDot, styles.stepDotActive]} />
      </View>

      <View style={styles.content}>
        <Text style={styles.eyebrow}>Almost there!</Text>
        <Text style={styles.title}>How will you use{'\n'}RentEasy?</Text>
        <Text style={styles.subtitle}>
          Choose your primary role. You can always switch later.
        </Text>

        {/* Role cards */}
        <View style={styles.cards}>
          {ROLE_OPTIONS.map(option => {
            const isSelected = selected === option.value
            return (
              <TouchableOpacity
                key={option.value}
                activeOpacity={0.8}
                onPress={() => {
                  setSelected(option.value)
                  log.ui.debug('Role card selected', { role: option.value })
                }}
              >
                <LinearGradient
                  colors={isSelected ? option.gradient : ['transparent', 'transparent']}
                  style={[
                    styles.card,
                    isSelected && styles.cardSelected,
                  ]}
                >
                  {/* Check badge */}
                  {isSelected && (
                    <View style={styles.checkBadge}>
                      <Ionicons name="checkmark" size={14} color={colors.white} />
                    </View>
                  )}

                  {/* Icon */}
                  <View style={[
                    styles.iconCircle,
                    isSelected && styles.iconCircleActive,
                  ]}>
                    <Ionicons
                      name={option.icon}
                      size={28}
                      color={isSelected ? colors.primary : colors.textSecondary}
                    />
                  </View>

                  {/* Text */}
                  <View style={styles.cardText}>
                    <View style={styles.cardTitleRow}>
                      <Text style={[
                        styles.cardTitle,
                        isSelected && styles.cardTitleActive,
                      ]}>
                        {option.title}
                      </Text>
                      <View style={[
                        styles.badge,
                        isSelected && styles.badgeActive,
                      ]}>
                        <Text style={[
                          styles.badgeText,
                          isSelected && styles.badgeTextActive,
                        ]}>
                          {option.subtitle}
                        </Text>
                      </View>
                    </View>
                    <Text style={styles.cardDesc}>{option.description}</Text>
                  </View>
                </LinearGradient>
              </TouchableOpacity>
            )
          })}
        </View>
      </View>

      {/* CTA */}
      <View style={styles.footer}>
        <Button
          title="Get Started"
          onPress={handleContinue}
          loading={loading}
          disabled={!selected}
        />
        <Text style={styles.hint}>
          Your choice doesn't limit you — you can explore both sides anytime
        </Text>
      </View>
    </SafeScreen>
  )
}

const styles = StyleSheet.create({
  screen: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xl,
  },
  header: {
    flexDirection: 'row',
    gap: spacing.xs,
    justifyContent: 'center',
    marginBottom: spacing.xl,
  },
  stepDot: {
    width: 8,
    height: 8,
    borderRadius: radius.full,
    backgroundColor: colors.border,
  },
  stepDotActive: {
    backgroundColor: colors.primary,
    width: 24,
  },
  content: { flex: 1 },
  eyebrow: {
    ...typography.label,
    color: colors.primary,
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    marginBottom: spacing.sm,
  },
  title: {
    ...typography.h1,
    marginBottom: spacing.sm,
  },
  subtitle: {
    ...typography.bodySmall,
    marginBottom: spacing.xl,
    lineHeight: 22,
  },
  cards: { gap: spacing.md },
  card: {
    borderRadius: radius.xl,
    borderWidth: 1.5,
    borderColor: colors.border,
    padding: spacing.lg,
    position: 'relative',
    overflow: 'hidden',
  },
  cardSelected: {
    borderColor: colors.primary,
  },
  checkBadge: {
    position: 'absolute',
    top: spacing.md,
    right: spacing.md,
    width: 24,
    height: 24,
    borderRadius: radius.full,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconCircle: {
    width: 56,
    height: 56,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  iconCircleActive: {
    backgroundColor: colors.primaryLight,
  },
  cardText: { gap: spacing.xs },
  cardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  cardTitle: {
    ...typography.bodyMedium,
    fontWeight: '600',
    flex: 1,
  },
  cardTitleActive: { color: colors.text },
  badge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.full,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  badgeActive: {
    backgroundColor: colors.primaryLight,
    borderColor: 'rgba(249,115,22,0.4)',
  },
  badgeText: {
    ...typography.caption,
    color: colors.textMuted,
    fontWeight: '600',
  },
  badgeTextActive: { color: colors.primary },
  cardDesc: {
    ...typography.bodySmall,
    lineHeight: 20,
  },
  footer: { gap: spacing.md },
  hint: {
    ...typography.caption,
    textAlign: 'center',
    lineHeight: 18,
  },
})
