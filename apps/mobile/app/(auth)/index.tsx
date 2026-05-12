import React, { useState } from 'react'
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native'
import { Link, useRouter } from 'expo-router'
import { LinearGradient } from 'expo-linear-gradient'
import { Ionicons } from '@expo/vector-icons'
import { SafeScreen } from '@/components/ui/SafeScreen'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { colors, spacing, typography, radius } from '@/constants/theme'
import { supabase } from '@/lib/supabase'
import { log } from '@/lib/logger'

export default function LoginScreen() {
  const router = useRouter()
  const [phone, setPhone] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const fullPhone = `+91${phone.trim()}`
  const isValid = /^[6-9]\d{9}$/.test(phone.trim())

  const handleContinue = async () => {
    if (!isValid) {
      setError('Enter a valid 10-digit mobile number')
      return
    }
    setError('')
    setLoading(true)

    log.auth.info('Sending OTP', { phone: fullPhone })

    const { error: otpError } = await supabase.auth.signInWithOtp({ phone: fullPhone })

    setLoading(false)

    if (otpError) {
      log.auth.error('OTP send failed', otpError.message)
      setError(otpError.message)
      return
    }

    log.auth.info('OTP sent — navigating to OTP screen')
    router.push({ pathname: '/(auth)/otp', params: { phone: fullPhone } })
  }

  return (
    <SafeScreen scroll contentStyle={styles.screen}>
      {/* Header gradient accent */}
      <LinearGradient
        colors={['rgba(249,115,22,0.18)', 'transparent']}
        style={styles.gradientTop}
        pointerEvents="none"
      />

      {/* Logo */}
      <View style={styles.logoArea}>
        <View style={styles.logoIcon}>
          <Ionicons name="home" size={32} color={colors.primary} />
        </View>
        <Text style={styles.logoText}>RentEasy</Text>
        <Text style={styles.logoTagline}>Find your perfect space</Text>
      </View>

      {/* Form card */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Welcome back</Text>
        <Text style={styles.cardSubtitle}>
          Enter your phone number to continue
        </Text>

        <View style={styles.inputRow}>
          <Input
            label="Mobile Number"
            value={phone}
            onChangeText={text => {
              setError('')
              setPhone(text.replace(/\D/g, '').slice(0, 10))
            }}
            keyboardType="number-pad"
            maxLength={10}
            returnKeyType="done"
            onSubmitEditing={handleContinue}
            error={error}
            prefix={
              <View style={styles.countryCode}>
                <Text style={styles.countryCodeText}>🇮🇳  +91</Text>
              </View>
            }
            placeholder="98765 43210"
          />
        </View>

        <Button
          title="Continue"
          onPress={handleContinue}
          loading={loading}
          disabled={!isValid}
          style={styles.ctaButton}
        />

        <View style={styles.divider}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>OR</Text>
          <View style={styles.dividerLine} />
        </View>

        <Link href="/(auth)/signup" asChild>
          <TouchableOpacity style={styles.signupLink} activeOpacity={0.7}>
            <Text style={styles.signupText}>
              New here?{' '}
              <Text style={styles.signupTextAccent}>Create an account</Text>
            </Text>
          </TouchableOpacity>
        </Link>
      </View>

      {/* Footer */}
      <Text style={styles.terms}>
        By continuing, you agree to our{' '}
        <Text style={styles.termsLink}>Terms of Service</Text>
        {' '}and{' '}
        <Text style={styles.termsLink}>Privacy Policy</Text>
      </Text>
    </SafeScreen>
  )
}

const styles = StyleSheet.create({
  screen: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl,
    justifyContent: 'center',
    minHeight: '100%',
  },
  gradientTop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 300,
  },
  logoArea: {
    alignItems: 'center',
    marginBottom: spacing.xxl,
  },
  logoIcon: {
    width: 72,
    height: 72,
    borderRadius: radius.xl,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(249,115,22,0.3)',
  },
  logoText: {
    ...typography.h1,
    fontSize: 36,
    letterSpacing: -1,
  },
  logoTagline: {
    ...typography.bodySmall,
    marginTop: spacing.xs,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.xl,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardTitle: {
    ...typography.h2,
    marginBottom: spacing.xs,
  },
  cardSubtitle: {
    ...typography.bodySmall,
    marginBottom: spacing.lg,
  },
  inputRow: {
    marginBottom: spacing.md,
  },
  countryCode: {
    marginRight: spacing.xs,
  },
  countryCodeText: {
    ...typography.body,
    color: colors.textSecondary,
    fontSize: 15,
  },
  ctaButton: {
    marginTop: spacing.sm,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: spacing.lg,
    gap: spacing.md,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.border,
  },
  dividerText: {
    ...typography.caption,
    color: colors.textMuted,
    letterSpacing: 1,
  },
  signupLink: {
    alignItems: 'center',
    paddingVertical: spacing.xs,
  },
  signupText: {
    ...typography.bodySmall,
    color: colors.textSecondary,
  },
  signupTextAccent: {
    color: colors.primary,
    fontWeight: '600',
  },
  terms: {
    ...typography.caption,
    textAlign: 'center',
    marginTop: spacing.xl,
    paddingHorizontal: spacing.md,
    lineHeight: 18,
  },
  termsLink: {
    color: colors.primary,
  },
})
