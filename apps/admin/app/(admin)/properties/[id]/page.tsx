import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { adminDb } from '@/lib/supabase'
import { PropertyActions } from './PropertyActions'

async function getProperty(id: string) {
  const { data, error } = await adminDb
    .from('properties')
    .select(`
      *,
      owner:profiles!properties_owner_id_fkey ( id, name, phone, email, avatar_url ),
      details:property_details ( * ),
      media:property_media ( * ),
      inquiries:inquiries ( id, contact_via, created_at,
        renter:profiles!inquiries_renter_id_fkey ( id, name, phone )
      )
    `)
    .eq('id', id)
    .single()

  if (error || !data) return null
  if (Array.isArray(data.media)) {
    data.media.sort((a: { order_index: number }, b: { order_index: number }) =>
      a.order_index - b.order_index
    )
  }
  return data
}

const TYPE_LABEL: Record<string, string> = {
  room: 'Room', flat: 'Flat', home: 'Home', pg: 'PG', hostel: 'Hostel',
}

function DetailRow({ label, value }: { label: string; value?: string | number | null }) {
  if (!value && value !== 0) return null
  return (
    <div className="flex gap-2 py-2 border-b border-[#2c2c30] last:border-0">
      <span className="text-zinc-500 text-sm w-40 shrink-0">{label}</span>
      <span className="text-zinc-200 text-sm">{value}</span>
    </div>
  )
}

export default async function PropertyDetailPage({ params }: { params: { id: string } }) {
  const property = await getProperty(params.id)
  if (!property) notFound()

  const d = property.details as any
  const coverUrl = (property.media as any[])?.find(m => m.type === 'image')?.url

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* Back */}
      <Link
        href="/properties"
        className="inline-flex items-center gap-1.5 text-zinc-400 hover:text-zinc-100 text-sm mb-6 transition"
      >
        <ArrowLeft size={15} /> Back to Properties
      </Link>

      <div className="flex items-start justify-between mb-6 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">{property.title}</h1>
          <p className="text-zinc-400 text-sm mt-0.5">
            {TYPE_LABEL[property.type] ?? property.type} · {property.area}, {property.city}, {property.state}
          </p>
        </div>
        {/* Approve / Reject actions */}
        <PropertyActions
          propertyId={property.id}
          isApproved={property.is_approved}
          rejectionReason={property.rejection_reason}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Left: image + details */}
        <div className="lg:col-span-2 space-y-4">
          {/* Cover image */}
          {coverUrl && (
            <div className="w-full h-56 rounded-2xl overflow-hidden bg-[#222226]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={coverUrl} alt={property.title} className="w-full h-full object-cover" />
            </div>
          )}

          {/* All images */}
          {(property.media as any[])?.length > 1 && (
            <div className="flex gap-2 overflow-x-auto pb-1">
              {(property.media as any[]).map((m: any) => (
                <div key={m.id} className="w-20 h-16 rounded-xl shrink-0 overflow-hidden bg-[#222226]">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={m.url} alt="" className="w-full h-full object-cover" />
                </div>
              ))}
            </div>
          )}

          {/* Property Details */}
          <div className="bg-[#1a1a1a] border border-[#2c2c30] rounded-2xl p-5">
            <h2 className="text-white font-semibold mb-3">Property Details</h2>
            <DetailRow label="Type"         value={TYPE_LABEL[property.type] ?? property.type} />
            <DetailRow label="Rent"         value={`₹${property.price.toLocaleString()} / month`} />
            <DetailRow label="Deposit"      value={d?.deposit ? `₹${d.deposit.toLocaleString()}` : null} />
            <DetailRow label="City"         value={property.city} />
            <DetailRow label="Area"         value={property.area} />
            <DetailRow label="State"        value={property.state} />
            <DetailRow label="Pincode"      value={property.pincode} />
            <DetailRow label="Address"      value={property.address} />
            <DetailRow label="BHK"          value={d?.bhk} />
            <DetailRow label="Furnishing"   value={d?.furnishing} />
            <DetailRow label="Electricity"  value={d?.electricity_type} />
            <DetailRow label="Available From" value={d?.available_from
              ? new Date(d.available_from).toLocaleDateString('en-IN', { dateStyle: 'medium' })
              : null} />
            <DetailRow label="Gender"       value={d?.preferred_gender} />
            <DetailRow label="Room Type"    value={d?.room_type} />
          </div>

          {/* Description */}
          {property.description && (
            <div className="bg-[#1a1a1a] border border-[#2c2c30] rounded-2xl p-5">
              <h2 className="text-white font-semibold mb-2">Description</h2>
              <p className="text-zinc-400 text-sm leading-relaxed">{property.description}</p>
            </div>
          )}
        </div>

        {/* Right: owner + inquiries */}
        <div className="space-y-4">
          {/* Owner */}
          <div className="bg-[#1a1a1a] border border-[#2c2c30] rounded-2xl p-5">
            <h2 className="text-white font-semibold mb-3">Owner</h2>
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-full bg-orange-500/20 flex items-center justify-center
                              text-orange-400 font-bold text-sm shrink-0">
                {(property.owner as any)?.name?.[0]?.toUpperCase() ?? '?'}
              </div>
              <div>
                <p className="text-white font-medium">{(property.owner as any)?.name}</p>
                <p className="text-zinc-500 text-xs">{(property.owner as any)?.email}</p>
              </div>
            </div>
            <p className="text-zinc-400 text-sm">{(property.owner as any)?.phone}</p>
          </div>

          {/* Status */}
          <div className="bg-[#1a1a1a] border border-[#2c2c30] rounded-2xl p-5">
            <h2 className="text-white font-semibold mb-3">Status</h2>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-zinc-500">Approval</span>
                <span className={property.is_approved ? 'text-emerald-400' : 'text-amber-400'}>
                  {property.is_approved ? 'Approved' : 'Pending'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500">Availability</span>
                <span className={property.is_available ? 'text-emerald-400' : 'text-zinc-400'}>
                  {property.is_available ? 'Available' : 'Unavailable'}
                </span>
              </div>
              {property.rejection_reason && (
                <div className="mt-2 p-2.5 bg-red-950/30 border border-red-900/50 rounded-xl">
                  <p className="text-red-400 text-xs">{property.rejection_reason}</p>
                </div>
              )}
              <div className="flex justify-between pt-1">
                <span className="text-zinc-500">Listed</span>
                <span className="text-zinc-300">
                  {new Date(property.created_at).toLocaleDateString('en-IN', { dateStyle: 'medium' })}
                </span>
              </div>
            </div>
          </div>

          {/* Recent inquiries */}
          <div className="bg-[#1a1a1a] border border-[#2c2c30] rounded-2xl overflow-hidden">
            <div className="px-5 py-3.5 border-b border-[#2c2c30]">
              <h2 className="text-white font-semibold">
                Inquiries ({(property.inquiries as any[])?.length ?? 0})
              </h2>
            </div>
            {!(property.inquiries as any[])?.length ? (
              <div className="px-5 py-6 text-center text-zinc-500 text-xs">None yet</div>
            ) : (
              <div className="divide-y divide-[#2c2c30]">
                {(property.inquiries as any[]).slice(0, 8).map((inq: any) => (
                  <div key={inq.id} className="px-5 py-3 flex items-center gap-3">
                    <div className="w-7 h-7 rounded-full bg-[#222226] flex items-center justify-center
                                    text-zinc-300 text-xs font-semibold shrink-0">
                      {inq.renter?.name?.[0]?.toUpperCase() ?? '?'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-zinc-200 text-sm truncate">{inq.renter?.name}</p>
                    </div>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full
                      ${inq.contact_via === 'whatsapp' ? 'bg-green-900/40 text-green-400' :
                        inq.contact_via === 'call'     ? 'bg-orange-900/40 text-orange-400' :
                                                         'bg-indigo-900/40 text-indigo-400'}`}>
                      {inq.contact_via}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
