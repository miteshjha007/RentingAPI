import React, { useState, useCallback, useEffect } from 'react'
import {
  ActivityIndicator, Alert, FlatList, Image,
  RefreshControl, StyleSheet, Switch, Text,
  TouchableOpacity, View,
} from 'react-native'
import { useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { colors, radius, spacing, typography } from '@/constants/theme'
import { supabase } from '@/lib/supabase'
import { formatRent, formatPropertyTitle } from '@/lib/format'
import { toast } from '@/store/toastStore'
import { log } from '@/lib/logger'

// ── Types ──────────────────────────────────────────────────────────────────────

interface OwnerListing {
  id:               string
  type:             string
  title:            string
  price:            number
  city:             string
  area:             string | null
  bhk_type:         string | null
  is_available:     boolean
  is_approved:      boolean
  rejection_reason: string | null
  cover_image:      string | null
  inquiry_count:    number
  media_count:      number
  created_at:       string
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function getStatus(listing: OwnerListing): {
  label: string; color: string; bg: string
} {
  if (listing.is_approved && listing.is_available)
    return { label: 'Active',          color: colors.success, bg: colors.successLight }
  if (listing.is_approved && !listing.is_available)
    return { label: 'Inactive',        color: colors.textMuted, bg: colors.surface }
  if (!listing.is_approved && listing.rejection_reason)
    return { label: 'Rejected',        color: colors.error,   bg: colors.errorLight }
  return   { label: 'Pending Review',  color: colors.warning, bg: 'rgba(245,158,11,0.12)' }
}

// ── Listing card ───────────────────────────────────────────────────────────────

interface ListingCardProps {
  item:           OwnerListing
  onToggle:       (id: string, val: boolean) => void
  onDelete:       (id: string, title: string) => void
  togglingId:     string | null
}

function ListingCard({ item, onToggle, onDelete, togglingId }: ListingCardProps) {
  const status  = getStatus(item)
  const toggling = togglingId === item.id

  return (
    <View style={styles.card}>
      {/* Top row: image + info */}
      <View style={styles.cardTop}>
        {/* Thumbnail */}
        {item.cover_image ? (
          <Image source={{ uri: item.cover_image }} style={styles.thumb} resizeMode="cover" />
        ) : (
          <View style={[styles.thumb, styles.thumbPlaceholder]}>
            <Ionicons name="home-outline" size={24} color={colors.border} />
          </View>
        )}

        {/* Info */}
        <View style={styles.cardInfo}>
          <Text style={styles.cardTitle} numberOfLines={2}>{item.title}</Text>
          <Text style={styles.cardType}>
            {formatPropertyTitle(item.type, item.bhk_type)}
            {'  ·  '}
            {item.area ? `${item.area}, ` : ''}{item.city}
          </Text>
          <Text style={styles.cardPrice}>{formatRent(item.price)}/mo</Text>

          {/* Status + inquiry count */}
          <View style={styles.badgeRow}>
            <View style={[styles.statusBadge, { backgroundColor: status.bg }]}>
              <Text style={[styles.statusText, { color: status.color }]}>{status.label}</Text>
            </View>
            {item.inquiry_count > 0 && (
              <View style={styles.inquiryBadge}>
                <Ionicons name="chatbubble-outline" size={11} color={colors.textMuted} />
                <Text style={styles.inquiryBadgeText}>{item.inquiry_count}</Text>
              </View>
            )}
          </View>
        </View>
      </View>

      {/* Rejection reason */}
      {item.rejection_reason && (
        <View style={styles.rejectionBox}>
          <Ionicons name="alert-circle-outline" size={13} color={colors.error} />
          <Text style={styles.rejectionText} numberOfLines={2}>{item.rejection_reason}</Text>
        </View>
      )}

      {/* Bottom actions */}
      <View style={styles.cardActions}>
        {/* Availability toggle (only when approved) */}
        <View style={styles.toggleRow}>
          <Text style={styles.toggleLabel}>
            {item.is_available ? 'Listed' : 'Unlisted'}
          </Text>
          {toggling ? (
            <ActivityIndicator size="small" color={colors.primary} style={{ marginRight: 4 }} />
          ) : (
            <Switch
              value={item.is_available}
              onValueChange={val => onToggle(item.id, val)}
              trackColor={{ false: colors.border, true: colors.primary + '55' }}
              thumbColor={item.is_available ? colors.primary : colors.textMuted}
              disabled={!item.is_approved}
            />
          )}
        </View>

        {/* Delete */}
        <TouchableOpacity
          style={styles.deleteBtn}
          onPress={() => onDelete(item.id, item.title)}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="trash-outline" size={17} color={colors.error} />
        </TouchableOpacity>
      </View>
    </View>
  )
}

// ── Screen ─────────────────────────────────────────────────────────────────────

export default function OwnerListingsScreen() {
  const router = useRouter()
  const insets = useSafeAreaInsets()

  const [listings,   setListings]   = useState<OwnerListing[]>([])
  const [loading,    setLoading]    = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [togglingId, setTogglingId] = useState<string | null>(null)

  const loadListings = useCallback(async () => {
    log.api.info('Loading owner listings')
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setLoading(false); return }

    const { data, error } = await supabase
      .from('properties')
      .select(`
        id, type, title, price, city, area,
        is_available, is_approved, rejection_reason, created_at,
        property_media ( url, order_index, type ),
        property_details ( bhk_type )
      `)
      .eq('owner_id', user.id)
      .order('created_at', { ascending: false })

    if (error) { log.api.error('Listings load failed', error.message); setLoading(false); return }

    // Fetch inquiry counts in one query
    const ids = (data ?? []).map((p: { id: string }) => p.id)
    const { data: inquiryCounts } = ids.length > 0
      ? await supabase.from('inquiries').select('property_id').in('property_id', ids)
      : { data: [] }

    const countMap: Record<string, number> = {}
    ;(inquiryCounts ?? []).forEach((r: { property_id: string }) => {
      countMap[r.property_id] = (countMap[r.property_id] ?? 0) + 1
    })

    const rows = ((data ?? []) as unknown as Array<{
      id: string; type: string; title: string; price: number
      city: string; area: string | null; is_available: boolean
      is_approved: boolean; rejection_reason: string | null; created_at: string
      property_media: Array<{ url: string; order_index: number; type: string }> | null
      property_details: { bhk_type?: string | null } | null
    }>).map(row => {
      const media = row.property_media ?? []
      const cover = media
        .filter(m => m.type === 'image')
        .sort((a, b) => a.order_index - b.order_index)[0]?.url ?? null
      return {
        id:               row.id,
        type:             row.type,
        title:            row.title,
        price:            row.price,
        city:             row.city,
        area:             row.area,
        bhk_type:         row.property_details?.bhk_type ?? null,
        is_available:     row.is_available,
        is_approved:      row.is_approved,
        rejection_reason: row.rejection_reason,
        cover_image:      cover,
        inquiry_count:    countMap[row.id] ?? 0,
        media_count:      media.length,
        created_at:       row.created_at,
      }
    })

    setListings(rows)
    setLoading(false)
    log.api.info('Listings loaded', { count: rows.length })
  }, [])

  useEffect(() => { loadListings() }, [loadListings])

  const handleRefresh = async () => {
    setRefreshing(true)
    await loadListings()
    setRefreshing(false)
  }

  const handleToggle = async (id: string, available: boolean) => {
    setTogglingId(id)
    const { error } = await supabase
      .from('properties')
      .update({ is_available: available })
      .eq('id', id)

    if (error) {
      toast.error('Failed to update availability')
      log.api.error('Toggle failed', error.message)
    } else {
      setListings(prev => prev.map(l => l.id === id ? { ...l, is_available: available } : l))
      toast.success(available ? 'Listing is now active' : 'Listing hidden from search')
    }
    setTogglingId(null)
  }

  const handleDelete = (id: string, title: string) => {
    Alert.alert(
      'Delete Listing',
      `Are you sure you want to delete "${title}"? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            const { error } = await supabase.from('properties').delete().eq('id', id)
            if (error) {
              toast.error('Failed to delete listing')
              log.api.error('Delete failed', error.message)
            } else {
              setListings(prev => prev.filter(l => l.id !== id))
              toast.success('Listing deleted')
            }
          },
        },
      ],
    )
  }

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>My Listings</Text>
          {!loading && (
            <Text style={styles.subtitle}>{listings.length} propert{listings.length === 1 ? 'y' : 'ies'}</Text>
          )}
        </View>
        <TouchableOpacity
          style={styles.addBtn}
          onPress={() => router.push('/(owner)/add-listing' as never)}
          activeOpacity={0.85}
        >
          <Ionicons name="add" size={22} color={colors.white} />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={listings}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={colors.primary}
              colors={[colors.primary]}
            />
          }
          renderItem={({ item }) => (
            <ListingCard
              item={item}
              onToggle={handleToggle}
              onDelete={handleDelete}
              togglingId={togglingId}
            />
          )}
          ListEmptyComponent={
            <View style={styles.empty}>
              <View style={styles.emptyIcon}>
                <Ionicons name="home-outline" size={40} color={colors.primary} />
              </View>
              <Text style={styles.emptyTitle}>No listings yet</Text>
              <Text style={styles.emptyBody}>
                Tap the + button to add your first property
              </Text>
              <TouchableOpacity
                style={styles.emptyBtn}
                onPress={() => router.push('/(owner)/add-listing' as never)}
              >
                <Ionicons name="add-circle-outline" size={16} color={colors.white} />
                <Text style={styles.emptyBtnText}>Add Listing</Text>
              </TouchableOpacity>
            </View>
          }
        />
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  screen:  { flex: 1, backgroundColor: colors.background },
  center:  { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header:  {
    flexDirection:     'row',
    alignItems:        'center',
    justifyContent:    'space-between',
    paddingHorizontal: spacing.lg,
    paddingTop:        spacing.md,
    paddingBottom:     spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  title:    { ...typography.h3 },
  subtitle: { ...typography.caption, color: colors.textMuted, marginTop: 2 },
  addBtn: {
    width:           44,
    height:          44,
    borderRadius:    radius.full,
    backgroundColor: colors.primary,
    alignItems:      'center',
    justifyContent:  'center',
  },
  list:    { paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.xxl, gap: spacing.md },

  // Listing card
  card: {
    backgroundColor: colors.card,
    borderRadius:    radius.xl,
    borderWidth:     1,
    borderColor:     colors.border,
    overflow:        'hidden',
  },
  cardTop:  { flexDirection: 'row', gap: spacing.sm, padding: spacing.md },
  thumb: {
    width:        90,
    height:       80,
    borderRadius: radius.md,
    flexShrink:   0,
    backgroundColor: colors.surface,
  },
  thumbPlaceholder: { alignItems: 'center', justifyContent: 'center' },
  cardInfo:  { flex: 1, gap: 3 },
  cardTitle: { ...typography.bodySmall, fontWeight: '600', color: colors.text, lineHeight: 18 },
  cardType:  { ...typography.caption, color: colors.textMuted },
  cardPrice: { ...typography.bodySmall, color: colors.primary, fontWeight: '700' },
  badgeRow:  { flexDirection: 'row', gap: spacing.xs, flexWrap: 'wrap', marginTop: 2 },

  statusBadge: {
    alignSelf:         'flex-start',
    borderRadius:      radius.full,
    paddingHorizontal: spacing.sm,
    paddingVertical:   2,
  },
  statusText: { fontSize: 11, fontWeight: '700' },
  inquiryBadge: {
    flexDirection:     'row',
    alignItems:        'center',
    gap:               3,
    backgroundColor:   colors.surface,
    borderRadius:      radius.full,
    paddingHorizontal: spacing.sm,
    paddingVertical:   2,
    borderWidth:       1,
    borderColor:       colors.border,
  },
  inquiryBadgeText: { fontSize: 11, color: colors.textMuted },

  // Rejection
  rejectionBox: {
    flexDirection:     'row',
    alignItems:        'flex-start',
    gap:               spacing.xs,
    backgroundColor:   colors.errorLight,
    paddingHorizontal: spacing.md,
    paddingVertical:   spacing.sm,
    borderTopWidth:    1,
    borderTopColor:    colors.error + '33',
  },
  rejectionText: { ...typography.caption, color: colors.error, flex: 1, lineHeight: 16 },

  // Actions
  cardActions: {
    flexDirection:     'row',
    alignItems:        'center',
    justifyContent:    'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical:   spacing.sm,
    borderTopWidth:    1,
    borderTopColor:    colors.border,
  },
  toggleRow:    { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  toggleLabel:  { ...typography.caption, color: colors.textSecondary, fontWeight: '500' },
  deleteBtn:    {
    width:        36,
    height:       36,
    borderRadius: radius.md,
    backgroundColor: colors.errorLight,
    alignItems:   'center',
    justifyContent: 'center',
  },

  // Empty state
  empty:     { alignItems: 'center', paddingTop: 80, gap: spacing.sm },
  emptyIcon: {
    width:           80,
    height:          80,
    borderRadius:    radius.full,
    backgroundColor: colors.primaryLight,
    alignItems:      'center',
    justifyContent:  'center',
    marginBottom:    spacing.sm,
  },
  emptyTitle:   { ...typography.bodyMedium, fontWeight: '600' },
  emptyBody:    { ...typography.bodySmall, textAlign: 'center', lineHeight: 20 },
  emptyBtn: {
    flexDirection:   'row',
    alignItems:      'center',
    gap:             spacing.sm,
    backgroundColor: colors.primary,
    borderRadius:    radius.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    marginTop:       spacing.sm,
  },
  emptyBtnText: { ...typography.bodySmall, color: colors.white, fontWeight: '700' },
})
