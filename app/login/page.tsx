'use client'
export const dynamic = 'force-dynamic'

import { useState } from 'react'
import { getSupabaseBrowser } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [showReset, setShowReset] = useState(false)
  const [resetSent, setResetSent] = useState(false)
  const [resetLoading, setResetLoading] = useState(false)
  const router = useRouter()

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const sb = getSupabaseBrowser()
    const { error: authErr } = await sb.auth.signInWithPassword({ email, password })
    if (authErr) { setError(authErr.message); setLoading(false); return }
    const { data: { user } } = await sb.auth.getUser()
    if (user) {
      const { data: profileData } = await sb.from('users').select('status').eq('id', user.id).single()
      const profile = profileData as unknown as { status: string } | null
      router.push(profile?.status === 'pending' ? '/pending' : '/dashboard')
    }
  }

  async function onReset(e: React.FormEvent) {
    e.preventDefault()
    setResetLoading(true)
    const sb = getSupabaseBrowser()
    await sb.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    })
    setResetSent(true)
    setResetLoading(false)
  }

  if (showReset) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-8 w-full max-w-sm">
          <div className="mb-6">
            <div className="flex items-baseline gap-0.5 mb-1">
              <span className="text-xl font-bold text-blue-600">Cold</span>
              <span className="text-xl font-bold text-slate-800">IQ</span>
            </div>
            <p className="text-sm text-slate-500">Reset your password</p>
          </div>
          {resetSent ? (
            <div className="text-center">
              <p className="text-sm text-green-700 bg-green-50 border border-green-200 px-4 py-3 rounded-lg mb-4">
                Check your email for a password reset link.
              </p>
              <button onClick={() => { setShowReset(false); setResetSent(false) }}
                className="text-xs text-blue-600 hover:underline">
                Back to sign in
              </button>
            </div>
          ) : (
            <form onSubmit={onReset} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Email</label>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)} required
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="you@company.com" />
              </div>
              <button type="submit" disabled={resetLoading}
                className="w-full py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors">
                {resetLoading ? 'Sending…' : 'Send reset link'}
              </button>
              <p className="text-xs text-center">
                <button type="button" onClick={() => setShowReset(false)} className="text-slate-500 hover:underline">
                  Back to sign in
                </button>
              </p>
            </form>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-8 w-full max-w-sm">
        <div className="mb-6">
          <div className="flex items-baseline gap-0.5 mb-1">
            <span className="text-xl font-bold text-blue-600">Cold</span>
            <span className="text-xl font-bold text-slate-800">IQ</span>
          </div>
          <p className="text-sm text-slate-500">Sign in to your account</p>
        </div>
        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Email</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} required
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="you@company.com" />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              <span>Password</span>
              <button type="button" onClick={() => setShowReset(true)}
                className="float-right text-blue-600 hover:underline font-normal">
                Forgot password?
              </button>
            </label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} required
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          {error && <p className="text-xs text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>}
          <button type="submit" disabled={loading}
            className="w-full py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors">
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
        <p className="mt-4 text-xs text-center text-slate-500">
          Don't have an account?{' '}
          <a href="/register" className="text-blue-600 hover:underline">Request access</a>
        </p>
      </div>
    </div>
  )
}
