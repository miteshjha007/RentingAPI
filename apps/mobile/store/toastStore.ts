import { create } from 'zustand'

export type ToastType = 'success' | 'error' | 'info' | 'warning'

export interface Toast {
  id:       string
  message:  string
  type:     ToastType
  duration: number     // ms before auto-dismiss
}

interface ToastStore {
  queue:   Toast[]
  show:    (message: string, type?: ToastType, duration?: number) => void
  dismiss: (id: string) => void
  // Convenience shortcuts
  success: (msg: string, duration?: number) => void
  error:   (msg: string, duration?: number) => void
  info:    (msg: string, duration?: number) => void
  warning: (msg: string, duration?: number) => void
}

export const useToastStore = create<ToastStore>((set, get) => ({
  queue: [],

  show: (message, type = 'info', duration = 3500) => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
    set(state => ({ queue: [...state.queue, { id, message, type, duration }] }))
  },

  dismiss: (id) => {
    set(state => ({ queue: state.queue.filter(t => t.id !== id) }))
  },

  success: (msg, duration) =>
    get().show(msg, 'success', duration),

  error: (msg, duration) =>
    get().show(msg, 'error', duration ?? 5000),

  info: (msg, duration) =>
    get().show(msg, 'info', duration),

  warning: (msg, duration) =>
    get().show(msg, 'warning', duration),
}))

// Convenience export so screens don't need to import the store directly
export const toast = {
  success: (msg: string, duration?: number) => useToastStore.getState().success(msg, duration),
  error:   (msg: string, duration?: number) => useToastStore.getState().error(msg, duration),
  info:    (msg: string, duration?: number) => useToastStore.getState().info(msg, duration),
  warning: (msg: string, duration?: number) => useToastStore.getState().warning(msg, duration),
}
