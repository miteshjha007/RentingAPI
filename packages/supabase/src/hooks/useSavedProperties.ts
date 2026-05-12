import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../client'
import type { PropertyCard } from '../types'

interface UseSavedPropertiesResult {
  saved: PropertyCard[]
  savedIds: Set<string>
  loading: boolean
  toggle: (propertyId: string) => Promise<void>
}

export function useSavedProperties(): UseSavedPropertiesResult {
  const [saved, setSaved] = useState<PropertyCard[]>([])
  const [loading, setLoading] = useState(true)

  const fetch = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase
      .from('saved_properties')
      .select(`
        property_id,
        properties(
          id, type, title, price, city, area, floor,
          furnished_status, available_from, latitude, longitude,
          property_media ( url, order_index, type ),
          property_details ( bhk_type, gender_allowed )
        )
      `)
      .order('created_at', { ascending: false })

    const cards: PropertyCard[] = (data ?? []).flatMap(row => {
      const p = row.properties as Record<string, unknown> | null
      if (!p) return []
      const media = (p.property_media as Array<{ url: string; order_index: number; type: string }> | null) ?? []
      const cover = media.filter(m => m.type === 'image').sort((a, b) => a.order_index - b.order_index)[0]?.url ?? null
      const details = p.property_details as { bhk_type?: string | null; gender_allowed?: string | null } | null
      return [{
        id: p.id as string,
        type: p.type as PropertyCard['type'],
        title: p.title as string,
        price: p.price as number,
        city: p.city as string,
        area: p.area as string | null,
        floor: p.floor as string | null,
        furnished_status: p.furnished_status as PropertyCard['furnished_status'],
        available_from: p.available_from as string | null,
        latitude: p.latitude as number | null,
        longitude: p.longitude as number | null,
        cover_image: cover,
        bhk_type: details?.bhk_type ?? null,
        gender_allowed: (details?.gender_allowed as PropertyCard['gender_allowed']) ?? null,
      }]
    })

    setSaved(cards)
    setLoading(false)
  }, [])

  useEffect(() => { fetch() }, [fetch])

  const toggle = useCallback(async (propertyId: string) => {
    const isSaved = saved.some(p => p.id === propertyId)
    if (isSaved) {
      await supabase.from('saved_properties').delete().eq('property_id', propertyId)
      setSaved(prev => prev.filter(p => p.id !== propertyId))
    } else {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      await supabase.from('saved_properties').insert({ user_id: user.id, property_id: propertyId })
      await fetch()
    }
  }, [saved, fetch])

  const savedIds = new Set(saved.map(p => p.id))

  return { saved, savedIds, loading, toggle }
}
