import { adminDb } from '@/lib/supabase'
import { Users, Building2, CheckCircle, Clock, CreditCard, MessageSquare } from 'lucide-react'

// Re-use the same parallel queries as the API route but directly in a Server Component
async function getStats() {
  const [
    usersResult, ownersResult, propertiesResult,
    pendingResult, approvedResult, subsResult,
    revenueResult, inquiriesResult, recentInqResult,
  ] = await Promise.all([
    adminDb.from('profiles').select('*', { count: 'exact', head: true }),
    adminDb.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'owner'),
    adminDb.from('properties').select('*', { count: 'exact', head: true }),
    adminDb.from('properties').select('*', { count: 'exact', head: true }).eq('is_approved', false),
    adminDb.from('properties').select('*', { count: 'exact', head: true }).eq('is_approved', true),
    adminDb.from('subscriptions').select('*', { count: 'exact', head: true }).eq('is_active', true),
    adminDb.from('subscriptions').select('amount').eq('is_active', true),
    adminDb.from('inquiries').select('*', { count: 'exact', head: true }),
    adminDb.from('inquiries')
      .select(`id, contact_via, created_at,
        property:properties!inquiries_property_id_fkey ( id, title, city ),
        renter:profiles!inquiries_renter_id_fkey ( id, name, phone )`)
      .order('created_at', { ascending: false })
      .limit(8),
  ])

  const totalRevenue = Math.floor(
    ((revenueResult.data ?? []) as { amount: number }[])
      .reduce((s, r) => s + (r.amount ?? 0), 0) / 100
  )

  return {
    totalUsers:   usersResult.count    ?? 0,
    totalOwners:  ownersResult.count   ?? 0,
    totalRenters: (usersResult.count ?? 0) - (ownersResult.count ?? 0),
    totalProps:   propertiesResult.count ?? 0,
    pending:      pendingResult.count    ?? 0,
    approved:     approvedResult.count   ?? 0,
    activeSubs:   subsResult.count       ?? 0,
    totalRevenue,
    totalInquiries: inquiriesResult.count ?? 0,
    recentInquiries: recentInqResult.data ?? [],
  }
}

function StatCard({
  label, value, sub, icon: Icon, color,
}: {
  label: string; value: number | string; sub?: string
  icon: React.ElementType; color: string
}) {
  return (
    <div className="bg-[#1a1a1a] border border-[#2c2c30] rounded-2xl p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-zinc-400 text-sm mb-1">{label}</p>
          <p className="text-white text-2xl font-bold">{value.toLocaleString()}</p>
          {sub && <p className="text-zinc-500 text-xs mt-1">{sub}</p>}
        </div>
        <div className={`p-2.5 rounded-xl ${color}`}>
          <Icon size={20} className="text-white" />
        </div>
      </div>
    </div>
  )
}

const VIA_LABEL: Record<string, string> = {
  whatsapp: 'WhatsApp',
  call:     'Call',
  chat:     'Message',
}

export default async function DashboardPage() {
  const stats = await getStats()

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Dashboard</h1>
        <p className="text-zinc-400 text-sm mt-0.5">Platform overview at a glance</p>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard label="Total Users"   value={stats.totalUsers}
          sub={`${stats.totalOwners} owners · ${stats.totalRenters} renters`}
          icon={Users} color="bg-blue-600" />
        <StatCard label="Properties"    value={stats.totalProps}
          sub={`${stats.approved} approved`}
          icon={Building2} color="bg-violet-600" />
        <StatCard label="Pending Review" value={stats.pending}
          icon={Clock} color="bg-amber-600" />
        <StatCard label="Active Subscriptions" value={stats.activeSubs}
          sub={`₹${stats.totalRevenue.toLocaleString()} revenue`}
          icon={CreditCard} color="bg-emerald-600" />
      </div>

      {/* Second row */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        <StatCard label="Approved Properties" value={stats.approved}
          icon={CheckCircle} color="bg-emerald-700" />
        <StatCard label="Total Inquiries" value={stats.totalInquiries}
          icon={MessageSquare} color="bg-indigo-600" />
        <StatCard label="Total Revenue" value={`₹${stats.totalRevenue.toLocaleString()}`}
          sub="from active subscriptions"
          icon={CreditCard} color="bg-orange-500" />
      </div>

      {/* Recent inquiries */}
      <div className="bg-[#1a1a1a] border border-[#2c2c30] rounded-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-[#2c2c30]">
          <h2 className="text-white font-semibold">Recent Inquiries</h2>
        </div>
        {stats.recentInquiries.length === 0 ? (
          <div className="px-5 py-8 text-center text-zinc-500 text-sm">No inquiries yet</div>
        ) : (
          <div className="divide-y divide-[#2c2c30]">
            {(stats.recentInquiries as any[]).map((inq) => (
              <div key={inq.id} className="px-5 py-3.5 flex items-center gap-4">
                <div className="w-8 h-8 rounded-full bg-[#222226] flex items-center justify-center
                                text-zinc-300 font-semibold text-sm shrink-0">
                  {inq.renter?.name?.[0]?.toUpperCase() ?? '?'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white text-sm font-medium truncate">
                    {inq.renter?.name ?? 'Unknown'}
                  </p>
                  <p className="text-zinc-500 text-xs truncate">{inq.property?.title ?? '—'}</p>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium
                  ${inq.contact_via === 'whatsapp' ? 'bg-green-900/40 text-green-400' :
                    inq.contact_via === 'call'     ? 'bg-orange-900/40 text-orange-400' :
                                                     'bg-indigo-900/40 text-indigo-400'}`}>
                  {VIA_LABEL[inq.contact_via] ?? inq.contact_via}
                </span>
                <span className="text-zinc-600 text-xs shrink-0">
                  {new Date(inq.created_at).toLocaleDateString('en-IN', {
                    day: '2-digit', month: 'short',
                  })}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
