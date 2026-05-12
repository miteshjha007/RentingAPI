import { createClient } from '@supabase/supabase-js'
import type { Database } from './types'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  ?? process.env.EXPO_PUBLIC_SUPABASE_URL
  ?? ''

const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  ?? process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY
  ?? ''

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables')
}

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
  realtime: {
    params: { eventsPerSecond: 10 },
  },
})

/** Service-role client — only for Edge Functions & server-side admin panel */
export const createServiceClient = () =>
  createClient<Database>(
    supabaseUrl,
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? '',
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
