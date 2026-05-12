// Edge Function: notify-owner
// Called after a renter submits an inquiry.
// 1. Looks up the owner's Expo push token from their profile.
// 2. Sends a push notification via the Expo Push API.
// 3. Inserts an in-app notification row so the owner sees it in the dashboard.

import { getAdminClient, errorResponse, jsonResponse } from '../_shared/supabaseAdmin.ts'
import { corsHeaders, handleCors } from '../_shared/cors.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

interface ExpoPushMessage {
  to: string
  sound: 'default'
  title: string
  body: string
  data?: Record<string, unknown>
  badge?: number
}

async function sendExpoPush(messages: ExpoPushMessage[]): Promise<void> {
  const res = await fetch('https://exp.host/--/api/v2/push/send', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      'Accept-Encoding': 'gzip, deflate',
    },
    body: JSON.stringify(messages),
  })
  if (!res.ok) {
    const err = await res.text()
    console.error('Expo push failed:', err)
  }
}

Deno.serve(async (req: Request) => {
  const cors = handleCors(req)
  if (cors) return cors

  const authHeader = req.headers.get('Authorization')
  if (!authHeader) return errorResponse('Unauthorized', 401)

  let body: { owner_id?: string; inquiry_id?: string }
  try {
    body = await req.json()
  } catch {
    return errorResponse('Invalid JSON body')
  }

  const { owner_id, inquiry_id } = body
  if (!owner_id || !inquiry_id) {
    return errorResponse('owner_id and inquiry_id are required')
  }

  // Verify the caller is the renter who created this inquiry
  const userClient = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { global: { headers: { Authorization: authHeader } } }
  )
  const { data: { user }, error: userErr } = await userClient.auth.getUser()
  if (userErr || !user) return errorResponse('Unauthorized', 401)

  const admin = getAdminClient()

  // Load inquiry to build notification text
  const { data: inquiry, error: inquiryErr } = await admin
    .from('inquiries')
    .select('id, renter_id, contact_via, properties(title, city)')
    .eq('id', inquiry_id)
    .eq('renter_id', user.id)   // ensures the caller owns this inquiry
    .single()

  if (inquiryErr || !inquiry) {
    return errorResponse('Inquiry not found or access denied', 404)
  }

  // Load renter name for notification text
  const { data: renter } = await admin
    .from('profiles')
    .select('name')
    .eq('id', user.id)
    .single()

  const property = inquiry.properties as { title?: string; city?: string } | null
  const propTitle = property?.title ?? 'your property'
  const propCity = property?.city ?? ''
  const renterName = renter?.name ?? 'Someone'
  const via = inquiry.contact_via

  const title = 'New Inquiry Received'
  const notifBody = `${renterName} is interested in ${propTitle}${propCity ? `, ${propCity}` : ''}. They want to connect via ${via}.`

  // Insert in-app notification (Realtime subscription on mobile picks this up)
  await admin.from('notifications').insert({
    user_id: owner_id,
    title,
    body: notifBody,
    type: 'inquiry',
    data: { inquiry_id, property_id: (inquiry as Record<string, unknown>).property_id },
  })

  // Send Expo push if the owner has a push token registered
  const { data: ownerProfile } = await admin
    .from('profiles')
    .select('expo_push_token')
    .eq('id', owner_id)
    .single()

  const pushToken = ownerProfile?.expo_push_token
  if (pushToken && pushToken.startsWith('ExponentPushToken[')) {
    await sendExpoPush([
      {
        to: pushToken,
        sound: 'default',
        title,
        body: notifBody,
        data: { inquiry_id, screen: 'inquiries' },
        badge: 1,
      },
    ])
  }

  return jsonResponse({ success: true })
})
