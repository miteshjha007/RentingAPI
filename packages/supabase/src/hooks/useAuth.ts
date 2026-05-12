import { useEffect, useState, useCallback } from 'react'
import type { Session, User, AuthError } from '@supabase/supabase-js'
import { supabase } from '../client'
import type { Profile, UserRole } from '../types'

interface AuthState {
  user: User | null
  session: Session | null
  profile: Profile | null
  loading: boolean
}

interface AuthActions {
  signInWithPhone: (phone: string) => Promise<{ error: AuthError | null }>
  verifyOtp: (phone: string, token: string) => Promise<{ error: AuthError | null }>
  signUp: (email: string, password: string, name: string, phone: string) => Promise<{ error: AuthError | null }>
  signIn: (email: string, password: string) => Promise<{ error: AuthError | null }>
  signOut: () => Promise<void>
  updateRole: (role: UserRole) => Promise<void>
  refreshProfile: () => Promise<void>
}

export function useAuth(): AuthState & AuthActions {
  const [state, setState] = useState<AuthState>({
    user: null,
    session: null,
    profile: null,
    loading: true,
  })

  const fetchProfile = useCallback(async (userId: string) => {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()
    return data as Profile | null
  }, [])

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      const profile = session?.user ? await fetchProfile(session.user.id) : null
      setState({ user: session?.user ?? null, session, profile, loading: false })
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      const profile = session?.user ? await fetchProfile(session.user.id) : null
      setState({ user: session?.user ?? null, session, profile, loading: false })
    })

    return () => subscription.unsubscribe()
  }, [fetchProfile])

  const signInWithPhone = useCallback(async (phone: string) => {
    const { error } = await supabase.auth.signInWithOtp({ phone })
    return { error }
  }, [])

  const verifyOtp = useCallback(async (phone: string, token: string) => {
    const { error } = await supabase.auth.verifyOtp({ phone, token, type: 'sms' })
    return { error }
  }, [])

  const signUp = useCallback(async (email: string, password: string, name: string, phone: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { name, phone } },
    })
    return { error }
  }, [])

  const signIn = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    return { error }
  }, [])

  const signOut = useCallback(async () => {
    await supabase.auth.signOut()
  }, [])

  const updateRole = useCallback(async (role: UserRole) => {
    if (!state.user) return
    await supabase.from('profiles').update({ role }).eq('id', state.user.id)
    await refreshProfile()
  }, [state.user])

  const refreshProfile = useCallback(async () => {
    if (!state.user) return
    const profile = await fetchProfile(state.user.id)
    setState(prev => ({ ...prev, profile }))
  }, [state.user, fetchProfile])

  return { ...state, signInWithPhone, verifyOtp, signUp, signIn, signOut, updateRole, refreshProfile }
}
