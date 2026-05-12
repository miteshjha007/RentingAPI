/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    // Avoids "Edge Runtime does not support Node.js crypto" when used in API routes
    serverComponentsExternalPackages: ['@supabase/supabase-js', '@supabase/ssr'],
  },
}

module.exports = nextConfig
