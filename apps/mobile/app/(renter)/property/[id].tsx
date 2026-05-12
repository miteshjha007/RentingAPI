import React, { useState, useCallback, useEffect } from 'react'
import {
  ActivityIndicator, ScrollView, StyleSheet,
  Text, TouchableOpacity, View,
} from 'react-native'
import { Tabs, useLocalSearchParams, useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { LinearGradient } from 'expo-linear-gradient'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { colors, radius, spacing, typography } from '@/constants/theme'
import { ImageCarousel } from '@/components/ImageCarousel'
import { supabase } from '@/lib/supabase'
import {
  formatRent, formatAvailability, formatAddress,
  formatDate, formatPropertyTitle,
} from '@/lib/format'
import { log } from '@/lib/logger'

// ── Types ──────────────────────────────────────────────────────────────────────

interface MediaItem {
  url:         string
  type:        'image' | 'video'
  room_label:  string | null
  order_index: number
}

interface Details {
  bhk_type:             string | null
  num_bathrooms:        number | null
  num_kitchens:         number | null
  balcony:              boolean
  parking:              boolean
  garden:               boolean
  area_sqft:            number | null
  gender_allowed:       string | null
  room_type:            string | null
  food_included:        boolean
  open_time:            string | null
  close_time:           string | null
  available_services:   string[]
  kitchen_available:    boolean
  distance_from_market: string | null
}

interface Owner {
  id:         string
  name:       string
  phone:      string | null
  avatar_url: string | null
}

interface FullProperty {
  id:                 string
  type:               string
  title:              string
  description:        string | null
  price:              number
  security_deposit:   number
  electricity_charges: string
  floor:              string | null
  total_floors:       number | null
  furnished_status:   string
  available_from:     string | null
  state:              string
  city:               string
  area:               string | null
  full_address:       string | null
  created_at:         string
  details:            Details | null
  media:              MediaItem[]
  owner:              Owner
}

// ── Helpers ────────────────────────────────────────────────────────────────────

const FURNISHED_LABEL: Record<string, string> = {
  furnished:      'Furnished',
  semi_furnished: 'Semi-Furnished',
  unfurnished:    'Unfurnished',
}

const ELEC_LABEL: Record<string, string> = {
  included: 'Included in rent',
  extra:    'Charged separately',
  fixed:    'Fixed monthly',
}

const GENDER_LABEL: Record<string, string> = {
  boys:  'Boys only',
  girls: 'Girls only',
  both:  'Co-ed',
}

const ROOM_LABEL: Record<string, string> = {
  '1_seater': 'Single occupancy',
  '2_seater': 'Double occupancy',
  '3_seater': 'Triple occupancy',
}

function DetailRow({ icon, label, value }: {
  icon: keyof typeof Ionicons.glyphMap
  label: string
  value: string
}) {
  return (
    <View style={styles.detailRow}>
      <View style={styles.detailIcon}>
        <Ionicons name={icon} size={15} color={colors.primary} />
      </View>
      <View style={styles.detailTextWrap}>
        <Text style={styles.detailLabel}>{label}</Text>
        <Text style={styles.detailValue}>{value}</Text>
      </View>
    </View>
  )
}

function OwnerAvatar({ name }: { name: string }) {
  const initials = name.split(' ').map(w => w[0]?.toUpperCase() ?? '').slice(0, 2).join('')
  return (
    <View style={styles.ownerAvatar}>
      <Text style={styles.ownerAvatarText}>{initials}</Text>
    </View>
  )
}

// ── Screen ─────────────────────────────────────────────────────────────────────

export default function PropertyDetailScreen() {
  const router            = useRouter()
  const insets            = useSafeAreaInsets()
  const { id }            = useLocalSearchParams<{ id: string }>()
  const [property, setProperty] = useState<FullProperty | null>(null)
  const [loading,  setLoading]  = useState(true)
  const [error,    setError]    = useState<string | null>(null)
  const [isSaved,  setIsSaved]  = useState(false)
  const [savingId, setSavingId] = useState(false)

  const loadProperty = useCallback(async () => {
    if (!id) return
    log.api.info('Loading property detail', { id })
    setLoading(true)

    const { data, error: err } = await supabase
      .from('properties')
      .select(`
        id, type, title, description, price, security_deposit,
        electricity_charges, floor, total_floors, furnished_status,
        available_from, state, city, area, full_address, created_at,
        details:property_details(*),
        media:property_media(*),
        owner:profiles!properties_owner_id_fkey(id, name, phone, avatar_url)
      `)
      .eq('id', id)
      .single()

    if (err) {
      log.api.error('Property load failed', err.message)
      setError(err.message)
    } else if (data) {
      // Sort media by order_index
      (data as unknown as FullProperty).media.sort(
        (a, b) => a.order_index - b.order_index
      )
      setProperty(data as unknown as FullProperty)
    }
    setLoading(false)
  }, [id])

  const loadSavedState = useCallback(async () => {
    if (!id) return
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data } = await supabase
      .from('saved_properties')
      .select('id')
      .eq('user_id', user.id)
      .eq('property_id', id)
      .maybeSingle()
    setIsSaved(!!data)
  }, [id])

  useEffect(() => {
    loadProperty()
    loadSavedState()
  }, [loadProperty, loadSavedState])

  const toggleSave = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user || !id) return
    setSavingId(true)
    if (isSaved) {
      await supabase.from('saved_properties').delete()
        .eq('user_id', user.id).eq('property_id', id)
      setIsSaved(false)
    } else {
      await supabase.from('saved_properties').insert({ user_id: user.id, property_id: id })
      setIsSaved(true)
    }
    setSavingId(false)
  }

  // Loading / error
  if (loading) {
    return (
      <>
        <Tabs.Screen options={{ tabBarStyle: { display: 'none' }, headerShown: false }} />
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </>
    )
  }

  if (error || !property) {
    return (
      <>
        <Tabs.Screen options={{ tabBarStyle: { display: 'none' }, headerShown: false }} />
        <View style={styles.center}>
          <Ionicons name="alert-circle-outline" size={48} color={colors.error} />
          <Text style={styles.errorText}>{error ?? 'Property not found'}</Text>
          <TouchableOpacity onPress={() => router.back()} style={styles.backLink}>
            <Text style={styles.backLinkText}>Go back</Text>
          </TouchableOpacity>
        </View>
      </>
    )
  }

  const { details } = property
  const carouselItems = property.media.map(m => ({
    url: m.url, type: m.type, room_label: m.room_label,
  }))

  return (
    <>
      {/* Hide tab bar for this screen */}
      <Tabs.Screen options={{ tabBarStyle: { display: 'none' }, headerShown: false }} />

      <View style={styles.screen}>
        {/* Scrollable body */}
        <ScrollView
          style={styles.scroll}
          showsVerticalScrollIndicator={false}
          stickyHeaderIndices={[]}
          bounces
        >
          {/* Hero carousel (edge-to-edge) */}
          <View>
            <ImageCarousel items={carouselItems} height={300} />

            {/* Header overlay gradient */}
            <LinearGradient
              colors={['rgba(0,0,0,0.55)', 'transparent']}
              style={styles.heroTopGradient}
              pointerEvents="none"
            />

            {/* Back button */}
            <TouchableOpacity
              style={[styles.heroBtn, styles.heroBtnLeft, { top: insets.top + spacing.sm }]}
              onPress={() => router.back()}
            >
              <Ionicons name="arrow-back" size={20} color={colors.white} />
            </TouchableOpacity>

            {/* Save button */}
            <TouchableOpacity
              style={[styles.heroBtn, styles.heroBtnRight, { top: insets.top + spacing.sm }]}
              onPress={toggleSave}
              disabled={savingId}
            >
              <Ionicons
                name={isSaved ? 'heart' : 'heart-outline'}
                size={20}
                color={isSaved ? '#f87171' : colors.white}
              />
            </TouchableOpacity>
          </View>

          {/* Content */}
          <View style={styles.body}>
            {/* Title + availability */}
            <View style={styles.titleRow}>
              <Text style={styles.propertyTitle}>{property.title}</Text>
              <View style={styles.availBadge}>
                <Text style={styles.availText}>{formatAvailability(property.available_from)}</Text>
              </View>
            </View>

            {/* Address */}
            <View style={styles.addrRow}>
              <Ionicons name="location-outline" size={14} color={colors.textMuted} />
              <Text style={styles.addrText}>
                {property.full_address ?? formatAddress(property.area, property.city, property.state)}
              </Text>
            </View>

            {/* Price row */}
            <View style={styles.priceSection}>
              <View>
                <Text style={styles.priceLabel}>Monthly Rent</Text>
                <Text style={styles.price}>{formatRent(property.price)}</Text>
              </View>
              <View style={styles.priceDivider} />
              <View>
                <Text style={styles.priceLabel}>Security Deposit</Text>
                <Text style={styles.depositPrice}>{formatRent(property.security_deposit)}</Text>
              </View>
            </View>

            {/* Quick chips */}
            <View style={styles.chips}>
              <Chip icon="business-outline" label={formatPropertyTitle(property.type, details?.bhk_type)} />
              {property.floor && <Chip icon="layers-outline" label={`Floor ${property.floor}${property.total_floors ? `/${property.total_floors}` : ''}`} />}
              <Chip icon="cube-outline"    label={FURNISHED_LABEL[property.furnished_status] ?? property.furnished_status} />
              <Chip icon="flash-outline"   label={ELEC_LABEL[property.electricity_charges] ?? property.electricity_charges} />
            </View>

            {/* Description */}
            {property.description ? (
              <View style={styles.section}>
                <Text style={styles.sectionLabel}>About this property</Text>
                <Text style={styles.description}>{property.description}</Text>
              </View>
            ) : null}

            {/* Property details grid */}
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>Property Details</Text>
              <View style={styles.detailGrid}>
                {details?.bhk_type && (
                  <DetailRow icon="home-outline"    label="BHK Type"    value={details.bhk_type} />
                )}
                {details?.area_sqft && (
                  <DetailRow icon="resize-outline"  label="Area"        value={`${details.area_sqft} sq.ft`} />
                )}
                {details?.num_bathrooms != null && (
                  <DetailRow icon="water-outline"   label="Bathrooms"   value={String(details.num_bathrooms)} />
                )}
                {details?.num_kitchens != null && (
                  <DetailRow icon="restaurant-outline" label="Kitchens" value={String(details.num_kitchens)} />
                )}
                {details?.balcony && (
                  <DetailRow icon="sunny-outline"   label="Balcony"     value="Yes" />
                )}
                {details?.parking && (
                  <DetailRow icon="car-outline"     label="Parking"     value="Available" />
                )}
                {details?.garden && (
                  <DetailRow icon="leaf-outline"    label="Garden"      value="Yes" />
                )}
                {details?.distance_from_market && (
                  <DetailRow icon="walk-outline"    label="From Market" value={details.distance_from_market} />
                )}
                {/* PG/Hostel specific */}
                {details?.gender_allowed && (
                  <DetailRow icon="people-outline"  label="Gender"      value={GENDER_LABEL[details.gender_allowed] ?? details.gender_allowed} />
                )}
                {details?.room_type && (
                  <DetailRow icon="bed-outline"     label="Room Type"   value={ROOM_LABEL[details.room_type] ?? details.room_type} />
                )}
                {details?.food_included && (
                  <DetailRow icon="fast-food-outline" label="Food"      value="Included" />
                )}
                {(details?.open_time && details?.close_time) && (
                  <DetailRow icon="time-outline"    label="Timings"
                    value={`${details.open_time} – ${details.close_time}`} />
                )}
                {details?.kitchen_available && (
                  <DetailRow icon="flame-outline"   label="Kitchen"     value="Available" />
                )}
              </View>
            </View>

            {/* Amenities */}
            {details?.available_services && details.available_services.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionLabel}>Amenities & Services</Text>
                <View style={styles.amenityChips}>
                  {details.available_services.map(s => (
                    <View key={s} style={styles.amenityChip}>
                      <Ionicons name="checkmark-circle" size={13} color={colors.success} />
                      <Text style={styles.amenityText}>
                        {s.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
                      </Text>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {/* Owner card */}
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>Listed By</Text>
              <View style={styles.ownerCard}>
                <OwnerAvatar name={property.owner.name} />
                <View style={styles.ownerInfo}>
                  <Text style={styles.ownerName}>{property.owner.name}</Text>
                  <Text style={styles.ownerSince}>
                    Member since {formatDate(property.created_at)}
                  </Text>
                </View>
                <TouchableOpacity
                  style={styles.ownerContactBtn}
                  onPress={() =>
                    router.push({
                      pathname: '/(renter)/property/contact' as never,
                      params: {
                        propertyId:   property.id,
                        propertyTitle: property.title,
                        ownerName:    property.owner.name,
                        ownerPhone:   property.owner.phone ?? '',
                        price:        String(property.price),
                      },
                    } as never)
                  }
                >
                  <Text style={styles.ownerContactText}>Contact</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Bottom spacer for CTA */}
            <View style={{ height: 90 }} />
          </View>
        </ScrollView>

        {/* Floating CTA */}
        <View style={[styles.ctaBar, { paddingBottom: insets.bottom + spacing.sm }]}>
          <View style={styles.ctaPrice}>
            <Text style={styles.ctaPriceLabel}>Rent</Text>
            <Text style={styles.ctaPriceValue}>{formatRent(property.price)}/mo</Text>
          </View>
          <TouchableOpacity
            style={styles.ctaBtn}
            activeOpacity={0.85}
            onPress={() =>
              router.push({
                pathname: '/(renter)/property/contact' as never,
                params: {
                  propertyId:    property.id,
                  propertyTitle: property.title,
                  ownerName:     property.owner.name,
                  ownerPhone:    property.owner.phone ?? '',
                  price:         String(property.price),
                },
              } as never)
            }
          >
            <Ionicons name="chatbubble-ellipses-outline" size={18} color={colors.white} />
            <Text style={styles.ctaBtnText}>Contact Owner</Text>
          </TouchableOpacity>
        </View>
      </View>
    </>
  )
}

function Chip({ icon, label }: { icon: keyof typeof Ionicons.glyphMap; label: string }) {
  return (
    <View style={styles.chip}>
      <Ionicons name={icon} size={13} color={colors.textMuted} />
      <Text style={styles.chipText}>{label}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  screen:       { flex: 1, backgroundColor: colors.background },
  scroll:       { flex: 1 },
  center:       { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.md },
  errorText:    { ...typography.bodySmall, color: colors.error, textAlign: 'center' },
  backLink:     { marginTop: spacing.sm },
  backLinkText: { ...typography.bodySmall, color: colors.primary },

  // Hero overlay buttons
  heroTopGradient: { position: 'absolute', top: 0, left: 0, right: 0, height: 100 },
  heroBtn: {
    position:        'absolute',
    width:           40,
    height:          40,
    borderRadius:    radius.full,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems:      'center',
    justifyContent:  'center',
  },
  heroBtnLeft:  { left: spacing.md },
  heroBtnRight: { right: spacing.md },

  // Body
  body: { paddingHorizontal: spacing.lg, paddingTop: spacing.lg },

  // Title
  titleRow: { gap: spacing.xs, marginBottom: spacing.xs },
  propertyTitle: { ...typography.h2, lineHeight: 32 },
  availBadge: {
    alignSelf:       'flex-start',
    backgroundColor: colors.successLight,
    borderRadius:    radius.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
  },
  availText:   { ...typography.caption, color: colors.success, fontWeight: '600' },

  // Address
  addrRow:  { flexDirection: 'row', alignItems: 'flex-start', gap: 4, marginBottom: spacing.md },
  addrText: { ...typography.bodySmall, color: colors.textMuted, flex: 1, lineHeight: 18 },

  // Price
  priceSection: {
    flexDirection:   'row',
    backgroundColor: colors.card,
    borderRadius:    radius.lg,
    borderWidth:     1,
    borderColor:     colors.border,
    padding:         spacing.md,
    marginBottom:    spacing.md,
    gap:             spacing.md,
    alignItems:      'center',
  },
  priceLabel:   { ...typography.caption, color: colors.textMuted, marginBottom: 2 },
  price:        { ...typography.h3, color: colors.primary },
  depositPrice: { ...typography.bodyMedium, fontWeight: '600' },
  priceDivider: { width: 1, height: 36, backgroundColor: colors.border },

  // Chips
  chips: {
    flexDirection: 'row',
    flexWrap:      'wrap',
    gap:           spacing.sm,
    marginBottom:  spacing.lg,
  },
  chip: {
    flexDirection:     'row',
    alignItems:        'center',
    gap:               4,
    backgroundColor:   colors.surface,
    borderRadius:      radius.full,
    paddingHorizontal: spacing.md,
    paddingVertical:   spacing.xs,
    borderWidth:       1,
    borderColor:       colors.border,
  },
  chipText: { ...typography.caption, color: colors.textSecondary, fontWeight: '500' },

  // Sections
  section:      { marginBottom: spacing.lg },
  sectionLabel: {
    ...typography.label,
    color:         colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom:  spacing.sm,
  },
  description:  { ...typography.body, color: colors.textSecondary, lineHeight: 24 },

  // Detail grid
  detailGrid: {
    backgroundColor: colors.card,
    borderRadius:    radius.lg,
    borderWidth:     1,
    borderColor:     colors.border,
    overflow:        'hidden',
  },
  detailRow: {
    flexDirection:     'row',
    alignItems:        'center',
    paddingHorizontal: spacing.md,
    paddingVertical:   spacing.sm,
    gap:               spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  detailIcon: {
    width:           32,
    height:          32,
    borderRadius:    radius.sm,
    backgroundColor: colors.primaryLight,
    alignItems:      'center',
    justifyContent:  'center',
  },
  detailTextWrap: { flex: 1, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  detailLabel:    { ...typography.bodySmall, color: colors.textMuted },
  detailValue:    { ...typography.bodySmall, color: colors.text, fontWeight: '500' },

  // Amenities
  amenityChips: {
    flexDirection: 'row',
    flexWrap:      'wrap',
    gap:           spacing.sm,
  },
  amenityChip: {
    flexDirection:     'row',
    alignItems:        'center',
    gap:               4,
    backgroundColor:   colors.surface,
    borderRadius:      radius.full,
    paddingHorizontal: spacing.sm,
    paddingVertical:   4,
    borderWidth:       1,
    borderColor:       colors.border,
  },
  amenityText: { ...typography.caption, color: colors.textSecondary, fontWeight: '500' },

  // Owner card
  ownerCard: {
    flexDirection:   'row',
    alignItems:      'center',
    backgroundColor: colors.card,
    borderRadius:    radius.lg,
    borderWidth:     1,
    borderColor:     colors.border,
    padding:         spacing.md,
    gap:             spacing.md,
  },
  ownerAvatar: {
    width:           48,
    height:          48,
    borderRadius:    radius.full,
    backgroundColor: colors.primaryLight,
    alignItems:      'center',
    justifyContent:  'center',
    borderWidth:     1.5,
    borderColor:     colors.primary,
  },
  ownerAvatarText:    { ...typography.bodyMedium, color: colors.primary, fontWeight: '700' },
  ownerInfo:          { flex: 1, gap: 2 },
  ownerName:          { ...typography.bodySmall, fontWeight: '600', color: colors.text },
  ownerSince:         { ...typography.caption, color: colors.textMuted },
  ownerContactBtn: {
    backgroundColor: colors.primaryLight,
    borderRadius:    radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderWidth:     1,
    borderColor:     colors.primary,
  },
  ownerContactText:   { ...typography.caption, color: colors.primary, fontWeight: '700' },

  // Floating CTA bar
  ctaBar: {
    position:          'absolute',
    bottom:            0,
    left:              0,
    right:             0,
    flexDirection:     'row',
    alignItems:        'center',
    backgroundColor:   colors.card,
    borderTopWidth:    1,
    borderTopColor:    colors.border,
    paddingHorizontal: spacing.lg,
    paddingTop:        spacing.sm,
    gap:               spacing.md,
  },
  ctaPrice:      { flex: 1 },
  ctaPriceLabel: { ...typography.caption, color: colors.textMuted },
  ctaPriceValue: { ...typography.bodyMedium, color: colors.primary, fontWeight: '700' },
  ctaBtn: {
    flex:            2,
    flexDirection:   'row',
    alignItems:      'center',
    justifyContent:  'center',
    gap:             spacing.sm,
    backgroundColor: colors.primary,
    borderRadius:    radius.md,
    paddingVertical: spacing.md,
  },
  ctaBtnText: { ...typography.bodySmall, color: colors.white, fontWeight: '700' },
})
