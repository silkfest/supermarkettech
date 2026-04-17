'use client'
import { useState } from 'react'
import { getSupabaseBrowser } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
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
      const { data: profile } = await sb.from('users').select('status').eq('id', user.id).single()
      router.push(profile?.status === 'pending' ? '/pending' : '/dashboard')
    }
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
            <label className="block text-xs font-medium text-slate-700 mb-1">Password</label>
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
