'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { LayoutDashboard, Building2, Users, LogOut } from 'lucide-react'
import { createBrowserSupabase } from '@/lib/supabase-browser'

interface SidebarProps {
  pendingCount: number
}

const NAV = [
  { href: '/dashboard',  label: 'Dashboard',   icon: LayoutDashboard },
  { href: '/properties', label: 'Properties',  icon: Building2 },
  { href: '/users',      label: 'Users',        icon: Users },
]

export function Sidebar({ pendingCount }: SidebarProps) {
  const pathname = usePathname()
  const router   = useRouter()

  async function signOut() {
    const supabase = createBrowserSupabase()
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <aside className="w-60 shrink-0 flex flex-col bg-[#1a1a1a] border-r border-[#2c2c30] min-h-screen">
      {/* Brand */}
      <div className="flex items-center gap-3 px-5 h-16 border-b border-[#2c2c30]">
        <div className="w-8 h-8 rounded-lg bg-orange-500 flex items-center justify-center">
          <span className="text-white font-bold text-sm">R</span>
        </div>
        <span className="text-white font-semibold">RentEasy</span>
        <span className="text-[10px] text-zinc-500 ml-auto font-medium">ADMIN</span>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5">
        {NAV.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(href + '/')
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition
                ${active
                  ? 'bg-orange-500/10 text-orange-400'
                  : 'text-zinc-400 hover:bg-[#222226] hover:text-zinc-100'
                }`}
            >
              <Icon size={17} />
              <span>{label}</span>
              {href === '/properties' && pendingCount > 0 && (
                <span className="ml-auto text-[11px] font-semibold bg-orange-500 text-white
                                 px-1.5 py-0.5 rounded-full min-w-[20px] text-center">
                  {pendingCount}
                </span>
              )}
            </Link>
          )
        })}
      </nav>

      {/* Sign out */}
      <div className="px-3 pb-5">
        <button
          onClick={signOut}
          className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm font-medium
                     text-zinc-400 hover:bg-[#222226] hover:text-red-400 transition"
        >
          <LogOut size={17} />
          <span>Sign out</span>
        </button>
      </div>
    </aside>
  )
}
