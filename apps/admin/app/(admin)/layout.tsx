import { redirect } from 'next/navigation'
import { createServerSupabase } from '@/lib/supabase-server'
import { adminDb } from '@/lib/supabase'
import { Sidebar } from './Sidebar'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  // Check session via cookie
  const supabase = createServerSupabase()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) redirect('/login')

  // Verify admin role
  const { data: profile } = await adminDb
    .from('profiles')
    .select('role')
    .eq('id', session.user.id)
    .single()

  if (profile?.role !== 'admin') redirect('/login')

  // Pending properties count for sidebar badge
  const { count: pendingCount } = await adminDb
    .from('properties')
    .select('*', { count: 'exact', head: true })
    .eq('is_approved', false)

  return (
    <div className="flex min-h-screen">
      <Sidebar pendingCount={pendingCount ?? 0} />
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  )
}
