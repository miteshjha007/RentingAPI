import React, { useState, useEffect, useRef, useCallback } from 'react'
import {
  Animated, ActivityIndicator, Dimensions, Image,
  StyleSheet, Text, TouchableOpacity, View,
} from 'react-native'
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps'
import * as Location from 'expo-location'
import { useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { colors, radius, spacing, typography } from '@/constants/theme'
import { supabase } from '@/lib/supabase'
import { formatRent, formatAddress, formatPropertyTitle } from '@/lib/format'
import { log } from '@/lib/logger'

const { width: SCREEN_W } = Dimensions.get('window')

const INDIA_REGION = {
  latitude:       20.5937,
  longitude:      78.9629,
  latitudeDelta:  12,
  longitudeDelta: 12,
}

interface MapProperty {
  id:          string
  type:        string
  title:       string
  price:       number
  city:        string
  area:        string | null
  bhk_type:    string | null
  latitude:    number
  longitude:   number
  cover_image: string | null
}

export default function MapScreen() {
  const router  = useRouter()
  const insets  = useSafeAreaInsets()
  const mapRef  = useRef<MapView>(null)
  const cardAnim = useRef(new Animated.Value(200)).current

  const [properties, setProperties]   = useState<MapProperty[]>([])
  const [loading,    setLoading]      = useState(true)
  const [selected,   setSelected]     = useState<MapProperty | null>(null)
  const [userLoc,    setUserLoc]      = useState<{ latitude: number; longitude: number } | null>(null)

  const showCard = useCallback((prop: MapProperty) => {
    setSelected(prop)
    Animated.spring(cardAnim, {
      toValue: 0, damping: 20, stiffness: 200, useNativeDriver: true,
    }).start()
  }, [cardAnim])

  const hideCard = useCallback(() => {
    Animated.timing(cardAnim, {
      toValue: 200, duration: 200, useNativeDriver: true,
    }).start(() => setSelected(null))
  }, [cardAnim])

  // Fetch properties with coordinates
  useEffect(() => {
    const load = async () => {
      log.api.info('Loading map properties')
      const { data, error } = await supabase
        .from('properties')
        .select(`
          id, type, title, price, city, area,
          latitude, longitude,
          property_media ( url, order_index, type ),
          property_details ( bhk_type )
        `)
        .eq('is_approved', true)
        .eq('is_available', true)
        .not('latitude', 'is', null)
        .not('longitude', 'is', null)
        .limit(200)

      if (error) { log.api.error('Map load failed', error.message); setLoading(false); return }

      const pins: MapProperty[] = ((data ?? []) as unknown as Array<{
        id: string; type: string; title: string; price: number
        city: string; area: string | null; latitude: number; longitude: number
        property_media: Array<{ url: string; order_index: number; type: string }> | null
        property_details: { bhk_type?: string | null } | null
      }>).map(row => {
        const media = row.property_media ?? []
        const cover = media
          .filter(m => m.type === 'image')
          .sort((a, b) => a.order_index - b.order_index)[0]?.url ?? null
        return {
          id:          row.id,
          type:        row.type,
          title:       row.title,
          price:       row.price,
          city:        row.city,
          area:        row.area,
          bhk_type:    row.property_details?.bhk_type ?? null,
          latitude:    row.latitude,
          longitude:   row.longitude,
          cover_image: cover,
        }
      })

      setProperties(pins)
      setLoading(false)
      log.api.info('Map pins loaded', { count: pins.length })
    }

    load()
  }, [])

  // Request location permission
  useEffect(() => {
    const requestLocation = async () => {
      const { status } = await Location.requestForegroundPermissionsAsync()
      if (status !== 'granted') return
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced })
      const loc = { latitude: pos.coords.latitude, longitude: pos.coords.longitude }
      setUserLoc(loc)
      mapRef.current?.animateToRegion({
        ...loc,
        latitudeDelta: 0.12,
        longitudeDelta: 0.12,
      }, 800)
    }
    requestLocation()
  }, [])

  const goToMyLocation = () => {
    if (userLoc) {
      mapRef.current?.animateToRegion({
        ...userLoc,
        latitudeDelta: 0.08,
        longitudeDelta: 0.08,
      }, 600)
    }
  }

  return (
    <View style={styles.screen}>
      {/* Map */}
      <MapView
        ref={mapRef}
        style={StyleSheet.absoluteFillObject}
        provider={PROVIDER_GOOGLE}
        initialRegion={INDIA_REGION}
        showsUserLocation={userLoc !== null}
        showsMyLocationButton={false}
        onPress={hideCard}
      >
        {properties.map(prop => (
          <Marker
            key={prop.id}
            coordinate={{ latitude: prop.latitude, longitude: prop.longitude }}
            onPress={() => showCard(prop)}
          >
            <View style={[
              styles.pin,
              selected?.id === prop.id && styles.pinSelected,
            ]}>
              <Text style={[
                styles.pinText,
                selected?.id === prop.id && styles.pinTextSelected,
              ]}>
                {formatRent(prop.price)}
              </Text>
            </View>
          </Marker>
        ))}
      </MapView>

      {/* Loading overlay */}
      {loading && (
        <View style={[styles.loadingOverlay, { paddingTop: insets.top + spacing.lg }]}>
          <View style={styles.loadingPill}>
            <ActivityIndicator size="small" color={colors.primary} />
            <Text style={styles.loadingText}>Loading listings…</Text>
          </View>
        </View>
      )}

      {/* Count badge */}
      {!loading && (
        <View style={[styles.countBadge, { top: insets.top + spacing.md }]}>
          <Ionicons name="location" size={13} color={colors.primary} />
          <Text style={styles.countText}>{properties.length} listings</Text>
        </View>
      )}

      {/* My Location FAB */}
      <TouchableOpacity
        style={[styles.locationFab, { bottom: insets.bottom + 100 + spacing.md }]}
        onPress={goToMyLocation}
        activeOpacity={0.85}
      >
        <Ionicons name="locate" size={22} color={colors.text} />
      </TouchableOpacity>

      {/* Mini card (slides up on marker tap) */}
      {selected && (
        <Animated.View
          style={[
            styles.miniCard,
            { bottom: insets.bottom + 80, transform: [{ translateY: cardAnim }] },
          ]}
        >
          <TouchableOpacity
            style={styles.miniCardInner}
            activeOpacity={0.9}
            onPress={() => router.push(`/(renter)/property/${selected.id}` as never)}
          >
            {/* Thumbnail */}
            {selected.cover_image ? (
              <Image
                source={{ uri: selected.cover_image }}
                style={styles.miniThumb}
                resizeMode="cover"
              />
            ) : (
              <View style={[styles.miniThumb, styles.miniThumbPlaceholder]}>
                <Ionicons name="home-outline" size={24} color={colors.border} />
              </View>
            )}

            {/* Info */}
            <View style={styles.miniInfo}>
              <Text style={styles.miniTitle} numberOfLines={1}>{selected.title}</Text>
              <Text style={styles.miniSub} numberOfLines={1}>
                {formatPropertyTitle(selected.type, selected.bhk_type)}
                {'  ·  '}
                {formatAddress(selected.area, selected.city)}
              </Text>
              <Text style={styles.miniPrice}>{formatRent(selected.price)}/mo</Text>
            </View>

            {/* Arrow */}
            <View style={styles.miniArrow}>
              <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
            </View>
          </TouchableOpacity>

          {/* Close */}
          <TouchableOpacity style={styles.miniClose} onPress={hideCard}>
            <Ionicons name="close" size={16} color={colors.textSecondary} />
          </TouchableOpacity>
        </Animated.View>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },

  // Price pin marker
  pin: {
    paddingHorizontal: spacing.sm,
    paddingVertical:   4,
    backgroundColor:   colors.card,
    borderRadius:      radius.full,
    borderWidth:       1.5,
    borderColor:       colors.border,
    shadowColor:       '#000',
    shadowOffset:      { width: 0, height: 2 },
    shadowOpacity:     0.3,
    shadowRadius:      3,
    elevation:         4,
  },
  pinSelected: {
    backgroundColor: colors.primary,
    borderColor:     colors.primary,
    transform:       [{ scale: 1.1 }],
  },
  pinText:     { ...typography.caption, color: colors.text, fontWeight: '700' },
  pinTextSelected: { color: colors.white },

  // Loading
  loadingOverlay: { position: 'absolute', top: 0, left: 0, right: 0, alignItems: 'center', pointerEvents: 'none' },
  loadingPill: {
    flexDirection:   'row',
    alignItems:      'center',
    gap:             spacing.sm,
    backgroundColor: colors.card,
    borderRadius:    radius.full,
    paddingHorizontal: spacing.md,
    paddingVertical:   spacing.sm,
    borderWidth:     1,
    borderColor:     colors.border,
  },
  loadingText: { ...typography.caption, color: colors.textSecondary },

  // Count badge
  countBadge: {
    position:        'absolute',
    left:            spacing.md,
    flexDirection:   'row',
    alignItems:      'center',
    gap:             4,
    backgroundColor: colors.card,
    borderRadius:    radius.full,
    paddingHorizontal: spacing.md,
    paddingVertical:   6,
    borderWidth:     1,
    borderColor:     colors.border,
  },
  countText: { ...typography.caption, color: colors.textSecondary, fontWeight: '600' },

  // My location FAB
  locationFab: {
    position:        'absolute',
    right:           spacing.md,
    width:           48,
    height:          48,
    borderRadius:    radius.full,
    backgroundColor: colors.card,
    alignItems:      'center',
    justifyContent:  'center',
    borderWidth:     1,
    borderColor:     colors.border,
    shadowColor:     '#000',
    shadowOffset:    { width: 0, height: 2 },
    shadowOpacity:   0.25,
    shadowRadius:    4,
    elevation:       5,
  },

  // Mini card
  miniCard: {
    position:        'absolute',
    left:            spacing.md,
    right:           spacing.md,
    backgroundColor: colors.card,
    borderRadius:    radius.xl,
    borderWidth:     1,
    borderColor:     colors.border,
    overflow:        'hidden',
    shadowColor:     '#000',
    shadowOffset:    { width: 0, height: -2 },
    shadowOpacity:   0.3,
    shadowRadius:    8,
    elevation:       10,
  },
  miniCardInner: {
    flexDirection: 'row',
    alignItems:    'center',
    padding:       spacing.sm,
    gap:           spacing.sm,
  },
  miniThumb: {
    width:        80,
    height:       70,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
  },
  miniThumbPlaceholder: { alignItems: 'center', justifyContent: 'center' },
  miniInfo: { flex: 1, gap: 4 },
  miniTitle: { ...typography.bodySmall, fontWeight: '600', color: colors.text },
  miniSub:   { ...typography.caption, color: colors.textMuted },
  miniPrice: { ...typography.bodySmall, color: colors.primary, fontWeight: '700', marginTop: 2 },
  miniArrow: { paddingRight: spacing.xs },
  miniClose: {
    position:        'absolute',
    top:             spacing.sm,
    right:           spacing.sm,
    width:           26,
    height:          26,
    borderRadius:    radius.full,
    backgroundColor: colors.surface,
    alignItems:      'center',
    justifyContent:  'center',
  },
})
