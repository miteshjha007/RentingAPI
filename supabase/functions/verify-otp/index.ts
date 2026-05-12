// Edge Function: verify-otp
// Verifies the OTP token and returns a session.
// The mobile app stores the access_token from the response.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders, handleCors } from '../_shared/cors.ts'
import { errorResponse, jsonResponse } from '../_shared/supabaseAdmin.ts'

Deno.serve(async (req: Request) => {
  const cors = handleCors(req)
  if (cors) return cors

  let body: { phone?: string; token?: string }
  try {
    body = await req.json()
  } catch {
    return errorResponse('Invalid JSON body')
  }

  const { phone, token } = body
  if (!phone || !token) {
    return errorResponse('phone and token are required')
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!
  )

  const { data, error } = await supabase.auth.verifyOtp({
    phone,
    token,
    type: 'sms',
  })

  if (error) {
    console.error('verify-otp error:', error.message)
    return errorResponse(error.message, 401)
  }

  return jsonResponse({
    access_token: data.session?.access_token,
    refresh_token: data.session?.refresh_token,
    user: data.user,
  })
})
