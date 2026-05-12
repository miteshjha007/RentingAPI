import { NextRequest } from 'next/server'
import { withAdmin, ok, ApiError } from '@/lib/apiHelpers'
import { adminDb } from '@/lib/supabase'
import { log } from '@/lib/logger'

interface BroadcastBody {
  title:   string
  body:    string
  target?: 'all' | 'renters' | 'owners'   // default: all
  data?:   Record<string, unknown>
}

interface ExpoPushMessage {
  to:     string
  title:  string
  body:   string
  sound:  'default'
  data?:  Record<string, unknown>
}

// Expo push accepts up to 100 messages per request
const EXPO_BATCH_SIZE = 100

async function sendExpoBatch(messages: ExpoPushMessage[]): Promise<void> {
  const res = await fetch('https://exp.host/--/api/v2/push/send', {
    method:  'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept:         'application/json',
    },
    body: JSON.stringify(messages),
  })

  if (!res.ok) {
    const txt = await res.text()
    log.push.error('Expo batch failed', { status: res.status, body: txt })
  } else {
    const json = await res.json() as { data: Array<{ status: string }> }
    const failed = json.data?.filter(r => r.status !== 'ok').length ?? 0
    if (failed) log.push.warn('Some push tokens failed', { failed, total: messages.length })
  }
}

// POST /api/notifications/broadcast
// Body: { title, body, target?, data? }
export const POST = withAdmin(async (req: NextRequest, _ctx, adminId: string) => {
  let body: BroadcastBody
  try { body = await req.json() }
  catch { throw new ApiError('Invalid JSON body', 400) }

  const { title, body: msgBody, target = 'all', data: extraData } = body

  if (!title?.trim()) throw new ApiError('title is required', 400)
  if (!msgBody?.trim()) throw new ApiError('body is required', 400)

  log.push.info('Starting broadcast', { title, target, adminId })

  // Fetch all matching profiles that have a push token
  let profileQuery = adminDb
    .from('profiles')
    .select('id, expo_push_token')
    .not('expo_push_token', 'is', null)

  if (target === 'renters') profileQuery = profileQuery.eq('role', 'renter')
  if (target === 'owners')  profileQuery = profileQuery.eq('role', 'owner')

  const { data: profiles, error: profileErr } = await profileQuery

  if (profileErr) {
    log.push.error('Failed to fetch profiles for broadcast', { error: profileErr.message })
    throw new ApiError('Failed to fetch recipient list', 500)
  }

  const recipients = (profiles ?? []).filter(
    (p: { expo_push_token: string | null }) =>
      p.expo_push_token?.startsWith('ExponentPushToken[')
  )

  log.push.info('Recipients determined', { total: recipients.length, target })

  if (recipients.length === 0) {
    return ok({ sent: 0, message: 'No recipients with valid push tokens' })
  }

  // Send in batches
  const messages: ExpoPushMessage[] = recipients.map(
    (p: { id: string; expo_push_token: string }) => ({
      to:    p.expo_push_token,
      title,
      body:  msgBody,
      sound: 'default' as const,
      data:  { ...extraData, screen: 'notifications' },
    })
  )

  let sent = 0
  for (let i = 0; i < messages.length; i += EXPO_BATCH_SIZE) {
    const batch = messages.slice(i, i + EXPO_BATCH_SIZE)
    await sendExpoBatch(batch)
    sent += batch.length
    log.push.debug(`Batch sent`, { batchStart: i, batchSize: batch.length })
  }

  // Insert in-app notification rows for all recipients in a single batch insert
  const notifRows = recipients.map((p: { id: string }) => ({
    user_id: p.id,
    title,
    body:    msgBody,
    type:    'general' as const,
    data:    extraData ?? {},
  }))

  const { error: notifErr } = await adminDb.from('notifications').insert(notifRows)
  if (notifErr) {
    // Non-fatal: push was sent, only in-app record failed
    log.push.warn('In-app notification insert failed', { error: notifErr.message })
  }

  log.push.info('Broadcast complete', { sent, target })
  return ok({ sent, target })
})
