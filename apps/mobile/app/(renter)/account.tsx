import React, { useState, useEffect } from 'react'
import {
  ActivityIndicator, Alert, ScrollView,
  StyleSheet, Text, TouchableOpacity, View,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { colors, radius, spacing, typography } from '@/constants/theme'
import { useAuthStore } from '@/store/authStore'
import { supabase } from '@/lib/supabase'
import { formatDate } from '@/lib/format'
import { log } from '@/lib/logger'

interface ActiveSub {
  plan:     string
  end_date: string
}

const PLAN_LABEL: Record<string, string> = {
  monthly:   'Monthly Pro',
  quarterly: 'Quarterly Pro',
  yearly:    'Annual Pro',
}

function Avatar({ name }: { name: string }) {
  const initials = name
    .split(' ')
    .map(w => w[0]?.toUpperCase() ?? '')
    .slice(0, 2)
    .join('')
  return (
    <View style={styles.avatar}>
      <Text style={styles.avatarText}>{initials}</Text>
    </View>
  )
}

interface MenuItemProps {
  icon:    keyof typeof Ionicons.glyphMap
  label:   string
  value?:  string
  danger?: boolean
  onPress: () => void
}

function MenuItem({ icon, label, value, danger, onPress }: MenuItemProps) {
  return (
    <TouchableOpacity style={styles.menuItem} onPress={onPress} activeOpacity={0.7}>
      <View style={[styles.menuIcon, danger && styles.menuIconDanger]}>
        <Ionicons name={icon} size={18} color={danger ? colors.error : colors.textSecondary} />
      </View>
      <Text style={[styles.menuLabel, danger && styles.menuLabelDanger]}>{label}</Text>
      {value ? (
        <Text style={styles.menuValue}>{value}</Text>
      ) : (
        !danger && <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
      )}
    </TouchableOpacity>
  )
}

export default function AccountScreen() {
  const insets = useSafeAreaInsets()
  const { profile, signOut } = useAuthStore()
  const [sub,     setSub]     = useState<ActiveSub | null>(null)
  const [subLoading, setSubLoading] = useState(true)
  const [signingOut, setSigningOut] = useState(false)

  useEffect(() => {
    const loadSub = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setSubLoading(false); return }
      const { data } = await supabase
        .from('subscriptions')
        .select('plan, end_date')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .gte('end_date', new Date().toISOString().split('T')[0])
        .order('end_date', { ascending: false })
        .limit(1)
        .maybeSingle()
      setSub(data as ActiveSub | null)
      setSubLoading(false)
    }
    loadSub()
  }, [])

  const handleSignOut = () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            setSigningOut(true)
            log.auth.info('User signing out')
            await signOut()
          },
        },
      ],
    )
  }

  if (!profile) return null

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + spacing.md, paddingBottom: insets.bottom + spacing.xl }]}
      showsVerticalScrollIndicator={false}
    >
      {/* Profile card */}
      <View style={styles.profileCard}>
        <Avatar name={profile.name ?? 'U'} />
        <View style={styles.profileInfo}>
          <View style={styles.nameRow}>
            <Text style={styles.name}>{profile.name}</Text>
            {profile.is_verified && (
              <Ionicons name="checkmark-circle" size={16} color={colors.primary} />
            )}
          </View>
          {profile.phone && (
            <Text style={styles.phone}>{profile.phone}</Text>
          )}
          {profile.email && (
            <Text style={styles.email} numberOfLines={1}>{profile.email}</Text>
          )}
        </View>
      </View>

      {/* Subscription badge */}
      {!subLoading && (
        <View style={[styles.subCard, sub ? styles.subCardActive : styles.subCardInactive]}>
          <View style={styles.subLeft}>
            <Ionicons
              name={sub ? 'star' : 'star-outline'}
              size={20}
              color={sub ? '#F59E0B' : colors.textMuted}
            />
            <View>
              <Text style={[styles.subTitle, !sub && styles.subTitleMuted]}>
                {sub ? PLAN_LABEL[sub.plan] ?? 'Pro Plan' : 'Free Plan'}
              </Text>
              {sub && (
                <Text style={styles.subExpiry}>Expires {formatDate(sub.end_date)}</Text>
              )}
            </View>
          </View>
          {!sub && (
            <View style={styles.upgradeBadge}>
              <Text style={styles.upgradeText}>Upgrade</Text>
            </View>
          )}
        </View>
      )}

      {/* Account menu */}
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>Account</Text>
        <View style={styles.menuCard}>
          <MenuItem icon="person-outline"       label="Edit Profile"      onPress={() => {}} />
          <View style={styles.divider} />
          <MenuItem icon="chatbubble-outline"   label="My Inquiries"      onPress={() => {}} />
          <View style={styles.divider} />
          <MenuItem icon="notifications-outline" label="Notifications"    onPress={() => {}} />
        </View>
      </View>

      {/* Support menu */}
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>Support</Text>
        <View style={styles.menuCard}>
          <MenuItem icon="help-circle-outline"  label="Help & Support"    onPress={() => {}} />
          <View style={styles.divider} />
          <MenuItem icon="star-outline"         label="Rate RentEasy"     onPress={() => {}} />
          <View style={styles.divider} />
          <MenuItem icon="information-circle-outline" label="About"
            value="v1.0.0"
            onPress={() => {}}
          />
        </View>
      </View>

      {/* Sign out */}
      <View style={styles.section}>
        <View style={styles.menuCard}>
          <MenuItem
            icon="log-out-outline"
            label={signingOut ? 'Signing out…' : 'Sign Out'}
            danger
            onPress={handleSignOut}
          />
        </View>
      </View>

      {/* Member since */}
      <Text style={styles.memberSince}>
        Member since {formatDate(profile.created_at)}
      </Text>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  screen:  { flex: 1, backgroundColor: colors.background },
  content: { paddingHorizontal: spacing.lg },

  // Profile card
  profileCard: {
    flexDirection:   'row',
    alignItems:      'center',
    backgroundColor: colors.card,
    borderRadius:    radius.xl,
    padding:         spacing.lg,
    borderWidth:     1,
    borderColor:     colors.border,
    gap:             spacing.md,
    marginBottom:    spacing.md,
  },
  avatar: {
    width:           64,
    height:          64,
    borderRadius:    radius.full,
    backgroundColor: colors.primaryLight,
    borderWidth:     2,
    borderColor:     colors.primary,
    alignItems:      'center',
    justifyContent:  'center',
  },
  avatarText:    { ...typography.h3, color: colors.primary },
  profileInfo:   { flex: 1, gap: 3 },
  nameRow:       { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  name:          { ...typography.bodyMedium, fontWeight: '700' },
  phone:         { ...typography.bodySmall, color: colors.textSecondary },
  email:         { ...typography.caption, color: colors.textMuted },

  // Subscription card
  subCard: {
    flexDirection:   'row',
    alignItems:      'center',
    justifyContent:  'space-between',
    borderRadius:    radius.xl,
    padding:         spacing.md,
    borderWidth:     1,
    marginBottom:    spacing.md,
  },
  subCardActive:   { backgroundColor: 'rgba(245, 158, 11, 0.08)', borderColor: 'rgba(245, 158, 11, 0.3)' },
  subCardInactive: { backgroundColor: colors.card, borderColor: colors.border },
  subLeft:       { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  subTitle:      { ...typography.bodySmall, fontWeight: '600', color: colors.text },
  subTitleMuted: { color: colors.textSecondary },
  subExpiry:     { ...typography.caption, color: colors.textMuted, marginTop: 2 },
  upgradeBadge:  {
    backgroundColor: colors.primary,
    borderRadius:    radius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: 5,
  },
  upgradeText:   { ...typography.caption, color: colors.white, fontWeight: '700' },

  // Sections
  section:       { marginBottom: spacing.md },
  sectionLabel:  {
    ...typography.label,
    color:         colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom:  spacing.sm,
    marginLeft:    spacing.xs,
  },
  menuCard: {
    backgroundColor: colors.card,
    borderRadius:    radius.xl,
    borderWidth:     1,
    borderColor:     colors.border,
    overflow:        'hidden',
  },
  menuItem: {
    flexDirection:   'row',
    alignItems:      'center',
    paddingHorizontal: spacing.md,
    paddingVertical:   spacing.md,
    gap:             spacing.md,
  },
  menuIcon: {
    width:           36,
    height:          36,
    borderRadius:    radius.md,
    backgroundColor: colors.surface,
    alignItems:      'center',
    justifyContent:  'center',
  },
  menuIconDanger: { backgroundColor: colors.errorLight },
  menuLabel:      { ...typography.body, fontSize: 15, flex: 1 },
  menuLabelDanger:{ color: colors.error },
  menuValue:      { ...typography.caption, color: colors.textMuted },
  divider:        { height: 1, backgroundColor: colors.border, marginLeft: 68 },

  memberSince: {
    ...typography.caption,
    color:     colors.textMuted,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
})
