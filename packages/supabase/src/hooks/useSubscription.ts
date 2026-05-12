import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../client'
import type { Subscription } from '../types'

interface UseSubscriptionResult {
  subscription: Subscription | null
  isActive: boolean
  loading: boolean
  refresh: () => void
}

export function useSubscription(): UseSubscriptionResult {
  const [subscription, setSubscription] = useState<Subscription | null>(null)
  const [loading, setLoading] = useState(true)
  const [tick, setTick] = useState(0)

  useEffect(() => {
    let cancelled = false
    setLoading(true)

    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user || cancelled) { setLoading(false); return }

      const { data } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .gte('end_date', new Date().toISOString().split('T')[0])
        .order('end_date', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (!cancelled) {
        setSubscription(data as Subscription | null)
        setLoading(false)
      }
    })

    return () => { cancelled = true }
  }, [tick])

  return {
    subscription,
    isActive: subscription !== null,
    loading,
    refresh: () => setTick(t => t + 1),
  }
}
