import React, { useState } from 'react'
import {
  ActivityIndicator, Alert, Keyboard, Linking,
  ScrollView, StyleSheet, Text, TextInput,
  TouchableOpacity, View,
} from 'react-native'
import { Tabs, useLocalSearchParams, useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { colors, radius, spacing, typography } from '@/constants/theme'
import { supabase } from '@/lib/supabase'
import { formatRent, formatPhone } from '@/lib/format'
import { log } from '@/lib/logger'
import { toast } from '@/store/toastStore'

type ContactMethod = 'whatsapp' | 'call' | 'chat'

const WHATSAPP_TEMPLATE = (title: string, price: number) =>
  `Hi, I found your listing "${title}" (${formatRent(price)}/mo) on RentEasy and I'm interested. Could you please share more details?`

export default function ContactScreen() {
  const router  = useRouter()
  const insets  = useSafeAreaInsets()

  const {
    propertyId,
    propertyTitle,
    ownerName,
    ownerPhone,
    price,
  } = useLocalSearchParams<{
    propertyId:    string
    propertyTitle: string
    ownerName:     string
    ownerPhone:    string
    price:         string
  }>()

  const priceNum = Number(price ?? '0')

  const [activeMethod, setActiveMethod] = useState<ContactMethod>('whatsapp')
  const [message,  setMessage]  = useState('')
  const [sending,  setSending]  = useState(false)

  // ── Contact actions ──────────────────────────────────────────────────────────

  const openWhatsApp = async () => {
    const phone = ownerPhone?.replace(/\D/g, '')
    if (!phone) { toast.error('Owner phone number is not available'); return }

    const text = encodeURIComponent(WHATSAPP_TEMPLATE(propertyTitle ?? '', priceNum))
    const url  = `whatsapp://send?phone=91${phone}&text=${text}`

    const supported = await Linking.canOpenURL(url)
    if (!supported) {
      toast.error('WhatsApp is not installed on this device')
      return
    }

    log.ui.info('Opening WhatsApp', { phone })
    await recordInquiry('whatsapp')
    await Linking.openURL(url)
  }

  const openDialer = async () => {
    const phone = ownerPhone?.replace(/\D/g, '')
    if (!phone) { toast.error('Owner phone number is not available'); return }

    const url = `tel:+91${phone}`
    log.ui.info('Opening dialer', { phone })
    await recordInquiry('call')
    await Linking.openURL(url)
  }

  const sendMessage = async () => {
    const trimmed = message.trim()
    if (trimmed.length < 10) {
      toast.error('Please write a message of at least 10 characters')
      return
    }
    Keyboard.dismiss()
    setSending(true)
    const inquiryId = await recordInquiry('chat', trimmed)
    if (inquiryId) {
      await notifyOwner(inquiryId)
      toast.success('Message sent to owner!')
      setMessage('')
      router.back()
    }
    setSending(false)
  }

  // ── Helpers ──────────────────────────────────────────────────────────────────

  const recordInquiry = async (via: ContactMethod, msg?: string): Promise<string | null> => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user || !propertyId) return null

    // Fetch owner_id from property
    const { data: prop } = await supabase
      .from('properties')
      .select('owner_id')
      .eq('id', propertyId)
      .single()

    if (!prop) return null

    const { data: inquiry, error } = await supabase
      .from('inquiries')
      .insert({
        property_id: propertyId,
        renter_id:   user.id,
        owner_id:    prop.owner_id,
        contact_via: via,
        message:     msg ?? null,
      })
      .select('id')
      .single()

    if (error) {
      log.api.error('Inquiry insert failed', error.message)
      // Duplicate inquiries are non-fatal
      return null
    }

    log.api.info('Inquiry created', { id: inquiry.id, via })
    return inquiry.id as string
  }

  const notifyOwner = async (inquiryId: string) => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      const { error } = await supabase.functions.invoke('notify-owner', {
        body:    { inquiry_id: inquiryId },
        headers: { Authorization: `Bearer ${session.access_token}` },
      })

      if (error) log.api.error('notify-owner failed', error.message)
      else       log.api.info('notify-owner called', { inquiryId })
    } catch (e) {
      log.api.error('notify-owner exception', String(e))
    }
  }

  // ── Tab button ───────────────────────────────────────────────────────────────

  const MethodTab = ({ method, icon, label }: {
    method: ContactMethod
    icon:   keyof typeof Ionicons.glyphMap
    label:  string
  }) => (
    <TouchableOpacity
      style={[styles.methodTab, activeMethod === method && styles.methodTabActive]}
      onPress={() => setActiveMethod(method)}
      activeOpacity={0.8}
    >
      <Ionicons
        name={icon}
        size={20}
        color={activeMethod === method ? colors.white : colors.textSecondary}
      />
      <Text style={[styles.methodLabel, activeMethod === method && styles.methodLabelActive]}>
        {label}
      </Text>
    </TouchableOpacity>
  )

  return (
    <>
      <Tabs.Screen options={{ tabBarStyle: { display: 'none' }, headerShown: false }} />

      <View style={[styles.screen, { paddingTop: insets.top }]}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => router.back()}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="arrow-back" size={22} color={colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Contact Owner</Text>
        </View>

        <ScrollView
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[
            styles.content,
            { paddingBottom: insets.bottom + spacing.xl },
          ]}
        >
          {/* Property summary */}
          <View style={styles.summaryCard}>
            <View style={styles.summaryLeft}>
              <Text style={styles.summaryTitle} numberOfLines={2}>{propertyTitle}</Text>
              <Text style={styles.summaryPrice}>{formatRent(priceNum)}/mo</Text>
            </View>
            <View style={styles.summaryRight}>
              <View style={styles.ownerAvatar}>
                <Text style={styles.ownerAvatarText}>
                  {(ownerName ?? 'O').split(' ').map(w => w[0]?.toUpperCase()).slice(0, 2).join('')}
                </Text>
              </View>
              <Text style={styles.ownerName} numberOfLines={1}>{ownerName}</Text>
            </View>
          </View>

          {/* Method selector */}
          <Text style={styles.sectionLabel}>How would you like to contact?</Text>
          <View style={styles.methodRow}>
            <MethodTab method="whatsapp" icon="logo-whatsapp" label="WhatsApp" />
            <MethodTab method="call"     icon="call-outline"   label="Call"     />
            <MethodTab method="chat"     icon="chatbubble-ellipses-outline" label="Message" />
          </View>

          {/* WhatsApp panel */}
          {activeMethod === 'whatsapp' && (
            <View style={styles.panel}>
              <View style={styles.panelInfo}>
                <Ionicons name="logo-whatsapp" size={32} color="#25D366" />
                <View style={styles.panelInfoText}>
                  <Text style={styles.panelTitle}>Chat on WhatsApp</Text>
                  <Text style={styles.panelBody}>
                    Opens WhatsApp with a pre-filled message to the owner.
                  </Text>
                </View>
              </View>
              {ownerPhone && (
                <Text style={styles.phoneDisplay}>
                  <Ionicons name="phone-portrait-outline" size={13} color={colors.textMuted} />
                  {'  '}{formatPhone(ownerPhone)}
                </Text>
              )}
              <TouchableOpacity
                style={[styles.actionBtn, styles.whatsappBtn]}
                onPress={openWhatsApp}
                activeOpacity={0.85}
              >
                <Ionicons name="logo-whatsapp" size={18} color={colors.white} />
                <Text style={styles.actionBtnText}>Open WhatsApp</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Call panel */}
          {activeMethod === 'call' && (
            <View style={styles.panel}>
              <View style={styles.panelInfo}>
                <View style={styles.callIcon}>
                  <Ionicons name="call" size={28} color={colors.primary} />
                </View>
                <View style={styles.panelInfoText}>
                  <Text style={styles.panelTitle}>Call Owner</Text>
                  <Text style={styles.panelBody}>
                    Directly call the owner's registered phone number.
                  </Text>
                </View>
              </View>
              {ownerPhone && (
                <Text style={styles.phoneDisplay}>
                  {formatPhone(ownerPhone)}
                </Text>
              )}
              <TouchableOpacity
                style={[styles.actionBtn, styles.callBtn]}
                onPress={openDialer}
                activeOpacity={0.85}
              >
                <Ionicons name="call-outline" size={18} color={colors.white} />
                <Text style={styles.actionBtnText}>
                  {ownerPhone ? `Call ${formatPhone(ownerPhone)}` : 'Call Owner'}
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Chat / Message panel */}
          {activeMethod === 'chat' && (
            <View style={styles.panel}>
              <View style={styles.panelInfo}>
                <View style={styles.chatIcon}>
                  <Ionicons name="chatbubble-ellipses" size={28} color={colors.primary} />
                </View>
                <View style={styles.panelInfoText}>
                  <Text style={styles.panelTitle}>Send a Message</Text>
                  <Text style={styles.panelBody}>
                    Owner will receive a notification and can reply.
                  </Text>
                </View>
              </View>

              <View style={styles.messageWrap}>
                <Text style={styles.messageLabel}>Your message</Text>
                <TextInput
                  style={styles.messageInput}
                  placeholder="Hi, I'm interested in this property. Please share more details…"
                  placeholderTextColor={colors.textMuted}
                  value={message}
                  onChangeText={setMessage}
                  multiline
                  numberOfLines={5}
                  maxLength={500}
                  textAlignVertical="top"
                />
                <Text style={styles.charCount}>{message.length}/500</Text>
              </View>

              <TouchableOpacity
                style={[styles.actionBtn, styles.sendBtn, sending && styles.actionBtnDisabled]}
                onPress={sendMessage}
                disabled={sending}
                activeOpacity={0.85}
              >
                {sending ? (
                  <ActivityIndicator size="small" color={colors.white} />
                ) : (
                  <>
                    <Ionicons name="send" size={16} color={colors.white} />
                    <Text style={styles.actionBtnText}>Send Message</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          )}

          {/* Disclaimer */}
          <Text style={styles.disclaimer}>
            <Ionicons name="shield-checkmark-outline" size={12} color={colors.textMuted} />
            {'  '}Contact details are shared only for genuine rental inquiries.
          </Text>
        </ScrollView>
      </View>
    </>
  )
}

const styles = StyleSheet.create({
  screen:  { flex: 1, backgroundColor: colors.background },
  header:  {
    flexDirection:     'row',
    alignItems:        'center',
    paddingHorizontal: spacing.lg,
    paddingVertical:   spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    gap:               spacing.md,
  },
  backBtn:       {
    width:           36,
    height:          36,
    borderRadius:    radius.full,
    backgroundColor: colors.surface,
    alignItems:      'center',
    justifyContent:  'center',
  },
  headerTitle:   { ...typography.h3 },
  content:       { paddingHorizontal: spacing.lg, paddingTop: spacing.lg },

  // Summary card
  summaryCard: {
    flexDirection:   'row',
    justifyContent:  'space-between',
    alignItems:      'center',
    backgroundColor: colors.card,
    borderRadius:    radius.xl,
    padding:         spacing.md,
    borderWidth:     1,
    borderColor:     colors.border,
    marginBottom:    spacing.lg,
    gap:             spacing.md,
  },
  summaryLeft:   { flex: 1, gap: 3 },
  summaryTitle:  { ...typography.bodySmall, fontWeight: '600', color: colors.text },
  summaryPrice:  { ...typography.bodyMedium, color: colors.primary, fontWeight: '700' },
  summaryRight:  { alignItems: 'center', gap: 4 },
  ownerAvatar: {
    width:           40,
    height:          40,
    borderRadius:    radius.full,
    backgroundColor: colors.primaryLight,
    alignItems:      'center',
    justifyContent:  'center',
    borderWidth:     1.5,
    borderColor:     colors.primary,
  },
  ownerAvatarText: { ...typography.label, color: colors.primary, fontWeight: '700' },
  ownerName:       { ...typography.caption, color: colors.textSecondary, maxWidth: 80, textAlign: 'center' },

  // Method tabs
  sectionLabel: {
    ...typography.label,
    color:         colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom:  spacing.sm,
  },
  methodRow: {
    flexDirection:   'row',
    gap:             spacing.sm,
    marginBottom:    spacing.lg,
  },
  methodTab: {
    flex:            1,
    alignItems:      'center',
    justifyContent:  'center',
    gap:             4,
    paddingVertical: spacing.md,
    borderRadius:    radius.md,
    backgroundColor: colors.surface,
    borderWidth:     1.5,
    borderColor:     colors.border,
  },
  methodTabActive: {
    backgroundColor: colors.primary,
    borderColor:     colors.primary,
  },
  methodLabel:       { ...typography.caption, color: colors.textSecondary, fontWeight: '600' },
  methodLabelActive: { color: colors.white },

  // Panel
  panel: {
    backgroundColor: colors.card,
    borderRadius:    radius.xl,
    borderWidth:     1,
    borderColor:     colors.border,
    padding:         spacing.lg,
    gap:             spacing.md,
    marginBottom:    spacing.md,
  },
  panelInfo:     { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  panelInfoText: { flex: 1, gap: 3 },
  panelTitle:    { ...typography.bodySmall, fontWeight: '700', color: colors.text },
  panelBody:     { ...typography.caption, color: colors.textMuted, lineHeight: 16 },
  phoneDisplay:  { ...typography.bodySmall, color: colors.textSecondary, fontWeight: '500' },

  callIcon: {
    width:           52,
    height:          52,
    borderRadius:    radius.full,
    backgroundColor: colors.primaryLight,
    alignItems:      'center',
    justifyContent:  'center',
  },
  chatIcon: {
    width:           52,
    height:          52,
    borderRadius:    radius.full,
    backgroundColor: colors.primaryLight,
    alignItems:      'center',
    justifyContent:  'center',
  },

  // Message input
  messageWrap:  { gap: spacing.xs },
  messageLabel: { ...typography.label, color: colors.textSecondary },
  messageInput: {
    ...typography.body,
    fontSize:          14,
    color:             colors.text,
    backgroundColor:   colors.surface,
    borderWidth:       1.5,
    borderColor:       colors.border,
    borderRadius:      radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical:   spacing.sm,
    minHeight:         110,
  },
  charCount: { ...typography.caption, color: colors.textMuted, alignSelf: 'flex-end' },

  // Action buttons
  actionBtn: {
    flexDirection:   'row',
    alignItems:      'center',
    justifyContent:  'center',
    gap:             spacing.sm,
    borderRadius:    radius.md,
    paddingVertical: spacing.md,
  },
  whatsappBtn:      { backgroundColor: '#25D366' },
  callBtn:          { backgroundColor: colors.primary },
  sendBtn:          { backgroundColor: colors.primary },
  actionBtnDisabled: { opacity: 0.6 },
  actionBtnText:    { ...typography.bodySmall, color: colors.white, fontWeight: '700' },

  // Disclaimer
  disclaimer: {
    ...typography.caption,
    color:      colors.textMuted,
    textAlign:  'center',
    lineHeight: 18,
    marginTop:  spacing.sm,
  },
})
