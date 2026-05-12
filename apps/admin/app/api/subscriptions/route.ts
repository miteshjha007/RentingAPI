import { NextRequest } from 'next/server'
import { withAdmin, ok, ApiError, parsePagination, buildMeta } from '@/lib/apiHelpers'
import { adminDb } from '@/lib/supabase'
import { log } from '@/lib/logger'

// GET /api/subscriptions?plan=monthly|quarterly|yearly&active=true&page=1&limit=20
export const GET = withAdmin(async (req: NextRequest) => {
  const sp     = req.nextUrl.searchParams
  const plan   = sp.get('plan')
  const active = sp.get('active')  // 'true' | 'false' | null (all)
  const { page, limit, offset } = parsePagination(req)

  log.db.info('Listing subscriptions', { plan, active, page, limit })

  let query = adminDb
    .from('subscriptions')
    .select(
      `*,
       user:profiles!subscriptions_user_id_fkey ( id, name, phone, email )`,
      { count: 'exact' }
    )
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (plan)             query = query.eq('plan', plan)
  if (active === 'true')  query = query.eq('is_active', true)
  if (active === 'false') query = query.eq('is_active', false)

  const { data, count, error } = await query

  if (error) {
    log.db.error('Failed to list subscriptions', { error: error.message })
    throw new ApiError('Failed to fetch subscriptions', 500)
  }

  // Aggregate revenue summary for the response
  const { data: revenueData } = await adminDb
    .from('subscriptions')
    .select('amount, plan, is_active')

  const totalRevPaise = (revenueData ?? [])
    .filter((r: { is_active: boolean }) => r.is_active)
    .reduce((s: number, r: { amount: number }) => s + (r.amount ?? 0), 0)

  log.db.info('Subscriptions fetched', { count, page, totalRevInr: Math.floor(totalRevPaise / 100) })

  return ok(
    { rows: data, summary: { totalRevenue_inr: Math.floor(totalRevPaise / 100) } },
    buildMeta(page, limit, count ?? 0)
  )
})
