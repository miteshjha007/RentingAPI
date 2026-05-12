import { NextRequest } from 'next/server'
import { withAdmin, ok, ApiError } from '@/lib/apiHelpers'
import { adminDb } from '@/lib/supabase'
import { log } from '@/lib/logger'

type Ctx = { params: { id: string } }

// GET /api/properties/:id — full property detail for admin review
export const GET = withAdmin(async (_req: NextRequest, { params }: Ctx) => {
  const { id } = params
  log.db.info('Fetching property detail', { id })

  const { data, error } = await adminDb
    .from('properties')
    .select(`
      *,
      owner:profiles!properties_owner_id_fkey ( id, name, phone, email, avatar_url ),
      details:property_details ( * ),
      media:property_media ( * ),
      inquiries:inquiries ( id, contact_via, created_at,
        renter:profiles!inquiries_renter_id_fkey ( id, name, phone )
      )
    `)
    .eq('id', id)
    .single()

  if (error || !data) {
    log.db.warn('Property not found', { id, error: error?.message })
    throw new ApiError('Property not found', 404)
  }

  // Sort media by order_index
  if (Array.isArray(data.media)) {
    data.media.sort((a: { order_index: number }, b: { order_index: number }) =>
      a.order_index - b.order_index
    )
  }

  return ok(data)
})
