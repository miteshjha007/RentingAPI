import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

/** Server-side Supabase client using the current request's cookies.
 *  Read-only — set/remove are no-ops (Server Components can't set cookies). */
export function createServerSupabase() {
  const cookieStore = cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name) { return cookieStore.get(name)?.value },
        set()     {},
        remove()  {},
      },
    }
  )
}
