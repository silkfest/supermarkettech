'use client'
export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getSupabaseBrowser } from '@/lib/supabase/client'
import { ArrowLeft, Star, Award, CheckCircle2, ChevronRight, UserCircle, Loader2, GraduationCap, MessageCircle } from 'lucide-react'
import PageShell from '@/components/layout/PageShell'

interface TechRow {
  id: string; name: string; email: string; role: string
  mentorId: string | null; mentorName: string | null
  completedTasks: number; totalTasks: number
  earnedXP: number; totalXP: number
  joinedAt: string
}
interface Journeyman { id: string; name: string }

const BADGES_COUNT_THRESHOLDS = [
  { id: 'first_step', check: (r: TechRow) => r.completedTasks >= 1 },
  { id: 'halfway',    check: (r: TechRow) => r.totalTasks > 0 && r.completedTasks / r.totalTasks >= 0.5 },
  { id: 'journeyman', check: (r: TechRow) => r.totalTasks > 0 && r.completedTasks >= r.totalTasks },
]
function estimateBadges(r: TechRow) { return BADGES_COUNT_THRESHOLDS.filter(b => b.check(r)).length }

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
  const [technicians, setTechnicians] = useState<TechRow[]>([])
  const [journeymen,  setJourneymen]  = useState<Journeyman[]>([])
  const [loading,     setLoading]     = useState(true)
  const [saving,      setSaving]      = useState<string | null>(null)
  const [saveError,   setSaveError]   = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      const sb = getSupabaseBrowser()
      const { data: { user } } = await sb.auth.getUser()
      if (!user) { router.push('/login'); return }
      const { data: me } = await sb.from('users').select('role').eq('id', user.id).single()
      const role = (me as { role: string } | null)?.role
      if (!role || !['admin', 'manager', 'journeyman'].includes(role)) { router.push('/dashboard'); return }

      const [overviewRes, jRes] = await Promise.all([
        fetch('/api/apprentice/overview'),
        sb.from('users').select('id,name').in('role', ['journeyman', 'admin', 'manager']).order('name'),
      ])
      const data = await overviewRes.json()
      if (Array.isArray(data)) setTechnicians(data)
      setJourneymen((jRes.data ?? []) as Journeyman[])
      setLoading(false)
    }
    load()
  }, [router])

  async function assignMentor(techId: string, mentorId: string | null) {
    setSaving(techId)
    setSaveError(null)
    const res = await fetch(`/api/users/${techId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mentor_id: mentorId }),
    })
    if (!res.ok) {
      const { error } = await res.json().catch(() => ({ error: 'Failed to assign mentor' }))
      setSaveError(error ?? 'Failed to assign mentor')
    } else {
      setTechnicians(prev => prev.map(a =>
        a.id === techId
          ? { ...a, mentorId, mentorName: journeymen.find(j => j.id === mentorId)?.name ?? null }
          : a
      ))
    }
    setSaving(null)
  }

  if (loading) return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center text-sm text-slate-400">
      <Loader2 size={20} className="animate-spin mr-2" /> Loading…
    </div>
  )

  const apprentices = technicians.filter(t => t.role === 'apprentice')
  const journeymenList = technicians.filter(t => t.role === 'journeyman')

  const totalProgress = apprentices.length > 0
    ? Math.round(apprentices.reduce((s, a) => s + (a.totalTasks > 0 ? a.completedTasks / a.totalTasks : 0), 0) / apprentices.length * 100)
    : 0

  function TechCard({ a, isJourneyman }: { a: TechRow; isJourneyman: boolean }) {
    const pct    = a.totalTasks > 0 ? Math.round((a.completedTasks / a.totalTasks) * 100) : 0
    const level  = getLevel(a.earnedXP)
    const badges = estimateBadges(a)
    const isSaving = saving === a.id

    return (
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-4 hover:shadow-md hover:border-blue-100 dark:hover:border-blue-900 transition-all">
        <div className="flex items-start gap-3">
          <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${isJourneyman ? 'bg-blue-100 dark:bg-blue-900/40' : 'bg-amber-50 dark:bg-amber-900/30'}`}>
            <UserCircle size={24} className={isJourneyman ? 'text-blue-500' : 'text-amber-400'} />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-0.5">
              <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 truncate">{a.name || a.email}</p>
              <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${isJourneyman ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300' : 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300'}`}>
                {isJourneyman ? 'Journeyman' : level.label}
              </span>
            </div>
            <p className="text-xs text-slate-400 dark:text-slate-500 truncate mb-3">{a.email}</p>

            {/* Progress bar — for apprentices */}
            {!isJourneyman && (
              <div className="mb-2">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">Training progress</span>
                  <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300">{pct}%</span>
                </div>
                <div className="h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-blue-500 to-emerald-400 rounded-full transition-all duration-500" style={{ width: `${pct}%` }} />
                </div>
                <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1">{a.completedTasks} / {a.totalTasks} tasks · {a.earnedXP} XP earned</p>
              </div>
            )}

            {/* Stats — apprentices only */}
            {!isJourneyman && (
              <div className="flex items-center gap-4 mt-2">
                <span className="flex items-center gap-1 text-xs text-slate-400 dark:text-slate-500">
                  <CheckCircle2 size={12} className="text-emerald-400" />{a.completedTasks} done
                </span>
                <span className="flex items-center gap-1 text-xs text-slate-400 dark:text-slate-500">
                  <Star size={12} className="text-yellow-400" />{a.earnedXP} XP
                </span>
                <span className="flex items-center gap-1 text-xs text-slate-400 dark:text-slate-500">
                  <Award size={12} className="text-violet-400" />{badges}+ badge{badges !== 1 ? 's' : ''}
                </span>
              </div>
            )}
          </div>

          {/* Action buttons */}
          <div className="flex-shrink-0 flex flex-col gap-1">
            <button
              onClick={() => router.push(`/apprentice/training?userId=${a.id}`)}
              className="p-2 rounded-lg text-blue-500 hover:text-blue-700 dark:hover:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-colors"
              title="View / assign courses"
            >
              <GraduationCap size={16} />
            </button>
            <button
              onClick={() => router.push(`/profile?userId=${a.id}`)}
              className="p-2 rounded-lg text-violet-500 hover:text-violet-700 dark:hover:text-violet-300 hover:bg-violet-50 dark:hover:bg-violet-900/30 transition-colors"
              title="View profile & leave review"
            >
              <MessageCircle size={16} />
            </button>
            <button
              onClick={() => router.push(`/admin/technicians/${a.id}`)}
              className="p-2 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              title="Technician record"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>

        {/* Journeyman assignment — apprentices only */}
        {!isJourneyman && (
          <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center gap-2">
            <span className="text-xs text-slate-400 dark:text-slate-500 flex-shrink-0">Journeyman:</span>
            <div className="flex-1 relative">
              <select
                value={a.mentorId ?? ''}
                onChange={e => assignMentor(a.id, e.target.value || null)}
                disabled={isSaving}
                className="w-full text-xs border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1.5 text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-300 disabled:opacity-60 appearance-none pr-6"
              >
                <option value="">— Unassigned —</option>
                {journeymen.map(j => <option key={j.id} value={j.id}>{j.name}</option>)}
              </select>
              {isSaving && <Loader2 size={12} className="absolute right-2 top-1/2 -translate-y-1/2 animate-spin text-blue-400" />}
            </div>
          </div>
        )}
      </div>
    )
  }

  return (
    <PageShell>
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      {/* Header */}
      <div className="safe-top bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-4 md:px-6 py-4 flex items-center gap-3 sticky top-0 z-10">
        <button onClick={() => router.push('/dashboard')} className="p-1.5 -ml-1 text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800">
          <ArrowLeft size={20} />
        </button>
        <div className="flex items-baseline gap-0.5">
          <span className="text-lg font-bold text-blue-600">Cold</span>
          <span className="text-lg font-bold text-slate-800 dark:text-slate-200">IQ</span>
        </div>
        <span className="text-slate-300 dark:text-slate-600">/</span>
        <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Team</span>
      </div>

      {saveError && (
        <div className="mx-4 md:mx-6 mt-3 px-4 py-2.5 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700 flex items-center justify-between">
          <span>{saveError}</span>
          <button onClick={() => setSaveError(null)} className="ml-3 text-red-400 hover:text-red-600">×</button>
        </div>
      )}

      <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">

        {/* Summary */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-4 text-center">
            <p className="text-2xl font-bold text-slate-800 dark:text-slate-200">{apprentices.length}</p>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">Apprentices</p>
          </div>
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-4 text-center">
            <p className="text-2xl font-bold text-blue-600">{journeymenList.length}</p>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">Journeymen</p>
          </div>
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-4 text-center">
            <p className="text-2xl font-bold text-emerald-600">{totalProgress}%</p>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">Avg. Progress</p>
          </div>
        </div>

        {/* Journeymen section */}
        {journeymenList.length > 0 && (
          <div className="space-y-3">
            <p className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-widest px-1">Journeymen</p>
            {journeymenList.map(a => <TechCard key={a.id} a={a} isJourneyman={true} />)}
          </div>
        )}

        {/* Apprentices section */}
        <div className="space-y-3">
          <p className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-widest px-1">Apprentices</p>
          {apprentices.length === 0 ? (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-8 text-center text-sm text-slate-400 dark:text-slate-500">
              No apprentices found. Add users with the Apprentice role to get started.
            </div>
          ) : (
            apprentices.map(a => <TechCard key={a.id} a={a} isJourneyman={false} />)
          )}
        </div>

      </div>
    </div>
    </PageShell>
  )
}
