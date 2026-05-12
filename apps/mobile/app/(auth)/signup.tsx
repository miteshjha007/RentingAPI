import React, { useState } from 'react'
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { SafeScreen } from '@/components/ui/SafeScreen'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { colors, spacing, typography, radius } from '@/constants/theme'
import { supabase } from '@/lib/supabase'
import { log } from '@/lib/logger'

export default function SignupScreen() {
  const router = useRouter()
  const [form, setForm] = useState({ name: '', email: '', phone: '' })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(false)

  const set = (field: keyof typeof form, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }))
    setErrors(prev => ({ ...prev, [field]: '' }))
  }

  const validate = (): boolean => {
    const e: Record<string, string> = {}
    if (!form.name.trim() || form.name.trim().length < 2)
      e.name = 'Name must be at least 2 characters'
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email))
      e.email = 'Enter a valid email address'
    if (!/^[6-9]\d{9}$/.test(form.phone.trim()))
      e.phone = 'Enter a valid 10-digit mobile number'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleSignup = async () => {
    if (!validate()) return
    setLoading(true)

    const fullPhone = `+91${form.phone.trim()}`
    log.auth.info('Signup: sending OTP', { phone: fullPhone })

    const { error: otpError } = await supabase.auth.signInWithOtp({ phone: fullPhone })
    setLoading(false)

    if (otpError) {
      log.auth.error('Signup OTP send failed', otpError.message)
      setErrors({ phone: otpError.message })
      return
    }

    log.auth.info('Signup OTP sent — navigating to OTP screen')
    // Pass name & email so OTP screen can save them post-verification
    router.push({
      pathname: '/(auth)/otp',
      params: {
        phone: fullPhone,
        name: form.name.trim(),
        email: form.email.trim(),
      },
    })
  }

  return (
    <SafeScreen scroll contentStyle={styles.screen}>
      {/* Back button */}
      <TouchableOpacity
        style={styles.back}
        onPress={() => router.back()}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <Ionicons name="arrow-back" size={24} color={colors.text} />
      </TouchableOpacity>

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Create account</Text>
        <Text style={styles.subtitle}>
          Join thousands finding their perfect rental
        </Text>
      </View>

      {/* Form */}
      <View style={styles.form}>
        <Input
          label="Full Name"
          value={form.name}
          onChangeText={v => set('name', v)}
          placeholder="Rahul Sharma"
          autoCapitalize="words"
          returnKeyType="next"
          error={errors.name}
        />
        <Input
          label="Email Address (optional)"
          value={form.email}
          onChangeText={v => set('email', v)}
          placeholder="rahul@example.com"
          keyboardType="email-address"
          returnKeyType="next"
          error={errors.email}
        />
        <Input
          label="Mobile Number"
          value={form.phone}
          onChangeText={v => set('phone', v.replace(/\D/g, '').slice(0, 10))}
          placeholder="98765 43210"
          keyboardType="number-pad"
          maxLength={10}
          returnKeyType="done"
          onSubmitEditing={handleSignup}
          error={errors.phone}
          prefix={
            <View style={styles.countryCode}>
              <Text style={styles.countryCodeText}>🇮🇳  +91</Text>
            </View>
          }
        />
      </View>

      <Button
        title="Send OTP"
        onPress={handleSignup}
        loading={loading}
        style={styles.cta}
      />

      {/* Already have account */}
      <TouchableOpacity
        style={styles.loginLink}
        activeOpacity={0.7}
        onPress={() => router.replace('/(auth)')}
      >
        <Text style={styles.loginText}>
          Already have an account?{' '}
          <Text style={styles.loginTextAccent}>Sign in</Text>
        </Text>
      </TouchableOpacity>

      <Text style={styles.terms}>
        By creating an account, you agree to our{' '}
        <Text style={styles.termsLink}>Terms</Text>
        {' '}&amp;{' '}
        <Text style={styles.termsLink}>Privacy Policy</Text>
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
    marginBottom: spacing.md,
  },
  header: {
    marginBottom: spacing.xl,
  },
  title: { ...typography.h1, marginBottom: spacing.xs },
  subtitle: { ...typography.bodySmall },
  form: {
    gap: spacing.md,
    marginBottom: spacing.xl,
  },
  countryCode: { marginRight: spacing.xs },
  countryCodeText: {
    ...typography.body,
    color: colors.textSecondary,
    fontSize: 15,
  },
  cta: { marginBottom: spacing.lg },
  loginLink: { alignItems: 'center', paddingVertical: spacing.xs },
  loginText: { ...typography.bodySmall },
  loginTextAccent: { color: colors.primary, fontWeight: '600' },
  terms: {
    ...typography.caption,
    textAlign: 'center',
    marginTop: spacing.lg,
    lineHeight: 18,
  },
  termsLink: { color: colors.primary },
})
