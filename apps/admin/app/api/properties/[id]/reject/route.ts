import { NextRequest } from 'next/server'
import { withAdmin, ok, ApiError } from '@/lib/apiHelpers'
import { adminDb } from '@/lib/supabase'
import { log } from '@/lib/logger'

type Ctx = { params: { id: string } }

// POST /api/properties/:id/reject
// Body: { reason: string }
export const POST = withAdmin(async (req: NextRequest, { params }: Ctx, adminId: string) => {
  const { id } = params

  let body: { reason?: string }
  try { body = await req.json() } catch { body = {} }

  const reason = body.reason?.trim()
  if (!reason || reason.length < 5) {
    throw new ApiError('A rejection reason (min 5 chars) is required', 400, 'MISSING_REASON')
  }

  log.db.info('Rejecting property', { propertyId: id, adminId, reason })

  const { data: property, error: fetchErr } = await adminDb
    .from('properties')
    .select('id, title, owner_id')
    .eq('id', id)
    .single()

  if (fetchErr || !property) {
    throw new ApiError('Property not found', 404)
  }

  const { error: updateErr } = await adminDb
    .from('properties')
    .update({ is_approved: false, rejection_reason: reason })
    .eq('id', id)

  if (updateErr) {
    log.db.error('Rejection update failed', { error: updateErr.message })
    throw new ApiError('Failed to reject property', 500)
  }

  log.db.info('Property rejected', { propertyId: id, ownerId: property.owner_id })

  // Notify owner with the specific reason so they know what to fix
  await adminDb.from('notifications').insert({
    user_id: property.owner_id,
    title:   'Listing Needs Attention',
    body:    `Your listing "${property.title}" was not approved. Reason: ${reason}`,
    type:    'rejection',
    data:    { property_id: id, reason },
  })

  return ok({ propertyId: id, rejected: true, reason })
})
