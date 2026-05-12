import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { log } from './logger'

const url     = process.env.NEXT_PUBLIC_SUPABASE_URL!
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const svcKey  = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!url || !svcKey) {
  log.auth.warn('Supabase env vars missing — check .env.local')
}

// Service-role client — bypasses RLS. Only used inside API route handlers.
export const adminDb: SupabaseClient = createClient(url, svcKey, {
  auth: { autoRefreshToken: false, persistSession: false },
})

// Verify a caller's JWT and return their user record.
// Throws if token is missing, invalid, or the user is not an admin.
export async function getAdminUser(authHeader: string | null) {
  if (!authHeader?.startsWith('Bearer ')) {
    return { user: null, error: 'Missing Bearer token' }
  }

  const token      = authHeader.slice(7)
  const userClient = createClient(url, anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
    global: { headers: { Authorization: `Bearer ${token}` } },
  })

  const { data: { user }, error: authErr } = await userClient.auth.getUser()
  if (authErr || !user) {
    log.auth.warn('Token verification failed', { error: authErr?.message })
    return { user: null, error: 'Invalid or expired token' }
  }

  // Check role via service-role client (avoids user seeing their own profile RLS)
  const { data: profile } = await adminDb
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'admin') {
    log.auth.warn('Non-admin attempted access', { userId: user.id, role: profile?.role })
    return { user: null, error: 'Forbidden: admin access required' }
  }

  return { user, error: null }
}
