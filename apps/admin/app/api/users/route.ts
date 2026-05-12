import { NextRequest } from 'next/server'
import { withAdmin, ok, ApiError, parsePagination, buildMeta } from '@/lib/apiHelpers'
import { adminDb } from '@/lib/supabase'
import { log } from '@/lib/logger'

// GET /api/users?role=renter|owner|admin&search=name&page=1&limit=20
export const GET = withAdmin(async (req: NextRequest) => {
  const sp     = req.nextUrl.searchParams
  const role   = sp.get('role')    // renter | owner | admin | null (all)
  const search = sp.get('search')
  const { page, limit, offset } = parsePagination(req)

  log.db.info('Listing users', { role, search, page, limit })

  let query = adminDb
    .from('profiles')
    .select(
      'id, name, email, phone, role, is_verified, avatar_url, created_at',
      { count: 'exact' }
    )
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (role)   query = query.eq('role', role)
  if (search) query = query.or(
    `name.ilike.%${search}%,email.ilike.%${search}%,phone.ilike.%${search}%`
  )

  const { data, count, error } = await query

  if (error) {
    log.db.error('Failed to list users', { error: error.message })
    throw new ApiError('Failed to fetch users', 500)
  }

  log.db.info('Users fetched', { count, page })
  return ok(data, buildMeta(page, limit, count ?? 0))
})
