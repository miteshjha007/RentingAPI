import React, { useRef, useState } from 'react'
import {
  Dimensions, FlatList, Image, StyleSheet, Text,
  TouchableOpacity, View,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { colors, radius, spacing, typography } from '@/constants/theme'

const { width: SCREEN_W } = Dimensions.get('window')

interface CarouselItem {
  url:        string
  type?:      'image' | 'video'
  room_label?: string | null
}

interface ImageCarouselProps {
  items:  CarouselItem[]
  height?: number
}

export function ImageCarousel({ items, height = 280 }: ImageCarouselProps) {
  const [activeIndex, setActiveIndex] = useState(0)
  const listRef = useRef<FlatList>(null)

  if (items.length === 0) {
    return (
      <View style={[styles.placeholder, { height }]}>
        <Ionicons name="image-outline" size={48} color={colors.border} />
        <Text style={styles.noImageText}>No photos yet</Text>
      </View>
    )
  }

  const onScroll = (e: { nativeEvent: { contentOffset: { x: number } } }) => {
    const idx = Math.round(e.nativeEvent.contentOffset.x / SCREEN_W)
    setActiveIndex(idx)
  }

  const current = items[activeIndex]

  return (
    <View style={{ height }}>
      <FlatList
        ref={listRef}
        data={items}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={onScroll}
        scrollEventThrottle={16}
        keyExtractor={(_, i) => String(i)}
        renderItem={({ item }) => (
          <View style={{ width: SCREEN_W, height }}>
            {item.type === 'video' ? (
              // Thumbnail fallback for video — player added in later step
              <View style={[styles.videoPlaceholder, { height }]}>
                <Ionicons name="play-circle" size={56} color={colors.white} />
                <Text style={styles.videoLabel}>Video</Text>
              </View>
            ) : (
              <Image
                source={{ uri: item.url }}
                style={{ width: SCREEN_W, height }}
                resizeMode="cover"
              />
            )}
          </View>
        )}
      />

      {/* Room label overlay */}
      {current?.room_label && (
        <View style={styles.labelOverlay}>
          <Text style={styles.labelText}>
            {current.room_label.replace(/_/g, ' ')}
          </Text>
        </View>
      )}

      {/* Counter pill */}
      <View style={styles.counter}>
        <Ionicons name="images-outline" size={12} color={colors.white} />
        <Text style={styles.counterText}>{activeIndex + 1}/{items.length}</Text>
      </View>

      {/* Dot indicators */}
      {items.length > 1 && items.length <= 10 && (
        <View style={styles.dots}>
          {items.map((_, i) => (
            <TouchableOpacity
              key={i}
              onPress={() => {
                listRef.current?.scrollToIndex({ index: i, animated: true })
                setActiveIndex(i)
              }}
            >
              <View style={[styles.dot, i === activeIndex && styles.dotActive]} />
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  placeholder: {
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  noImageText: {
    ...typography.bodySmall,
    color: colors.textMuted,
  },
  videoPlaceholder: {
    width: SCREEN_W,
    backgroundColor: '#0a0a0a',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  videoLabel: {
    ...typography.label,
    color: colors.white,
  },
  labelOverlay: {
    position:      'absolute',
    bottom:        spacing.xl + 4,
    left:          spacing.md,
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderRadius:  radius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical:   3,
  },
  labelText: {
    ...typography.caption,
    color:      colors.white,
    fontWeight: '500',
    textTransform: 'capitalize',
  },
  counter: {
    position:        'absolute',
    top:             spacing.md,
    right:           spacing.md,
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderRadius:    radius.full,
    flexDirection:   'row',
    alignItems:      'center',
    gap:             4,
    paddingHorizontal: spacing.sm,
    paddingVertical:   4,
  },
  counterText: {
    ...typography.caption,
    color: colors.white,
    fontWeight: '600',
  },
  dots: {
    position:       'absolute',
    bottom:         spacing.sm,
    left:           0,
    right:          0,
    flexDirection:  'row',
    justifyContent: 'center',
    gap:            5,
  },
  dot: {
    width:         6,
    height:        6,
    borderRadius:  3,
    backgroundColor: 'rgba(255,255,255,0.4)',
  },
  dotActive: {
    backgroundColor: colors.white,
    width:           16,
  },
})
