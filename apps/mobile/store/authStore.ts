import { create } from 'zustand'
import type { Session, User } from '@supabase/supabase-js'
import { supabase, fetchProfile, type Profile } from '@/lib/supabase'
import { log } from '@/lib/logger'

interface AuthState {
  user:          User | null
  session:       Session | null
  profile:       Profile | null
  isLoading:     boolean  // true during initialize()
  isHydrated:    boolean  // true after first auth check completes
}

interface AuthActions {
  initialize:    () => Promise<void>
  setSession:    (session: Session | null, user: User | null) => void
  setProfile:    (profile: Profile | null) => void
  refreshProfile:() => Promise<void>
  signOut:       () => Promise<void>
}

export const useAuthStore = create<AuthState & AuthActions>((set, get) => ({
  user:       null,
  session:    null,
  profile:    null,
  isLoading:  true,
  isHydrated: false,

  initialize: async () => {
    log.store.info('Initializing auth store')

    // 1. Get persisted session from AsyncStorage
    const { data: { session }, error } = await supabase.auth.getSession()

    if (error) {
      log.store.error('getSession failed', error.message)
      set({ isLoading: false, isHydrated: true })
      return
    }

    if (session?.user) {
      log.store.info('Session found', { userId: session.user.id })
      const profile = await fetchProfile(session.user.id)
      log.store.info('Profile loaded', { role: profile?.role ?? 'none' })
      set({ session, user: session.user, profile, isLoading: false, isHydrated: true })
    } else {
      log.store.info('No session — user is unauthenticated')
      set({ isLoading: false, isHydrated: true })
    }

    // 2. Subscribe to future auth changes (token refresh, sign out, etc.)
    supabase.auth.onAuthStateChange(async (event, newSession) => {
      log.store.info('Auth state changed', { event, userId: newSession?.user?.id ?? 'none' })

      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        if (newSession?.user) {
          const profile = await fetchProfile(newSession.user.id)
          log.store.info('Profile reloaded after auth event', { role: profile?.role ?? 'none' })
          set({ session: newSession, user: newSession.user, profile })
        }
      }

      if (event === 'SIGNED_OUT') {
        log.store.info('Signed out — clearing store')
        set({ session: null, user: null, profile: null })
      }
    })
  },

  setSession: (session, user) => {
    log.store.debug('setSession', { userId: user?.id ?? 'null' })
    set({ session, user })
  },

  setProfile: (profile) => {
    log.store.debug('setProfile', { role: profile?.role ?? 'null' })
    set({ profile })
  },

  refreshProfile: async () => {
    const { user } = get()
    if (!user) return
    log.store.info('Refreshing profile')
    const profile = await fetchProfile(user.id)
    set({ profile })
  },

  signOut: async () => {
    log.store.info('Signing out')
    await supabase.auth.signOut()
    set({ session: null, user: null, profile: null })
    log.store.info('Sign out complete')
  },
}))
