import { createServerClient } from '@supabase/ssr'
import { NextRequest, NextResponse } from 'next/server'
import type { EmailOtpType } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

// GET /auth/confirm?token_hash=...&type=recovery
//
// Server-side handler for emailed auth links (password reset, signup
// confirmation). The email template points here — on OUR domain — instead of
// at the Supabase project URL. Two reasons that matters:
//
// 1. Deliverability. When the From address is @coldiq.ca but every link points
//    at <project>.supabase.co, that sender/link domain mismatch reads as
//    phishing: Outlook flags the message "potentially dangerous" and DISABLES
//    its links (they render as plain text). Matching the link domain to the
//    sending domain removes that signal.
// 2. Robustness + security. verifyOtp() exchanges the token hash for a session
//    here on the server and writes it to cookies. No token is ever exposed in
//    the URL fragment, and nothing depends on browser-local state (a PKCE
//    code_verifier) that a mail app's in-app browser wouldn't have.
//
// The token in the link is single-use and short-lived; verifyOtp rejects it if
// it's expired or already consumed, and we forward that reason to the UI.

// Where to send the user after a link of each type verifies successfully.
const DESTINATION: Partial<Record<EmailOtpType, string>> = {
  recovery: '/reset-password',
  invite: '/reset-password',
  signup: '/pending',
  email: '/dashboard',
  email_change: '/dashboard',
  magiclink: '/dashboard',
}

export async function GET(req: NextRequest) {
  const url = new URL(req.url)
  const tokenHash = url.searchParams.get('token_hash')
  const type = url.searchParams.get('type') as EmailOtpType | null

  // Failures land back on the reset page using the same param names Supabase
  // itself uses, so that page's existing error handling renders them.
  const failure = (params: Record<string, string>) => {
    const u = new URL('/reset-password', url.origin)
    for (const [k, v] of Object.entries(params)) u.searchParams.set(k, v)
    return NextResponse.redirect(u)
  }

  if (!tokenHash || !type) {
    return failure({
      error_description: 'This link is missing its verification token. Please request a new one from the sign-in page.',
    })
  }

  // Only accept a relative in-app path for `next`. Without this check an
  // attacker could craft ...&next=https://evil.example and turn this endpoint
  // into an open redirect. Must start with a single "/" NOT followed by another
  // "/" or a backslash: both "//host" and "/\host" are treated as
  // protocol-relative by the URL parser and would resolve off-site.
  const requestedNext = url.searchParams.get('next')
  const safeNext = requestedNext && /^\/(?![/\\])/.test(requestedNext) ? requestedNext : null
  const destination = safeNext ?? DESTINATION[type] ?? '/dashboard'

  // Build the redirect up front so the Supabase client can write the session
  // cookies onto the very response we return.
  const res = NextResponse.redirect(new URL(destination, url.origin))

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? '',
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '',
    {
      cookies: {
        getAll: () => req.cookies.getAll(),
        setAll: (cookiesToSet) => {
          cookiesToSet.forEach(({ name, value, options }) => {
            res.cookies.set(name, value, options)
          })
        },
      },
    }
  )

  const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash })

  if (error) {
    const params: Record<string, string> = { error_description: error.message }
    if (error.code) params.error_code = error.code
    return failure(params)
  }

  return res
}
