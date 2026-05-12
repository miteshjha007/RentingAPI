import React from 'react'
import {
  Image, StyleSheet, Text, TouchableOpacity, View, type ViewStyle,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { LinearGradient } from 'expo-linear-gradient'
import { colors, radius, spacing, typography } from '@/constants/theme'
import { formatRentLabel, formatPropertyTitle, formatAddress } from '@/lib/format'

// Minimal shape required — matches PropertyCard from shared types
export interface PropertyCardData {
  id:               string
  type:             string
  title:            string
  price:            number
  city:             string
  area:             string | null
  floor:            string | null
  furnished_status: string
  available_from:   string | null
  cover_image:      string | null
  bhk_type:         string | null
  gender_allowed:   string | null
}

interface PropertyCardProps {
  property:  PropertyCardData
  onPress:   () => void
  onSave?:   () => void
  isSaved?:  boolean
  style?:    ViewStyle
  horizontal?: boolean
}

const TYPE_COLOR: Record<string, string> = {
  pg:       '#8b5cf6',
  hostel:   '#0ea5e9',
  room:     '#f59e0b',
  flat:     '#10b981',
  home:     '#f97316',
  commercial:'#64748b',
}

export function PropertyCard({
  property,
  onPress,
  onSave,
  isSaved = false,
  style,
  horizontal = false,
}: PropertyCardProps) {
  const typeColor = TYPE_COLOR[property.type] ?? colors.primary

  return (
    <TouchableOpacity
      activeOpacity={0.88}
      onPress={onPress}
      style={[styles.card, horizontal && styles.cardHorizontal, style]}
    >
      {/* Cover image */}
      <View style={[styles.imageWrap, horizontal && styles.imageWrapHorizontal]}>
        {property.cover_image ? (
          <Image
            source={{ uri: property.cover_image }}
            style={styles.image}
            resizeMode="cover"
          />
        ) : (
          <View style={[styles.image, styles.imagePlaceholder]}>
            <Ionicons name="home-outline" size={40} color={colors.border} />
          </View>
        )}

        {/* Bottom gradient */}
        <LinearGradient
          colors={['transparent', 'rgba(0,0,0,0.55)']}
          style={styles.imageGradient}
          pointerEvents="none"
        />

        {/* Type badge */}
        <View style={[styles.typeBadge, { backgroundColor: typeColor + '22', borderColor: typeColor + '55' }]}>
          <Text style={[styles.typeBadgeText, { color: typeColor }]}>
            {formatPropertyTitle(property.type, property.bhk_type)}
          </Text>
        </View>

        {/* Save button */}
        {onSave && (
          <TouchableOpacity
            style={styles.saveBtn}
            onPress={(e) => { e.stopPropagation(); onSave() }}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons
              name={isSaved ? 'heart' : 'heart-outline'}
              size={20}
              color={isSaved ? '#f87171' : colors.white}
            />
          </TouchableOpacity>
        )}
      </View>

      {/* Info */}
      <View style={styles.info}>
        <Text style={styles.title} numberOfLines={1}>{property.title}</Text>

        <View style={styles.locationRow}>
          <Ionicons name="location-outline" size={13} color={colors.textMuted} />
          <Text style={styles.location} numberOfLines={1}>
            {formatAddress(property.area, property.city)}
          </Text>
        </View>

        <View style={styles.footer}>
          <Text style={styles.price}>{formatRentLabel(property.price)}</Text>
          <View style={styles.tags}>
            {property.floor && (
              <Tag icon="layers-outline" label={`Floor ${property.floor}`} />
            )}
            <Tag
              icon="cube-outline"
              label={property.furnished_status === 'furnished'
                ? 'Furnished'
                : property.furnished_status === 'semi_furnished'
                ? 'Semi'
                : 'Unfurnished'
              }
            />
            {property.gender_allowed && property.type === 'pg' && (
              <Tag
                icon="person-outline"
                label={property.gender_allowed === 'boys' ? 'Boys' : property.gender_allowed === 'girls' ? 'Girls' : 'Co-ed'}
              />
            )}
          </View>
        </View>
      </View>
    </TouchableOpacity>
  )
}

function Tag({ icon, label }: { icon: keyof typeof Ionicons.glyphMap; label: string }) {
  return (
    <View style={styles.tag}>
      <Ionicons name={icon} size={11} color={colors.textMuted} />
      <Text style={styles.tagText}>{label}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius:    radius.xl,
    borderWidth:     1,
    borderColor:     colors.border,
    overflow:        'hidden',
  },
  cardHorizontal: {
    flexDirection: 'row',
    height:        120,
  },
  imageWrap: {
    width:    '100%',
    height:   180,
    position: 'relative',
  },
  imageWrapHorizontal: {
    width:  120,
    height: '100%',
  },
  image: {
    width:  '100%',
    height: '100%',
  },
  imagePlaceholder: {
    backgroundColor: colors.surface,
    alignItems:      'center',
    justifyContent:  'center',
  },
  imageGradient: {
    position: 'absolute',
    bottom: 0, left: 0, right: 0,
    height: 60,
  },
  typeBadge: {
    position:     'absolute',
    top:          spacing.sm,
    left:         spacing.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical:   3,
    borderRadius: radius.full,
    borderWidth:  1,
  },
  typeBadgeText: {
    ...typography.caption,
    fontWeight: '600',
  },
  saveBtn: {
    position:        'absolute',
    top:             spacing.sm,
    right:           spacing.sm,
    width:           34,
    height:          34,
    borderRadius:    radius.full,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems:      'center',
    justifyContent:  'center',
  },
  info: {
    padding:    spacing.md,
    gap:        spacing.xs,
    flex:       1,
  },
  title: {
    ...typography.bodyMedium,
    fontWeight: '600',
  },
  locationRow: {
    flexDirection: 'row',
    alignItems:    'center',
    gap:           3,
  },
  location: {
    ...typography.caption,
    color: colors.textMuted,
    flex:  1,
  },
  footer: {
    flexDirection:  'row',
    alignItems:     'center',
    justifyContent: 'space-between',
    flexWrap:       'wrap',
    gap:            spacing.xs,
    marginTop:      spacing.xs,
  },
  price: {
    ...typography.bodyMedium,
    color:      colors.primary,
    fontWeight: '700',
  },
  tags: {
    flexDirection: 'row',
    gap:           spacing.xs,
    flexWrap:      'wrap',
  },
  tag: {
    flexDirection:     'row',
    alignItems:        'center',
    gap:               3,
    backgroundColor:   colors.surface,
    borderRadius:      radius.full,
    paddingHorizontal: spacing.sm,
    paddingVertical:   3,
    borderWidth:       1,
    borderColor:       colors.border,
  },
  tagText: {
    ...typography.caption,
    color: colors.textMuted,
  },
})
