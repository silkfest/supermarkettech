'use client'
import { useEffect } from 'react'
import { getSupabaseBrowser } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

export default function PendingPage() {
  const router = useRouter()

  useEffect(() => {
    const sb = getSupabaseBrowser()
    // Poll every 10s to detect approval
    const interval = setInterval(async () => {
      const { data: { user } } = await sb.auth.getUser()
      if (!user) { router.push('/login'); return }
      const { data: profileData } = await sb.from('users').select('status').eq('id', user.id).single()
      const profile = profileData as unknown as { status: string } | null
      if (profile?.status === 'active') router.push('/dashboard')
    }, 10000)
    return () => clearInterval(interval)
  }, [router])

  async function handleLogout() {
    await getSupabaseBrowser().auth.signOut()
    window.location.href = '/login'
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-8 w-full max-w-sm text-center">
        <div className="flex items-baseline gap-0.5 justify-center mb-6">
          <span className="text-xl font-bold text-blue-600">Cold</span>
          <span className="text-xl font-bold text-slate-800">IQ</span>
        </div>
        <div className="w-12 h-12 rounded-full bg-amber-50 border border-amber-200 flex items-center justify-center mx-auto mb-4 text-2xl">
          ⏳
        </div>
        <h2 className="text-sm font-semibold text-slate-800 mb-2">Access pending</h2>
        <p className="text-sm text-slate-500 mb-1">
          Your account is awaiting approval from an administrator.
        </p>
        <p className="text-xs text-slate-400 mb-6">
          This page will automatically update once you're approved.
        </p>
        <button onClick={handleLogout}
          className="text-xs text-slate-400 hover:text-slate-600 underline">
          Sign out
        </button>
      </div>
    </div>
  )
}
