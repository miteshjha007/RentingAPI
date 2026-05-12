'use client'

import { useState, useEffect, useCallback } from 'react'
import { toast } from 'sonner'
import { Search, ChevronLeft, ChevronRight, ShieldCheck } from 'lucide-react'
import { apiFetch } from '@/lib/supabase-browser'

type User = {
  id: string
  name: string
  email: string
  phone: string
  role: string
  is_verified: boolean
  created_at: string
}

type Meta = { page: number; limit: number; total: number; totalPages: number }

const ROLE_TABS = [
  { value: '',       label: 'All' },
  { value: 'renter', label: 'Renters' },
  { value: 'owner',  label: 'Owners' },
  { value: 'admin',  label: 'Admins' },
]

const ROLE_COLORS: Record<string, string> = {
  admin:  'bg-orange-900/40 text-orange-400',
  owner:  'bg-blue-900/40 text-blue-400',
  renter: 'bg-zinc-800 text-zinc-400',
}

export default function UsersPage() {
  const [role,    setRole]    = useState('')
  const [search,  setSearch]  = useState('')
  const [page,    setPage]    = useState(1)
  const [users,   setUsers]   = useState<User[]>([])
  const [meta,    setMeta]    = useState<Meta | null>(null)
  const [loading, setLoading] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ page: String(page), limit: '25' })
      if (role)   params.set('role', role)
      if (search) params.set('search', search)
      const res  = await apiFetch(`/api/users?${params}`)
      const json = await res.json()
      setUsers(json.data ?? [])
      setMeta(json.meta ?? null)
    } catch {
      toast.error('Failed to load users')
    } finally {
      setLoading(false)
    }
  }, [role, search, page])

  useEffect(() => { load() }, [load])

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => { setPage(1); load() }, 400)
    return () => clearTimeout(t)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search])

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Users</h1>
        <p className="text-zinc-400 text-sm mt-0.5">Browse and manage platform users</p>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        {/* Role tabs */}
        <div className="flex gap-1 bg-[#1a1a1a] border border-[#2c2c30] rounded-xl p-1">
          {ROLE_TABS.map(tab => (
            <button
              key={tab.value}
              onClick={() => { setRole(tab.value); setPage(1) }}
              className={`px-3.5 py-1.5 rounded-lg text-sm font-medium transition
                ${role === tab.value
                  ? 'bg-orange-500 text-white'
                  : 'text-zinc-400 hover:text-zinc-100'}`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative flex-1 max-w-xs">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search name, email, phone…"
            className="w-full pl-8 pr-3 py-2 rounded-xl bg-[#1a1a1a] border border-[#2c2c30]
                       text-white text-sm placeholder-zinc-600 focus:outline-none
                       focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition"
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-[#1a1a1a] border border-[#2c2c30] rounded-2xl overflow-hidden">
        {loading && users.length === 0 ? (
          <div className="py-16 text-center text-zinc-500 text-sm">Loading…</div>
        ) : users.length === 0 ? (
          <div className="py-16 text-center text-zinc-500 text-sm">No users found</div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[#2c2c30] text-left">
                    <th className="px-5 py-3 text-zinc-500 font-medium">User</th>
                    <th className="px-4 py-3 text-zinc-500 font-medium">Phone</th>
                    <th className="px-4 py-3 text-zinc-500 font-medium">Role</th>
                    <th className="px-4 py-3 text-zinc-500 font-medium">Verified</th>
                    <th className="px-4 py-3 text-zinc-500 font-medium">Joined</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#2c2c30]">
                  {users.map(user => (
                    <tr key={user.id} className="hover:bg-[#222226] transition">
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-[#2c2c30] flex items-center justify-center
                                          text-zinc-300 font-semibold text-sm shrink-0">
                            {user.name?.[0]?.toUpperCase() ?? '?'}
                          </div>
                          <div>
                            <p className="text-white font-medium">{user.name}</p>
                            <p className="text-zinc-500 text-xs">{user.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3.5 text-zinc-300">{user.phone || '—'}</td>
                      <td className="px-4 py-3.5">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium
                          ${ROLE_COLORS[user.role] ?? 'bg-zinc-800 text-zinc-400'}`}>
                          {user.role}
                        </span>
                      </td>
                      <td className="px-4 py-3.5">
                        {user.is_verified ? (
                          <ShieldCheck size={15} className="text-emerald-400" />
                        ) : (
                          <span className="text-zinc-600 text-xs">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3.5 text-zinc-500 text-xs whitespace-nowrap">
                        {new Date(user.created_at).toLocaleDateString('en-IN', {
                          day: '2-digit', month: 'short', year: 'numeric',
                        })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {meta && meta.totalPages > 1 && (
              <div className="flex items-center justify-between px-5 py-3 border-t border-[#2c2c30]">
                <span className="text-zinc-500 text-xs">
                  {meta.total} users · page {meta.page} of {meta.totalPages}
                </span>
                <div className="flex gap-1">
                  <button
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={meta.page <= 1}
                    className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-100 disabled:opacity-30 transition"
                  >
                    <ChevronLeft size={16} />
                  </button>
                  <button
                    onClick={() => setPage(p => Math.min(meta.totalPages, p + 1))}
                    disabled={meta.page >= meta.totalPages}
                    className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-100 disabled:opacity-30 transition"
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
