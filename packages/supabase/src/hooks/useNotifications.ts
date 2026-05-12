import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../client'
import type { Notification } from '../types'

interface UseNotificationsResult {
  notifications: Notification[]
  unreadCount: number
  loading: boolean
  markAsRead: (id: string) => Promise<void>
  markAllRead: () => Promise<void>
}

export function useNotifications(): UseNotificationsResult {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let userId: string | null = null

    const setup = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setLoading(false); return }
      userId = user.id

      const { data } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50)

      setNotifications((data as Notification[]) ?? [])
      setLoading(false)

      // Realtime subscription — new rows appear instantly
      const channel = supabase
        .channel(`notifications:${user.id}`)
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${user.id}` },
          (payload) => {
            setNotifications(prev => [payload.new as Notification, ...prev])
          }
        )
        .on(
          'postgres_changes',
          { event: 'UPDATE', schema: 'public', table: 'notifications', filter: `user_id=eq.${user.id}` },
          (payload) => {
            setNotifications(prev =>
              prev.map(n => n.id === (payload.new as Notification).id ? payload.new as Notification : n)
            )
          }
        )
        .subscribe()

      return () => { supabase.removeChannel(channel) }
    }

    const cleanup = setup()
    return () => { cleanup.then(fn => fn?.()) }
  }, [])

  const markAsRead = useCallback(async (id: string) => {
    await supabase.from('notifications').update({ is_read: true }).eq('id', id)
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n))
  }, [])

  const markAllRead = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    await supabase.from('notifications').update({ is_read: true }).eq('user_id', user.id).eq('is_read', false)
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })))
  }, [])

  const unreadCount = notifications.filter(n => !n.is_read).length

  return { notifications, unreadCount, loading, markAsRead, markAllRead }
}
