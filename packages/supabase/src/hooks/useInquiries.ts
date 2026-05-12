import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../client'
import type { Inquiry, ContactVia } from '../types'

// Richer type returned by this hook — includes joined profile + property data
export interface InquiryDetail extends Inquiry {
  property: { id: string; title: string; city: string; type: string } | null
  renter:   { id: string; name: string; phone: string | null; avatar_url: string | null } | null
}

interface UseInquiriesResult {
  inquiries:  InquiryDetail[]
  loading:    boolean
  error:      string | null
  unread:     number
  refresh:    () => void
}

interface UseInquiriesOptions {
  propertyId?: string   // filter to a single property
  limit?:      number
}

export function useInquiries(options: UseInquiriesOptions = {}): UseInquiriesResult {
  const { propertyId, limit = 50 } = options
  const [inquiries, setInquiries] = useState<InquiryDetail[]>([])
  const [loading, setLoading]     = useState(true)
  const [error, setError]         = useState<string | null>(null)
  const [tick, setTick]           = useState(0)

  useEffect(() => {
    let cancelled = false
    setLoading(true)

    const run = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user || cancelled) { setLoading(false); return }

      let query = supabase
        .from('inquiries')
        .select(`
          *,
          property:properties!inquiries_property_id_fkey (id, title, city, type),
          renter:profiles!inquiries_renter_id_fkey      (id, name, phone, avatar_url)
        `)
        .eq('owner_id', user.id)
        .order('created_at', { ascending: false })
        .limit(limit)

      if (propertyId) query = query.eq('property_id', propertyId)

      const { data, error: err } = await query

      if (cancelled) return
      if (err) { setError(err.message); setLoading(false); return }

      setInquiries((data ?? []) as InquiryDetail[])
      setError(null)
      setLoading(false)
    }

    run()
    return () => { cancelled = true }
  }, [propertyId, limit, tick])

  const unread = 0 // extend with a read_at column if needed

  return {
    inquiries,
    loading,
    error,
    unread,
    refresh: () => setTick(t => t + 1),
  }
}
