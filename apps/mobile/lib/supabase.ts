import AsyncStorage from '@react-native-async-storage/async-storage'
import { createClient } from '@supabase/supabase-js'
import { log } from './logger'

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL ?? ''
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? ''

if (!supabaseUrl || !supabaseAnonKey) {
  log.api.warn('Supabase env vars missing — check .env file')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
})

// ── Typed helpers ─────────────────────────────────────────────────────────────

export type UserRole = 'renter' | 'owner' | 'admin'

export interface Profile {
  id: string
  name: string
  email: string | null
  phone: string | null
  role: UserRole | null
  avatar_url: string | null
  is_verified: boolean
  expo_push_token: string | null
  created_at: string
}

export async function fetchProfile(userId: string): Promise<Profile | null> {
  log.api.debug('Fetching profile', { userId })
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single()

  if (error) {
    log.api.error('fetchProfile failed', error.message)
    return null
  }
  log.api.debug('Profile fetched', { role: data?.role })
  return data as Profile
}

export async function updateProfile(
  userId: string,
  updates: Partial<Pick<Profile, 'name' | 'email' | 'phone' | 'role' | 'expo_push_token' | 'avatar_url'>>
): Promise<{ error: string | null }> {
  log.api.info('Updating profile', { userId, fields: Object.keys(updates) })
  const { error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', userId)

  if (error) {
    log.api.error('updateProfile failed', error.message)
    return { error: error.message }
  }
  log.api.info('Profile updated successfully')
  return { error: null }
}
