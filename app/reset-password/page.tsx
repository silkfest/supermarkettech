'use client'
export const dynamic = 'force-dynamic'

import { useState, useEffect } from 'react'
import type { AuthChangeEvent } from '@supabase/supabase-js'
import { getSupabaseBrowser } from '@/lib/supabase/client'

// Turn Supabase's raw error codes into something a field user can act on.
function friendlyError(code: string | null, description: string | null): string {
  if (code === 'otp_expired') {
    return 'This reset link has expired or was already used. Reset links are only valid for about an hour and can be used once — please request a new one from the sign-in page.'
  }
  if (description) {
    // Supabase sends the description URL-encoded with + for spaces.
    return description.replace(/\+/g, ' ')
  }
  return 'This password reset link is invalid or has expired. Please request a new one from the sign-in page.'
}

export default function ResetPasswordPage() {
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [ready, setReady] = useState(false)
  const [done, setDone] = useState(false)

  useEffect(() => {
    // Capture the link's parameters BEFORE creating the Supabase client — its
    // automatic detectSessionInUrl can consume and clear the hash, and relying
    // on it to then hand us a session was proving unreliable on mobile in-app
    // browsers. We read the tokens straight off the URL and set the session
    // ourselves, which is deterministic and lets us surface the real error.
    //
    // The implicit recovery link lands as:
    //   /reset-password#access_token=...&refresh_token=...&type=recovery
    // and an error link as:
    //   /reset-password#error=access_denied&error_code=otp_expired&error_description=...
    // We also check the query string, just in case params arrive there.
    const hp = new URLSearchParams(window.location.hash.replace(/^#/, ''))
    const qp = new URLSearchParams(window.location.search)
    const get = (k: string) => hp.get(k) ?? qp.get(k)

    const errorCode = get('error_code')
    const errorDesc = get('error_description') ?? get('error')
    const accessToken = get('access_token')
    const refreshToken = get('refresh_token')

    const sb = getSupabaseBrowser()
    let cancelled = false

    // Strip the tokens/errors out of the address bar so they don't linger in
    // history or get re-processed.
    const cleanUrl = () => window.history.replaceState(null, '', window.location.pathname)

    if (errorDesc) {
      setError(friendlyError(errorCode, errorDesc))
      cleanUrl()
      return
    }

    if (accessToken && refreshToken) {
      sb.auth.setSession({ access_token: accessToken, refresh_token: refreshToken })
        .then(({ error: sessErr }: { error: { message: string } | null }) => {
          if (cancelled) return
          cleanUrl()
          if (sessErr) { setError(sessErr.message); return }
          setReady(true)
        })
      return () => { cancelled = true }
    }

    // No tokens or error in the URL. Either the client already auto-processed
    // the link, or an existing recovery session is present — check for one, and
    // give it a short grace period before declaring the link bad.
    let settled = false
    const markReady = () => { if (!settled) { settled = true; setReady(true) } }

    const { data: { subscription } } = sb.auth.onAuthStateChange((event: AuthChangeEvent) => {
      if (event === 'PASSWORD_RECOVERY' || event === 'SIGNED_IN') markReady()
    })
    ;(async () => {
      const { data: { session } } = await sb.auth.getSession()
      if (session) markReady()
    })()

    const timer = setTimeout(async () => {
      if (settled) return
      const { data: { session } } = await sb.auth.getSession()
      if (session) { markReady(); return }
      setError('This password reset link is invalid or has expired. Please request a new one from the sign-in page.')
    }, 8000)

    return () => { cancelled = true; subscription.unsubscribe(); clearTimeout(timer) }
  }, [])

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (password !== confirm) { setError('Passwords do not match'); return }
    if (password.length < 8) { setError('Password must be at least 8 characters'); return }
    setLoading(true)
    setError('')
    const sb = getSupabaseBrowser()
    const { error: updateErr } = await sb.auth.updateUser({ password })
    if (updateErr) { setError(updateErr.message); setLoading(false); return }
    // Show an explicit confirmation rather than bouncing straight to the app —
    // clearer for the user, and doesn't depend on the recovery session having
    // persisted as a full app session.
    setLoading(false)
    setDone(true)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-8 w-full max-w-sm">
        <div className="mb-6">
          <div className="flex items-baseline gap-0.5 mb-1">
            <span className="text-xl font-bold text-blue-600">Cold</span>
            <span className="text-xl font-bold text-slate-800">IQ</span>
          </div>
          <p className="text-sm text-slate-500">Set a new password</p>
        </div>
        {done ? (
          <div className="text-center">
            <div className="w-12 h-12 rounded-full bg-emerald-50 border border-emerald-200 flex items-center justify-center mx-auto mb-4 text-2xl">
              ✓
            </div>
            <p className="text-sm font-medium text-slate-800 mb-1">Password updated</p>
            <p className="text-sm text-slate-500 mb-4">You can now sign in with your new password.</p>
            <a href="/login" className="inline-block w-full py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors">
              Continue to sign in
            </a>
          </div>
        ) : !ready ? (
          error ? (
            <div className="text-center">
              <p className="text-sm text-red-600 bg-red-50 border border-red-200 px-4 py-3 rounded-lg mb-4">{error}</p>
              <a href="/login" className="text-xs text-blue-600 hover:underline">Back to sign in</a>
            </div>
          ) : (
            <p className="text-sm text-slate-500 text-center">Verifying reset link…</p>
          )
        ) : (
          <form onSubmit={onSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">New password</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} required
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="At least 8 characters" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Confirm password</label>
              <input type="password" value={confirm} onChange={e => setConfirm(e.target.value)} required
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            {error && <p className="text-xs text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>}
            <button type="submit" disabled={loading}
              className="w-full py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors">
              {loading ? 'Saving…' : 'Set new password'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
