import React, { useEffect, useRef, useState } from 'react'
import {
  Animated,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { SafeScreen } from '@/components/ui/SafeScreen'
import { OtpInput } from '@/components/ui/OtpInput'
import { Button } from '@/components/ui/Button'
import { colors, spacing, typography, radius } from '@/constants/theme'
import { supabase, fetchProfile, updateProfile } from '@/lib/supabase'
import { useAuthStore } from '@/store/authStore'
import { toast } from '@/store/toastStore'
import { log } from '@/lib/logger'

const RESEND_SECONDS = 30

export default function OtpScreen() {
  const router = useRouter()
  const params = useLocalSearchParams<{
    phone: string
    name?: string
    email?: string
  }>()

  const { phone, name, email } = params
  const isSignup = Boolean(name)

  const { setSession, setProfile } = useAuthStore()

  const [otp, setOtp] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [resendTimer, setResendTimer] = useState(RESEND_SECONDS)
  const [resending, setResending] = useState(false)

  // Shake animation on wrong OTP
  const shakeAnim = useRef(new Animated.Value(0)).current

  const shake = () => {
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 10, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -10, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 8, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -8, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 60, useNativeDriver: true }),
    ]).start()
  }

  // Countdown timer for resend
  useEffect(() => {
    if (resendTimer <= 0) return
    const id = setTimeout(() => setResendTimer(t => t - 1), 1000)
    return () => clearTimeout(id)
  }, [resendTimer])

  const handleResend = async () => {
    if (resendTimer > 0 || resending) return
    setResending(true)
    setError('')
    log.auth.info('Resending OTP', { phone })

    const { error: otpErr } = await supabase.auth.signInWithOtp({ phone })
    setResending(false)

    if (otpErr) {
      log.auth.error('Resend failed', otpErr.message)
      toast.error('Failed to resend OTP. Try again.')
      return
    }

    log.auth.info('OTP resent')
    toast.info('OTP resent successfully')
    setResendTimer(RESEND_SECONDS)
    setOtp('')
  }

  const handleVerify = async () => {
    if (otp.length < 6) {
      setError('Enter the 6-digit code')
      return
    }
    setError('')
    setLoading(true)

    log.auth.info('Verifying OTP', { phone, codeLength: otp.length })

    const { data, error: verifyErr } = await supabase.auth.verifyOtp({
      phone,
      token: otp,
      type: 'sms',
    })

    if (verifyErr || !data.session || !data.user) {
      setLoading(false)
      log.auth.error('OTP verification failed', verifyErr?.message)
      setError('Incorrect code. Please try again.')
      toast.error('Incorrect code. Please try again.')
      shake()
      setOtp('')
      return
    }

    log.auth.info('OTP verified', { userId: data.user.id })
    setSession(data.session, data.user)

    // If this was a signup, persist name/email to profile
    if (isSignup && (name || email)) {
      log.auth.info('Signup: saving profile details', { name, email })
      await updateProfile(data.user.id, {
        ...(name  ? { name }  : {}),
        ...(email ? { email } : {}),
        phone,
      })
    }

    const profile = await fetchProfile(data.user.id)
    log.auth.info('Profile after verification', { role: profile?.role ?? 'none' })
    setProfile(profile)
    setLoading(false)

    // NavigationGuard in _layout.tsx handles the redirect, but we also
    // do it here for a faster, direct transition.
    if (!profile?.role) {
      log.nav.info('No role set → /(onboarding)/purpose')
      router.replace('/(onboarding)/purpose')
    } else if (profile.role === 'owner') {
      log.nav.info('Owner role → /(owner)/dashboard')
      router.replace('/(owner)/dashboard')
    } else {
      log.nav.info('Renter role → /(renter)/home')
      router.replace('/(renter)/home')
    }
  }

  // Auto-verify when 6 digits are entered
  useEffect(() => {
    if (otp.length === 6 && !loading) {
      handleVerify()
    }
  }, [otp])

  const maskedPhone = phone?.replace(/(\+91)(\d{3})\d{4}(\d{3})/, '$1 $2****$3')

  return (
    <SafeScreen contentStyle={styles.screen}>
      {/* Back */}
      <TouchableOpacity
        style={styles.back}
        onPress={() => router.back()}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <Ionicons name="arrow-back" size={24} color={colors.text} />
      </TouchableOpacity>

      {/* Icon */}
      <View style={styles.iconWrap}>
        <View style={styles.iconCircle}>
          <Ionicons name="chatbubble-ellipses" size={36} color={colors.primary} />
        </View>
      </View>

      {/* Title */}
      <Text style={styles.title}>Verify OTP</Text>
      <Text style={styles.subtitle}>
        We sent a 6-digit code to{'\n'}
        <Text style={styles.phoneHighlight}>{maskedPhone}</Text>
      </Text>

      {/* OTP Input */}
      <Animated.View style={[styles.otpWrap, { transform: [{ translateX: shakeAnim }] }]}>
        <OtpInput value={otp} onChange={setOtp} error={Boolean(error)} />
      </Animated.View>

      {/* Error */}
      {error ? (
        <View style={styles.errorBadge}>
          <Ionicons name="alert-circle" size={14} color={colors.error} />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}

      {/* Verify Button */}
      <Button
        title="Verify"
        onPress={handleVerify}
        loading={loading}
        disabled={otp.length < 6}
        style={styles.verifyBtn}
      />

      {/* Resend */}
      <View style={styles.resendRow}>
        <Text style={styles.resendLabel}>Didn't receive the code?  </Text>
        {resendTimer > 0 ? (
          <Text style={styles.resendTimer}>Resend in {resendTimer}s</Text>
        ) : (
          <TouchableOpacity onPress={handleResend} disabled={resending}>
            <Text style={[styles.resendLink, resending && styles.resendDisabled]}>
              {resending ? 'Sending…' : 'Resend OTP'}
            </Text>
          </TouchableOpacity>
        )}
      </View>

      <Text style={styles.hint}>
        Make sure you have signal and the number is correct.
      </Text>
    </SafeScreen>
  )
}

const styles = StyleSheet.create({
  screen: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.xl,
  },
  back: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xl,
  },
  iconWrap: { alignItems: 'center', marginBottom: spacing.lg },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: radius.full,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(249,115,22,0.3)',
  },
  title: {
    ...typography.h1,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  subtitle: {
    ...typography.bodySmall,
    textAlign: 'center',
    marginBottom: spacing.xxl,
    lineHeight: 22,
  },
  phoneHighlight: {
    color: colors.text,
    fontWeight: '600',
  },
  otpWrap: {
    marginBottom: spacing.lg,
  },
  errorBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    justifyContent: 'center',
    marginBottom: spacing.md,
    backgroundColor: colors.errorLight,
    borderRadius: radius.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    alignSelf: 'center',
  },
  errorText: {
    ...typography.caption,
    color: colors.error,
  },
  verifyBtn: { marginBottom: spacing.lg },
  resendRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  resendLabel: { ...typography.bodySmall },
  resendTimer: {
    ...typography.bodySmall,
    color: colors.textMuted,
    fontWeight: '500',
  },
  resendLink: {
    ...typography.bodySmall,
    color: colors.primary,
    fontWeight: '600',
  },
  resendDisabled: { opacity: 0.5 },
  hint: {
    ...typography.caption,
    textAlign: 'center',
    paddingHorizontal: spacing.xl,
    lineHeight: 18,
  },
})
