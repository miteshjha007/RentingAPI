import { createBrowserClient } from '@supabase/ssr'

export function createBrowserSupabase() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

/** Authenticated fetch — attaches the current session's Bearer token. */
export async function apiFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const supabase = createBrowserSupabase()
  const { data: { session } } = await supabase.auth.getSession()
  return fetch(path, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session?.access_token ?? ''}`,
      ...(init.headers as Record<string, string> ?? {}),
    },
  })
}
