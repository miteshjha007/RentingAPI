'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { CheckCircle, XCircle } from 'lucide-react'
import { apiFetch } from '@/lib/supabase-browser'

interface Props {
  propertyId: string
  isApproved: boolean
  rejectionReason: string | null
}

export function PropertyActions({ propertyId, isApproved, rejectionReason }: Props) {
  const router = useRouter()
  const [rejecting, setRejecting] = useState(false)
  const [reason,    setReason]    = useState('')
  const [loading,   setLoading]   = useState(false)

  async function approve() {
    if (!confirm('Approve this property?')) return
    setLoading(true)
    try {
      const res = await apiFetch(`/api/properties/${propertyId}/approve`, { method: 'POST' })
      if (!res.ok) throw new Error()
      toast.success('Property approved')
      router.refresh()
    } catch {
      toast.error('Failed to approve')
    } finally {
      setLoading(false)
    }
  }

  async function submitReject() {
    if (!reason.trim()) { toast.error('Enter a rejection reason'); return }
    setLoading(true)
    try {
      const res = await apiFetch(`/api/properties/${propertyId}/reject`, {
        method: 'POST',
        body: JSON.stringify({ reason }),
      })
      if (!res.ok) throw new Error()
      toast.success('Property rejected')
      setRejecting(false)
      router.refresh()
    } catch {
      toast.error('Failed to reject')
    } finally {
      setLoading(false)
    }
  }

  // Already approved or rejected — no actions to show
  if (isApproved || rejectionReason) return null

  return (
    <div className="flex flex-col items-end gap-2 shrink-0">
      <div className="flex gap-2">
        <button
          onClick={approve}
          disabled={loading}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700
                     text-white text-sm font-medium disabled:opacity-50 transition"
        >
          <CheckCircle size={15} /> Approve
        </button>
        <button
          onClick={() => { setRejecting(r => !r); setReason('') }}
          disabled={loading}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-red-700 hover:bg-red-800
                     text-white text-sm font-medium disabled:opacity-50 transition"
        >
          <XCircle size={15} /> Reject
        </button>
      </div>

      {rejecting && (
        <div className="flex gap-2 w-full max-w-sm">
          <input
            autoFocus
            value={reason}
            onChange={e => setReason(e.target.value)}
            placeholder="Reason for rejection…"
            className="flex-1 px-3 py-2 rounded-xl bg-[#1a1a1a] border border-red-800/50
                       text-white text-sm placeholder-zinc-600 focus:outline-none
                       focus:border-red-500 focus:ring-1 focus:ring-red-500 transition"
          />
          <button
            onClick={submitReject}
            disabled={loading}
            className="px-3 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-sm
                       font-medium disabled:opacity-50 transition"
          >
            {loading ? '…' : 'Confirm'}
          </button>
        </div>
      )}
    </div>
  )
}
