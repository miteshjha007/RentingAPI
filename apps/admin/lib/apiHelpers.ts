import { NextRequest, NextResponse } from 'next/server'
import { getAdminUser } from './supabase'
import { reqLogger } from './logger'

// ── Standard error type ───────────────────────────────────────────────────────

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number = 400,
    public readonly code?: string
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

// ── Standard response builders ────────────────────────────────────────────────

export interface PaginationMeta {
  page:       number
  limit:      number
  total:      number
  totalPages: number
}

export function ok<T>(data: T, meta?: PaginationMeta): NextResponse {
  return NextResponse.json(
    { data, ...(meta ? { meta } : {}) },
    { status: 200 }
  )
}

export function created<T>(data: T): NextResponse {
  return NextResponse.json({ data }, { status: 201 })
}

export function noContent(): NextResponse {
  return new NextResponse(null, { status: 204 })
}

export function err(message: string, status = 400, code?: string): NextResponse {
  return NextResponse.json({ error: message, ...(code ? { code } : {}) }, { status })
}

// ── Pagination helper ─────────────────────────────────────────────────────────

export function parsePagination(req: NextRequest, defaultLimit = 20) {
  const sp    = req.nextUrl.searchParams
  const page  = Math.max(1, parseInt(sp.get('page')  ?? '1',  10))
  const limit = Math.min(100, Math.max(1, parseInt(sp.get('limit') ?? String(defaultLimit), 10)))
  const offset = (page - 1) * limit
  return { page, limit, offset }
}

export function buildMeta(page: number, limit: number, total: number): PaginationMeta {
  return { page, limit, total, totalPages: Math.ceil(total / limit) }
}

// ── Route handler type ────────────────────────────────────────────────────────

type RouteContext   = { params: Record<string, string> }
type AdminHandler   = (req: NextRequest, ctx: RouteContext, adminId: string) => Promise<NextResponse>

// ── withAdmin — wraps a route handler with auth + logging + error handling ────
//
// Usage:
//   export const GET = withAdmin(async (req, { params }, adminId) => {
//     ...
//     return ok(data)
//   })

export function withAdmin(handler: AdminHandler) {
  return async function routeWrapper(
    req: NextRequest,
    ctx: RouteContext = { params: {} }
  ): Promise<NextResponse> {
    const path = new URL(req.url).pathname
    const rl   = reqLogger(req.method, path)

    // Auth check
    const { user, error: authErr } = await getAdminUser(req.headers.get('authorization'))
    if (authErr || !user) {
      const status = authErr?.includes('Forbidden') ? 403 : 401
      rl.fail(status, authErr ?? 'Unauthorized')
      return err(authErr ?? 'Unauthorized', status)
    }

    // Execute handler
    try {
      const res = await handler(req, ctx, user.id)
      rl.ok(res.status)
      return res
    } catch (e) {
      if (e instanceof ApiError) {
        rl.fail(e.status, e.message)
        return err(e.message, e.status, e.code)
      }
      rl.boom(e)
      return err('Internal server error', 500)
    }
  }
}
