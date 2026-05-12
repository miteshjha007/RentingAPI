// Auto-generated from schema — update when migrations change.
// Run `supabase gen types typescript --local > packages/supabase/src/types.ts`

// ── Enums ─────────────────────────────────────────────────────────────────────

export type UserRole = 'renter' | 'owner' | 'admin'
export type PropertyType = 'room' | 'flat' | 'home' | 'pg' | 'hostel' | 'commercial'
export type FurnishedStatus = 'furnished' | 'semi_furnished' | 'unfurnished'
export type ElectricityChargesType = 'included' | 'extra' | 'fixed'
export type GenderAllowed = 'boys' | 'girls' | 'both'
export type RoomType = '1_seater' | '2_seater' | '3_seater'
export type MediaType = 'image' | 'video'
export type SubscriptionPlan = 'monthly' | 'quarterly' | 'yearly'
export type ContactVia = 'whatsapp' | 'call' | 'chat'
export type NotificationType = 'inquiry' | 'approval' | 'rejection' | 'subscription' | 'general'

// ── Table Row Types ───────────────────────────────────────────────────────────

export interface Profile {
  id: string
  name: string
  email: string | null
  phone: string | null
  role: UserRole
  avatar_url: string | null
  is_verified: boolean
  created_at: string
}

export interface Property {
  id: string
  owner_id: string
  type: PropertyType
  title: string
  description: string | null
  price: number
  security_deposit: number
  electricity_charges: ElectricityChargesType
  floor: string | null
  total_floors: number | null
  furnished_status: FurnishedStatus
  available_from: string | null
  is_available: boolean
  is_approved: boolean
  rejection_reason: string | null
  state: string
  city: string
  area: string | null
  pincode: string | null
  full_address: string | null
  latitude: number | null
  longitude: number | null
  created_at: string
  updated_at: string
}

export interface PropertyDetails {
  id: string
  property_id: string
  // Flat / Home
  bhk_type: string | null
  num_bathrooms: number | null
  num_kitchens: number | null
  balcony: boolean
  parking: boolean
  garden: boolean
  area_sqft: number | null
  distance_from_market: string | null
  // PG / Hostel
  gender_allowed: GenderAllowed | null
  room_type: RoomType | null
  food_included: boolean
  open_time: string | null
  close_time: string | null
  // Common
  available_services: string[]
  kitchen_available: boolean
  created_at: string
}

export interface PropertyMedia {
  id: string
  property_id: string
  url: string
  type: MediaType
  room_label: string | null
  order_index: number
  created_at: string
}

export interface SavedProperty {
  id: string
  user_id: string
  property_id: string
  created_at: string
}

export interface Subscription {
  id: string
  user_id: string
  plan: SubscriptionPlan
  start_date: string
  end_date: string
  is_active: boolean
  razorpay_order_id: string | null
  razorpay_payment_id: string | null
  amount: number  // in paise
  created_at: string
  updated_at: string
}

export interface Inquiry {
  id: string
  property_id: string
  renter_id: string
  owner_id: string
  message: string | null
  contact_via: ContactVia
  created_at: string
}

export interface Notification {
  id: string
  user_id: string
  title: string
  body: string
  type: NotificationType
  is_read: boolean
  data: Record<string, unknown>
  created_at: string
}

export interface AdminSetting {
  id: string
  key: string
  value: string
  updated_at: string
}

// ── Insert Types (omit auto-generated fields) ─────────────────────────────────

export type ProfileInsert = Omit<Profile, 'id' | 'created_at'>
export type ProfileUpdate = Partial<ProfileInsert>

export type PropertyInsert = Omit<Property, 'id' | 'created_at' | 'updated_at' | 'is_approved'>
export type PropertyUpdate = Partial<PropertyInsert>

export type PropertyDetailsInsert = Omit<PropertyDetails, 'id' | 'created_at'>
export type PropertyDetailsUpdate = Partial<PropertyDetailsInsert>

export type PropertyMediaInsert = Omit<PropertyMedia, 'id' | 'created_at'>

export type InquiryInsert = Omit<Inquiry, 'id' | 'created_at'>

export type NotificationInsert = Omit<Notification, 'id' | 'created_at'>

// ── Composite / View Types ────────────────────────────────────────────────────

/** Full property with all joined data returned by useProperty() */
export interface PropertyFull extends Property {
  details: PropertyDetails | null
  media: PropertyMedia[]
  owner: Pick<Profile, 'id' | 'name' | 'phone' | 'avatar_url'>
}

/** Property card data for list/map views */
export interface PropertyCard
  extends Pick<
    Property,
    | 'id'
    | 'type'
    | 'title'
    | 'price'
    | 'city'
    | 'area'
    | 'floor'
    | 'furnished_status'
    | 'available_from'
    | 'latitude'
    | 'longitude'
  > {
  cover_image: string | null
  bhk_type: string | null
  gender_allowed: GenderAllowed | null
}

// ── Filter Types ─────────────────────────────────────────────────────────────

export interface PropertyFilters {
  type?: PropertyType
  city?: string
  area?: string
  pincode?: string
  min_price?: number
  max_price?: number
  furnished_status?: FurnishedStatus
  gender_allowed?: GenderAllowed
  available_from?: string
  search?: string
}

// ── Database type map (mirrors Supabase generated structure) ─────────────────

export interface Database {
  public: {
    Tables: {
      profiles:          { Row: Profile;          Insert: ProfileInsert;          Update: ProfileUpdate }
      properties:        { Row: Property;          Insert: PropertyInsert;          Update: PropertyUpdate }
      property_details:  { Row: PropertyDetails;   Insert: PropertyDetailsInsert;   Update: PropertyDetailsUpdate }
      property_media:    { Row: PropertyMedia;      Insert: PropertyMediaInsert;      Update: Partial<PropertyMediaInsert> }
      saved_properties:  { Row: SavedProperty;      Insert: Omit<SavedProperty, 'id' | 'created_at'>; Update: never }
      subscriptions:     { Row: Subscription;       Insert: never;                   Update: never }
      inquiries:         { Row: Inquiry;            Insert: InquiryInsert;           Update: never }
      notifications:     { Row: Notification;       Insert: NotificationInsert;      Update: Partial<Pick<Notification, 'is_read'>> }
      admin_settings:    { Row: AdminSetting;       Insert: Omit<AdminSetting, 'id' | 'updated_at'>; Update: Pick<AdminSetting, 'value'> }
    }
    Enums: {
      user_role:                UserRole
      property_type:            PropertyType
      furnished_status:         FurnishedStatus
      electricity_charges_type: ElectricityChargesType
      gender_allowed:           GenderAllowed
      room_type:                RoomType
      media_type:               MediaType
      subscription_plan:        SubscriptionPlan
      contact_via:              ContactVia
      notification_type:        NotificationType
    }
  }
}
