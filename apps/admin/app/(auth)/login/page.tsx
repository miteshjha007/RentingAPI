'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { createBrowserSupabase } from '@/lib/supabase-browser'

export default function LoginPage() {
  const router   = useRouter()
  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [loading,  setLoading]  = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      const supabase = createBrowserSupabase()
      const { data, error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) { toast.error(error.message); return }

      // Verify admin role before redirecting
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', data.user.id)
        .single()

      if (profile?.role !== 'admin') {
        await supabase.auth.signOut()
        toast.error('Access denied — admin accounts only.')
        return
      }

      router.push('/dashboard')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0f0f0f] px-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-orange-500 mb-4">
            <span className="text-white font-bold text-xl">R</span>
          </div>
          <h1 className="text-2xl font-bold text-white">RentEasy Admin</h1>
          <p className="text-zinc-400 text-sm mt-1">Sign in to manage the platform</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-1.5">
              Email address
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="admin@renteasy.in"
              className="w-full px-4 py-2.5 rounded-xl bg-[#1a1a1a] border border-[#2c2c30] text-white placeholder-zinc-600
                         focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-1.5">
              Password
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full px-4 py-2.5 rounded-xl bg-[#1a1a1a] border border-[#2c2c30] text-white placeholder-zinc-600
                         focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 disabled:opacity-60
                       text-white font-semibold transition"
          >
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
      </div>
    </div>
  )
}
