import React, { useState, useEffect, useCallback } from 'react'
import {
  ActivityIndicator, RefreshControl, ScrollView,
  StyleSheet, Text, TouchableOpacity, View,
} from 'react-native'
import { useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { colors, radius, spacing, typography } from '@/constants/theme'
import { useAuthStore } from '@/store/authStore'
import { supabase } from '@/lib/supabase'
import { formatRent, timeAgo } from '@/lib/format'
import { log } from '@/lib/logger'

// ── Types ──────────────────────────────────────────────────────────────────────

interface Stats {
  total:     number
  active:    number
  pending:   number
  inquiries: number
}

interface RecentInquiry {
  id:              string
  contact_via:     string
  message:         string | null
  created_at:      string
  property_title:  string
  renter_name:     string
  renter_phone:    string | null
}

const VIA_LABEL: Record<string, { label: string; icon: keyof typeof Ionicons.glyphMap; color: string }> = {
  whatsapp: { label: 'WhatsApp', icon: 'logo-whatsapp',              color: '#25D366' },
  call:     { label: 'Call',     icon: 'call-outline',               color: colors.primary },
  chat:     { label: 'Message',  icon: 'chatbubble-ellipses-outline', color: '#6366f1' },
}

// ── Components ─────────────────────────────────────────────────────────────────

function StatCard({
  icon, label, value, color,
}: {
  icon: keyof typeof Ionicons.glyphMap
  label: string
  value: number | string
  color: string
}) {
  return (
    <View style={[styles.statCard, { borderColor: color + '33' }]}>
      <View style={[styles.statIcon, { backgroundColor: color + '18' }]}>
        <Ionicons name={icon} size={20} color={color} />
      </View>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  )
}

// ── Screen ─────────────────────────────────────────────────────────────────────

export default function OwnerDashboardScreen() {
  const router   = useRouter()
  const insets   = useSafeAreaInsets()
  const { profile } = useAuthStore()

  const [stats,      setStats]      = useState<Stats | null>(null)
  const [inquiries,  setInquiries]  = useState<RecentInquiry[]>([])
  const [loading,    setLoading]    = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const loadData = useCallback(async () => {
    log.api.info('Loading owner dashboard')
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setLoading(false); return }

    const [total, active, pending, inquiryCount, recentInquiries] = await Promise.all([
      supabase.from('properties')
        .select('id', { count: 'exact', head: true })
        .eq('owner_id', user.id),

      supabase.from('properties')
        .select('id', { count: 'exact', head: true })
        .eq('owner_id', user.id)
        .eq('is_approved', true)
        .eq('is_available', true),

      supabase.from('properties')
        .select('id', { count: 'exact', head: true })
        .eq('owner_id', user.id)
        .eq('is_approved', false)
        .is('rejection_reason', null),

      supabase.from('inquiries')
        .select('id', { count: 'exact', head: true })
        .eq('owner_id', user.id),

      supabase.from('inquiries')
        .select(`
          id, contact_via, message, created_at,
          property:properties!inquiries_property_id_fkey ( title ),
          renter:profiles!inquiries_renter_id_fkey ( name, phone )
        `)
        .eq('owner_id', user.id)
        .order('created_at', { ascending: false })
        .limit(8),
    ])

    setStats({
      total:     total.count  ?? 0,
      active:    active.count ?? 0,
      pending:   pending.count ?? 0,
      inquiries: inquiryCount.count ?? 0,
    })

    const rows = (recentInquiries.data ?? []) as unknown as Array<{
      id: string; contact_via: string; message: string | null; created_at: string
      property: { title: string } | null
      renter:   { name: string; phone: string | null } | null
    }>

    setInquiries(rows.map(r => ({
      id:             r.id,
      contact_via:    r.contact_via,
      message:        r.message,
      created_at:     r.created_at,
      property_title: r.property?.title ?? '—',
      renter_name:    r.renter?.name   ?? 'Unknown',
      renter_phone:   r.renter?.phone  ?? null,
    })))

    setLoading(false)
    log.api.info('Dashboard loaded')
  }, [])

  useEffect(() => { loadData() }, [loadData])

  const handleRefresh = async () => {
    setRefreshing(true)
    await loadData()
    setRefreshing(false)
  }

  const firstName = profile?.name?.split(' ')[0] ?? 'there'

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.content}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={colors.primary}
              colors={[colors.primary]}
            />
          }
        >
          {/* Header */}
          <View style={styles.header}>
            <View>
              <Text style={styles.greeting}>Hi, {firstName} 👋</Text>
              <Text style={styles.subGreeting}>Your listings at a glance</Text>
            </View>
            <TouchableOpacity
              style={styles.addBtn}
              onPress={() => router.push('/(owner)/add-listing' as never)}
              activeOpacity={0.85}
            >
              <Ionicons name="add" size={22} color={colors.white} />
            </TouchableOpacity>
          </View>

          {/* Stats grid */}
          {stats && (
            <View style={styles.statsGrid}>
              <StatCard icon="home"            label="Total"    value={stats.total}     color={colors.primary} />
              <StatCard icon="checkmark-circle" label="Active"  value={stats.active}    color={colors.success} />
              <StatCard icon="time"            label="Pending"  value={stats.pending}   color={colors.warning} />
              <StatCard icon="chatbubbles"     label="Inquiries" value={stats.inquiries} color="#6366f1" />
            </View>
          )}

          {/* Quick actions */}
          <View style={styles.quickActions}>
            <TouchableOpacity
              style={styles.quickBtn}
              onPress={() => router.push('/(owner)/add-listing' as never)}
              activeOpacity={0.8}
            >
              <View style={[styles.quickIcon, { backgroundColor: colors.primaryLight }]}>
                <Ionicons name="add-circle-outline" size={22} color={colors.primary} />
              </View>
              <Text style={styles.quickLabel}>Add Listing</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.quickBtn}
              onPress={() => router.push('/(owner)/listings' as never)}
              activeOpacity={0.8}
            >
              <View style={[styles.quickIcon, { backgroundColor: 'rgba(34,197,94,0.12)' }]}>
                <Ionicons name="list-outline" size={22} color={colors.success} />
              </View>
              <Text style={styles.quickLabel}>My Listings</Text>
            </TouchableOpacity>
          </View>

          {/* Recent inquiries */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Recent Inquiries</Text>

            {inquiries.length === 0 ? (
              <View style={styles.emptyCard}>
                <Ionicons name="chatbubble-outline" size={36} color={colors.border} />
                <Text style={styles.emptyText}>No inquiries yet</Text>
                <Text style={styles.emptyBody}>
                  Inquiries from renters will appear here
                </Text>
              </View>
            ) : (
              inquiries.map((inq, idx) => {
                const via = VIA_LABEL[inq.contact_via] ?? VIA_LABEL.chat
                return (
                  <View
                    key={inq.id}
                    style={[
                      styles.inquiryCard,
                      idx < inquiries.length - 1 && styles.inquiryCardBorder,
                    ]}
                  >
                    {/* Via icon */}
                    <View style={[styles.inquiryIcon, { backgroundColor: via.color + '18' }]}>
                      <Ionicons name={via.icon} size={18} color={via.color} />
                    </View>

                    {/* Info */}
                    <View style={styles.inquiryInfo}>
                      <Text style={styles.inquiryRenter}>{inq.renter_name}</Text>
                      <Text style={styles.inquiryProperty} numberOfLines={1}>
                        {inq.property_title}
                      </Text>
                      {inq.message ? (
                        <Text style={styles.inquiryMsg} numberOfLines={1}>
                          {inq.message}
                        </Text>
                      ) : (
                        <Text style={styles.inquiryVia}>
                          Contacted {via.label.toLowerCase()}
                        </Text>
                      )}
                    </View>

                    {/* Time */}
                    <Text style={styles.inquiryTime}>{timeAgo(inq.created_at)}</Text>
                  </View>
                )
              })
            )}
          </View>
        </ScrollView>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  screen:   { flex: 1, backgroundColor: colors.background },
  center:   { flex: 1, alignItems: 'center', justifyContent: 'center' },
  content:  { paddingHorizontal: spacing.lg, paddingBottom: spacing.xxl },

  // Header
  header: {
    flexDirection:   'row',
    alignItems:      'center',
    justifyContent:  'space-between',
    paddingTop:      spacing.md,
    paddingBottom:   spacing.lg,
  },
  greeting:    { ...typography.h3 },
  subGreeting: { ...typography.caption, color: colors.textMuted, marginTop: 2 },
  addBtn: {
    width:           44,
    height:          44,
    borderRadius:    radius.full,
    backgroundColor: colors.primary,
    alignItems:      'center',
    justifyContent:  'center',
  },

  // Stats
  statsGrid: {
    flexDirection: 'row',
    flexWrap:      'wrap',
    gap:           spacing.sm,
    marginBottom:  spacing.md,
  },
  statCard: {
    flex:            1,
    minWidth:        '45%',
    backgroundColor: colors.card,
    borderRadius:    radius.lg,
    borderWidth:     1,
    padding:         spacing.md,
    gap:             spacing.xs,
    alignItems:      'flex-start',
  },
  statIcon: {
    width:        36,
    height:       36,
    borderRadius: radius.md,
    alignItems:   'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  statValue: { ...typography.h2, lineHeight: 30 },
  statLabel: { ...typography.caption, color: colors.textMuted },

  // Quick actions
  quickActions: {
    flexDirection: 'row',
    gap:           spacing.sm,
    marginBottom:  spacing.lg,
  },
  quickBtn: {
    flex:            1,
    backgroundColor: colors.card,
    borderRadius:    radius.lg,
    borderWidth:     1,
    borderColor:     colors.border,
    padding:         spacing.md,
    alignItems:      'center',
    gap:             spacing.sm,
  },
  quickIcon: {
    width:           44,
    height:          44,
    borderRadius:    radius.full,
    alignItems:      'center',
    justifyContent:  'center',
  },
  quickLabel: { ...typography.caption, color: colors.textSecondary, fontWeight: '600' },

  // Recent inquiries
  section:      { marginBottom: spacing.lg },
  sectionTitle: { ...typography.bodyMedium, fontWeight: '700', marginBottom: spacing.md },

  emptyCard: {
    backgroundColor: colors.card,
    borderRadius:    radius.xl,
    borderWidth:     1,
    borderColor:     colors.border,
    padding:         spacing.xl,
    alignItems:      'center',
    gap:             spacing.xs,
  },
  emptyText: { ...typography.bodySmall, fontWeight: '600', color: colors.textSecondary, marginTop: spacing.sm },
  emptyBody: { ...typography.caption, color: colors.textMuted, textAlign: 'center' },

  inquiryCard: {
    flexDirection:     'row',
    alignItems:        'center',
    backgroundColor:   colors.card,
    borderRadius:      radius.lg,
    borderWidth:       1,
    borderColor:       colors.border,
    padding:           spacing.md,
    gap:               spacing.sm,
    marginBottom:      spacing.sm,
  },
  inquiryCardBorder: {},
  inquiryIcon: {
    width:           42,
    height:          42,
    borderRadius:    radius.full,
    alignItems:      'center',
    justifyContent:  'center',
    flexShrink:      0,
  },
  inquiryInfo:     { flex: 1, gap: 2 },
  inquiryRenter:   { ...typography.bodySmall, fontWeight: '600', color: colors.text },
  inquiryProperty: { ...typography.caption, color: colors.primary },
  inquiryMsg:      { ...typography.caption, color: colors.textMuted, fontStyle: 'italic' },
  inquiryVia:      { ...typography.caption, color: colors.textMuted },
  inquiryTime:     { ...typography.caption, color: colors.textMuted, flexShrink: 0 },
})
