// Centralised formatting utilities — import from here, never inline in components.

/** ₹25,000 → "₹25K"  |  ₹1,20,000 → "₹1.2L"  |  ₹800 → "₹800" */
export function formatRent(amount: number): string {
  if (amount >= 100_000) return `₹${(amount / 100_000).toFixed(1).replace(/\.0$/, '')}L`
  if (amount >= 1_000)   return `₹${Math.round(amount / 1_000)}K`
  return `₹${amount}`
}

/** Full rent label shown in cards */
export function formatRentLabel(amount: number): string {
  return `${formatRent(amount)}/mo`
}

/** ISO date string → "12 May 2026" */
export function formatDate(iso: string | null | undefined): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric',
  })
}

/** "2026-06-01" → "Available from 1 Jun 2026" or "Available Now" */
export function formatAvailability(iso: string | null | undefined): string {
  if (!iso) return 'Available Now'
  const d   = new Date(iso)
  const now = new Date()
  if (d <= now) return 'Available Now'
  return `From ${d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}`
}

/** "+919876543210" → "98765 43210" */
export function formatPhone(raw: string | null | undefined): string {
  if (!raw) return ''
  const digits = raw.replace(/\D/g, '').replace(/^91/, '')
  return digits.length === 10
    ? `${digits.slice(0, 5)} ${digits.slice(5)}`
    : digits
}

/** area + city → "Lajpat Nagar, Delhi" */
export function formatAddress(
  area: string | null | undefined,
  city: string,
  state?: string | null
): string {
  const parts = [area, city, state].filter(Boolean)
  return parts.join(', ')
}

/** Capitalise first letter of each word */
export function titleCase(str: string): string {
  return str.replace(/\b\w/g, c => c.toUpperCase())
}

/** '1BHK' | '2BHK' | null + type → "2BHK Flat" or "PG" */
export function formatPropertyTitle(
  type: string,
  bhk?: string | null
): string {
  const typeMap: Record<string, string> = {
    room: 'Room', flat: 'Flat', home: 'House',
    pg: 'PG', hostel: 'Hostel', commercial: 'Commercial Space',
  }
  const label = typeMap[type] ?? titleCase(type)
  return bhk ? `${bhk} ${label}` : label
}

/** Relative time: "2 hours ago", "3 days ago" */
export function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const mins  = Math.floor(diff / 60_000)
  const hours = Math.floor(diff / 3_600_000)
  const days  = Math.floor(diff / 86_400_000)
  if (mins < 1)    return 'just now'
  if (mins < 60)   return `${mins}m ago`
  if (hours < 24)  return `${hours}h ago`
  if (days < 7)    return `${days}d ago`
  return formatDate(iso)
}
