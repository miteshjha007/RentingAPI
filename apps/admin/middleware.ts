import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { type NextRequest, NextResponse } from 'next/server'

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string)      { return request.cookies.get(name)?.value },
        set(name: string, value: string, opts: CookieOptions) {
          request.cookies.set({ name, value, ...opts })
          response = NextResponse.next({ request })
          response.cookies.set({ name, value, ...opts })
        },
        remove(name: string, opts: CookieOptions) {
          request.cookies.set({ name, value: '', ...opts })
          response = NextResponse.next({ request })
          response.cookies.set({ name, value: '', ...opts })
        },
      },
    }
  )

  // Refresh session so it doesn't expire mid-visit
  const { data: { session } } = await supabase.auth.getSession()
  const { pathname } = request.nextUrl

  // API routes and static assets handle their own auth
  if (pathname.startsWith('/api/') || pathname.startsWith('/_next')) return response

  // Login page: already authenticated → go to dashboard
  if (pathname === '/login') {
    if (session) return NextResponse.redirect(new URL('/dashboard', request.url))
    return response
  }

  // Root: redirect to dashboard (layout will check admin role)
  if (pathname === '/') {
    return NextResponse.redirect(new URL(session ? '/dashboard' : '/login', request.url))
  }

  // Protected pages: require session
  if (!session) {
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('next', pathname)
    return NextResponse.redirect(loginUrl)
  }

  return response
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
