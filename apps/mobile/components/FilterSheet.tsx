import React, { useEffect, useRef, useState } from 'react'
import {
  Animated, Modal, ScrollView, StyleSheet,
  Text, TextInput, TouchableOpacity, View,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { colors, radius, spacing, typography } from '@/constants/theme'

export interface Filters {
  type?:             string
  min_price?:        number
  max_price?:        number
  furnished_status?: string
  gender_allowed?:   string
  city?:             string
}

interface FilterSheetProps {
  visible:   boolean
  onClose:   () => void
  filters:   Filters
  onApply:   (f: Filters) => void
}

const TYPES = [
  { value: '',          label: 'All Types' },
  { value: 'room',      label: 'Room' },
  { value: 'flat',      label: 'Flat' },
  { value: 'home',      label: 'House' },
  { value: 'pg',        label: 'PG' },
  { value: 'hostel',    label: 'Hostel' },
  { value: 'commercial',label: 'Commercial' },
]

const FURNISHED = [
  { value: '',              label: 'Any' },
  { value: 'furnished',     label: 'Furnished' },
  { value: 'semi_furnished',label: 'Semi' },
  { value: 'unfurnished',   label: 'Unfurnished' },
]

const GENDER = [
  { value: '',      label: 'Any' },
  { value: 'boys',  label: 'Boys' },
  { value: 'girls', label: 'Girls' },
  { value: 'both',  label: 'Co-ed' },
]

export function FilterSheet({ visible, onClose, filters, onApply }: FilterSheetProps) {
  const insets    = useSafeAreaInsets()
  const slideAnim = useRef(new Animated.Value(600)).current
  const [local, setLocal] = useState<Filters>(filters)

  useEffect(() => {
    setLocal(filters)
    Animated.spring(slideAnim, {
      toValue:     visible ? 0 : 600,
      damping:     24,
      stiffness:   220,
      useNativeDriver: true,
    }).start()
  }, [visible, filters])

  const set = (patch: Partial<Filters>) =>
    setLocal(prev => ({ ...prev, ...patch }))

  const handleApply = () => {
    // Strip empty strings from filters
    const clean = Object.fromEntries(
      Object.entries(local).filter(([, v]) => v !== '' && v !== undefined && v !== null)
    ) as Filters
    onApply(clean)
    onClose()
  }

  const handleClear = () => {
    setLocal({})
    onApply({})
    onClose()
  }

  const activeCount = Object.values(local).filter(v => v !== '' && v !== undefined).length

  return (
    <Modal transparent animationType="none" visible={visible} onRequestClose={onClose}>
      {/* Backdrop */}
      <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose} />

      {/* Sheet */}
      <Animated.View
        style={[
          styles.sheet,
          { paddingBottom: insets.bottom + spacing.md },
          { transform: [{ translateY: slideAnim }] },
        ]}
      >
        {/* Handle */}
        <View style={styles.handle} />

        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Filters</Text>
          {activeCount > 0 && (
            <TouchableOpacity onPress={handleClear}>
              <Text style={styles.clearBtn}>Clear all ({activeCount})</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity onPress={onClose} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Ionicons name="close" size={22} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} style={styles.body}>
          {/* Property Type */}
          <Section label="Property Type">
            <ChipRow
              options={TYPES}
              selected={local.type ?? ''}
              onSelect={v => set({ type: v })}
            />
          </Section>

          {/* Price Range */}
          <Section label="Monthly Rent (₹)">
            <View style={styles.priceRow}>
              <PriceInput
                placeholder="Min e.g. 5000"
                value={local.min_price ? String(local.min_price) : ''}
                onChange={v => set({ min_price: v ? Number(v) : undefined })}
              />
              <View style={styles.priceSep} />
              <PriceInput
                placeholder="Max e.g. 20000"
                value={local.max_price ? String(local.max_price) : ''}
                onChange={v => set({ max_price: v ? Number(v) : undefined })}
              />
            </View>
          </Section>

          {/* Furnished */}
          <Section label="Furnishing">
            <ChipRow
              options={FURNISHED}
              selected={local.furnished_status ?? ''}
              onSelect={v => set({ furnished_status: v })}
            />
          </Section>

          {/* Gender — only relevant for PG */}
          {(!local.type || local.type === 'pg') && (
            <Section label="Gender (PG)">
              <ChipRow
                options={GENDER}
                selected={local.gender_allowed ?? ''}
                onSelect={v => set({ gender_allowed: v })}
              />
            </Section>
          )}
        </ScrollView>

        {/* Apply */}
        <TouchableOpacity style={styles.applyBtn} onPress={handleApply} activeOpacity={0.85}>
          <Text style={styles.applyText}>
            Show Results{activeCount > 0 ? ` (${activeCount} active)` : ''}
          </Text>
        </TouchableOpacity>
      </Animated.View>
    </Modal>
  )
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionLabel}>{label}</Text>
      {children}
    </View>
  )
}

function ChipRow({
  options, selected, onSelect,
}: {
  options: { value: string; label: string }[]
  selected: string
  onSelect: (v: string) => void
}) {
  return (
    <View style={styles.chips}>
      {options.map(o => {
        const active = selected === o.value
        return (
          <TouchableOpacity
            key={o.value}
            style={[styles.chip, active && styles.chipActive]}
            onPress={() => onSelect(o.value)}
            activeOpacity={0.75}
          >
            <Text style={[styles.chipText, active && styles.chipTextActive]}>
              {o.label}
            </Text>
          </TouchableOpacity>
        )
      })}
    </View>
  )
}

function PriceInput({
  placeholder, value, onChange,
}: {
  placeholder: string; value: string; onChange: (v: string) => void
}) {
  return (
    <TextInput
      style={styles.priceInput}
      placeholder={placeholder}
      placeholderTextColor={colors.textMuted}
      value={value}
      onChangeText={v => onChange(v.replace(/\D/g, ''))}
      keyboardType="number-pad"
      returnKeyType="done"
    />
  )
}

const styles = StyleSheet.create({
  backdrop: {
    flex:            1,
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  sheet: {
    position:        'absolute',
    bottom:          0,
    left:            0,
    right:           0,
    backgroundColor: colors.card,
    borderTopLeftRadius:  radius.xl,
    borderTopRightRadius: radius.xl,
    paddingHorizontal: spacing.lg,
    paddingTop:        spacing.sm,
    maxHeight:         '85%',
  },
  handle: {
    alignSelf:       'center',
    width:           40,
    height:          4,
    borderRadius:    2,
    backgroundColor: colors.border,
    marginBottom:    spacing.md,
  },
  header: {
    flexDirection:  'row',
    alignItems:     'center',
    marginBottom:   spacing.md,
    gap:            spacing.sm,
  },
  title: {
    ...typography.h3,
    flex: 1,
  },
  clearBtn: {
    ...typography.bodySmall,
    color: colors.primary,
    fontWeight: '600',
  },
  body: { flex: 0 },
  section: {
    marginBottom: spacing.lg,
    gap:          spacing.sm,
  },
  sectionLabel: {
    ...typography.label,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  chips: {
    flexDirection: 'row',
    flexWrap:      'wrap',
    gap:           spacing.sm,
  },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical:   spacing.sm - 2,
    borderRadius:      radius.full,
    borderWidth:       1.5,
    borderColor:       colors.border,
    backgroundColor:   colors.surface,
  },
  chipActive: {
    borderColor:     colors.primary,
    backgroundColor: colors.primaryLight,
  },
  chipText: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  chipTextActive: {
    color: colors.primary,
    fontWeight: '700',
  },
  priceRow: {
    flexDirection: 'row',
    alignItems:    'center',
    gap:           spacing.sm,
  },
  priceSep: {
    width:           20,
    height:          1.5,
    backgroundColor: colors.border,
  },
  priceInput: {
    flex:            1,
    ...typography.body,
    color:           colors.text,
    backgroundColor: colors.surface,
    borderWidth:     1.5,
    borderColor:     colors.border,
    borderRadius:    radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical:   spacing.sm,
  },
  applyBtn: {
    backgroundColor: colors.primary,
    borderRadius:    radius.md,
    paddingVertical: spacing.md,
    alignItems:      'center',
    marginTop:       spacing.md,
  },
  applyText: {
    ...typography.bodyMedium,
    color:      colors.white,
    fontWeight: '700',
  },
})
