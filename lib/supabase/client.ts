import { createBrowserClient, createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import type { NextRequest } from 'next/server'

// Lazy env-var accessors so missing vars during build-time static gen don't throw
function getUrl()      { return process.env.NEXT_PUBLIC_SUPABASE_URL      ?? '' }
function getAnonKey()  { return process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '' }

// ── Browser client ─────────────────────────────────────────────────────────
// Uses @supabase/ssr so the session is stored in cookies (not localStorage),
// which means the server can read it on every API request automatically.
//
// NOTE: @supabase/ssr hard-codes flowType 'pkce' on this client (it overrides
// any auth.flowType we pass), so we can't switch it here. That's fine for
// *receiving* a session from a URL: auth-js detects an implicit `#access_token`
// callback purely from the URL regardless of flowType. The problem is only on
// the *sending* side — see getSupabaseAuthLinks() below.
let browserClient: ReturnType<typeof createBrowserClient> | null = null
export function getSupabaseBrowser() {
  if (!browserClient) {
    browserClient = createBrowserClient(getUrl(), getAnonKey())
  }
  return browserClient
}

// ── Implicit-flow client for sending auth email links ──────────────────────
// Used ONLY to initiate password-reset emails (resetPasswordForEmail).
//
// Why a separate client: the @supabase/ssr browser client above is forced to
// PKCE, which makes resetPasswordForEmail attach a one-time `code_challenge`
// and store the matching `code_verifier` in the requesting browser. The reset
// link then comes back as `?code=...`, and completing it REQUIRES that verifier
// to still be in the browser that opens the link. But users tap the link from
// their mail app (Outlook, Gmail, Apple Mail), which opens it in an isolated
// in-app browser with a separate storage jar — the verifier isn't there, the
// code→session exchange fails, and the reset page falsely reports the link as
// "invalid or has expired" even though Supabase verified the token server-side.
//
// An implicit-flow client sends NO code_challenge, so Supabase issues a link
// whose session rides in the URL hash (`#access_token=...`). That needs no
// pre-stored verifier, so it works from any browser or mail client. The reset
// page's normal @supabase/ssr client then picks the session up from the hash
// and persists it to cookies as usual. persistSession/detectSessionInUrl are
// off here so this throwaway sender never competes with the real client.
let authLinksClient: ReturnType<typeof createClient> | null = null
export function getSupabaseAuthLinks() {
  if (!authLinksClient) {
    authLinksClient = createClient(getUrl(), getAnonKey(), {
      auth: {
        flowType: 'implicit',
        persistSession: false,
        detectSessionInUrl: false,
        autoRefreshToken: false,
      },
    })
  }
  return authLinksClient
}

// ── Server client for data operations (service role — bypasses RLS) ────────
export function getSupabaseServer() {
  return createClient(
    getUrl(),
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? getAnonKey(),
    { auth: { persistSession: false } }
  )
}

// ── Auth-checking client for API route handlers ────────────────────────────
// Reads the Supabase session cookie from the incoming request so that
// supabase.auth.getUser() returns the real signed-in user.
export function getSupabaseRouteAuth(req: NextRequest) {
  const reqCookies = req.cookies.getAll()
  return createServerClient(getUrl(), getAnonKey(), {
    cookies: {
      getAll: () => reqCookies,
      setAll: () => {}, // read-only — we don't need to set cookies in route handlers
    },
  })
}
