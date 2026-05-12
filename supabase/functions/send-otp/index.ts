// Edge Function: send-otp
// Sends a phone OTP using Supabase Auth built-in phone provider.
// The mobile app calls this before showing the OTP input screen.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders, handleCors } from '../_shared/cors.ts'
import { errorResponse, jsonResponse } from '../_shared/supabaseAdmin.ts'

Deno.serve(async (req: Request) => {
  const cors = handleCors(req)
  if (cors) return cors

  let body: { phone?: string }
  try {
    body = await req.json()
  } catch {
    return errorResponse('Invalid JSON body')
  }

  const { phone } = body
  if (!phone || !/^\+91[6-9]\d{9}$/.test(phone)) {
    return errorResponse('Valid Indian mobile number required (+91XXXXXXXXXX)')
  }

  // Use the anon key — signInWithOtp does not require auth
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!
  )

  const { error } = await supabase.auth.signInWithOtp({ phone })

  if (error) {
    console.error('send-otp error:', error.message)
    return errorResponse(error.message, 500)
  }

  return jsonResponse({ success: true }, 200)
})
