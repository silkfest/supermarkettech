'use client'
export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getSupabaseBrowser } from '@/lib/supabase/client'
import { Star, Award, CheckCircle2, ChevronRight, UserCircle, Loader2, GraduationCap, MessageCircle, AlertTriangle, Shield, Clock, X } from 'lucide-react'
import PageShell from '@/components/layout/PageShell'
import PageHeader from '@/components/PageHeader'

interface TechRow {
  id: string; name: string; email: string; role: string
  mentorId: string | null; mentorName: string | null
  completedTasks: number; totalTasks: number
  earnedXP: number; totalXP: number
  joinedAt: string
  certStatus: 'none' | 'ok' | 'expiring' | 'expired'
}
interface Journeyman { id: string; name: string }
interface PendingApproval {
  user_id: string; user_name: string; task_id: string; task_title: string
  category: string; difficulty: string; points: number; notes: string
}

const DIFF_BADGE: Record<string, string> = {
  beginner:     'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
  intermediate: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
  advanced:     'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
}

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

interface AssignCourse {
  id: string; title: string; points: number
  assigned_to_target?: boolean
  completion: { completed_at: string } | null
}

// Assign courses straight to one person, without leaving the Team page.
// Reuses the existing endpoints: the courses list already reports, per course,
// whether it's assigned to a given user (`assigned_to_target`), and the
// assignments endpoint toggles a single user's assignment.
function AssignCoursesModal({ tech, onClose }: { tech: TechRow; onClose: () => void }) {
  const [courses, setCourses] = useState<AssignCourse[]>([])
  const [loading, setLoading] = useState(true)
  const [busy,    setBusy]    = useState<string | null>(null)
  const [error,   setError]   = useState('')

  useEffect(() => {
    async function load() {
      const res = await fetch(`/api/apprentice/courses?userId=${tech.id}`)
      const data = await res.json().catch(() => [])
      setCourses(Array.isArray(data) ? data : [])
      setLoading(false)
    }
    load()
  }, [tech.id])

  async function toggle(course: AssignCourse) {
    const on = !course.assigned_to_target
    setBusy(course.id)
    setError('')
    const res = await fetch(`/api/apprentice/courses/${course.id}/assignments`, {
      method: on ? 'POST' : 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: tech.id }),
    })
    if (res.ok) {
      setCourses(prev => prev.map(c => c.id === course.id ? { ...c, assigned_to_target: on } : c))
    } else {
      const d = await res.json().catch(() => ({}))
      setError(d.error ?? 'Failed to update assignment')
    }
    setBusy(null)
  }

  const assignedCount = courses.filter(c => c.assigned_to_target).length

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl w-full max-w-md shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 dark:border-slate-700">
          <div className="min-w-0">
            <h2 className="text-sm font-semibold text-slate-900 dark:text-white">Assign courses</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
              {tech.name || tech.email} · {assignedCount} assigned
            </p>
          </div>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-300 flex-shrink-0"><X size={18}/></button>
        </div>

        {loading ? (
          <div className="flex justify-center py-12 text-slate-500 text-sm gap-2">
            <Loader2 size={16} className="animate-spin"/> Loading courses…
          </div>
        ) : (
          <div className="p-4 space-y-1.5 max-h-[65vh] overflow-y-auto">
            {error && (
              <div className="px-3 py-2 mb-2 bg-red-50 dark:bg-red-900/50 border border-red-200 dark:border-red-700 text-red-700 dark:text-red-300 text-xs rounded-lg">{error}</div>
            )}
            {courses.length === 0 && (
              <p className="text-xs text-slate-400 text-center py-8">No published courses yet.</p>
            )}
            {courses.map(course => {
              const on = !!course.assigned_to_target
              const done = !!course.completion
              return (
                <button key={course.id} onClick={() => toggle(course)} disabled={busy === course.id}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg border text-sm text-left transition-colors ${on
                    ? 'bg-blue-50 dark:bg-blue-900/30 border-blue-300 dark:border-blue-700'
                    : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 hover:border-slate-400 dark:hover:border-slate-500'}`}
                >
                  <div className="flex-1 min-w-0">
                    <p className={`font-medium truncate ${on ? 'text-blue-700 dark:text-blue-300' : 'text-slate-700 dark:text-slate-200'}`}>
                      {course.title}
                    </p>
                    <p className="text-[11px] text-slate-400">
                      +{course.points} XP{done ? ' · completed' : ''}
                    </p>
                  </div>
                  {busy === course.id ? <Loader2 size={15} className="animate-spin text-slate-400"/>
                    : done ? <CheckCircle2 size={15} className="text-emerald-500"/>
                    : on ? <CheckCircle2 size={15} className="text-blue-600 dark:text-blue-400"/>
                    : <span className="text-[11px] text-slate-400">Assign</span>}
                </button>
              )
            })}
            <p className="text-[11px] text-slate-400 dark:text-slate-500 pt-2">
              Courses assigned to everyone in a role are managed from the Training page.
            </p>
          </div>
        )}

        <div className="flex items-center justify-between px-5 py-4 border-t border-slate-200 dark:border-slate-700">
          <a href={`/apprentice/training?userId=${tech.id}`} className="text-xs text-blue-600 dark:text-blue-400 hover:underline">
            View full training →
          </a>
          <button onClick={onClose} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg">Done</button>
        </div>
      </div>
    </div>
  )
}

export default function AdminApprenticesPage() {
  const router = useRouter()
  const [technicians, setTechnicians] = useState<TechRow[]>([])
  const [journeymen,  setJourneymen]  = useState<Journeyman[]>([])
  const [loading,     setLoading]     = useState(true)
  const [saving,      setSaving]      = useState<string | null>(null)
  const [saveError,   setSaveError]   = useState<string | null>(null)
  const [approvals,   setApprovals]   = useState<PendingApproval[]>([])
  const [reviewing,   setReviewing]   = useState<string | null>(null)
  const [canAssign,   setCanAssign]   = useState(false)
  const [assignFor,   setAssignFor]   = useState<TechRow | null>(null)

  useEffect(() => {
    async function load() {
      const sb = getSupabaseBrowser()
      const { data: { user } } = await sb.auth.getUser()
      if (!user) { router.push('/login'); return }
      const { data: me } = await sb.from('users').select('role').eq('id', user.id).single()
      const role = (me as { role: string } | null)?.role
      if (!role || !['admin', 'manager', 'journeyman'].includes(role)) { router.push('/dashboard'); return }

      setCanAssign(['admin', 'manager'].includes(role))

      const [overviewRes, mentorRes, approvalsRes] = await Promise.all([
        fetch('/api/apprentice/overview'),
        // Mentor candidates must come from the server: RLS on public.users only
        // lets a user read their own row, so querying this from the browser
        // returned an empty dropdown.
        fetch('/api/apprentice/people?roles=journeyman,admin,manager&includeSelf=1')
          .then(r => r.ok ? r.json() : []),
        fetch('/api/apprentice/approvals'),
      ])
      const data = await overviewRes.json()
      if (Array.isArray(data)) setTechnicians(data)
      setJourneymen((mentorRes ?? []) as Journeyman[])
      const appData = await approvalsRes.json().catch(() => [])
      if (Array.isArray(appData)) setApprovals(appData)
      setLoading(false)
    }
    load()
  }, [router])

  async function reviewSubmission(a: PendingApproval, action: 'approve' | 'reject') {
    const key = `${a.user_id}:${a.task_id}`
    setReviewing(key)
    setSaveError(null)
    const res = await fetch('/api/apprentice/progress', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: a.user_id, taskId: a.task_id, action }),
    })
    if (!res.ok) {
      const { error } = await res.json().catch(() => ({ error: 'Failed to update submission' }))
      setSaveError(error ?? 'Failed to update submission')
      setReviewing(null)
      return
    }
    // Drop the handled submission; on approve, credit the apprentice's totals
    setApprovals(prev => prev.filter(p => !(p.user_id === a.user_id && p.task_id === a.task_id)))
    if (action === 'approve') {
      setTechnicians(prev => prev.map(t =>
        t.id === a.user_id
          ? { ...t, completedTasks: t.completedTasks + 1, earnedXP: t.earnedXP + a.points }
          : t
      ))
    }
    setReviewing(null)
  }

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

  function CertBadge({ status }: { status: TechRow['certStatus'] }) {
    if (status === 'expired') {
      return (
        <span className="flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-red-50 text-red-700 border border-red-200 dark:bg-red-500/10 dark:text-red-400 dark:border-red-500/30">
          <AlertTriangle size={10} /> Cert expired
        </span>
      )
    }
    if (status === 'expiring') {
      return (
        <span className="flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/30">
          <AlertTriangle size={10} /> Cert expiring
        </span>
      )
    }
    return null
  }

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
              <CertBadge status={a.certStatus} />
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
            {/* Assign courses right here — no navigating to the Training page.
                Journeymen can view this page but may not assign. */}
            <button
              onClick={() => canAssign ? setAssignFor(a) : router.push(`/apprentice/training?userId=${a.id}`)}
              className="p-2 rounded-lg text-blue-500 hover:text-blue-700 dark:hover:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-colors"
              title={canAssign ? 'Assign courses' : 'View training'}
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
      <PageHeader title="Team" home={false} back="/dashboard" />

      {assignFor && (
        <AssignCoursesModal tech={assignFor} onClose={() => setAssignFor(null)} />
      )}

      {saveError && (
        <div className="mx-4 md:mx-6 mt-3 px-4 py-2.5 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700 flex items-center justify-between">
          <span>{saveError}</span>
          <button onClick={() => setSaveError(null)} className="ml-3 text-red-400 hover:text-red-600">×</button>
        </div>
      )}

      <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">

        {/* Certification alerts */}
        {(() => {
          const expired = technicians.filter(t => t.certStatus === 'expired')
          const expiring = technicians.filter(t => t.certStatus === 'expiring')
          if (expired.length === 0 && expiring.length === 0) return null
          return (
            <div className="space-y-2">
              {expired.length > 0 && (
                <div className="flex items-start gap-2 px-4 py-3 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30 rounded-lg text-sm text-red-700 dark:text-red-400">
                  <AlertTriangle size={15} className="flex-shrink-0 mt-0.5" />
                  <span>
                    <strong>{expired.length}</strong> team member{expired.length !== 1 ? 's have' : ' has'} expired certifications: {expired.map(t => t.name || t.email).join(', ')}
                  </span>
                </div>
              )}
              {expiring.length > 0 && (
                <div className="flex items-start gap-2 px-4 py-3 bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/30 rounded-lg text-sm text-amber-700 dark:text-amber-400">
                  <Shield size={15} className="flex-shrink-0 mt-0.5" />
                  <span>
                    <strong>{expiring.length}</strong> team member{expiring.length !== 1 ? 's have' : ' has'} certifications expiring within 90 days: {expiring.map(t => t.name || t.email).join(', ')}
                  </span>
                </div>
              )}
            </div>
          )
        })()}

        {/* Pending approvals */}
        {approvals.length > 0 && (
          <div className="bg-white dark:bg-slate-900 border border-amber-200 dark:border-amber-500/30 rounded-xl overflow-hidden">
            <div className="flex items-center gap-2 px-4 py-3 bg-amber-50 dark:bg-amber-500/10 border-b border-amber-200 dark:border-amber-500/30">
              <Clock size={15} className="text-amber-600 dark:text-amber-400" />
              <span className="text-sm font-semibold text-amber-800 dark:text-amber-300">Pending approvals</span>
              <span className="text-[11px] font-bold px-1.5 py-0.5 rounded-full bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400">{approvals.length}</span>
            </div>
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {approvals.map(a => {
                const key = `${a.user_id}:${a.task_id}`
                const busy = reviewing === key
                return (
                  <div key={key} className="px-4 py-3 flex items-start gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-0.5">
                        <span className="text-sm font-medium text-slate-800 dark:text-slate-200">{a.task_title}</span>
                        {a.difficulty && <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${DIFF_BADGE[a.difficulty] ?? 'bg-slate-100 text-slate-600'}`}>{a.difficulty}</span>}
                        <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400">+{a.points} XP</span>
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        Submitted by <span className="font-medium text-slate-700 dark:text-slate-300">{a.user_name}</span>
                        {a.category && <span className="text-slate-400 dark:text-slate-500"> · {a.category}</span>}
                      </p>
                      {a.notes && <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 italic">“{a.notes}”</p>}
                    </div>
                    <div className="flex-shrink-0 flex items-center gap-2">
                      <button
                        onClick={() => reviewSubmission(a, 'approve')}
                        disabled={busy}
                        className="flex items-center gap-1 px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-[11px] font-medium rounded-lg transition-colors"
                      >
                        {busy ? <Loader2 size={12} className="animate-spin"/> : <CheckCircle2 size={12}/>} Approve
                      </button>
                      <button
                        onClick={() => reviewSubmission(a, 'reject')}
                        disabled={busy}
                        className="flex items-center gap-1 px-2.5 py-1 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 disabled:opacity-50 text-slate-700 dark:text-slate-200 text-[11px] font-medium rounded-lg transition-colors"
                      >
                        <X size={12}/> Reject
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

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
