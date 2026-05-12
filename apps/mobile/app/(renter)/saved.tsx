import React, { useState, useCallback, useEffect } from 'react'
import {
  ActivityIndicator, FlatList, RefreshControl,
  StyleSheet, Text, View,
} from 'react-native'
import { useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { colors, spacing, typography, radius } from '@/constants/theme'
import { PropertyCard, type PropertyCardData } from '@/components/PropertyCard'
import { supabase } from '@/lib/supabase'
import { log } from '@/lib/logger'

type SavedRow = {
  property_id: string
  properties: {
    id: string; type: string; title: string; price: number
    city: string; area: string | null; floor: string | null
    furnished_status: string; available_from: string | null
    property_media: Array<{ url: string; order_index: number; type: string }> | null
    property_details: { bhk_type?: string | null; gender_allowed?: string | null } | null
  } | null
}

function toCard(row: SavedRow): PropertyCardData | null {
  const p = row.properties
  if (!p) return null
  const media = p.property_media ?? []
  const cover = media
    .filter(m => m.type === 'image')
    .sort((a, b) => a.order_index - b.order_index)[0]?.url ?? null
  return {
    id:               p.id,
    type:             p.type,
    title:            p.title,
    price:            p.price,
    city:             p.city,
    area:             p.area,
    floor:            p.floor,
    furnished_status: p.furnished_status,
    available_from:   p.available_from,
    cover_image:      cover,
    bhk_type:         p.property_details?.bhk_type ?? null,
    gender_allowed:   p.property_details?.gender_allowed ?? null,
  }
}

export default function SavedScreen() {
  const router = useRouter()
  const insets = useSafeAreaInsets()

  const [properties, setProperties] = useState<PropertyCardData[]>([])
  const [savedIds,   setSavedIds]   = useState<Set<string>>(new Set())
  const [loading,    setLoading]    = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const fetchSaved = useCallback(async () => {
    log.api.info('Loading saved properties')
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setLoading(false); return }

    const { data, error } = await supabase
      .from('saved_properties')
      .select(`
        property_id,
        properties (
          id, type, title, price, city, area, floor,
          furnished_status, available_from,
          property_media ( url, order_index, type ),
          property_details ( bhk_type, gender_allowed )
        )
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (error) { log.api.error('Saved fetch failed', error.message); setLoading(false); return }

    const cards = ((data ?? []) as unknown as SavedRow[])
      .map(toCard)
      .filter((c): c is PropertyCardData => c !== null)

    setProperties(cards)
    setSavedIds(new Set(cards.map(c => c.id)))
    setLoading(false)
    log.api.info('Saved loaded', { count: cards.length })
  }, [])

  useEffect(() => { fetchSaved() }, [fetchSaved])

  const handleRefresh = useCallback(async () => {
    setRefreshing(true)
    await fetchSaved()
    setRefreshing(false)
  }, [fetchSaved])

  const handleUnsave = useCallback(async (id: string) => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    await supabase.from('saved_properties').delete()
      .eq('property_id', id).eq('user_id', user.id)
    setProperties(prev => prev.filter(p => p.id !== id))
    setSavedIds(prev => { const s = new Set(prev); s.delete(id); return s })
  }, [])

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Saved</Text>
        {properties.length > 0 && (
          <View style={styles.countBadge}>
            <Text style={styles.countText}>{properties.length}</Text>
          </View>
        )}
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={properties}
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
            <PropertyCard
              property={item}
              onPress={() => router.push(`/(renter)/property/${item.id}` as never)}
              onSave={() => handleUnsave(item.id)}
              isSaved={savedIds.has(item.id)}
            />
          )}
          ListEmptyComponent={
            <View style={styles.empty}>
              <View style={styles.emptyIcon}>
                <Ionicons name="heart-outline" size={40} color={colors.primary} />
              </View>
              <Text style={styles.emptyTitle}>No saved listings yet</Text>
              <Text style={styles.emptyBody}>
                Tap the heart icon on any listing to save it here
              </Text>
            </View>
          }
        />
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  screen:      { flex: 1, backgroundColor: colors.background },
  header:      {
    flexDirection:   'row',
    alignItems:      'center',
    paddingHorizontal: spacing.lg,
    paddingTop:      spacing.md,
    paddingBottom:   spacing.md,
    gap:             spacing.sm,
  },
  title:       { ...typography.h3 },
  countBadge:  {
    backgroundColor: colors.primaryLight,
    borderRadius:    radius.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
  countText:   { ...typography.caption, color: colors.primary, fontWeight: '700' },
  list:        { paddingHorizontal: spacing.lg, paddingBottom: spacing.xxl, gap: spacing.md },
  center:      { flex: 1, alignItems: 'center', justifyContent: 'center' },
  empty:       { alignItems: 'center', paddingTop: 80, gap: spacing.sm, paddingHorizontal: spacing.xxl },
  emptyIcon:   {
    width:           80,
    height:          80,
    borderRadius:    radius.full,
    backgroundColor: colors.primaryLight,
    alignItems:      'center',
    justifyContent:  'center',
    marginBottom:    spacing.sm,
  },
  emptyTitle:  { ...typography.bodyMedium, fontWeight: '600' },
  emptyBody:   { ...typography.bodySmall, textAlign: 'center', lineHeight: 20 },
})
