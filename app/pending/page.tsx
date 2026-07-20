'use client'
export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import { getSupabaseBrowser } from '@/lib/supabase/client'
import { clearAllChatDrafts } from '@/lib/chat/drafts'
import { useRouter } from 'next/navigation'

const COOLDOWN_MS = 60 * 60 * 1000 // 1 hour

interface MeProfile {
  name: string
  email: string
  created_at: string
  notify_requested_at: string | null
}

export default function PendingPage() {
  const router = useRouter()
  const [profile, setProfile] = useState<MeProfile | null>(null)
  const [notifyState, setNotifyState] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle')
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  useEffect(() => {
    const sb = getSupabaseBrowser()

    async function loadProfile() {
      const { data: { session } } = await sb.auth.getSession()
      if (!session) { router.push('/login'); return }
      const res = await fetch('/api/users/me', {
        headers: { Authorization: `Bearer ${session.access_token}` },
      })
      if (res.ok) {
        const data = await res.json()
        setProfile(data)
      }
    }
    loadProfile()

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

  async function handleNotify() {
    setNotifyState('sending')
    setErrorMsg(null)
    const sb = getSupabaseBrowser()
    const { data: { session } } = await sb.auth.getSession()
    if (!session) { router.push('/login'); return }

    const res = await fetch('/api/users/me/notify', {
      method: 'POST',
      headers: { Authorization: `Bearer ${session.access_token}` },
    })
    const data = await res.json()
    if (res.ok || res.status === 429) {
      setNotifyState('sent')
      setProfile(p => p ? { ...p, notify_requested_at: data.notifyRequestedAt } : p)
    } else {
      setNotifyState('error')
      setErrorMsg(data.error ?? 'Something went wrong')
    }
  }

  async function handleLogout() {
    clearAllChatDrafts()
    await getSupabaseBrowser().auth.signOut()
    window.location.href = '/login'
  }

  const submittedAt = profile ? new Date(profile.created_at) : null
  const waitingSinceMin = submittedAt
    ? Math.max(0, Math.round((Date.now() - submittedAt.getTime()) / (60 * 1000)))
    : null

  const lastRequested = profile?.notify_requested_at ? new Date(profile.notify_requested_at) : null
  const cooldownActive = lastRequested ? Date.now() - lastRequested.getTime() < COOLDOWN_MS : false
  const cooldownRemainingMin = lastRequested
    ? Math.max(0, Math.ceil((COOLDOWN_MS - (Date.now() - lastRequested.getTime())) / (60 * 1000)))
    : 0

  function formatDuration(minutes: number) {
    if (minutes < 60) return `${minutes} minute${minutes === 1 ? '' : 's'}`
    const hours = Math.floor(minutes / 60)
    if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'}`
    const days = Math.floor(hours / 24)
    return `${days} day${days === 1 ? '' : 's'}`
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm p-8 w-full max-w-sm text-center">
        <div className="flex items-baseline gap-0.5 justify-center mb-6">
          <span className="text-xl font-bold text-blue-600">Cold</span>
          <span className="text-xl font-bold text-slate-800 dark:text-slate-200">IQ</span>
        </div>
        <div className="w-12 h-12 rounded-full bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800 flex items-center justify-center mx-auto mb-4 text-2xl">
          ⏳
        </div>
        <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-200 mb-2">Access pending</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 mb-1">
          Your account is awaiting approval from an administrator.
        </p>
        {waitingSinceMin !== null && (
          <p className="text-xs text-slate-400 dark:text-slate-500 mb-1">
            Account requested {formatDuration(waitingSinceMin)} ago.
          </p>
        )}
        <p className="text-xs text-slate-400 dark:text-slate-500 mb-6">
          This page will automatically update once you&apos;re approved. An administrator on
          your team will review and activate your account — most requests are approved
          within a business day.
        </p>

        <button
          onClick={handleNotify}
          disabled={notifyState === 'sending' || cooldownActive}
          className="w-full mb-2 px-4 py-2 text-sm font-medium rounded-lg border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-950 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {notifyState === 'sending' ? 'Sending...' : 'Notify admin again'}
        </button>

        {notifyState === 'sent' && (
          <p className="text-xs text-emerald-600 dark:text-emerald-400 mb-4">
            {cooldownActive
              ? `Admin notified. You can request again in ${formatDuration(cooldownRemainingMin)}.`
              : 'Admin notified.'}
          </p>
        )}
        {notifyState === 'error' && errorMsg && (
          <p className="text-xs text-red-600 dark:text-red-400 mb-4">{errorMsg}</p>
        )}
        {notifyState === 'idle' && cooldownActive && (
          <p className="text-xs text-slate-400 dark:text-slate-500 mb-4">
            You can request again in {formatDuration(cooldownRemainingMin)}.
          </p>
        )}

        <button onClick={handleLogout}
          className="text-xs text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 underline">
          Sign out
        </button>
      </div>
    </div>
  )
}
