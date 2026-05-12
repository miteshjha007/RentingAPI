import { useState, useEffect } from 'react'
import { supabase } from '../client'
import type { PropertyFull } from '../types'

interface UsePropertyResult {
  property: PropertyFull | null
  loading: boolean
  error: string | null
  refresh: () => void
}

export function useProperty(id: string | undefined): UsePropertyResult {
  const [property, setProperty] = useState<PropertyFull | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [tick, setTick] = useState(0)

  useEffect(() => {
    if (!id) { setLoading(false); return }

    let cancelled = false
    setLoading(true)

    supabase
      .from('properties')
      .select(`
        *,
        details:property_details(*),
        media:property_media(*),
        owner:profiles!properties_owner_id_fkey(id, name, phone, avatar_url)
      `)
      .eq('id', id)
      .single()
      .then(({ data, error: err }) => {
        if (cancelled) return
        if (err) {
          setError(err.message)
        } else {
          // Sort media by order_index
          if (data?.media) {
            data.media.sort((a: { order_index: number }, b: { order_index: number }) => a.order_index - b.order_index)
          }
          setProperty(data as PropertyFull)
        }
        setLoading(false)
      })

    return () => { cancelled = true }
  }, [id, tick])

  return { property, loading, error, refresh: () => setTick(t => t + 1) }
}
