// Edge Function: razorpay-webhook
// Receives payment.captured events from Razorpay.
// Verifies the webhook signature, then upserts the subscription row
// and creates an in-app notification for the user.
//
// Razorpay webhook signature:
//   HMAC-SHA256(raw_body_string, RAZORPAY_WEBHOOK_SECRET)
// compared against the X-Razorpay-Signature header (hex string).

import { getAdminClient, errorResponse, jsonResponse } from '../_shared/supabaseAdmin.ts'

async function verifySignature(rawBody: string, signature: string, secret: string): Promise<boolean> {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  )
  const sigBytes = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(rawBody))
  const computed = Array.from(new Uint8Array(sigBytes))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
  return computed === signature
}

function addDays(date: Date, days: number): string {
  const d = new Date(date)
  d.setDate(d.getDate() + days)
  return d.toISOString().split('T')[0]
}

Deno.serve(async (req: Request) => {
  // Razorpay sends POST only
  if (req.method !== 'POST') {
    return errorResponse('Method not allowed', 405)
  }

  const signature = req.headers.get('X-Razorpay-Signature') ?? ''
  const rawBody = await req.text()

  const webhookSecret = Deno.env.get('RAZORPAY_WEBHOOK_SECRET')!
  const valid = await verifySignature(rawBody, signature, webhookSecret)
  if (!valid) {
    console.warn('razorpay-webhook: invalid signature')
    return errorResponse('Invalid signature', 401)
  }

  let payload: Record<string, unknown>
  try {
    payload = JSON.parse(rawBody)
  } catch {
    return errorResponse('Invalid JSON')
  }

  const event = payload.event as string

  // Only process successful payment captures
  if (event !== 'payment.captured') {
    return jsonResponse({ received: true, skipped: true })
  }

  const paymentEntity = (payload.payload as Record<string, unknown>)?.payment as Record<string, unknown>
  const entity = paymentEntity?.entity as Record<string, unknown>

  if (!entity) {
    return errorResponse('Malformed webhook payload', 400)
  }

  const razorpayPaymentId = entity.id as string
  const razorpayOrderId = entity.order_id as string
  const amountPaise = entity.amount as number
  const notes = (entity.notes ?? {}) as Record<string, string>

  const userId = notes.user_id
  const plan = notes.plan as 'monthly' | 'quarterly' | 'yearly'
  const durationDays = parseInt(notes.duration_days ?? '30', 10)

  if (!userId || !plan) {
    console.error('razorpay-webhook: missing user_id or plan in notes', notes)
    return errorResponse('Missing order metadata', 400)
  }

  const admin = getAdminClient()
  const today = new Date()

  // Deactivate any existing active subscriptions for this user
  await admin
    .from('subscriptions')
    .update({ is_active: false })
    .eq('user_id', userId)
    .eq('is_active', true)

  // Insert new subscription
  const { error: subErr } = await admin.from('subscriptions').insert({
    user_id: userId,
    plan,
    start_date: today.toISOString().split('T')[0],
    end_date: addDays(today, durationDays),
    is_active: true,
    razorpay_order_id: razorpayOrderId,
    razorpay_payment_id: razorpayPaymentId,
    amount: amountPaise,
  })

  if (subErr) {
    console.error('razorpay-webhook: subscription insert failed:', subErr.message)
    return errorResponse('Failed to activate subscription', 500)
  }

  // Notify the user in-app
  const planLabels: Record<string, string> = {
    monthly: 'Monthly',
    quarterly: '3-Month',
    yearly: 'Annual',
  }
  await admin.from('notifications').insert({
    user_id: userId,
    title: 'Subscription Activated!',
    body: `Your ${planLabels[plan] ?? plan} plan is now active. Enjoy unlimited property contacts.`,
    type: 'subscription',
    data: {
      razorpay_payment_id: razorpayPaymentId,
      plan,
      amount_paise: amountPaise,
    },
  })

  console.log(`razorpay-webhook: subscription activated for user ${userId}, plan=${plan}`)
  return jsonResponse({ received: true })
})
