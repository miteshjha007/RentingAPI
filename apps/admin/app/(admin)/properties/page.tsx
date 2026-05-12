'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'
import { Search, CheckCircle, XCircle, Eye, ChevronLeft, ChevronRight } from 'lucide-react'
import { apiFetch } from '@/lib/supabase-browser'

type Property = {
  id: string
  title: string
  type: string
  price: number
  city: string
  area: string
  is_approved: boolean
  rejection_reason: string | null
  created_at: string
  owner: { id: string; name: string; phone: string }
}

type Meta = { page: number; limit: number; total: number; totalPages: number }

const STATUS_TABS = [
  { value: 'all',      label: 'All' },
  { value: 'pending',  label: 'Pending' },
  { value: 'approved', label: 'Approved' },
]

const TYPE_LABEL: Record<string, string> = {
  room: 'Room', flat: 'Flat', home: 'Home',
  pg: 'PG', hostel: 'Hostel',
}

export default function PropertiesPage() {
  const [status,     setStatus]     = useState('all')
  const [search,     setSearch]     = useState('')
  const [page,       setPage]       = useState(1)
  const [properties, setProperties] = useState<Property[]>([])
  const [meta,       setMeta]       = useState<Meta | null>(null)
  const [loading,    setLoading]    = useState(false)

  const [rejectingId, setRejectingId] = useState<string | null>(null)
  const [rejectReason, setRejectReason] = useState('')
  const [actioning,  setActioning]  = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ status, page: String(page), limit: '20' })
      if (search) params.set('search', search)
      const res  = await apiFetch(`/api/properties?${params}`)
      const json = await res.json()
      setProperties(json.data ?? [])
      setMeta(json.meta ?? null)
    } catch {
      toast.error('Failed to load properties')
    } finally {
      setLoading(false)
    }
  }, [status, search, page])

  useEffect(() => { load() }, [load])

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => { setPage(1); load() }, 400)
    return () => clearTimeout(t)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search])

  async function approve(id: string) {
    if (!confirm('Approve this property?')) return
    setActioning(id)
    try {
      const res = await apiFetch(`/api/properties/${id}/approve`, { method: 'POST' })
      if (!res.ok) throw new Error()
      toast.success('Property approved')
      load()
    } catch {
      toast.error('Failed to approve property')
    } finally {
      setActioning(null)
    }
  }

  async function submitReject(id: string) {
    if (!rejectReason.trim()) { toast.error('Please enter a rejection reason'); return }
    setActioning(id)
    try {
      const res = await apiFetch(`/api/properties/${id}/reject`, {
        method: 'POST',
        body: JSON.stringify({ reason: rejectReason }),
      })
      if (!res.ok) throw new Error()
      toast.success('Property rejected')
      setRejectingId(null)
      setRejectReason('')
      load()
    } catch {
      toast.error('Failed to reject property')
    } finally {
      setActioning(null)
    }
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Properties</h1>
        <p className="text-zinc-400 text-sm mt-0.5">Review and manage property listings</p>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        {/* Status tabs */}
        <div className="flex gap-1 bg-[#1a1a1a] border border-[#2c2c30] rounded-xl p-1">
          {STATUS_TABS.map(tab => (
            <button
              key={tab.value}
              onClick={() => { setStatus(tab.value); setPage(1) }}
              className={`px-3.5 py-1.5 rounded-lg text-sm font-medium transition
                ${status === tab.value
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
            placeholder="Search title, city…"
            className="w-full pl-8 pr-3 py-2 rounded-xl bg-[#1a1a1a] border border-[#2c2c30]
                       text-white text-sm placeholder-zinc-600 focus:outline-none
                       focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition"
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-[#1a1a1a] border border-[#2c2c30] rounded-2xl overflow-hidden">
        {loading && properties.length === 0 ? (
          <div className="py-16 text-center text-zinc-500 text-sm">Loading…</div>
        ) : properties.length === 0 ? (
          <div className="py-16 text-center text-zinc-500 text-sm">No properties found</div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[#2c2c30] text-left">
                    <th className="px-5 py-3 text-zinc-500 font-medium">Property</th>
                    <th className="px-4 py-3 text-zinc-500 font-medium">Owner</th>
                    <th className="px-4 py-3 text-zinc-500 font-medium">Price</th>
                    <th className="px-4 py-3 text-zinc-500 font-medium">Status</th>
                    <th className="px-4 py-3 text-zinc-500 font-medium">Date</th>
                    <th className="px-4 py-3 text-zinc-500 font-medium text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#2c2c30]">
                  {properties.map(prop => (
                    <>
                      <tr key={prop.id} className="hover:bg-[#222226] transition">
                        <td className="px-5 py-3.5">
                          <p className="text-white font-medium truncate max-w-[200px]">{prop.title}</p>
                          <p className="text-zinc-500 text-xs mt-0.5">
                            {TYPE_LABEL[prop.type] ?? prop.type} · {prop.area}, {prop.city}
                          </p>
                        </td>
                        <td className="px-4 py-3.5">
                          <p className="text-zinc-200">{prop.owner?.name}</p>
                          <p className="text-zinc-500 text-xs">{prop.owner?.phone}</p>
                        </td>
                        <td className="px-4 py-3.5 text-zinc-200">
                          ₹{prop.price.toLocaleString()}
                        </td>
                        <td className="px-4 py-3.5">
                          {prop.is_approved ? (
                            <span className="text-xs bg-emerald-900/40 text-emerald-400 px-2 py-0.5 rounded-full">
                              Approved
                            </span>
                          ) : prop.rejection_reason ? (
                            <span className="text-xs bg-red-900/40 text-red-400 px-2 py-0.5 rounded-full">
                              Rejected
                            </span>
                          ) : (
                            <span className="text-xs bg-amber-900/40 text-amber-400 px-2 py-0.5 rounded-full">
                              Pending
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3.5 text-zinc-500 text-xs whitespace-nowrap">
                          {new Date(prop.created_at).toLocaleDateString('en-IN', {
                            day: '2-digit', month: 'short', year: 'numeric',
                          })}
                        </td>
                        <td className="px-4 py-3.5">
                          <div className="flex items-center gap-2 justify-end">
                            <Link
                              href={`/properties/${prop.id}`}
                              className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-[#2c2c30] transition"
                              title="View details"
                            >
                              <Eye size={15} />
                            </Link>
                            {!prop.is_approved && !prop.rejection_reason && (
                              <>
                                <button
                                  onClick={() => approve(prop.id)}
                                  disabled={actioning === prop.id}
                                  title="Approve"
                                  className="p-1.5 rounded-lg text-emerald-400 hover:bg-emerald-900/30 disabled:opacity-40 transition"
                                >
                                  <CheckCircle size={15} />
                                </button>
                                <button
                                  onClick={() => { setRejectingId(prop.id); setRejectReason('') }}
                                  disabled={actioning === prop.id}
                                  title="Reject"
                                  className="p-1.5 rounded-lg text-red-400 hover:bg-red-900/30 disabled:opacity-40 transition"
                                >
                                  <XCircle size={15} />
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                      {/* Inline reject reason input */}
                      {rejectingId === prop.id && (
                        <tr key={`${prop.id}-reject`} className="bg-red-950/20">
                          <td colSpan={6} className="px-5 py-3">
                            <div className="flex gap-2 items-center">
                              <input
                                autoFocus
                                value={rejectReason}
                                onChange={e => setRejectReason(e.target.value)}
                                placeholder="Reason for rejection…"
                                className="flex-1 px-3 py-1.5 rounded-lg bg-[#1a1a1a] border border-red-800/50
                                           text-white text-sm placeholder-zinc-600 focus:outline-none
                                           focus:border-red-500 focus:ring-1 focus:ring-red-500 transition"
                              />
                              <button
                                onClick={() => submitReject(prop.id)}
                                disabled={actioning === prop.id}
                                className="px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white text-sm
                                           font-medium disabled:opacity-50 transition"
                              >
                                {actioning === prop.id ? 'Rejecting…' : 'Reject'}
                              </button>
                              <button
                                onClick={() => setRejectingId(null)}
                                className="px-3 py-1.5 rounded-lg text-zinc-400 hover:text-zinc-100 text-sm transition"
                              >
                                Cancel
                              </button>
                            </div>
                          </td>
                        </tr>
                      )}
                    </>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {meta && meta.totalPages > 1 && (
              <div className="flex items-center justify-between px-5 py-3 border-t border-[#2c2c30]">
                <span className="text-zinc-500 text-xs">
                  {meta.total} properties · page {meta.page} of {meta.totalPages}
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
