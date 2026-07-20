'use client'
export const dynamic = 'force-dynamic'

import { useEffect, useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { getSupabaseBrowser } from '@/lib/supabase/client'
import { RadioTower, Loader2, AlertTriangle } from 'lucide-react'
import PageHeader from '@/components/PageHeader'
import EmptyState from '@/components/EmptyState'
import { timeAgo, parseDevice } from '@/lib/utils'
import { ROLE_LABEL, ROLE_COLOR } from '@/lib/constants'
import type { Role } from '@/lib/constants'

// "Active now" is approximate: it reads Supabase's own background token-refresh
// activity for a session (see the user_login_activity view), not a per-second
// heartbeat. A session refreshes roughly once per hour while its tab stays
// open, so this window is set generously above that cadence to avoid marking
// someone offline between refreshes.
const ACTIVE_WINDOW_MIN = 90

interface SessionRow {
  session_id: string
  user_id: string
  name: string
  role: Role
  status: string
  logged_in_at: string
  last_active_at: string
  user_agent: string | null
}

interface UserSummary {
  user_id: string
  name: string
  role: Role
  lastLoginAt: string
  lastActiveAt: string
  lastDevice: string
  activeNow: boolean
  loginCount: number
}

export default function LoginActivityPage() {
  const router = useRouter()
  const [sessions, setSessions] = useState<SessionRow[]>([])
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      const sb = getSupabaseBrowser()
      const { data: { user } } = await sb.auth.getUser()
      if (!user) { router.push('/login'); return }
      const { data: me } = await sb.from('users').select('role').eq('id', user.id).single()
      if (!me || (me as { role: string }).role !== 'admin') { router.push('/dashboard'); return }

      try {
        const res = await fetch('/api/admin/login-activity')
        if (!res.ok) throw new Error('Failed to load')
        setSessions(await res.json())
      } catch {
        setError('Could not load login activity. Check your connection and try again.')
      }
      setLoading(false)
    }
    load()
  }, [router])

  const { activeUsers, recentLogins } = useMemo(() => {
    const now = Date.now()
    const byUser = new Map<string, UserSummary>()
    for (const s of sessions) {
      const existing = byUser.get(s.user_id)
      const lastActiveMs = new Date(s.last_active_at).getTime()
      if (!existing) {
        byUser.set(s.user_id, {
          user_id: s.user_id,
          name: s.name,
          role: s.role,
          lastLoginAt: s.logged_in_at,
          lastActiveAt: s.last_active_at,
          lastDevice: parseDevice(s.user_agent),
          activeNow: (now - lastActiveMs) / 60000 <= ACTIVE_WINDOW_MIN,
          loginCount: 1,
        })
      } else {
        existing.loginCount += 1
        if (new Date(s.logged_in_at) > new Date(existing.lastLoginAt)) existing.lastLoginAt = s.logged_in_at
        if (lastActiveMs > new Date(existing.lastActiveAt).getTime()) {
          existing.lastActiveAt = s.last_active_at
          existing.lastDevice = parseDevice(s.user_agent)
        }
        existing.activeNow = existing.activeNow || (now - lastActiveMs) / 60000 <= ACTIVE_WINDOW_MIN
      }
    }
    const allUsers = [...byUser.values()].sort((a, b) => new Date(b.lastActiveAt).getTime() - new Date(a.lastActiveAt).getTime())
    const recent = [...sessions].sort((a, b) => new Date(b.logged_in_at).getTime() - new Date(a.logged_in_at).getTime()).slice(0, 100)
    return { activeUsers: allUsers, recentLogins: recent }
  }, [sessions])

  const activeNowCount = activeUsers.filter(u => u.activeNow).length

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <PageHeader title="Login Activity" />

      <div className="max-w-4xl mx-auto px-4 md:px-6 py-6 md:py-8 space-y-6">
        <div>
          <h1 className="text-xl font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
            <RadioTower size={20} className="text-blue-600"/>
            Login Activity
          </h1>
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
            Who&apos;s signed in and when everyone last logged in. &quot;Active now&quot; is approximate —
            it reflects app activity in the last {ACTIVE_WINDOW_MIN} minutes, not a live per-second status.
          </p>
        </div>

        {error && (
          <div className="flex items-center gap-2 px-4 py-3 bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 rounded-xl text-sm text-red-700 dark:text-red-400">
            <AlertTriangle size={15} className="flex-shrink-0"/>
            <span>{error}</span>
          </div>
        )}

        {loading && (
          <div className="flex justify-center py-16 text-slate-400 dark:text-slate-500 text-sm gap-2">
            <Loader2 size={16} className="animate-spin"/> Loading login activity…
          </div>
        )}

        {!loading && !error && (
          <>
            {/* Currently active */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300">Signed In</h2>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/30">
                  {activeNowCount} active now
                </span>
              </div>
              {activeUsers.length === 0 ? (
                <EmptyState icon={RadioTower} title="No login activity recorded yet." />
              ) : (
                <div className="space-y-1.5">
                  {activeUsers.map(u => (
                    <div key={u.user_id} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 flex items-center gap-3">
                      <span className={`w-2 h-2 rounded-full flex-shrink-0 ${u.activeNow ? 'bg-emerald-400 animate-pulse' : 'bg-slate-300 dark:bg-slate-600'}`} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-sm font-medium text-slate-800 dark:text-slate-200 truncate">{u.name}</p>
                          <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${ROLE_COLOR[u.role]}`}>
                            {ROLE_LABEL[u.role]}
                          </span>
                        </div>
                        <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
                          {u.activeNow ? 'Active' : 'Last active'} {timeAgo(u.lastActiveAt)} · {u.lastDevice}
                        </p>
                      </div>
                      <p className="text-xs text-slate-400 dark:text-slate-500 flex-shrink-0">
                        {u.loginCount} login{u.loginCount !== 1 ? 's' : ''}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Recent sign-ins log */}
            <div>
              <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Recent Sign-Ins</h2>
              {recentLogins.length === 0 ? (
                <EmptyState icon={RadioTower} title="No sign-ins recorded yet." />
              ) : (
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden divide-y divide-slate-100 dark:divide-slate-800">
                  {recentLogins.map(s => (
                    <div key={s.session_id} className="px-4 py-2.5 flex items-center gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-sm text-slate-700 dark:text-slate-300 truncate">{s.name}</p>
                          <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${ROLE_COLOR[s.role]}`}>
                            {ROLE_LABEL[s.role]}
                          </span>
                        </div>
                        <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">{parseDevice(s.user_agent)}</p>
                      </div>
                      <p className="text-xs text-slate-400 dark:text-slate-500 flex-shrink-0" title={new Date(s.logged_in_at).toLocaleString()}>
                        {timeAgo(s.logged_in_at)}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
