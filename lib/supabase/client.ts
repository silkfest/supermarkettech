import { createBrowserClient, createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import type { NextRequest } from 'next/server'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// ── Browser client ─────────────────────────────────────────────────────────
// Uses @supabase/ssr so the session is stored in cookies (not localStorage),
// which means the server can read it on every API request automatically.
let browserClient: ReturnType<typeof createBrowserClient> | null = null
export function getSupabaseBrowser() {
  if (!browserClient) {
    browserClient = createBrowserClient(supabaseUrl, supabaseAnonKey)
  }
  return browserClient
}

// ── Server client for data operations (service role — bypasses RLS) ────────
export function getSupabaseServer() {
  return createClient(
    supabaseUrl,
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? supabaseAnonKey,
    { auth: { persistSession: false } }
  )
}

// ── Auth-checking client for API route handlers ────────────────────────────
// Reads the Supabase session cookie from the incoming request so that
// supabase.auth.getUser() returns the real signed-in user.
export function getSupabaseRouteAuth(req: NextRequest) {
  const reqCookies = req.cookies.getAll()
  return createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll: () => reqCookies,
      setAll: () => {}, // read-only — we don't need to set cookies in route handlers
    },
  })
}
