import React, { useState } from 'react'
import {
  ActivityIndicator, Image, KeyboardAvoidingView,
  Platform, ScrollView, StyleSheet, Switch, Text,
  TextInput, TouchableOpacity, View,
} from 'react-native'
import { Tabs, useRouter } from 'expo-router'
import * as ImagePicker from 'expo-image-picker'
import { Ionicons } from '@expo/vector-icons'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { colors, radius, spacing, typography } from '@/constants/theme'
import { supabase } from '@/lib/supabase'
import { toast } from '@/store/toastStore'
import { log } from '@/lib/logger'

// ── Constants ──────────────────────────────────────────────────────────────────

const TOTAL_STEPS = 5

const PROPERTY_TYPES: Array<{
  value: string; label: string; icon: keyof typeof Ionicons.glyphMap; desc: string; color: string
}> = [
  { value: 'room',       label: 'Room',       icon: 'bed-outline',       desc: 'Single / shared room',       color: '#f59e0b' },
  { value: 'flat',       label: 'Flat',        icon: 'business-outline',  desc: 'Apartment or flat',          color: '#10b981' },
  { value: 'home',       label: 'House',       icon: 'home-outline',      desc: 'Independent house / villa',  color: '#f97316' },
  { value: 'pg',         label: 'PG',          icon: 'people-outline',    desc: 'Paying guest accommodation', color: '#8b5cf6' },
  { value: 'hostel',     label: 'Hostel',      icon: 'shield-outline',    desc: 'Hostel for students/workers', color: '#0ea5e9' },
  { value: 'commercial', label: 'Commercial',  icon: 'storefront-outline', desc: 'Office / shop / warehouse',  color: '#64748b' },
]

const BHK_TYPES   = ['1 RK', '1 BHK', '2 BHK', '3 BHK', '4 BHK', '4+ BHK']
const FURNISHED   = [
  { value: 'furnished',      label: 'Furnished' },
  { value: 'semi_furnished', label: 'Semi-Furnished' },
  { value: 'unfurnished',    label: 'Unfurnished' },
]
const ELECTRICITY = [
  { value: 'extra',    label: 'Charged Separately' },
  { value: 'included', label: 'Included in Rent' },
  { value: 'fixed',    label: 'Fixed Monthly' },
]
const GENDER_OPTS = [
  { value: 'boys',  label: 'Boys Only' },
  { value: 'girls', label: 'Girls Only' },
  { value: 'both',  label: 'Co-ed' },
]
const ROOM_TYPES = [
  { value: '1_seater', label: 'Single (1-seater)' },
  { value: '2_seater', label: 'Double (2-seater)' },
  { value: '3_seater', label: 'Triple (3-seater)' },
]
const SERVICES = [
  'WiFi', 'Air Conditioning', 'Washing Machine', 'Geyser / Water Heater',
  'TV', 'Refrigerator', 'Microwave', 'Power Backup', 'Lift / Elevator',
  '24/7 Security', 'CCTV', 'Gym', 'Swimming Pool',
  'Car Parking', 'Bike Parking', 'Water Purifier',
  'Cooking Gas (Cylinder)', 'Gas Pipeline', 'Modular Kitchen',
  'Wardrobe', 'Study Table', 'Balcony', 'Garden',
]

// ── Form state ─────────────────────────────────────────────────────────────────

interface ListingForm {
  // Step 1
  type: string
  // Step 2
  title: string
  description: string
  // Step 3
  state: string
  city: string
  area: string
  pincode: string
  full_address: string
  // Step 4
  price: string
  security_deposit: string
  electricity_charges: string
  available_from: string
  // Step 5
  furnished_status: string
  floor: string
  total_floors: string
  area_sqft: string
  bhk_type: string
  num_bathrooms: string
  balcony: boolean
  parking: boolean
  garden: boolean
  kitchen_available: boolean
  gender_allowed: string
  room_type: string
  food_included: boolean
  open_time: string
  close_time: string
  available_services: string[]
}

const INITIAL_FORM: ListingForm = {
  type: '', title: '', description: '',
  state: '', city: '', area: '', pincode: '', full_address: '',
  price: '', security_deposit: '', electricity_charges: 'extra', available_from: '',
  furnished_status: 'unfurnished', floor: '', total_floors: '',
  area_sqft: '', bhk_type: '', num_bathrooms: '',
  balcony: false, parking: false, garden: false, kitchen_available: false,
  gender_allowed: '', room_type: '', food_included: false,
  open_time: '', close_time: '', available_services: [],
}

// ── Helper sub-components ──────────────────────────────────────────────────────

function FLabel({ children }: { children: string }) {
  return <Text style={s.label}>{children}</Text>
}

function FInput({
  label, value, onChangeText, placeholder, keyboardType, multiline, hint,
}: {
  label: string; value: string; onChangeText: (v: string) => void
  placeholder?: string; keyboardType?: 'default' | 'number-pad' | 'email-address' | 'phone-pad'
  multiline?: boolean; hint?: string
}) {
  const [focused, setFocused] = useState(false)
  return (
    <View style={s.fieldWrap}>
      <FLabel>{label}</FLabel>
      <TextInput
        style={[s.input, multiline && s.inputMulti, focused && s.inputFocused]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.textMuted}
        keyboardType={keyboardType ?? 'default'}
        multiline={multiline}
        numberOfLines={multiline ? 4 : 1}
        textAlignVertical={multiline ? 'top' : 'center'}
        returnKeyType={multiline ? 'default' : 'next'}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
      />
      {hint && <Text style={s.hint}>{hint}</Text>}
    </View>
  )
}

function ChipSelect({
  label, options, value, onChange,
}: {
  label: string
  options: Array<{ value: string; label: string }>
  value: string
  onChange: (v: string) => void
}) {
  return (
    <View style={s.fieldWrap}>
      <FLabel>{label}</FLabel>
      <View style={s.chipRow}>
        {options.map(o => (
          <TouchableOpacity
            key={o.value}
            style={[s.chip, value === o.value && s.chipActive]}
            onPress={() => onChange(o.value)}
            activeOpacity={0.75}
          >
            <Text style={[s.chipText, value === o.value && s.chipTextActive]}>
              {o.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  )
}

function BoolRow({ label, value, onChange }: {
  label: string; value: boolean; onChange: (v: boolean) => void
}) {
  return (
    <View style={s.boolRow}>
      <Text style={s.boolLabel}>{label}</Text>
      <Switch
        value={value}
        onValueChange={onChange}
        trackColor={{ false: colors.border, true: colors.primary + '55' }}
        thumbColor={value ? colors.primary : colors.textMuted}
      />
    </View>
  )
}

// ── Main Screen ────────────────────────────────────────────────────────────────

export default function AddListingScreen() {
  const router  = useRouter()
  const insets  = useSafeAreaInsets()

  const [step,       setStep]       = useState(1)
  const [form,       setForm]       = useState<ListingForm>(INITIAL_FORM)
  const [images,     setImages]     = useState<Array<{ uri: string }>>([])
  const [submitting, setSubmitting] = useState(false)

  const set = (key: keyof ListingForm, val: ListingForm[typeof key]) =>
    setForm(prev => ({ ...prev, [key]: val }))

  const toggleService = (s: string) => {
    setForm(prev => ({
      ...prev,
      available_services: prev.available_services.includes(s)
        ? prev.available_services.filter(x => x !== s)
        : [...prev.available_services, s],
    }))
  }

  // ── Validation ───────────────────────────────────────────────────────────────

  const validate = (): string | null => {
    if (step === 1 && !form.type)              return 'Please select a property type'
    if (step === 2 && form.title.trim().length < 5) return 'Title must be at least 5 characters'
    if (step === 3) {
      if (!form.city.trim())  return 'City is required'
      if (!form.state.trim()) return 'State is required'
    }
    if (step === 4) {
      const p = Number(form.price)
      if (!form.price || isNaN(p) || p <= 0) return 'Enter a valid monthly rent'
      const d = Number(form.security_deposit)
      if (form.security_deposit && (isNaN(d) || d < 0)) return 'Enter a valid deposit amount'
    }
    return null
  }

  const handleNext = () => {
    const err = validate()
    if (err) { toast.error(err); return }
    if (step < TOTAL_STEPS) setStep(s => s + 1)
    else handleSubmit()
  }

  const handleBack = () => {
    if (step > 1) setStep(s => s - 1)
    else router.back()
  }

  // ── Image picker ─────────────────────────────────────────────────────────────

  const pickImages = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync()
    if (status !== 'granted') { toast.error('Permission required to access photos'); return }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      quality: 0.7,
      selectionLimit: 8,
    })

    if (!result.canceled) {
      setImages(prev => {
        const combined = [...prev, ...result.assets.map(a => ({ uri: a.uri }))]
        return combined.slice(0, 8)
      })
    }
  }

  const removeImage = (idx: number) =>
    setImages(prev => prev.filter((_, i) => i !== idx))

  // ── Submit ───────────────────────────────────────────────────────────────────

  const handleSubmit = async () => {
    setSubmitting(true)
    log.api.info('Submitting new listing', { type: form.type, title: form.title })

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { toast.error('Session expired — please sign in again'); setSubmitting(false); return }

    // 1. Insert property
    const { data: property, error: propErr } = await supabase
      .from('properties')
      .insert({
        owner_id:            user.id,
        type:                form.type,
        title:               form.title.trim(),
        description:         form.description.trim() || null,
        price:               Number(form.price),
        security_deposit:    Number(form.security_deposit) || 0,
        electricity_charges: form.electricity_charges,
        floor:               form.floor || null,
        total_floors:        form.total_floors ? Number(form.total_floors) : null,
        furnished_status:    form.furnished_status,
        available_from:      form.available_from || null,
        state:               form.state.trim(),
        city:                form.city.trim(),
        area:                form.area.trim() || null,
        pincode:             form.pincode || null,
        full_address:        form.full_address.trim() || null,
        is_available:        true,
      })
      .select('id')
      .single()

    if (propErr || !property) {
      toast.error('Failed to create listing. Please try again.')
      log.api.error('Property insert failed', propErr?.message ?? 'no data')
      setSubmitting(false)
      return
    }

    const propertyId = property.id as string
    log.api.info('Property created', { propertyId })

    // 2. Insert property_details
    const detailsPayload: Record<string, unknown> = {
      property_id:          propertyId,
      bhk_type:             form.bhk_type || null,
      num_bathrooms:        form.num_bathrooms ? Number(form.num_bathrooms) : null,
      num_kitchens:         null,
      balcony:              form.balcony,
      parking:              form.parking,
      garden:               form.garden,
      area_sqft:            form.area_sqft ? Number(form.area_sqft) : null,
      gender_allowed:       form.gender_allowed || null,
      room_type:            form.room_type || null,
      food_included:        form.food_included,
      open_time:            form.open_time || null,
      close_time:           form.close_time || null,
      available_services:   form.available_services,
      kitchen_available:    form.kitchen_available,
      distance_from_market: null,
    }

    const { error: detailsErr } = await supabase
      .from('property_details')
      .insert(detailsPayload)

    if (detailsErr) {
      log.api.error('Details insert failed', detailsErr.message)
      // Non-fatal — property was created, details can be added later
    }

    // 3. Upload images
    for (let i = 0; i < images.length; i++) {
      const img = images[i]
      const ext  = img.uri.split('.').pop()?.toLowerCase() ?? 'jpg'
      const path = `${user.id}/${propertyId}/${Date.now()}_${i}.${ext}`

      try {
        const response = await fetch(img.uri)
        const blob     = await response.blob()

        const { data: uploadData, error: uploadErr } = await supabase.storage
          .from('property-images')
          .upload(path, blob, { contentType: `image/${ext}`, upsert: false })

        if (uploadErr) {
          log.api.error(`Image ${i} upload failed`, uploadErr.message)
          continue
        }

        const { data: { publicUrl } } = supabase.storage
          .from('property-images')
          .getPublicUrl(path)

        await supabase.from('property_media').insert({
          property_id: propertyId,
          url:         publicUrl,
          type:        'image',
          room_label:  null,
          order_index: i,
        })

        log.api.info(`Image ${i} uploaded`)
      } catch (e) {
        log.api.error(`Image ${i} exception`, String(e))
      }
    }

    toast.success('Listing submitted for review!')
    log.api.info('Listing submission complete', { propertyId })
    setSubmitting(false)
    router.replace('/(owner)/listings' as never)
  }

  // ── Step renderers ────────────────────────────────────────────────────────────

  const renderStep1 = () => (
    <View style={s.stepContent}>
      <Text style={s.stepTitle}>What are you listing?</Text>
      <Text style={s.stepSubtitle}>Choose the type that best describes your property</Text>
      <View style={s.typeGrid}>
        {PROPERTY_TYPES.map(pt => {
          const active = form.type === pt.value
          return (
            <TouchableOpacity
              key={pt.value}
              style={[s.typeCard, active && { borderColor: pt.color, backgroundColor: pt.color + '12' }]}
              onPress={() => set('type', pt.value)}
              activeOpacity={0.8}
            >
              <View style={[s.typeIcon, { backgroundColor: pt.color + '20' }]}>
                <Ionicons name={pt.icon} size={24} color={pt.color} />
              </View>
              <Text style={[s.typeLabel, active && { color: pt.color }]}>{pt.label}</Text>
              <Text style={s.typeDesc}>{pt.desc}</Text>
              {active && (
                <View style={[s.typeCheck, { backgroundColor: pt.color }]}>
                  <Ionicons name="checkmark" size={12} color={colors.white} />
                </View>
              )}
            </TouchableOpacity>
          )
        })}
      </View>
    </View>
  )

  const renderStep2 = () => (
    <View style={s.stepContent}>
      <Text style={s.stepTitle}>Tell us about your property</Text>
      <Text style={s.stepSubtitle}>A good title helps renters find you faster</Text>
      <FInput
        label="Property Title *"
        value={form.title}
        onChangeText={v => set('title', v)}
        placeholder="e.g. Spacious 2BHK near Metro Station"
        hint="Min 5 characters"
      />
      <FInput
        label="Description (optional)"
        value={form.description}
        onChangeText={v => set('description', v)}
        placeholder="Describe the property, its surroundings, what's nearby…"
        multiline
      />
    </View>
  )

  const renderStep3 = () => (
    <View style={s.stepContent}>
      <Text style={s.stepTitle}>Where is it located?</Text>
      <Text style={s.stepSubtitle}>Accurate location helps renters in your area find you</Text>
      <FInput
        label="City *"
        value={form.city}
        onChangeText={v => set('city', v)}
        placeholder="e.g. Mumbai"
      />
      <FInput
        label="State *"
        value={form.state}
        onChangeText={v => set('state', v)}
        placeholder="e.g. Maharashtra"
      />
      <FInput
        label="Area / Locality"
        value={form.area}
        onChangeText={v => set('area', v)}
        placeholder="e.g. Bandra West"
      />
      <FInput
        label="Pincode"
        value={form.pincode}
        onChangeText={v => set('pincode', v.replace(/\D/g, '').slice(0, 6))}
        placeholder="400050"
        keyboardType="number-pad"
      />
      <FInput
        label="Full Address (optional)"
        value={form.full_address}
        onChangeText={v => set('full_address', v)}
        placeholder="Building name, street, landmark…"
        multiline
      />
    </View>
  )

  const renderStep4 = () => (
    <View style={s.stepContent}>
      <Text style={s.stepTitle}>Pricing & Availability</Text>
      <Text style={s.stepSubtitle}>Set a competitive price to attract renters</Text>
      <FInput
        label="Monthly Rent (₹) *"
        value={form.price}
        onChangeText={v => set('price', v.replace(/\D/g, ''))}
        placeholder="e.g. 15000"
        keyboardType="number-pad"
      />
      <FInput
        label="Security Deposit (₹)"
        value={form.security_deposit}
        onChangeText={v => set('security_deposit', v.replace(/\D/g, ''))}
        placeholder="e.g. 30000"
        keyboardType="number-pad"
      />
      <ChipSelect
        label="Electricity Charges *"
        options={ELECTRICITY}
        value={form.electricity_charges}
        onChange={v => set('electricity_charges', v)}
      />
      <FInput
        label="Available From"
        value={form.available_from}
        onChangeText={v => set('available_from', v)}
        placeholder="YYYY-MM-DD  (leave blank for Immediately)"
        hint="Format: 2026-06-01"
      />
    </View>
  )

  const renderStep5 = () => {
    const type = form.type
    const isFlatHome   = type === 'flat' || type === 'home'
    const isPgHostel   = type === 'pg'   || type === 'hostel'

    return (
      <View style={s.stepContent}>
        <Text style={s.stepTitle}>Property Details</Text>
        <Text style={s.stepSubtitle}>Fill in what applies — more info = more inquiries</Text>

        {/* Furnishing */}
        <ChipSelect
          label="Furnishing *"
          options={FURNISHED}
          value={form.furnished_status}
          onChange={v => set('furnished_status', v)}
        />

        {/* BHK (flat / home) */}
        {isFlatHome && (
          <ChipSelect
            label="BHK Type"
            options={BHK_TYPES.map(b => ({ value: b, label: b }))}
            value={form.bhk_type}
            onChange={v => set('bhk_type', v)}
          />
        )}

        {/* PG / Hostel specifics */}
        {isPgHostel && (
          <>
            <ChipSelect
              label="Gender Allowed"
              options={GENDER_OPTS}
              value={form.gender_allowed}
              onChange={v => set('gender_allowed', v)}
            />
            <ChipSelect
              label="Room Type"
              options={ROOM_TYPES}
              value={form.room_type}
              onChange={v => set('room_type', v)}
            />
          </>
        )}

        {/* Floor */}
        <View style={s.rowTwo}>
          <View style={{ flex: 1 }}>
            <FInput
              label="Floor No."
              value={form.floor}
              onChangeText={v => set('floor', v)}
              placeholder="e.g. 3"
              keyboardType="number-pad"
            />
          </View>
          <View style={{ flex: 1 }}>
            <FInput
              label="Total Floors"
              value={form.total_floors}
              onChangeText={v => set('total_floors', v.replace(/\D/g, ''))}
              placeholder="e.g. 10"
              keyboardType="number-pad"
            />
          </View>
        </View>

        {/* Area sqft */}
        <FInput
          label="Area (sq.ft)"
          value={form.area_sqft}
          onChangeText={v => set('area_sqft', v.replace(/\D/g, ''))}
          placeholder="e.g. 850"
          keyboardType="number-pad"
        />

        {/* Toggle features */}
        <View style={s.fieldWrap}>
          <FLabel>Features</FLabel>
          <View style={s.toggleCard}>
            <BoolRow label="Balcony"           value={form.balcony}           onChange={v => set('balcony', v)} />
            <BoolRow label="Parking"           value={form.parking}           onChange={v => set('parking', v)} />
            <BoolRow label="Garden / Terrace"  value={form.garden}            onChange={v => set('garden', v)} />
            <BoolRow label="Kitchen Available" value={form.kitchen_available} onChange={v => set('kitchen_available', v)} />
            {isPgHostel && (
              <BoolRow label="Meals Included"  value={form.food_included}     onChange={v => set('food_included', v)} />
            )}
          </View>
        </View>

        {/* PG timings */}
        {isPgHostel && (
          <View style={s.rowTwo}>
            <View style={{ flex: 1 }}>
              <FInput
                label="Open Time"
                value={form.open_time}
                onChangeText={v => set('open_time', v)}
                placeholder="06:00 AM"
              />
            </View>
            <View style={{ flex: 1 }}>
              <FInput
                label="Close Time"
                value={form.close_time}
                onChangeText={v => set('close_time', v)}
                placeholder="10:00 PM"
              />
            </View>
          </View>
        )}

        {/* Amenities */}
        <View style={s.fieldWrap}>
          <FLabel>Amenities & Services</FLabel>
          <View style={s.serviceGrid}>
            {SERVICES.map(sv => {
              const on = form.available_services.includes(sv)
              return (
                <TouchableOpacity
                  key={sv}
                  style={[s.serviceChip, on && s.serviceChipOn]}
                  onPress={() => toggleService(sv)}
                  activeOpacity={0.75}
                >
                  {on && <Ionicons name="checkmark" size={12} color={colors.primary} />}
                  <Text style={[s.serviceText, on && s.serviceTextOn]}>{sv}</Text>
                </TouchableOpacity>
              )
            })}
          </View>
        </View>

        {/* Photos */}
        <View style={s.fieldWrap}>
          <FLabel>Photos (optional)</FLabel>
          <View style={s.photoGrid}>
            {images.map((img, idx) => (
              <View key={idx} style={s.photoThumb}>
                <Image source={{ uri: img.uri }} style={s.photoImg} />
                <TouchableOpacity
                  style={s.photoRemove}
                  onPress={() => removeImage(idx)}
                >
                  <Ionicons name="close" size={12} color={colors.white} />
                </TouchableOpacity>
              </View>
            ))}
            {images.length < 8 && (
              <TouchableOpacity style={s.photoAdd} onPress={pickImages} activeOpacity={0.8}>
                <Ionicons name="camera-outline" size={24} color={colors.textMuted} />
                <Text style={s.photoAddText}>Add{'\n'}Photos</Text>
              </TouchableOpacity>
            )}
          </View>
          <Text style={s.hint}>Up to 8 photos · First photo becomes the cover image</Text>
        </View>
      </View>
    )
  }

  const stepContent = [
    renderStep1, renderStep2, renderStep3, renderStep4, renderStep5,
  ]

  return (
    <>
      <Tabs.Screen options={{ tabBarStyle: { display: 'none' }, headerShown: false }} />

      <KeyboardAvoidingView
        style={styles.screen}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}
      >
        {/* Header */}
        <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={handleBack}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="arrow-back" size={22} color={colors.text} />
          </TouchableOpacity>

          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle}>Add Listing</Text>
            <Text style={styles.headerStep}>Step {step} of {TOTAL_STEPS}</Text>
          </View>

          {/* Spacer to balance back button */}
          <View style={{ width: 36 }} />
        </View>

        {/* Progress bar */}
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${(step / TOTAL_STEPS) * 100}%` }]} />
        </View>

        {/* Step content */}
        <ScrollView
          style={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: spacing.xl }}
        >
          {stepContent[step - 1]?.()}
        </ScrollView>

        {/* Bottom navigation */}
        <View style={[styles.navBar, { paddingBottom: insets.bottom + spacing.sm }]}>
          {step > 1 && (
            <TouchableOpacity style={styles.navBack} onPress={handleBack} activeOpacity={0.8}>
              <Ionicons name="arrow-back" size={18} color={colors.textSecondary} />
              <Text style={styles.navBackText}>Back</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={[styles.navNext, step === 1 && styles.navNextFull, submitting && styles.navNextDisabled]}
            onPress={handleNext}
            disabled={submitting}
            activeOpacity={0.85}
          >
            {submitting ? (
              <ActivityIndicator size="small" color={colors.white} />
            ) : step < TOTAL_STEPS ? (
              <>
                <Text style={styles.navNextText}>Next</Text>
                <Ionicons name="arrow-forward" size={18} color={colors.white} />
              </>
            ) : (
              <>
                <Ionicons name="checkmark-circle-outline" size={18} color={colors.white} />
                <Text style={styles.navNextText}>Submit Listing</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </>
  )
}

// ── Styles (split: outer `styles` for layout, inner `s` for form elements) ────

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection:     'row',
    alignItems:        'center',
    paddingHorizontal: spacing.lg,
    paddingBottom:     spacing.sm,
    gap:               spacing.sm,
  },
  backBtn: {
    width:           36,
    height:          36,
    borderRadius:    radius.full,
    backgroundColor: colors.surface,
    alignItems:      'center',
    justifyContent:  'center',
  },
  headerCenter: { flex: 1, alignItems: 'center' },
  headerTitle:  { ...typography.bodyMedium, fontWeight: '700' },
  headerStep:   { ...typography.caption, color: colors.textMuted },

  progressTrack: {
    height:          3,
    backgroundColor: colors.border,
    marginHorizontal: spacing.lg,
    borderRadius:    2,
    marginBottom:    spacing.sm,
  },
  progressFill: {
    height:          3,
    backgroundColor: colors.primary,
    borderRadius:    2,
  },

  scroll: { flex: 1 },

  navBar: {
    flexDirection:     'row',
    gap:               spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingTop:        spacing.sm,
    borderTopWidth:    1,
    borderTopColor:    colors.border,
    backgroundColor:   colors.background,
  },
  navBack: {
    flexDirection:   'row',
    alignItems:      'center',
    gap:             spacing.xs,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius:    radius.md,
    backgroundColor: colors.surface,
    borderWidth:     1,
    borderColor:     colors.border,
  },
  navBackText:     { ...typography.bodySmall, color: colors.textSecondary, fontWeight: '600' },
  navNext: {
    flex:            1,
    flexDirection:   'row',
    alignItems:      'center',
    justifyContent:  'center',
    gap:             spacing.sm,
    paddingVertical: spacing.md,
    borderRadius:    radius.md,
    backgroundColor: colors.primary,
  },
  navNextFull:     { flex: 1 },
  navNextDisabled: { opacity: 0.6 },
  navNextText:     { ...typography.bodySmall, color: colors.white, fontWeight: '700' },
})

// Form-specific styles (prefixed `s.` to keep separate from layout `styles.`)
const s = StyleSheet.create({
  stepContent: { paddingHorizontal: spacing.lg, paddingTop: spacing.md },
  stepTitle:   { ...typography.h3, marginBottom: spacing.xs },
  stepSubtitle:{ ...typography.bodySmall, color: colors.textMuted, marginBottom: spacing.lg, lineHeight: 20 },

  // Type selector grid
  typeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  typeCard: {
    width:           '47%',
    backgroundColor: colors.card,
    borderRadius:    radius.lg,
    borderWidth:     1.5,
    borderColor:     colors.border,
    padding:         spacing.md,
    gap:             4,
    position:        'relative',
  },
  typeIcon: {
    width:           44,
    height:          44,
    borderRadius:    radius.md,
    alignItems:      'center',
    justifyContent:  'center',
    marginBottom:    spacing.xs,
  },
  typeLabel: { ...typography.bodySmall, fontWeight: '700', color: colors.text },
  typeDesc:  { ...typography.caption,  color: colors.textMuted, lineHeight: 15 },
  typeCheck: {
    position:     'absolute',
    top:          spacing.sm,
    right:        spacing.sm,
    width:        20,
    height:       20,
    borderRadius: radius.full,
    alignItems:   'center',
    justifyContent: 'center',
  },

  // Field wrapper
  fieldWrap: { marginBottom: spacing.md },
  label: {
    ...typography.label,
    color:         colors.textSecondary,
    marginBottom:  spacing.xs,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  hint: { ...typography.caption, color: colors.textMuted, marginTop: 4 },

  // Text input
  input: {
    ...typography.body,
    fontSize:          15,
    color:             colors.text,
    backgroundColor:   colors.surface,
    borderWidth:       1.5,
    borderColor:       colors.border,
    borderRadius:      radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical:   spacing.sm,
    height:            48,
  },
  inputMulti:   { height: 100, paddingTop: spacing.sm },
  inputFocused: { borderColor: colors.primary },

  // Chip selector
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical:   spacing.xs,
    borderRadius:      radius.full,
    borderWidth:       1.5,
    borderColor:       colors.border,
    backgroundColor:   colors.surface,
  },
  chipActive:     { borderColor: colors.primary, backgroundColor: colors.primaryLight },
  chipText:       { ...typography.bodySmall, color: colors.textSecondary, fontWeight: '500' },
  chipTextActive: { color: colors.primary, fontWeight: '700' },

  // Boolean row
  boolRow: {
    flexDirection:     'row',
    alignItems:        'center',
    justifyContent:    'space-between',
    paddingVertical:   spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  boolLabel: { ...typography.body, fontSize: 15 },

  toggleCard: {
    backgroundColor: colors.card,
    borderRadius:    radius.lg,
    borderWidth:     1,
    borderColor:     colors.border,
    paddingHorizontal: spacing.md,
    overflow:        'hidden',
  },

  // Two-column row
  rowTwo: { flexDirection: 'row', gap: spacing.sm },

  // Services grid
  serviceGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  serviceChip: {
    flexDirection:     'row',
    alignItems:        'center',
    gap:               4,
    paddingHorizontal: spacing.sm,
    paddingVertical:   6,
    borderRadius:      radius.full,
    borderWidth:       1.5,
    borderColor:       colors.border,
    backgroundColor:   colors.surface,
  },
  serviceChipOn:  { borderColor: colors.primary, backgroundColor: colors.primaryLight },
  serviceText:    { ...typography.caption, color: colors.textSecondary, fontWeight: '500' },
  serviceTextOn:  { color: colors.primary, fontWeight: '700' },

  // Photos
  photoGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  photoThumb: {
    width:        80,
    height:       80,
    borderRadius: radius.md,
    position:     'relative',
  },
  photoImg: { width: '100%', height: '100%', borderRadius: radius.md },
  photoRemove: {
    position:        'absolute',
    top:             -6,
    right:           -6,
    width:           22,
    height:          22,
    borderRadius:    radius.full,
    backgroundColor: colors.error,
    alignItems:      'center',
    justifyContent:  'center',
  },
  photoAdd: {
    width:           80,
    height:          80,
    borderRadius:    radius.md,
    borderWidth:     1.5,
    borderColor:     colors.border,
    borderStyle:     'dashed',
    alignItems:      'center',
    justifyContent:  'center',
    gap:             2,
    backgroundColor: colors.surface,
  },
  photoAddText: {
    ...typography.caption,
    color:     colors.textMuted,
    textAlign: 'center',
    lineHeight: 14,
  },
})
