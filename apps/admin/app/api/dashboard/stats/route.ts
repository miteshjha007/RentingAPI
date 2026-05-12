import { NextRequest } from 'next/server'
import { withAdmin, ok, ApiError } from '@/lib/apiHelpers'
import { adminDb } from '@/lib/supabase'
import { log } from '@/lib/logger'

export const GET = withAdmin(async (_req: NextRequest) => {
  log.db.info('Fetching dashboard stats')

  // Run all independent counts in parallel for minimum latency
  const [
    usersResult,
    ownersResult,
    propertiesResult,
    pendingResult,
    approvedResult,
    subsResult,
    revenueResult,
    inquiriesResult,
    recentInqResult,
  ] = await Promise.all([
    adminDb.from('profiles').select('*', { count: 'exact', head: true }),
    adminDb.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'owner'),
    adminDb.from('properties').select('*', { count: 'exact', head: true }),
    adminDb.from('properties').select('*', { count: 'exact', head: true }).eq('is_approved', false),
    adminDb.from('properties').select('*', { count: 'exact', head: true }).eq('is_approved', true),
    adminDb.from('subscriptions').select('*', { count: 'exact', head: true }).eq('is_active', true),
    adminDb.from('subscriptions').select('amount, plan').eq('is_active', true),
    adminDb.from('inquiries').select('*', { count: 'exact', head: true }),
    adminDb
      .from('inquiries')
      .select(`
        id, contact_via, created_at,
        property:properties!inquiries_property_id_fkey ( id, title, city ),
        renter:profiles!inquiries_renter_id_fkey       ( id, name, phone )
      `)
      .order('created_at', { ascending: false })
      .limit(5),
  ])

  // Bubble up any DB errors
  const errors = [usersResult, ownersResult, propertiesResult, pendingResult,
    approvedResult, subsResult, revenueResult, inquiriesResult, recentInqResult]
    .map(r => r.error)
    .filter(Boolean)

  if (errors.length) {
    log.db.error('Dashboard query failed', { errors: errors.map(e => e!.message) })
    throw new ApiError('Failed to fetch dashboard stats', 500)
  }

  // Calculate revenue breakdown by plan (amounts stored in paise → convert to ₹)
  const revenueRows = (revenueResult.data ?? []) as Array<{ amount: number; plan: string }>

  const totalRevenuePaise = revenueRows.reduce((sum, r) => sum + (r.amount ?? 0), 0)
  const revenueByPlan     = revenueRows.reduce<Record<string, number>>((acc, r) => {
    acc[r.plan] = (acc[r.plan] ?? 0) + r.amount
    return acc
  }, {})

  const totalUsers   = usersResult.count    ?? 0
  const totalOwners  = ownersResult.count   ?? 0

  log.db.info('Dashboard stats fetched', {
    totalUsers,
    totalOwners,
    pending:    pendingResult.count,
    activesSubs: subsResult.count,
  })

  return ok({
    users: {
      total:   totalUsers,
      owners:  totalOwners,
      renters: totalUsers - totalOwners,
    },
    properties: {
      total:    propertiesResult.count ?? 0,
      pending:  pendingResult.count    ?? 0,
      approved: approvedResult.count   ?? 0,
    },
    subscriptions: {
      active:          subsResult.count ?? 0,
      totalRevenue_inr: Math.floor(totalRevenuePaise / 100),
      byPlan: {
        monthly:  Math.floor((revenueByPlan['monthly']  ?? 0) / 100),
        quarterly: Math.floor((revenueByPlan['quarterly'] ?? 0) / 100),
        yearly:   Math.floor((revenueByPlan['yearly']   ?? 0) / 100),
      },
    },
    inquiries: {
      total:  inquiriesResult.count ?? 0,
      recent: recentInqResult.data  ?? [],
    },
  })
})
