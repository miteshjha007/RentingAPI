import { NextRequest } from 'next/server'
import { withAdmin, ok, ApiError } from '@/lib/apiHelpers'
import { adminDb } from '@/lib/supabase'
import { log } from '@/lib/logger'

type Ctx = { params: { id: string } }

// POST /api/properties/:id/approve
export const POST = withAdmin(async (_req: NextRequest, { params }: Ctx, adminId: string) => {
  const { id } = params
  log.db.info('Approving property', { propertyId: id, adminId })

  // Fetch to get owner_id and title before updating
  const { data: property, error: fetchErr } = await adminDb
    .from('properties')
    .select('id, title, owner_id, is_approved')
    .eq('id', id)
    .single()

  if (fetchErr || !property) {
    throw new ApiError('Property not found', 404)
  }

  if (property.is_approved) {
    throw new ApiError('Property is already approved', 409, 'ALREADY_APPROVED')
  }

  // Approve
  const { error: updateErr } = await adminDb
    .from('properties')
    .update({ is_approved: true, rejection_reason: null })
    .eq('id', id)

  if (updateErr) {
    log.db.error('Approval update failed', { error: updateErr.message })
    throw new ApiError('Failed to approve property', 500)
  }

  log.db.info('Property approved', { propertyId: id, ownerId: property.owner_id })

  // Notify owner in-app
  await adminDb.from('notifications').insert({
    user_id: property.owner_id,
    title:   '🎉 Property Approved!',
    body:    `Your listing "${property.title}" has been approved and is now live.`,
    type:    'approval',
    data:    { property_id: id },
  })

  log.db.info('Approval notification sent', { ownerId: property.owner_id })

  return ok({ propertyId: id, approved: true })
})
