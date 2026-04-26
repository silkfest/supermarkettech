'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getSupabaseBrowser } from '@/lib/supabase/client'
import { ArrowLeft, Star, Award, CheckCircle2, ChevronRight, UserCircle, Loader2 } from 'lucide-react'

interface ApprenticeRow {
  id: string; name: string; email: string
  mentorId: string | null; mentorName: string | null
  completedTasks: number; totalTasks: number
  earnedXP: number; totalXP: number
  joinedAt: string
}
interface Journeyman { id: string; name: string }

const BADGES_COUNT_THRESHOLDS = [
  { id: 'first_step',   check: (r: ApprenticeRow) => r.completedTasks >= 1 },
  { id: 'halfway',      check: (r: ApprenticeRow) => r.totalTasks > 0 && r.completedTasks / r.totalTasks >= 0.5 },
  { id: 'journeyman',   check: (r: ApprenticeRow) => r.totalTasks > 0 && r.completedTasks >= r.totalTasks },
]

function estimateBadges(r: ApprenticeRow): number {
  return BADGES_COUNT_THRESHOLDS.filter(b => b.check(r)).length
}

const LEVELS = [
  { min: 0,   label: 'Rookie' },
  { min: 50,  label: 'Apprentice I' },
  { min: 100, label: 'Apprentice II' },
  { min: 200, label: 'Apprentice III' },
  { min: 300, label: 'Senior Apprentice' },
  { min: 450, label: 'Journeyman Ready!' },
]
function getLevel(xp: number) {
  let lv = LEVELS[0]
  for (const l of LEVELS) { if (xp >= l.min) lv = l }
  return lv
}

export default function AdminApprenticesPage() {
  const router = useRouter()
  const [apprentices, setApprentices] = useState<ApprenticeRow[]>([])
  const [journeymen,  setJourneymen]  = useState<Journeyman[]>([])
  const [loading, setLoading]         = useState(true)
  const [saving,  setSaving]          = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      const sb = getSupabaseBrowser()
      const { data: { user } } = await sb.auth.getUser()
      if (!user) { router.push('/login'); return }
      const { data: me } = await sb.from('users').select('role').eq('id', user.id).single()
      const role = (me as { role: string } | null)?.role
      if (!role || !['admin', 'manager', 'journeyman'].includes(role)) {
        router.push('/dashboard'); return
      }

      const [overviewRes, jRes] = await Promise.all([
        fetch('/api/apprentice/overview'),
        sb.from('users').select('id,name').in('role', ['journeyman', 'admin', 'manager']).order('name'),
      ])
      const data = await overviewRes.json()
      if (Array.isArray(data)) setApprentices(data)
      setJourneymen((jRes.data ?? []) as Journeyman[])
      setLoading(false)
    }
    load()
  }, [router])

  async function assignMentor(apprenticeId: string, mentorId: string | null) {
    setSaving(apprenticeId)
    const sb = getSupabaseBrowser()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (sb as any).from('users').update({ mentor_id: mentorId }).eq('id', apprenticeId)
    setApprentices(prev => prev.map(a =>
      a.id === apprenticeId
        ? { ...a, mentorId, mentorName: journeymen.find(j => j.id === mentorId)?.name ?? null }
        : a
    ))
    setSaving(null)
  }

  if (loading) return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center text-sm text-slate-400">
      <Loader2 size={20} className="animate-spin mr-2" /> Loading…
    </div>
  )

  const totalProgress = apprentices.length > 0
    ? Math.round(apprentices.reduce((s, a) => s + (a.totalTasks > 0 ? a.completedTasks / a.totalTasks : 0), 0) / apprentices.length * 100)
    : 0

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-4 md:px-6 py-4 flex items-center gap-3 sticky top-0 z-10">
        <button onClick={() => router.push('/dashboard')} className="p-1.5 -ml-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100">
          <ArrowLeft size={20} />
        </button>
        <div className="flex items-baseline gap-0.5">
          <span className="text-lg font-bold text-blue-600">Cold</span>
          <span className="text-lg font-bold text-slate-800">IQ</span>
        </div>
        <span className="text-slate-300">/</span>
        <span className="text-sm font-medium text-slate-700">Apprentices</span>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6 space-y-4">

        {/* Summary banner */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-white border border-slate-200 rounded-xl p-4 text-center">
            <p className="text-2xl font-bold text-slate-800">{apprentices.length}</p>
            <p className="text-xs text-slate-400 mt-0.5">Apprentices</p>
          </div>
          <div className="bg-white border border-slate-200 rounded-xl p-4 text-center">
            <p className="text-2xl font-bold text-blue-600">{totalProgress}%</p>
            <p className="text-xs text-slate-400 mt-0.5">Avg. Progress</p>
          </div>
          <div className="bg-white border border-slate-200 rounded-xl p-4 text-center">
            <p className="text-2xl font-bold text-emerald-600">
              {apprentices.filter(a => a.mentorId).length}
            </p>
            <p className="text-xs text-slate-400 mt-0.5">Assigned</p>
          </div>
        </div>

        {apprentices.length === 0 && (
          <div className="bg-white border border-slate-200 rounded-xl p-8 text-center text-sm text-slate-400">
            No apprentices found. Add users with the Apprentice role to get started.
          </div>
        )}

        {/* Apprentice cards */}
        <div className="space-y-3">
          {apprentices.map(a => {
            const pct    = a.totalTasks > 0 ? Math.round((a.completedTasks / a.totalTasks) * 100) : 0
            const level  = getLevel(a.earnedXP)
            const badges = estimateBadges(a)
            const isSaving = saving === a.id

            return (
              <div key={a.id} className="bg-white border border-slate-200 rounded-xl p-4 hover:shadow-md hover:border-blue-100 transition-all">
                <div className="flex items-start gap-3">
                  {/* Avatar */}
                  <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center flex-shrink-0">
                    <UserCircle size={24} className="text-blue-400" />
                  </div>

                  {/* Main info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-0.5">
                      <p className="text-sm font-semibold text-slate-800 truncate">{a.name || a.email}</p>
                      <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700">
                        {level.label}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 truncate mb-3">{a.email}</p>

                    {/* Progress bar */}
                    <div className="mb-2">
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-[11px] text-slate-500 font-medium">Training progress</span>
                        <span className="text-[11px] font-bold text-slate-700">{pct}%</span>
                      </div>
                      <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-blue-500 to-emerald-400 rounded-full transition-all duration-500"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <p className="text-[10px] text-slate-400 mt-1">{a.completedTasks} / {a.totalTasks} tasks · {a.earnedXP} XP earned</p>
                    </div>

                    {/* Stats + badges */}
                    <div className="flex items-center gap-4 mt-3">
                      <span className="flex items-center gap-1 text-xs text-slate-400">
                        <CheckCircle2 size={12} className="text-emerald-400" />
                        {a.completedTasks} done
                      </span>
                      <span className="flex items-center gap-1 text-xs text-slate-400">
                        <Star size={12} className="text-yellow-400" />
                        {a.earnedXP} XP
                      </span>
                      <span className="flex items-center gap-1 text-xs text-slate-400">
                        <Award size={12} className="text-violet-400" />
                        {badges}+ badge{badges !== 1 ? 's' : ''}
                      </span>
                    </div>
                  </div>

                  {/* View profile button */}
                  <button
                    onClick={() => router.push(`/admin/technicians/${a.id}`)}
                    className="flex-shrink-0 p-2 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
                    title="View technician profile"
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>

                {/* Journeyman assignment */}
                <div className="mt-3 pt-3 border-t border-slate-100 flex items-center gap-2">
                  <span className="text-xs text-slate-400 flex-shrink-0">Journeyman:</span>
                  <div className="flex-1 relative">
                    <select
                      value={a.mentorId ?? ''}
                      onChange={e => assignMentor(a.id, e.target.value || null)}
                      disabled={isSaving}
                      className="w-full text-xs border border-slate-200 rounded-lg px-2 py-1.5 text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-300 disabled:opacity-60 appearance-none pr-6"
                    >
                      <option value="">— Unassigned —</option>
                      {journeymen.map(j => (
                        <option key={j.id} value={j.id}>{j.name}</option>
                      ))}
                    </select>
                    {isSaving && (
                      <Loader2 size={12} className="absolute right-2 top-1/2 -translate-y-1/2 animate-spin text-blue-400" />
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
