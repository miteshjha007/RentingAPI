import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '../client'
import type { PropertyCard, PropertyFilters } from '../types'

const PAGE_SIZE = 20

interface UsePropertiesResult {
  properties: PropertyCard[]
  loading: boolean
  loadingMore: boolean
  hasMore: boolean
  error: string | null
  loadMore: () => void
  refresh: () => void
}

export function useProperties(filters: PropertyFilters = {}): UsePropertiesResult {
  const [properties, setProperties] = useState<PropertyCard[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const pageRef = useRef(0)
  const filtersKey = JSON.stringify(filters)

  const buildQuery = useCallback((page: number) => {
    let q = supabase
      .from('properties')
      .select(`
        id, type, title, price, city, area, floor,
        furnished_status, available_from, latitude, longitude,
        property_media!inner ( url, order_index, type ),
        property_details ( bhk_type, gender_allowed )
      `)
      .eq('is_approved', true)
      .eq('is_available', true)
      .order('created_at', { ascending: false })
      .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1)

    if (filters.type)             q = q.eq('type', filters.type)
    if (filters.city)             q = q.ilike('city', `%${filters.city}%`)
    if (filters.area)             q = q.ilike('area', `%${filters.area}%`)
    if (filters.pincode)          q = q.eq('pincode', filters.pincode)
    if (filters.min_price != null) q = q.gte('price', filters.min_price)
    if (filters.max_price != null) q = q.lte('price', filters.max_price)
    if (filters.furnished_status) q = q.eq('furnished_status', filters.furnished_status)
    if (filters.available_from)   q = q.gte('available_from', filters.available_from)
    if (filters.search)           q = q.or(`title.ilike.%${filters.search}%,area.ilike.%${filters.search}%,city.ilike.%${filters.search}%`)

    return q
  }, [filtersKey])

  const toCard = (row: Record<string, unknown>): PropertyCard => {
    const media = (row.property_media as Array<{ url: string; order_index: number; type: string }> | null) ?? []
    const coverImage = media
      .filter(m => m.type === 'image')
      .sort((a, b) => a.order_index - b.order_index)[0]?.url ?? null
    const details = row.property_details as { bhk_type?: string | null; gender_allowed?: string | null } | null
    return {
      id: row.id as string,
      type: row.type as PropertyCard['type'],
      title: row.title as string,
      price: row.price as number,
      city: row.city as string,
      area: (row.area as string) ?? null,
      floor: (row.floor as string) ?? null,
      furnished_status: row.furnished_status as PropertyCard['furnished_status'],
      available_from: (row.available_from as string) ?? null,
      latitude: (row.latitude as number) ?? null,
      longitude: (row.longitude as number) ?? null,
      cover_image: coverImage,
      bhk_type: details?.bhk_type ?? null,
      gender_allowed: (details?.gender_allowed as PropertyCard['gender_allowed']) ?? null,
    }
  }

  const fetch = useCallback(async () => {
    setLoading(true)
    setError(null)
    pageRef.current = 0
    const { data, error: err } = await buildQuery(0)
    if (err) {
      setError(err.message)
    } else {
      const cards = (data ?? []).map(toCard)
      setProperties(cards)
      setHasMore(cards.length === PAGE_SIZE)
    }
    setLoading(false)
  }, [buildQuery])

  const loadMore = useCallback(async () => {
    if (loadingMore || !hasMore) return
    setLoadingMore(true)
    const nextPage = pageRef.current + 1
    const { data, error: err } = await buildQuery(nextPage)
    if (!err) {
      const cards = (data ?? []).map(toCard)
      setProperties(prev => [...prev, ...cards])
      setHasMore(cards.length === PAGE_SIZE)
      pageRef.current = nextPage
    }
    setLoadingMore(false)
  }, [buildQuery, loadingMore, hasMore])

  useEffect(() => { fetch() }, [fetch])

  return { properties, loading, loadingMore, hasMore, error, loadMore, refresh: fetch }
}
