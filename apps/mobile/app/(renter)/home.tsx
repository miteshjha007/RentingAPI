import React, { useState, useCallback, useRef, useEffect } from 'react'
import {
  ActivityIndicator, FlatList, RefreshControl,
  StyleSheet, Text, TextInput, TouchableOpacity, View,
} from 'react-native'
import { useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { colors, radius, spacing, typography } from '@/constants/theme'
import { useAuthStore } from '@/store/authStore'
import { PropertyCard, type PropertyCardData } from '@/components/PropertyCard'
import { FilterSheet, type Filters } from '@/components/FilterSheet'
import { supabase } from '@/lib/supabase'
import { log } from '@/lib/logger'

const PAGE_SIZE = 20

type RawRow = {
  id: string
  type: string
  title: string
  price: number
  city: string
  area: string | null
  floor: string | null
  furnished_status: string
  available_from: string | null
  property_media: Array<{ url: string; order_index: number; type: string }> | null
  property_details: { bhk_type?: string | null; gender_allowed?: string | null } | null
}

function toCard(row: RawRow): PropertyCardData {
  const media = row.property_media ?? []
  const cover = media
    .filter(m => m.type === 'image')
    .sort((a, b) => a.order_index - b.order_index)[0]?.url ?? null
  return {
    id: row.id,
    type: row.type,
    title: row.title,
    price: row.price,
    city: row.city,
    area: row.area,
    floor: row.floor,
    furnished_status: row.furnished_status,
    available_from: row.available_from,
    cover_image: cover,
    bhk_type: row.property_details?.bhk_type ?? null,
    gender_allowed: row.property_details?.gender_allowed ?? null,
  }
}

export default function HomeScreen() {
  const router   = useRouter()
  const insets   = useSafeAreaInsets()
  const { profile } = useAuthStore()

  const [search,        setSearch]        = useState('')
  const [filters,       setFilters]       = useState<Filters>({})
  const [filterVisible, setFilterVisible] = useState(false)
  const [properties,    setProperties]    = useState<PropertyCardData[]>([])
  const [loading,       setLoading]       = useState(true)
  const [refreshing,    setRefreshing]    = useState(false)
  const [loadingMore,   setLoadingMore]   = useState(false)
  const [hasMore,       setHasMore]       = useState(true)
  const [savedIds,      setSavedIds]      = useState<Set<string>>(new Set())

  const pageRef      = useRef(0)
  const searchTimer  = useRef<ReturnType<typeof setTimeout>>()
  const liveSearch   = useRef('')
  const liveFilters  = useRef<Filters>({})

  const activeFilterCount = Object.values(filters).filter(v => v !== '' && v !== undefined).length

  const buildQuery = (page: number, s: string, f: Filters) => {
    let q = supabase
      .from('properties')
      .select(`
        id, type, title, price, city, area, floor,
        furnished_status, available_from,
        property_media ( url, order_index, type ),
        property_details ( bhk_type, gender_allowed )
      `)
      .eq('is_approved', true)
      .eq('is_available', true)
      .order('created_at', { ascending: false })
      .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1)

    if (s)                  q = q.or(`title.ilike.%${s}%,area.ilike.%${s}%,city.ilike.%${s}%`)
    if (f.type)             q = q.eq('type', f.type)
    if (f.city)             q = q.ilike('city', `%${f.city}%`)
    if (f.min_price)        q = q.gte('price', f.min_price)
    if (f.max_price)        q = q.lte('price', f.max_price)
    if (f.furnished_status) q = q.eq('furnished_status', f.furnished_status)

    return q
  }

  const fetchSavedIds = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data } = await supabase
      .from('saved_properties')
      .select('property_id')
      .eq('user_id', user.id)
    setSavedIds(new Set((data ?? []).map(r => r.property_id as string)))
  }, [])

  const doLoad = useCallback(async (page: number, s: string, f: Filters) => {
    log.api.info('Fetching properties', { page, search: s })
    const { data, error } = await buildQuery(page, s, f)
    if (error) { log.api.error('Fetch failed', error.message); return [] }
    return ((data ?? []) as unknown as RawRow[]).map(toCard)
  }, [])

  const initialLoad = useCallback(async () => {
    setLoading(true)
    pageRef.current = 0
    const [cards] = await Promise.all([
      doLoad(0, liveSearch.current, liveFilters.current),
      fetchSavedIds(),
    ])
    setProperties(cards)
    setHasMore(cards.length === PAGE_SIZE)
    setLoading(false)
  }, [doLoad, fetchSavedIds])

  const handleRefresh = useCallback(async () => {
    setRefreshing(true)
    pageRef.current = 0
    const [cards] = await Promise.all([
      doLoad(0, liveSearch.current, liveFilters.current),
      fetchSavedIds(),
    ])
    setProperties(cards)
    setHasMore(cards.length === PAGE_SIZE)
    setRefreshing(false)
  }, [doLoad, fetchSavedIds])

  const handleLoadMore = useCallback(async () => {
    if (loadingMore || !hasMore) return
    setLoadingMore(true)
    const next = pageRef.current + 1
    const cards = await doLoad(next, liveSearch.current, liveFilters.current)
    if (cards.length > 0) {
      setProperties(prev => [...prev, ...cards])
      setHasMore(cards.length === PAGE_SIZE)
      pageRef.current = next
    } else {
      setHasMore(false)
    }
    setLoadingMore(false)
  }, [loadingMore, hasMore, doLoad])

  const handleSearch = (text: string) => {
    setSearch(text)
    clearTimeout(searchTimer.current)
    searchTimer.current = setTimeout(async () => {
      liveSearch.current = text
      setLoading(true)
      pageRef.current = 0
      const cards = await doLoad(0, text, liveFilters.current)
      setProperties(cards)
      setHasMore(cards.length === PAGE_SIZE)
      setLoading(false)
    }, 400)
  }

  const handleApplyFilters = async (f: Filters) => {
    setFilters(f)
    liveFilters.current = f
    setLoading(true)
    pageRef.current = 0
    const cards = await doLoad(0, liveSearch.current, f)
    setProperties(cards)
    setHasMore(cards.length === PAGE_SIZE)
    setLoading(false)
  }

  const toggleSave = useCallback(async (id: string) => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    if (savedIds.has(id)) {
      await supabase.from('saved_properties').delete()
        .eq('property_id', id).eq('user_id', user.id)
      setSavedIds(prev => { const s = new Set(prev); s.delete(id); return s })
    } else {
      await supabase.from('saved_properties').insert({ user_id: user.id, property_id: id })
      setSavedIds(prev => new Set([...prev, id]))
    }
  }, [savedIds])

  useEffect(() => { initialLoad() }, [])

  const firstName = profile?.name?.split(' ')[0] ?? 'there'

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Hi, {firstName} 👋</Text>
          <Text style={styles.subGreeting}>Find your perfect space</Text>
        </View>
        <TouchableOpacity style={styles.iconBtn}>
          <Ionicons name="notifications-outline" size={22} color={colors.textSecondary} />
        </TouchableOpacity>
      </View>

      {/* Search + Filter */}
      <View style={styles.searchRow}>
        <View style={styles.searchWrap}>
          <Ionicons name="search" size={16} color={colors.textMuted} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search city, area, locality…"
            placeholderTextColor={colors.textMuted}
            value={search}
            onChangeText={handleSearch}
            returnKeyType="search"
          />
          {search.length > 0 && (
            <TouchableOpacity
              onPress={() => handleSearch('')}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="close-circle" size={16} color={colors.textMuted} />
            </TouchableOpacity>
          )}
        </View>

        <TouchableOpacity
          style={[styles.filterBtn, activeFilterCount > 0 && styles.filterBtnActive]}
          onPress={() => setFilterVisible(true)}
          activeOpacity={0.8}
        >
          <Ionicons
            name="options-outline"
            size={18}
            color={activeFilterCount > 0 ? colors.primary : colors.textSecondary}
          />
          {activeFilterCount > 0 && (
            <View style={styles.filterBadge}>
              <Text style={styles.filterBadgeText}>{activeFilterCount}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* Results bar */}
      {!loading && (
        <View style={styles.resultsBar}>
          <Text style={styles.resultsText}>
            {properties.length === 0
              ? 'No listings found'
              : `${properties.length}${hasMore ? '+' : ''} listings`}
          </Text>
          {activeFilterCount > 0 && (
            <TouchableOpacity onPress={() => handleApplyFilters({})}>
              <Text style={styles.clearFilters}>Clear filters</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Feed */}
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
              onSave={() => toggleSave(item.id)}
              isSaved={savedIds.has(item.id)}
            />
          )}
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.4}
          ListFooterComponent={
            loadingMore
              ? <ActivityIndicator color={colors.primary} style={styles.footerSpinner} />
              : null
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="home-outline" size={60} color={colors.border} />
              <Text style={styles.emptyTitle}>No listings found</Text>
              <Text style={styles.emptyBody}>
                Try adjusting your search or clearing filters
              </Text>
            </View>
          }
        />
      )}

      <FilterSheet
        visible={filterVisible}
        onClose={() => setFilterVisible(false)}
        filters={filters}
        onApply={handleApplyFilters}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  screen:          { flex: 1, backgroundColor: colors.background },
  header:          {
    flexDirection:   'row',
    alignItems:      'center',
    justifyContent:  'space-between',
    paddingHorizontal: spacing.lg,
    paddingTop:      spacing.md,
    paddingBottom:   spacing.sm,
  },
  greeting:        { ...typography.h3 },
  subGreeting:     { ...typography.caption, color: colors.textMuted, marginTop: 2 },
  iconBtn:         {
    width:           40,
    height:          40,
    borderRadius:    radius.full,
    backgroundColor: colors.surface,
    alignItems:      'center',
    justifyContent:  'center',
    borderWidth:     1,
    borderColor:     colors.border,
  },
  searchRow:       {
    flexDirection:   'row',
    alignItems:      'center',
    paddingHorizontal: spacing.lg,
    gap:             spacing.sm,
    marginBottom:    spacing.sm,
  },
  searchWrap:      {
    flex:            1,
    flexDirection:   'row',
    alignItems:      'center',
    gap:             spacing.sm,
    backgroundColor: colors.surface,
    borderRadius:    radius.md,
    borderWidth:     1.5,
    borderColor:     colors.border,
    paddingHorizontal: spacing.md,
    height:          44,
  },
  searchInput:     {
    flex:    1,
    ...typography.body,
    fontSize: 14,
    color:   colors.text,
    paddingVertical: 0,
  },
  filterBtn:       {
    width:           44,
    height:          44,
    borderRadius:    radius.md,
    backgroundColor: colors.surface,
    alignItems:      'center',
    justifyContent:  'center',
    borderWidth:     1.5,
    borderColor:     colors.border,
  },
  filterBtnActive: { borderColor: colors.primary, backgroundColor: colors.primaryLight },
  filterBadge:     {
    position:        'absolute',
    top:             -4,
    right:           -4,
    width:           16,
    height:          16,
    borderRadius:    8,
    backgroundColor: colors.primary,
    alignItems:      'center',
    justifyContent:  'center',
  },
  filterBadgeText: { fontSize: 9, fontWeight: '700', color: colors.white },
  resultsBar:      {
    flexDirection:   'row',
    justifyContent:  'space-between',
    alignItems:      'center',
    paddingHorizontal: spacing.lg,
    marginBottom:    spacing.sm,
  },
  resultsText:     { ...typography.caption, color: colors.textMuted },
  clearFilters:    { ...typography.caption, color: colors.primary, fontWeight: '600' },
  list:            { paddingHorizontal: spacing.lg, paddingBottom: spacing.xxl, gap: spacing.md },
  center:          { flex: 1, alignItems: 'center', justifyContent: 'center' },
  footerSpinner:   { paddingVertical: spacing.lg },
  empty:           { alignItems: 'center', paddingTop: 80, gap: spacing.sm },
  emptyTitle:      { ...typography.bodyMedium, fontWeight: '600', marginTop: spacing.sm },
  emptyBody:       { ...typography.bodySmall, textAlign: 'center', lineHeight: 20 },
})
