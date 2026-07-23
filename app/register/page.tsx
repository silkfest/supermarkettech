'use client'
export const dynamic = 'force-dynamic'

import { useState } from 'react'
import { getSupabaseBrowser } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

export default function RegisterPage() {
  const [name,      setName]      = useState('')
  const [email,     setEmail]     = useState('')
  const [password,  setPassword]  = useState('')
  const [confirm,   setConfirm]   = useState('')
  const [error,     setError]     = useState('')
  const [loading,   setLoading]   = useState(false)
  const [emailSent, setEmailSent] = useState(false)
  const router = useRouter()

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (password !== confirm) { setError('Passwords do not match'); return }
    if (password.length < 8) { setError('Password must be at least 8 characters'); return }
    setLoading(true)
    setError('')
    const sb = getSupabaseBrowser()
    const { data, error: authErr } = await sb.auth.signUp({
      email, password,
      options: { data: { name } },
    })
    setLoading(false)

    if (authErr) { setError(authErr.message); return }

    // Supabase silently returns no user for duplicate emails
    if (!data.user) {
      setError('Could not create account — this email may already be registered. Try signing in instead.')
      return
    }

    // Email confirmation is required (session is null until user clicks link)
    if (!data.session) {
      setEmailSent(true)
      return
    }

    // All good — user created and logged in, send to pending screen
    router.push('/pending')
  }

  if (emailSent) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm p-8 w-full max-w-sm text-center">
          <div className="flex items-baseline gap-0.5 justify-center mb-6">
            <span className="text-xl font-bold text-blue-600">Cold</span>
            <span className="text-xl font-bold text-slate-800 dark:text-slate-200">IQ</span>
          </div>
          <div className="w-12 h-12 rounded-full bg-blue-50 border border-blue-200 flex items-center justify-center mx-auto mb-4 text-2xl">
            ✉️
          </div>
          <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-200 mb-2">Check your email</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-1">
            We sent a confirmation link to <span className="font-medium">{email}</span>.
          </p>
          <p className="text-xs text-slate-400 dark:text-slate-500">
            Click the link to confirm your address — your access request will then be sent to an administrator for approval.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm p-8 w-full max-w-sm">
        <div className="mb-6">
          <div className="flex items-baseline gap-0.5 mb-1">
            <span className="text-xl font-bold text-blue-600">Cold</span>
            <span className="text-xl font-bold text-slate-800 dark:text-slate-200">IQ</span>
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400">Request access to ColdIQ</p>
        </div>
        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Full name</label>
            <input type="text" value={name} onChange={e => setName(e.target.value)} required
              className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-800 dark:text-slate-100 dark:placeholder-slate-500"
              placeholder="Jane Smith" />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Work email</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} required
              className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-800 dark:text-slate-100 dark:placeholder-slate-500"
              placeholder="you@company.com" />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Password</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} required minLength={8}
              className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-800 dark:text-slate-100 dark:placeholder-slate-500"
              placeholder="Min 8 characters" />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Confirm password</label>
            <input type="password" value={confirm} onChange={e => setConfirm(e.target.value)} required minLength={8}
              className={`w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-800 dark:text-slate-100 dark:placeholder-slate-500 ${
                confirm && password !== confirm
                  ? 'border-red-400 dark:border-red-500/60'
                  : 'border-slate-200 dark:border-slate-700'
              }`}
              placeholder="Re-enter password" />
            {confirm && password !== confirm && (
              <p className="mt-1 text-xs text-red-600 dark:text-red-400">Passwords do not match</p>
            )}
          </div>
          {error && <p className="text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/50 px-3 py-2 rounded-lg">{error}</p>}
          <button type="submit" disabled={loading}
            className="w-full py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors">
            {loading ? 'Creating account…' : 'Request access'}
          </button>
        </form>
        <p className="mt-4 text-xs text-center text-slate-500 dark:text-slate-400">
          Already have an account?{' '}
          <a href="/login" className="text-blue-600 dark:text-blue-400 hover:underline">Sign in</a>
        </p>
      </div>
    </div>
  )
}
