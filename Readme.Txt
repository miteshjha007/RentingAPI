RENTAL PROPERTY MARKETPLACE — SETUP GUIDE
==========================================

Tech Stack: Expo SDK 51 (React Native) + Next.js 14 + Supabase + Razorpay + Google Maps
Package manager: npm (npm workspaces monorepo) — requires Node 18+ and npm 9+

Monorepo layout:
  apps/mobile         → Expo (React Native) renter/owner app           [FRONTEND]
  apps/admin          → Next.js 14 admin panel                          [FRONTEND]
  packages/supabase   → Shared typed Supabase client + React hooks      [SHARED]
  supabase/           → DB migrations, edge functions, seed             [BACKEND]

STEP 1 — SUPABASE LOCAL DEV
-----------------------------
1. Install Supabase CLI:  npm install -g supabase
2. Login:                 supabase login
3. Init (if new project): supabase init      [already done - supabase/config.toml exists]
4. Start local stack:     supabase start
5. Run migrations:        supabase db reset   [applies all migrations + seed.sql]
6. Regenerate TS types:   npm run db:types

STEP 2 — ENV VARIABLES
------------------------
Copy the keys from `supabase start` output into:
  apps/mobile/.env            (EXPO_PUBLIC_*)
  apps/admin/.env.local       (NEXT_PUBLIC_* + service role key)
  supabase/functions/.env     (Razorpay + Expo push token)

STEP 3 — INSTALL DEPENDENCIES
-------------------------------
  npm install            (run once at the repo root — installs ALL workspaces)

STEP 4 — RUN APPS
------------------
  npm run mobile         → Expo mobile app (scan QR with Expo Go / press a/i/w)
  npm run admin          → Next.js admin panel at http://localhost:3001

  Other useful scripts (run from repo root):
    npm run typecheck    → TypeScript check across all workspaces
    npm run build:admin  → Production build of the admin panel
    npm run db:start     → Start local Supabase stack
    npm run db:reset     → Apply all migrations + seed
    npm run db:types     → Regenerate shared TS types from the DB

  NOTE: The admin panel runs on port 3001 (not 3000).
        Apps will not start until STEP 2 env files exist.

MIGRATION ORDER
---------------
  001_enums.sql             → Custom PostgreSQL enum types
  002_profiles.sql          → User profiles + auth trigger
  003_properties.sql        → Property listings + RLS
  004_property_details.sql  → Extended per-type fields + RLS
  005_property_media.sql    → Image/video URLs + RLS
  006_saved_properties.sql  → Favourites + RLS
  007_subscriptions.sql     → Razorpay subscription records + RLS
  008_inquiries.sql         → Owner-renter contact + RLS
  009_notifications.sql     → In-app + realtime notifications + RLS
  010_admin_settings.sql    → Runtime config key-value store + RLS
  011_storage_buckets.sql   → Storage bucket creation + policies

STORAGE UPLOAD PATH CONVENTION
--------------------------------
  property-images/  {owner_id}/{property_id}/{filename}
  property-videos/  {owner_id}/{property_id}/{filename}
  avatars/          {user_id}/avatar.{ext}
  food-menus/       {owner_id}/{property_id}/menu.{ext}

IMPORTANT NOTES
---------------
- All monetary values (subscription amount) stored in PAISE (₹1 = 100 paise)
- Properties are hidden from renters until admin sets is_approved = TRUE
- Service role key is ONLY used in Edge Functions and admin server-side code
- Never commit .env files — add them to .gitignore
