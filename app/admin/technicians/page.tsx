'use client'
export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getSupabaseBrowser } from '@/lib/supabase/client'
import { Shield, AlertTriangle, CheckCircle, ChevronRight, UserCircle, GraduationCap } from 'lucide-react'
import PageHeader from '@/components/PageHeader'
import type { LevelId, TeamTrainingRow } from '@/lib/game/progress'

import { ROLE_LABEL, ROLE_COLOR } from '@/lib/constants'
import type { Role, Status } from '@/lib/constants'

interface UserRow {
  id: string; email: string; name: string; role: Role; status: Status; created_at: string
}
interface Cert {
  id: string; user_id: string; cert_type: string; expiry_date: string | null
}

function certStatus(certs: Cert[]): 'none' | 'expiring' | 'expired' | 'ok' {
  if (certs.length === 0) return 'none'
  const now = new Date()
  const soon = new Date(); soon.setDate(soon.getDate() + 90)
  let expired = false, expiring = false
  for (const c of certs) {
    if (!c.expiry_date) continue
    const exp = new Date(c.expiry_date)
    if (exp < now) expired = true
    else if (exp < soon) expiring = true
  }
  if (expired) return 'expired'
  if (expiring) return 'expiring'
  return 'ok'
}

const GRADE_COLOR: Record<string, string> = {
  A: 'bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/30 text-emerald-700 dark:text-emerald-400',
  B: 'bg-blue-50 dark:bg-blue-500/10 border-blue-200 dark:border-blue-500/30 text-blue-700 dark:text-blue-400',
  C: 'bg-amber-50 dark:bg-amber-500/10 border-amber-200 dark:border-amber-500/30 text-amber-700 dark:text-amber-400',
}
const SHIFT_LEVELS: { id: LevelId; label: string }[] = [
  { id: 'gas-station', label: 'Gas station' },
  { id: 'supermarket', label: 'Supermarket' },
]

/** Best grade earned on each shift level, as small chips. */
function GradeChips({ row }: { row: TeamTrainingRow }) {
  const earned = SHIFT_LEVELS.filter(l => row.levels[l.id]?.bestGrade)
  if (earned.length === 0) return null
  return (
    <>
      {earned.map(l => {
        const g = row.levels[l.id]!.bestGrade!
        return (
          <span key={l.id} className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full border ${GRADE_COLOR[g] ?? 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400'}`}>
            {l.label} {g}
          </span>
        )
      })}
    </>
  )
}

export default function TechniciansPage() {
  const router = useRouter()
  const [users, setUsers]   = useState<UserRow[]>([])
  const [certs, setCerts]   = useState<Cert[]>([])
  const [pmCounts, setPmCounts] = useState<Record<string, number>>({})
  const [training, setTraining] = useState<Record<string, TeamTrainingRow>>({})
  const [stationsTotal, setStationsTotal] = useState(0)
  const [loading, setLoading]   = useState(true)

  useEffect(() => {
    async function load() {
      const sb = getSupabaseBrowser()
      const { data: { user } } = await sb.auth.getUser()
      if (!user) { router.push('/login'); return }
      const { data: me } = await sb.from('users').select('role').eq('id', user.id).single()
      if (!me || (me as { role: string }).role !== 'admin') { router.push('/dashboard'); return }

      const [{ data: allUsers }, { data: allCerts }, { data: pmReports }] = await Promise.all([
        sb.from('users').select('id,email,name,role,status,created_at').order('name'),
        sb.from('tech_certifications').select('id,user_id,cert_type,expiry_date'),
        sb.from('pm_reports').select('technician').not('technician', 'is', null),
      ])

      setUsers((allUsers ?? []) as UserRow[])
      setCerts((allCerts ?? []) as Cert[])

      // Count PMs per tech name
      const counts: Record<string, number> = {}
      for (const r of (pmReports ?? []) as { technician: { id?: string; name?: string } | null }[]) {
        const id = r.technician?.id
        if (id) counts[id] = (counts[id] ?? 0) + 1
      }
      setPmCounts(counts)

      // Training lives in the game save, which only the server can read.
      try {
        const res = await fetch('/api/game/team-progress', { signal: AbortSignal.timeout(5000) })
        if (res.ok) {
          const body = await res.json() as { stationsTotal: number; rows: TeamTrainingRow[] }
          setStationsTotal(body.stationsTotal)
          setTraining(Object.fromEntries(body.rows.map(r => [r.userId, r])))
        }
      } catch { /* a nice-to-have — never hold up the roster for it */ }

      setLoading(false)
    }
    load()
  }, [router])

  if (loading) return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center text-sm text-slate-400 dark:text-slate-500">Loading…</div>
  )

  const certsByUser: Record<string, Cert[]> = {}
  for (const c of certs) {
    if (!certsByUser[c.user_id]) certsByUser[c.user_id] = []
    certsByUser[c.user_id].push(c)
  }

  const trainingRows = Object.values(training)
  const graduates = trainingRows.filter(r => r.graduated).length
  const started = trainingRows.length
  const shiftsLogged = trainingRows.reduce((n, r) => n + SHIFT_LEVELS.reduce((m, l) => m + (r.levels[l.id]?.shifts ?? 0), 0), 0)

  const CertIcon = ({ status }: { status: ReturnType<typeof certStatus> }) => {
    if (status === 'none')     return <span className="text-xs text-slate-400 dark:text-slate-500">No certs</span>
    if (status === 'expired')  return <AlertTriangle size={14} className="text-red-500" />
    if (status === 'expiring') return <AlertTriangle size={14} className="text-amber-500" />
    return <CheckCircle size={14} className="text-emerald-500" />
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <PageHeader title="Technicians" home={false} back="/dashboard" />

      <div className="max-w-4xl mx-auto px-4 py-6 space-y-3">
        {/* Expired cert alert */}
        {users.some(u => certStatus(certsByUser[u.id] ?? []) === 'expired') && (
          <div className="flex items-center gap-2 px-4 py-3 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30 rounded-lg text-sm text-red-700 dark:text-red-400">
            <AlertTriangle size={15} />
            Some technicians have expired certifications — check their profiles.
          </div>
        )}

        {/* ColdCall training at a glance */}
        {stationsTotal > 0 && Object.keys(training).length > 0 && (
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <GraduationCap size={15} className="text-blue-600 dark:text-blue-400" />
              <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">ColdCall training</p>
              <button onClick={() => router.push('/game')}
                className="ml-auto text-xs text-blue-600 dark:text-blue-400 hover:underline">Open the game</button>
            </div>
            <div className="grid grid-cols-3 gap-3 text-center">
              <div>
                <p className="text-xl font-bold text-slate-800 dark:text-slate-200 tabular-nums">{graduates}</p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">graduated Trade School</p>
              </div>
              <div>
                <p className="text-xl font-bold text-slate-800 dark:text-slate-200 tabular-nums">{started}</p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">of {users.length} have started</p>
              </div>
              <div>
                <p className="text-xl font-bold text-slate-800 dark:text-slate-200 tabular-nums">{shiftsLogged}</p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">shifts worked</p>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {users.map(u => {
            const cs = certStatus(certsByUser[u.id] ?? [])
            const jobCount = pmCounts[u.id] ?? 0
            const tr = training[u.id]
            return (
              <button
                key={u.id}
                onClick={() => router.push(`/admin/technicians/${u.id}`)}
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-4 text-left hover:shadow-md hover:border-blue-200 dark:hover:border-blue-500/50 transition-all active:scale-[0.98] flex items-start gap-3"
              >
                <div className="w-9 h-9 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center flex-shrink-0">
                  <UserCircle size={22} className="text-slate-400 dark:text-slate-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 truncate">{u.name || u.email}</p>
                    <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${ROLE_COLOR[u.role]}`}>
                      {ROLE_LABEL[u.role]}
                    </span>
                    {u.status !== 'active' && (
                      <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400">
                        {u.status}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-400 dark:text-slate-500 truncate mb-2">{u.email}</p>
                  <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
                    <span className="flex items-center gap-1">
                      <Shield size={11} />
                      <span>{(certsByUser[u.id] ?? []).length} cert{(certsByUser[u.id] ?? []).length !== 1 ? 's' : ''}</span>
                    </span>
                    <CertIcon status={cs} />
                    {jobCount > 0 && (
                      <span className="text-slate-400 dark:text-slate-500">{jobCount} PM{jobCount !== 1 ? 's' : ''}</span>
                    )}
                  </div>
                  {tr && (
                    <div className="flex items-center gap-1.5 flex-wrap mt-1.5">
                      <GraduationCap size={11} className={tr.graduated ? 'text-emerald-500' : 'text-slate-400 dark:text-slate-500'} />
                      <span className={`text-xs ${tr.graduated ? 'text-emerald-600 dark:text-emerald-400 font-medium' : 'text-slate-500 dark:text-slate-400'}`}>
                        {tr.graduated ? 'Trade School complete' : `Trade School ${tr.stationsPassed}/${stationsTotal}`}
                      </span>
                      <GradeChips row={tr} />
                      {tr.hours > 0 && (
                        <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full border bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300">
                          {Math.round(tr.hours)} h logged
                        </span>
                      )}
                    </div>
                  )}
                </div>
                <ChevronRight size={16} className="text-slate-300 dark:text-slate-600 flex-shrink-0 mt-1" />
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
