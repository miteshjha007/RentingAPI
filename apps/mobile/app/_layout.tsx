import { useEffect } from 'react'
import { Stack, useRouter, useSegments, useRootNavigationState } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { useAuthStore } from '@/store/authStore'
import { ToastContainer } from '@/components/ui/Toast'
import { log } from '@/lib/logger'

function NavigationGuard() {
  const { session, profile, isHydrated } = useAuthStore()
  const segments = useSegments()
  const router = useRouter()
  const navState = useRootNavigationState()

  useEffect(() => {
    // Wait until Expo Router's navigation is mounted and auth is resolved
    if (!navState?.key || !isHydrated) return

    const inAuth       = segments[0] === '(auth)'
    const inOnboarding = segments[0] === '(onboarding)'
    const inRenter     = segments[0] === '(renter)'
    const inOwner      = segments[0] === '(owner)'

    if (!session) {
      // Not authenticated — send to login
      if (!inAuth) {
        log.nav.info('No session → /(auth)')
        router.replace('/(auth)')
      }
      return
    }

    // Authenticated — check if profile setup is complete
    if (!profile?.role) {
      if (!inOnboarding) {
        log.nav.info('No role → /(onboarding)/purpose')
        router.replace('/(onboarding)/purpose')
      }
      return
    }

    // Profile complete — route to the right home screen
    if (profile.role === 'owner') {
      if (!inOwner) {
        log.nav.info('Owner → /(owner)/dashboard')
        router.replace('/(owner)/dashboard')
      }
    } else {
      // renter or admin
      if (!inRenter) {
        log.nav.info('Renter → /(renter)/home')
        router.replace('/(renter)/home')
      }
    }
  }, [session, profile, isHydrated, navState?.key, segments])

  return null
}

export default function RootLayout() {
  const initialize = useAuthStore(s => s.initialize)

  useEffect(() => {
    log.store.info('App mounted — initializing auth')
    initialize()
  }, [initialize])

  return (
    <SafeAreaProvider>
      <StatusBar style="light" backgroundColor="transparent" translucent />
      <NavigationGuard />
      <Stack screenOptions={{ headerShown: false, animation: 'fade' }} />
      {/* ToastContainer floats above everything — rendered outside Stack */}
      <ToastContainer />
    </SafeAreaProvider>
  )
}
