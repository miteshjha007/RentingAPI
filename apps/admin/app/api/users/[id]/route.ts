import { NextRequest } from 'next/server'
import { withAdmin, ok, ApiError } from '@/lib/apiHelpers'
import { adminDb } from '@/lib/supabase'
import { log } from '@/lib/logger'

type Ctx = { params: { id: string } }

// GET /api/users/:id — full user profile + their properties + active subscription
export const GET = withAdmin(async (_req: NextRequest, { params }: Ctx) => {
  const { id } = params
  log.db.info('Fetching user detail', { userId: id })

  const [profileResult, propertiesResult, subsResult, inquiriesResult] = await Promise.all([
    adminDb
      .from('profiles')
      .select('*')
      .eq('id', id)
      .single(),

    adminDb
      .from('properties')
      .select('id, type, title, city, price, is_approved, is_available, created_at')
      .eq('owner_id', id)
      .order('created_at', { ascending: false })
      .limit(20),

    adminDb
      .from('subscriptions')
      .select('*')
      .eq('user_id', id)
      .order('created_at', { ascending: false })
      .limit(5),

    adminDb
      .from('inquiries')
      .select('id, contact_via, created_at, properties!inquiries_property_id_fkey(title, city)')
      .eq('renter_id', id)
      .order('created_at', { ascending: false })
      .limit(10),
  ])

  if (profileResult.error || !profileResult.data) {
    throw new ApiError('User not found', 404)
  }

  return ok({
    profile:     profileResult.data,
    properties:  propertiesResult.data  ?? [],
    subscriptions: subsResult.data      ?? [],
    inquiries:   inquiriesResult.data   ?? [],
  })
})

// PATCH /api/users/:id — update role, verify status, or ban
// Body: { role?, is_verified?, expo_push_token? }
export const PATCH = withAdmin(async (req: NextRequest, { params }: Ctx, adminId: string) => {
  const { id } = params

  let body: Record<string, unknown>
  try { body = await req.json() } catch { body = {} }

  // Whitelist editable fields from admin panel
  const allowed = ['role', 'is_verified']
  const updates = Object.fromEntries(
    Object.entries(body).filter(([k]) => allowed.includes(k))
  )

  if (Object.keys(updates).length === 0) {
    throw new ApiError('No valid fields to update', 400, 'NO_UPDATES')
  }

  log.db.info('Updating user', { userId: id, updates, adminId })

  const { data, error } = await adminDb
    .from('profiles')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    log.db.error('User update failed', { error: error.message })
    throw new ApiError('Failed to update user', 500)
  }

  log.db.info('User updated', { userId: id, updates })
  return ok(data)
})
