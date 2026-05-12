import { NextRequest } from 'next/server'
import { withAdmin, ok, ApiError } from '@/lib/apiHelpers'
import { adminDb } from '@/lib/supabase'
import { log } from '@/lib/logger'

// GET /api/settings — returns all key-value settings
export const GET = withAdmin(async () => {
  log.db.info('Fetching admin settings')

  const { data, error } = await adminDb
    .from('admin_settings')
    .select('key, value, updated_at')
    .order('key')

  if (error) {
    log.db.error('Failed to fetch settings', { error: error.message })
    throw new ApiError('Failed to fetch settings', 500)
  }

  // Convert array to object for easier consumption: { commission_percent: "5", ... }
  const settings = Object.fromEntries(
    (data ?? []).map((row: { key: string; value: string }) => [row.key, row.value])
  )

  return ok({ settings, rows: data })
})

// PATCH /api/settings
// Body: { [key: string]: string }  — partial update of one or more keys
export const PATCH = withAdmin(async (req: NextRequest, _ctx, adminId: string) => {
  let body: Record<string, string>
  try { body = await req.json() }
  catch { throw new ApiError('Invalid JSON body', 400) }

  if (!body || Object.keys(body).length === 0) {
    throw new ApiError('No settings provided', 400)
  }

  log.db.info('Updating settings', { keys: Object.keys(body), adminId })

  // Validate keys exist before writing
  const { data: existing } = await adminDb
    .from('admin_settings')
    .select('key')
    .in('key', Object.keys(body))

  const existingKeys = new Set((existing ?? []).map((r: { key: string }) => r.key))
  const unknownKeys  = Object.keys(body).filter(k => !existingKeys.has(k))

  if (unknownKeys.length > 0) {
    throw new ApiError(
      `Unknown setting keys: ${unknownKeys.join(', ')}`,
      400,
      'UNKNOWN_KEYS'
    )
  }

  // Upsert each key — run in a single transaction-like sequence
  const updates = Object.entries(body).map(([key, value]) =>
    adminDb
      .from('admin_settings')
      .update({ value })
      .eq('key', key)
  )

  const results = await Promise.all(updates)
  const failed  = results.filter(r => r.error)

  if (failed.length) {
    log.db.error('Some settings failed to update', {
      errors: failed.map(r => r.error?.message),
    })
    throw new ApiError('Partial settings update failure', 500)
  }

  log.db.info('Settings updated', { keys: Object.keys(body) })

  // Return refreshed settings
  const { data: refreshed } = await adminDb
    .from('admin_settings')
    .select('key, value, updated_at')
    .order('key')

  return ok({
    updated: Object.keys(body),
    settings: Object.fromEntries(
      (refreshed ?? []).map((r: { key: string; value: string }) => [r.key, r.value])
    ),
  })
})
