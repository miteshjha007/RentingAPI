// Edge Function: razorpay-create-order
// Creates a Razorpay order for a subscription plan.
// Prices are fetched live from admin_settings so the admin can change them
// without redeploying. Amounts are converted to paise before sending to Razorpay.

import { corsHeaders, handleCors } from '../_shared/cors.ts'
import { getAdminClient, errorResponse, jsonResponse } from '../_shared/supabaseAdmin.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

type Plan = 'monthly' | 'quarterly' | 'yearly'

const PLAN_DURATION_DAYS: Record<Plan, number> = {
  monthly: 30,
  quarterly: 90,
  yearly: 365,
}

const PLAN_SETTING_KEY: Record<Plan, string> = {
  monthly: 'subscription_monthly_inr',
  quarterly: 'subscription_quarterly_inr',
  yearly: 'subscription_yearly_inr',
}

Deno.serve(async (req: Request) => {
  const cors = handleCors(req)
  if (cors) return cors

  // Require authenticated caller
  const authHeader = req.headers.get('Authorization')
  if (!authHeader) return errorResponse('Unauthorized', 401)

  let body: { plan?: string; user_id?: string }
  try {
    body = await req.json()
  } catch {
    return errorResponse('Invalid JSON body')
  }

  const { plan, user_id } = body
  if (!plan || !['monthly', 'quarterly', 'yearly'].includes(plan)) {
    return errorResponse('plan must be monthly, quarterly, or yearly')
  }
  if (!user_id) {
    return errorResponse('user_id is required')
  }

  const typedPlan = plan as Plan
  const admin = getAdminClient()

  // Verify the calling user matches user_id (prevent spoofing)
  const userClient = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { global: { headers: { Authorization: authHeader } } }
  )
  const { data: { user }, error: userErr } = await userClient.auth.getUser()
  if (userErr || user?.id !== user_id) {
    return errorResponse('Unauthorized', 401)
  }

  // Fetch plan price from admin_settings
  const { data: setting, error: settingErr } = await admin
    .from('admin_settings')
    .select('value')
    .eq('key', PLAN_SETTING_KEY[typedPlan])
    .single()

  if (settingErr || !setting) {
    return errorResponse('Could not fetch plan pricing', 500)
  }

  const amountInr = parseInt(setting.value, 10)
  const amountPaise = amountInr * 100

  // Create Razorpay order via REST API
  const razorpayKeyId = Deno.env.get('RAZORPAY_KEY_ID')!
  const razorpayKeySecret = Deno.env.get('RAZORPAY_KEY_SECRET')!
  const credentials = btoa(`${razorpayKeyId}:${razorpayKeySecret}`)

  const receiptId = `sub_${user_id.slice(0, 8)}_${Date.now()}`

  const rpRes = await fetch('https://api.razorpay.com/v1/orders', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Basic ${credentials}`,
    },
    body: JSON.stringify({
      amount: amountPaise,
      currency: 'INR',
      receipt: receiptId,
      notes: {
        user_id,
        plan,
        duration_days: PLAN_DURATION_DAYS[typedPlan],
      },
    }),
  })

  if (!rpRes.ok) {
    const rpErr = await rpRes.text()
    console.error('Razorpay order creation failed:', rpErr)
    return errorResponse('Failed to create payment order', 502)
  }

  const order = await rpRes.json()

  return jsonResponse({
    order_id: order.id,
    amount: order.amount,       // in paise
    currency: order.currency,
    plan,
    duration_days: PLAN_DURATION_DAYS[typedPlan],
  })
})
