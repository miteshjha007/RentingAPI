import { NextRequest } from 'next/server'
import { withAdmin, ok, ApiError, parsePagination, buildMeta } from '@/lib/apiHelpers'
import { adminDb } from '@/lib/supabase'
import { log } from '@/lib/logger'

// GET /api/properties?status=pending|approved|all&type=room&city=Delhi&page=1&limit=20
export const GET = withAdmin(async (req: NextRequest) => {
  const sp     = req.nextUrl.searchParams
  const status = sp.get('status') ?? 'all'   // pending | approved | all
  const type   = sp.get('type')              // room | flat | home | pg | hostel
  const city   = sp.get('city')
  const search = sp.get('search')
  const { page, limit, offset } = parsePagination(req)

  log.db.info('Listing properties', { status, type, city, page, limit })

  let query = adminDb
    .from('properties')
    .select(`
      id, owner_id, type, title, price, city, area, state,
      is_approved, is_available, rejection_reason,
      created_at, updated_at,
      owner:profiles!properties_owner_id_fkey ( id, name, phone ),
      cover:property_media ( url, order_index, type )
    `, { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (status === 'pending')  query = query.eq('is_approved', false)
  if (status === 'approved') query = query.eq('is_approved', true)
  if (type)                  query = query.eq('type', type)
  if (city)                  query = query.ilike('city', `%${city}%`)
  if (search)                query = query.or(`title.ilike.%${search}%,city.ilike.%${search}%,area.ilike.%${search}%`)

  const { data, count, error } = await query

  if (error) {
    log.db.error('Failed to list properties', { error: error.message })
    throw new ApiError('Failed to fetch properties', 500)
  }

  log.db.info('Properties fetched', { count, page })
  return ok(data, buildMeta(page, limit, count ?? 0))
})
