import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../client'
import type { Property, PropertyMedia } from '../types'

// Extended type for owner's own listings — includes cover image and inquiry count
export interface OwnerProperty extends Property {
  cover_image:   string | null
  media_count:   number
  inquiry_count: number
}

interface UseOwnerPropertiesResult {
  properties:  OwnerProperty[]
  loading:     boolean
  error:       string | null
  refresh:     () => void
  deleteProperty: (id: string) => Promise<{ error: string | null }>
  toggleAvailability: (id: string, available: boolean) => Promise<{ error: string | null }>
}

export function useOwnerProperties(): UseOwnerPropertiesResult {
  const [properties, setProperties] = useState<OwnerProperty[]>([])
  const [loading, setLoading]       = useState(true)
  const [error, setError]           = useState<string | null>(null)
  const [tick, setTick]             = useState(0)

  useEffect(() => {
    let cancelled = false
    setLoading(true)

    const run = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user || cancelled) { setLoading(false); return }

      const { data, error: err } = await supabase
        .from('properties')
        .select(`
          *,
          property_media ( url, order_index, type )
        `)
        .eq('owner_id', user.id)
        .order('created_at', { ascending: false })

      if (cancelled) return
      if (err) { setError(err.message); setLoading(false); return }

      // Fetch inquiry counts for all properties in a single query
      const propertyIds = (data ?? []).map((p: { id: string }) => p.id)
      const { data: inquiryCounts } = await supabase
        .from('inquiries')
        .select('property_id')
        .in('property_id', propertyIds)

      const countMap: Record<string, number> = {}
      ;(inquiryCounts ?? []).forEach((row: { property_id: string }) => {
        countMap[row.property_id] = (countMap[row.property_id] ?? 0) + 1
      })

      const enriched: OwnerProperty[] = (data ?? []).map((p: Record<string, unknown>) => {
        const media = (p.property_media as PropertyMedia[] | null) ?? []
        const cover = media
          .filter(m => m.type === 'image')
          .sort((a, b) => a.order_index - b.order_index)[0]?.url ?? null

        return {
          ...(p as unknown as Property),
          cover_image:   cover,
          media_count:   media.length,
          inquiry_count: countMap[p.id as string] ?? 0,
        }
      })

      setProperties(enriched)
      setError(null)
      setLoading(false)
    }

    run()
    return () => { cancelled = true }
  }, [tick])

  const deleteProperty = useCallback(async (id: string) => {
    const { error: err } = await supabase
      .from('properties')
      .delete()
      .eq('id', id)

    if (err) return { error: err.message }
    setProperties(prev => prev.filter(p => p.id !== id))
    return { error: null }
  }, [])

  const toggleAvailability = useCallback(async (id: string, available: boolean) => {
    const { error: err } = await supabase
      .from('properties')
      .update({ is_available: available })
      .eq('id', id)

    if (err) return { error: err.message }
    setProperties(prev =>
      prev.map(p => p.id === id ? { ...p, is_available: available } : p)
    )
    return { error: null }
  }, [])

  return {
    properties,
    loading,
    error,
    refresh: () => setTick(t => t + 1),
    deleteProperty,
    toggleAvailability,
  }
}
