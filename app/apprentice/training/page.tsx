'use client'
export const dynamic = 'force-dynamic'

import { useEffect, useState, useCallback, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { getSupabaseBrowser } from '@/lib/supabase/client'
import {
  ArrowLeft, ChevronDown, CheckCircle2, Circle, Loader2,
  ChevronDown as Down, BookOpen, Plus, Pencil, Trash2,
  ExternalLink, Clock, Star, X, Check,
} from 'lucide-react'
import LearningTabBar from '@/components/layout/LearningTabBar'

// ─── Badge definitions (aligned to Ontario 313A skill sets) ─────────────────
const BADGES = [
  { id: 'first_step',    icon: '🏅', name: 'First Step',         desc: 'Complete your first task',                    check: (c: number, _t: number, byCat: Record<string,number>) => Object.values(byCat).some(v => v > 0) },
  { id: 'safety',        icon: '🛡️', name: 'Safety Certified',   desc: 'Complete all Protect Self & Environment tasks', check: (_c: number, _t: number, byCat: Record<string,number>, totCat: Record<string,number>) => (byCat['Protect Self & Environment'] ?? 0) >= (totCat['Protect Self & Environment'] ?? 1) },
  { id: 'business',      icon: '📋', name: 'Pro Communicator',   desc: 'Complete all Business Practices tasks',         check: (_c: number, _t: number, byCat: Record<string,number>, totCat: Record<string,number>) => (byCat['Business Practices'] ?? 0) >= (totCat['Business Practices'] ?? 1) },
  { id: 'tools',         icon: '🔧', name: 'Tool Master',        desc: 'Complete all Tools & Equipment tasks',          check: (_c: number, _t: number, byCat: Record<string,number>, totCat: Record<string,number>) => (byCat['Tools & Equipment'] ?? 0) >= (totCat['Tools & Equipment'] ?? 1) },
  { id: 'planning',      icon: '📐', name: 'System Designer',    desc: 'Complete all Planning & Preparation tasks',     check: (_c: number, _t: number, byCat: Record<string,number>, totCat: Record<string,number>) => (byCat['Planning & Preparation'] ?? 0) >= (totCat['Planning & Preparation'] ?? 1) },
  { id: 'installation',  icon: '⚙️', name: 'Installer',          desc: 'Complete all Installation tasks',               check: (_c: number, _t: number, byCat: Record<string,number>, totCat: Record<string,number>) => (byCat['Installation'] ?? 0) >= (totCat['Installation'] ?? 1) },
  { id: 'maintenance',   icon: '🔩', name: 'PM Pro',             desc: 'Complete all Planned Maintenance tasks',        check: (_c: number, _t: number, byCat: Record<string,number>, totCat: Record<string,number>) => (byCat['Planned Maintenance'] ?? 0) >= (totCat['Planned Maintenance'] ?? 1) },
  { id: 'service',       icon: '⚡', name: 'Diagnostic Expert',  desc: 'Complete all Service & Repair tasks',           check: (_c: number, _t: number, byCat: Record<string,number>, totCat: Record<string,number>) => (byCat['Service & Repair'] ?? 0) >= (totCat['Service & Repair'] ?? 1) },
  { id: 'commissioning', icon: '✅', name: 'Commissioning Pro',  desc: 'Complete all Commissioning tasks',              check: (_c: number, _t: number, byCat: Record<string,number>, totCat: Record<string,number>) => (byCat['Commissioning'] ?? 0) >= (totCat['Commissioning'] ?? 1) },
  { id: 'halfway',       icon: '💯', name: 'Halfway There',      desc: 'Reach 50% overall completion',                 check: (c: number, t: number) => t > 0 && c / t >= 0.5 },
  { id: 'journeyman',    icon: '⭐', name: 'Journeyman Ready',   desc: 'Complete all 313A required tasks',              check: (c: number, t: number) => t > 0 && c >= t },
]

// ─── Level system ────────────────────────────────────────────────────────────
const LEVELS = [
  { min: 0,    label: 'Rookie',            color: 'text-slate-500' },
  { min: 150,  label: 'Apprentice I',      color: 'text-amber-600' },
  { min: 400,  label: 'Apprentice II',     color: 'text-orange-600' },
  { min: 700,  label: 'Apprentice III',    color: 'text-blue-600' },
  { min: 1100, label: 'Senior Apprentice', color: 'text-violet-600' },
  { min: 1500, label: 'Journeyman Ready!', color: 'text-emerald-600' },
]

function getLevel(xp: number) {
  let lv = LEVELS[0]
  for (const l of LEVELS) { if (xp >= l.min) lv = l }
  return lv
}

const DIFF_BADGE: Record<string, string> = {
  beginner:     'bg-emerald-100 text-emerald-700',
  intermediate: 'bg-amber-100 text-amber-700',
  advanced:     'bg-red-100 text-red-700',
}

const CAT_COLORS: Record<string, { bg: string; border: string; icon: string }> = {
  'Protect Self & Environment': { bg: 'bg-red-50',     border: 'border-red-200',    icon: '🛡️' },
  'Business Practices':         { bg: 'bg-blue-50',    border: 'border-blue-200',   icon: '📋' },
  'Tools & Equipment':          { bg: 'bg-slate-50',   border: 'border-slate-200',  icon: '🔧' },
  'Planning & Preparation':     { bg: 'bg-orange-50',  border: 'border-orange-200', icon: '📐' },
  'Installation':               { bg: 'bg-cyan-50',    border: 'border-cyan-200',   icon: '⚙️' },
  'Planned Maintenance':        { bg: 'bg-green-50',   border: 'border-green-200',  icon: '🔍' },
  'Cleaning & Lubrication':     { bg: 'bg-yellow-50',  border: 'border-yellow-200', icon: '🧹' },
  'Maintenance':                { bg: 'bg-teal-50',    border: 'border-teal-200',   icon: '🔩' },
  'Service & Repair':           { bg: 'bg-purple-50',  border: 'border-purple-200', icon: '⚡' },
  'Commissioning':              { bg: 'bg-emerald-50', border: 'border-emerald-200',icon: '✅' },
}

const COURSE_TYPE_META: Record<string, { label: string; icon: string; color: string }> = {
  video:     { label: 'Video',     icon: '🎬', color: 'bg-red-50 dark:bg-red-900/40 text-red-700 dark:text-red-300 border-red-200 dark:border-red-700/50' },
  article:   { label: 'Article',   icon: '📄', color: 'bg-blue-50 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-700/50' },
  'hands-on':{ label: 'Hands-On', icon: '🔧', color: 'bg-amber-50 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-700/50' },
  quiz:      { label: 'Quiz',      icon: '🧠', color: 'bg-violet-50 dark:bg-violet-900/40 text-violet-700 dark:text-violet-300 border-violet-200 dark:border-violet-700/50' },
}

const COURSE_CATEGORIES = ['General', 'Safety', 'Tools & Equipment', 'Refrigeration', 'Electrical', 'Controls', 'Business Practices']

interface Task {
  id: string; category: string; title: string; description: string
  difficulty: string; points: number; sort_order: number
  progress: { status: string; completed_at: string | null; notes: string; verifier: { name: string } | null } | null
}
interface Course {
  id: string; title: string; description: string; category: string
  type: string; url: string; duration_minutes: number; points: number
  sort_order: number; is_published: boolean; created_at: string
  completion: { completed_at: string; notes: string } | null
}
interface UserProfile { id: string; name: string; email: string; role: string; mentor_id: string | null }
interface Apprentice  { id: string; name: string; email: string }

// ─── Course modal ─────────────────────────────────────────────────────────────
interface CourseModalProps {
  initial?: Course | null
  onSave: (course: Course) => void
  onClose: () => void
}
function CourseModal({ initial, onSave, onClose }: CourseModalProps) {
  const [title,    setTitle]    = useState(initial?.title            ?? '')
  const [desc,     setDesc]     = useState(initial?.description      ?? '')
  const [category, setCat]      = useState(initial?.category         ?? 'General')
  const [type,     setType]     = useState(initial?.type             ?? 'article')
  const [url,      setUrl]      = useState(initial?.url              ?? '')
  const [duration, setDuration] = useState(initial?.duration_minutes ?? 0)
  const [points,   setPoints]   = useState(initial?.points           ?? 50)
  const [saving,   setSaving]   = useState(false)
  const [error,    setError]    = useState('')

  async function handleSave() {
    if (!title.trim()) { setError('Title is required'); return }
    setSaving(true); setError('')
    const method = initial ? 'PATCH' : 'POST'
    const endpoint = initial ? `/api/apprentice/courses/${initial.id}` : '/api/apprentice/courses'
    const res = await fetch(endpoint, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, description: desc, category, type, url, duration_minutes: Number(duration), points: Number(points) }),
    })
    setSaving(false)
    if (!res.ok) { const d = await res.json(); setError(d.error ?? 'Failed to save'); return }
    onSave(await res.json())
  }

  const inputCls = 'w-full px-3 py-2 text-sm bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500'
  const labelCls = 'block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1'

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl w-full max-w-lg shadow-2xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 dark:border-slate-700">
          <h2 className="text-sm font-semibold text-slate-900 dark:text-white">{initial ? 'Edit Course' : 'Add Course'}</h2>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-300"><X size={18}/></button>
        </div>
        <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
          {error && <div className="px-3 py-2 bg-red-50 dark:bg-red-900/50 border border-red-200 dark:border-red-700 text-red-700 dark:text-red-300 text-xs rounded-lg">{error}</div>}

          <div>
            <label className={labelCls}>Title *</label>
            <input value={title} onChange={e => setTitle(e.target.value)} className={inputCls} placeholder="e.g. Refrigerant Safety Basics" />
          </div>
          <div>
            <label className={labelCls}>Description</label>
            <textarea value={desc} onChange={e => setDesc(e.target.value)} rows={2} className={inputCls} placeholder="What will the apprentice learn?" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Category</label>
              <select value={category} onChange={e => setCat(e.target.value)} className={inputCls}>
                {COURSE_CATEGORIES.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls}>Type</label>
              <select value={type} onChange={e => setType(e.target.value)} className={inputCls}>
                <option value="article">📄 Article</option>
                <option value="video">🎬 Video</option>
                <option value="hands-on">🔧 Hands-On</option>
                <option value="quiz">🧠 Quiz</option>
              </select>
            </div>
          </div>
          <div>
            <label className={labelCls}>Link / URL (optional)</label>
            <input value={url} onChange={e => setUrl(e.target.value)} className={inputCls} placeholder="https://…" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Duration (minutes)</label>
              <input type="number" min={0} value={duration} onChange={e => setDuration(Number(e.target.value))} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>XP Reward</label>
              <input type="number" min={5} step={5} value={points} onChange={e => setPoints(Number(e.target.value))} className={inputCls} />
            </div>
          </div>
        </div>
        <div className="flex justify-end gap-2 px-5 py-4 border-t border-slate-200 dark:border-slate-700">
          <button onClick={onClose} className="px-4 py-2 text-sm text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-lg">Cancel</button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg"
          >
            {saving && <Loader2 size={13} className="animate-spin"/>}
            {saving ? 'Saving…' : initial ? 'Update' : 'Add Course'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────
function TrainingInner() {
  const router       = useRouter()
  const searchParams = useSearchParams()

  const [activeTab, setActiveTab]   = useState<'tasks' | 'courses'>('tasks')

  // Tasks state
  const [tasks, setTasks]           = useState<Task[]>([])
  const [toggling, setToggling]     = useState<string | null>(null)
  const [toggleError, setToggleError] = useState<string | null>(null)
  const [openCats, setOpenCats]     = useState<Record<string, boolean>>({})
  const [newBadge, setNewBadge]     = useState<string | null>(null)

  // Courses state
  const [courses, setCourses]           = useState<Course[]>([])
  const [coursesLoading, setCoursesLoading] = useState(false)
  const [togglingCourse, setTogglingCourse] = useState<string | null>(null)
  const [showCourseModal, setShowCourseModal] = useState(false)
  const [editingCourse, setEditingCourse] = useState<Course | null>(null)
  const [deletingCourse, setDeletingCourse] = useState<string | null>(null)

  // User state
  const [currentUser, setUser]      = useState<UserProfile | null>(null)
  const [viewingUser, setViewing]   = useState<UserProfile | null>(null)
  const [mentor, setMentor]         = useState<{ name: string } | null>(null)
  const [apprentices, setApprentices] = useState<Apprentice[]>([])
  const [loading, setLoading]       = useState(true)
  const [showSwitcher, setShowSwitcher] = useState(false)

  const isAdmin    = ['admin', 'manager', 'journeyman'].includes(currentUser?.role ?? '')
  const isReadOnly = isAdmin && viewingUser !== null && viewingUser.id !== currentUser?.id
  const displayUser = viewingUser ?? currentUser

  const fetchTasks = useCallback(async (userId: string) => {
    const res  = await fetch(`/api/apprentice/progress?userId=${userId}`)
    const data = await res.json()
    if (Array.isArray(data)) setTasks(data)
  }, [])

  const fetchCourses = useCallback(async (userId: string) => {
    setCoursesLoading(true)
    const res  = await fetch(`/api/apprentice/courses?userId=${userId}`)
    const data = await res.json()
    if (Array.isArray(data)) setCourses(data)
    setCoursesLoading(false)
  }, [])

  useEffect(() => {
    async function load() {
      const sb = getSupabaseBrowser()
      const { data: { user } } = await sb.auth.getUser()
      if (!user) { router.push('/login'); return }

      const { data: profile } = await sb.from('users').select('*').eq('id', user.id).single()
      if (!profile) { router.push('/login'); return }
      const me = profile as unknown as UserProfile
      setUser(me)

      const canViewOthers = ['admin', 'manager', 'journeyman'].includes(me.role)
      const targetId = searchParams.get('userId')
      let targetUser: UserProfile = me

      if (targetId && canViewOthers && targetId !== me.id) {
        const { data: other } = await sb.from('users').select('*').eq('id', targetId).single()
        if (other) targetUser = other as unknown as UserProfile
      }
      setViewing(targetUser)

      if (targetUser.mentor_id) {
        const { data: m } = await sb.from('users').select('name').eq('id', targetUser.mentor_id).single()
        if (m) setMentor(m as { name: string })
      }

      if (canViewOthers) {
        const { data: apps } = await sb.from('users').select('id,name,email').eq('role', 'apprentice').order('name')
        setApprentices((apps ?? []) as Apprentice[])
      }

      await Promise.all([fetchTasks(targetUser.id), fetchCourses(targetUser.id)])
      setOpenCats(Object.fromEntries(Object.keys(CAT_COLORS).map(k => [k, true])))
      setLoading(false)
    }
    load()
  }, [router, fetchTasks, fetchCourses, searchParams])

  // ── Task toggle ──────────────────────────────────────────────────────────────
  async function toggleTask(task: Task) {
    if (!currentUser || isReadOnly) return
    const wasComplete = task.progress?.status === 'completed'
    setToggling(task.id)
    setToggleError(null)

    const prevTasks = tasks
    const prevBadgeCount = computeEarnedBadges(tasks).length
    const newTasks = tasks.map(t =>
      t.id === task.id
        ? { ...t, progress: wasComplete ? null : { status: 'completed', completed_at: new Date().toISOString(), notes: '', verifier: null } }
        : t
    )
    setTasks(newTasks)

    const userId = viewingUser?.id ?? currentUser.id
    if (wasComplete) {
      const res = await fetch('/api/apprentice/progress', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, taskId: task.id }),
      })
      if (!res.ok) { setTasks(prevTasks); setToggleError('Failed to save — please try again') }
    } else {
      const res = await fetch('/api/apprentice/progress', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, taskId: task.id, status: 'completed' }),
      })
      if (!res.ok) {
        setTasks(prevTasks)
        setToggleError('Failed to save — please try again')
      } else {
        const newBadgeCount = computeEarnedBadges(newTasks).length
        if (newBadgeCount > prevBadgeCount) {
          const earned  = computeEarnedBadges(newTasks)
          const prev    = computeEarnedBadges(tasks)
          const newOnes = earned.filter(b => !prev.find(p => p.id === b.id))
          if (newOnes[0]) { setNewBadge(newOnes[0].id); setTimeout(() => setNewBadge(null), 4000) }
        }
      }
    }
    setToggling(null)
  }

  // ── Course actions ───────────────────────────────────────────────────────────
  async function toggleCourse(course: Course) {
    if (!currentUser) return
    const wasDone = !!course.completion
    setTogglingCourse(course.id)

    const userId = viewingUser?.id ?? currentUser.id
    if (wasDone) {
      await fetch(`/api/apprentice/courses/${course.id}/complete`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      })
      setCourses(prev => prev.map(c => c.id === course.id ? { ...c, completion: null } : c))
    } else {
      await fetch(`/api/apprentice/courses/${course.id}/complete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      })
      setCourses(prev => prev.map(c => c.id === course.id
        ? { ...c, completion: { completed_at: new Date().toISOString(), notes: '' } }
        : c
      ))
    }
    setTogglingCourse(null)
  }

  function handleCourseSaved(saved: Course) {
    const userId = viewingUser?.id ?? currentUser?.id ?? ''
    if (editingCourse) {
      setCourses(prev => prev.map(c => c.id === saved.id ? { ...saved, completion: c.completion } : c))
    } else {
      setCourses(prev => [...prev, { ...saved, completion: null }])
    }
    setShowCourseModal(false)
    setEditingCourse(null)
    // Re-fetch to get completion status for the right user
    if (userId) fetchCourses(userId)
  }

  async function deleteCourse(id: string) {
    if (!confirm('Delete this course? Completions will also be removed.')) return
    setDeletingCourse(id)
    await fetch(`/api/apprentice/courses/${id}`, { method: 'DELETE' })
    setCourses(prev => prev.filter(c => c.id !== id))
    setDeletingCourse(null)
  }

  function computeEarnedBadges(taskList: Task[]) {
    const completed   = taskList.filter(t => t.progress?.status === 'completed')
    const byCat: Record<string, number>  = {}
    const totCat: Record<string, number> = {}
    for (const t of taskList) totCat[t.category] = (totCat[t.category] ?? 0) + 1
    for (const t of completed) byCat[t.category]  = (byCat[t.category]  ?? 0) + 1
    return BADGES.filter(b => b.check(completed.length, taskList.length, byCat, totCat))
  }

  function switchTo(app: Apprentice) {
    setShowSwitcher(false)
    router.push(`/apprentice/training?userId=${app.id}`)
  }

  if (loading) return (
    <div className="min-h-screen bg-white dark:bg-slate-900 flex items-center justify-center">
      <Loader2 size={24} className="animate-spin text-blue-400" />
    </div>
  )

  const completed    = tasks.filter(t => t.progress?.status === 'completed')
  const taskXP       = tasks.reduce((s, t) => s + t.points, 0)
  const earnedTaskXP = completed.reduce((s, t) => s + t.points, 0)
  const courseXP     = courses.reduce((s, c) => s + (c.completion ? c.points : 0), 0)
  const totalCourseXP = courses.reduce((s, c) => s + c.points, 0)
  const earnedXP     = earnedTaskXP + courseXP
  const totalXP      = taskXP + totalCourseXP
  const pct          = totalXP > 0 ? Math.round((earnedXP / totalXP) * 100) : 0
  const level        = getLevel(earnedXP)
  const nextLevel    = LEVELS.find(l => l.min > earnedXP)
  const earnedBadges = computeEarnedBadges(tasks)
  const categories   = Object.keys(CAT_COLORS)
  const tasksByCat: Record<string, Task[]> = {}
  for (const t of tasks) {
    if (!tasksByCat[t.category]) tasksByCat[t.category] = []
    tasksByCat[t.category].push(t)
  }

  // Group courses by category
  const coursesByCat: Record<string, Course[]> = {}
  for (const c of courses) {
    if (!coursesByCat[c.category]) coursesByCat[c.category] = []
    coursesByCat[c.category].push(c)
  }

  return (
    <div className="min-h-[100dvh] bg-white dark:bg-slate-900 text-slate-900 dark:text-white">
      {/* Badge toast */}
      {newBadge && (() => {
        const b = BADGES.find(x => x.id === newBadge)!
        return (
          <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-5 py-3 bg-yellow-400 text-yellow-900 rounded-full shadow-2xl font-bold text-sm animate-bounce">
            <span className="text-2xl">{b.icon}</span>
            Badge Unlocked: {b.name}!
          </div>
        )
      })()}

      {/* Course modal */}
      {(showCourseModal || editingCourse) && (
        <CourseModal
          initial={editingCourse}
          onSave={handleCourseSaved}
          onClose={() => { setShowCourseModal(false); setEditingCourse(null) }}
        />
      )}

      {/* Header */}
      <div className="safe-top bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 px-4 py-4 flex items-center gap-3 sticky top-0 z-10">
        <button
          onClick={() => isAdmin ? router.push('/admin/apprentices') : router.push('/dashboard')}
          className="p-1.5 -ml-1 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700"
        >
          <ArrowLeft size={20} />
        </button>
        <div className="flex items-baseline gap-0.5">
          <span className="text-lg font-bold text-blue-400">Cold</span>
          <span className="text-lg font-bold text-slate-900 dark:text-white">IQ</span>
        </div>
        <span className="text-slate-300 dark:text-slate-600">/</span>
        <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Training</span>

        {isAdmin && apprentices.length > 0 && (
          <div className="ml-auto relative">
            <button
              onClick={() => setShowSwitcher(s => !s)}
              className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 border border-slate-300 dark:border-slate-600 rounded-lg text-xs text-slate-700 dark:text-slate-200 transition-colors"
            >
              <span className="font-medium truncate max-w-[120px]">
                {isReadOnly ? displayUser?.name || displayUser?.email : 'View as apprentice'}
              </span>
              <Down size={12} className={`flex-shrink-0 transition-transform ${showSwitcher ? 'rotate-180' : ''}`} />
            </button>
            {showSwitcher && (
              <div className="absolute right-0 top-full mt-1 w-56 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-xl shadow-2xl z-50 overflow-hidden">
                <div className="p-2 border-b border-slate-200 dark:border-slate-700">
                  <p className="text-[10px] text-slate-500 uppercase tracking-widest px-1">Switch apprentice</p>
                </div>
                <div className="max-h-60 overflow-y-auto py-1">
                  {apprentices.map(a => (
                    <button key={a.id} onClick={() => switchTo(a)}
                      className={`w-full text-left px-3 py-2 text-xs hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors ${a.id === displayUser?.id ? 'text-blue-600 dark:text-blue-400 font-medium' : 'text-slate-600 dark:text-slate-300'}`}
                    >
                      <p className="font-medium truncate">{a.name || a.email}</p>
                      {a.name && <p className="text-slate-500 truncate">{a.email}</p>}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {!isAdmin && mentor && (
          <span className="ml-auto text-xs text-slate-500 dark:text-slate-400">Journeyman: <span className="text-slate-700 dark:text-slate-200 font-medium">{mentor.name}</span></span>
        )}
      </div>

      {/* Learning tab bar */}
      <LearningTabBar />

      {/* Banners */}
      {toggleError && (
        <div className="bg-red-50 dark:bg-red-900/60 border-b border-red-200 dark:border-red-700/50 px-4 py-2 flex items-center justify-between">
          <span className="text-xs text-red-700 dark:text-red-300">{toggleError}</span>
          <button onClick={() => setToggleError(null)} className="ml-3 text-red-500 dark:text-red-400 hover:text-red-700 dark:hover:text-red-200 text-base leading-none">×</button>
        </div>
      )}
      {isReadOnly && (
        <div className="bg-blue-50 dark:bg-blue-900/60 border-b border-blue-200 dark:border-blue-700/50 px-4 py-2 flex items-center gap-2">
          <span className="text-xs text-blue-700 dark:text-blue-300">
            👁 Viewing <span className="font-semibold text-blue-800 dark:text-blue-200">{displayUser?.name || displayUser?.email}</span>'s training — read-only
          </span>
          {mentor && <span className="ml-auto text-xs text-blue-600 dark:text-blue-400">Journeyman: <span className="text-blue-700 dark:text-blue-200 font-medium">{mentor.name}</span></span>}
        </div>
      )}

      <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">

        {/* XP / Level card */}
        <div className="bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-700 border border-slate-200 dark:border-slate-600 rounded-2xl p-5">
          <div className="flex items-start justify-between mb-4">
            <div>
              <p className="text-xs text-slate-400 font-medium uppercase tracking-widest mb-1">Level</p>
              <p className={`text-2xl font-bold ${level.color}`}>{level.label}</p>
              <p className="text-sm text-slate-500 dark:text-slate-300 mt-0.5">{displayUser?.name}</p>
            </div>
            <div className="text-right">
              <p className="text-3xl font-bold text-slate-900 dark:text-white">{earnedXP}</p>
              <p className="text-xs text-slate-400">/ {totalXP} XP</p>
            </div>
          </div>
          <div className="mb-2">
            <div className="h-3 bg-slate-200 dark:bg-slate-600 rounded-full overflow-hidden">
              <div className="h-full bg-blue-500 rounded-full transition-all duration-700" style={{ width: `${pct}%` }} />
            </div>
          </div>
          <div className="flex justify-between text-xs text-slate-400">
            <span>{pct}% complete</span>
            {nextLevel && <span>{nextLevel.min - earnedXP} XP to {nextLevel.label}</span>}
          </div>
          <div className="flex gap-4 mt-4 pt-4 border-t border-slate-200 dark:border-slate-600">
            <div className="text-center">
              <p className="text-lg font-bold text-slate-900 dark:text-white">{completed.length}</p>
              <p className="text-[10px] text-slate-400 uppercase tracking-wide">Tasks Done</p>
            </div>
            <div className="w-px bg-slate-300 dark:bg-slate-600" />
            <div className="text-center">
              <p className="text-lg font-bold text-slate-900 dark:text-white">{courses.filter(c => c.completion).length}</p>
              <p className="text-[10px] text-slate-400 uppercase tracking-wide">Courses Done</p>
            </div>
            <div className="w-px bg-slate-300 dark:bg-slate-600" />
            <div className="text-center">
              <p className="text-lg font-bold text-slate-900 dark:text-white">{earnedBadges.length}</p>
              <p className="text-[10px] text-slate-400 uppercase tracking-wide">Badges</p>
            </div>
            <div className="w-px bg-slate-300 dark:bg-slate-600" />
            <div className="text-center">
              <p className="text-lg font-bold text-slate-900 dark:text-white">{categories.length}</p>
              <p className="text-[10px] text-slate-400 uppercase tracking-wide">Categories</p>
            </div>
          </div>
        </div>

        {/* Badges */}
        <div>
          <h3 className="text-[11px] font-semibold text-slate-500 uppercase tracking-widest mb-3">Badges</h3>
          <div className="grid grid-cols-4 sm:grid-cols-5 gap-2">
            {BADGES.map(b => {
              const earned = earnedBadges.some(e => e.id === b.id)
              const isNew  = newBadge === b.id
              return (
                <div key={b.id}
                  className={`flex flex-col items-center gap-1.5 p-2.5 rounded-xl border transition-all ${earned ? isNew ? 'bg-yellow-400/20 border-yellow-400 ring-2 ring-yellow-400 ring-offset-1 ring-offset-white dark:ring-offset-slate-900' : 'bg-slate-200 dark:bg-slate-700 border-slate-400 dark:border-slate-500' : 'bg-slate-100 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 opacity-40 grayscale'}`}
                  title={`${b.name}: ${b.desc}`}
                >
                  <span className="text-xl sm:text-2xl">{b.icon}</span>
                  <span className="text-[10px] text-center text-slate-600 dark:text-slate-300 font-medium leading-tight">{b.name}</span>
                </div>
              )
            })}
          </div>
        </div>

        {/* Tab switcher */}
        <div className="flex gap-1 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-1">
          <button
            onClick={() => setActiveTab('tasks')}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
              activeTab === 'tasks' ? 'bg-white dark:bg-slate-600 text-slate-900 dark:text-white shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
            }`}
          >
            <span>📋</span>
            <span>313A Tasks</span>
            <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${activeTab === 'tasks' ? 'bg-blue-100 dark:bg-slate-500 text-blue-700 dark:text-slate-200' : 'bg-slate-200 dark:bg-slate-700 text-slate-500'}`}>
              {completed.length}/{tasks.length}
            </span>
          </button>
          <button
            onClick={() => setActiveTab('courses')}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
              activeTab === 'courses' ? 'bg-white dark:bg-slate-600 text-slate-900 dark:text-white shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
            }`}
          >
            <BookOpen size={15}/>
            <span>Courses</span>
            <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${activeTab === 'courses' ? 'bg-blue-100 dark:bg-slate-500 text-blue-700 dark:text-slate-200' : 'bg-slate-200 dark:bg-slate-700 text-slate-500'}`}>
              {courses.filter(c => c.completion).length}/{courses.length}
            </span>
          </button>
        </div>

        {/* ── 313A Tasks tab ─────────────────────────────────────────────────── */}
        {activeTab === 'tasks' && (
          <>
            {/* Category progress summary */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {categories.map(cat => {
                const catTasks = tasksByCat[cat] ?? []
                const catDone  = catTasks.filter(t => t.progress?.status === 'completed').length
                const catPct   = catTasks.length > 0 ? Math.round((catDone / catTasks.length) * 100) : 0
                const ci       = CAT_COLORS[cat]
                return (
                  <button key={cat} onClick={() => setOpenCats(o => ({ ...o, [cat]: !o[cat] }))}
                    className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-left hover:border-slate-400 dark:hover:border-slate-500 transition-colors"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-base">{ci.icon}</span>
                      <span className="text-xs font-bold text-slate-900 dark:text-white">{catPct}%</span>
                    </div>
                    <div className="h-1.5 bg-slate-200 dark:bg-slate-600 rounded-full overflow-hidden mb-1.5">
                      <div className="h-full bg-blue-500 rounded-full transition-all" style={{ width: `${catPct}%` }} />
                    </div>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-tight">{cat}</p>
                    <p className="text-[10px] text-slate-400 dark:text-slate-500">{catDone}/{catTasks.length}</p>
                  </button>
                )
              })}
            </div>

            {/* Task lists by category */}
            {categories.map(cat => {
              const catTasks = (tasksByCat[cat] ?? []).sort((a, b) => a.sort_order - b.sort_order)
              const catDone  = catTasks.filter(t => t.progress?.status === 'completed').length
              const isOpen   = openCats[cat] ?? true
              const ci       = CAT_COLORS[cat]

              return (
                <div key={cat} className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl overflow-hidden">
                  <button onClick={() => setOpenCats(o => ({ ...o, [cat]: !o[cat] }))}
                    className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
                  >
                    <span className="text-xl">{ci.icon}</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-100 text-sm flex-1 text-left">{cat}</span>
                    <span className="text-xs text-slate-400">{catDone}/{catTasks.length}</span>
                    {catDone === catTasks.length && <span className="text-emerald-600 dark:text-emerald-400 text-xs font-bold">✓ Complete</span>}
                    <ChevronDown size={15} className={`text-slate-500 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                  </button>

                  {isOpen && (
                    <div className="divide-y divide-slate-200 dark:divide-slate-700/50">
                      {catTasks.map(task => {
                        const done = task.progress?.status === 'completed'
                        const busy = toggling === task.id
                        return (
                          <div key={task.id} className={`px-4 py-3.5 flex items-start gap-3 transition-colors ${done ? 'opacity-70' : ''}`}>
                            <button onClick={() => !isReadOnly && toggleTask(task)} disabled={busy || isReadOnly}
                              className={`flex-shrink-0 mt-0.5 transition-transform ${isReadOnly ? 'cursor-default' : 'active:scale-90'}`}
                            >
                              {busy ? <Loader2 size={20} className="animate-spin text-blue-400" />
                                : done ? <CheckCircle2 size={20} className="text-emerald-600 dark:text-emerald-400" />
                                : <Circle size={20} className={isReadOnly ? 'text-slate-700' : 'text-slate-600 hover:text-slate-400'} />}
                            </button>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap mb-0.5">
                                <p className={`text-sm font-medium ${done ? 'line-through text-slate-400' : 'text-slate-800 dark:text-slate-100'}`}>{task.title}</p>
                                <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${DIFF_BADGE[task.difficulty]}`}>{task.difficulty}</span>
                              </div>
                              <p className="text-xs text-slate-400 leading-relaxed">{task.description}</p>
                              {done && task.progress?.verifier && <p className="text-[10px] text-emerald-500 mt-1">✓ Verified by {task.progress.verifier.name}</p>}
                              {done && task.progress?.completed_at && <p className="text-[10px] text-slate-500 mt-0.5">Completed {new Date(task.progress.completed_at).toLocaleDateString()}</p>}
                            </div>
                            <span className={`flex-shrink-0 text-[11px] font-bold px-2 py-0.5 rounded-full ${done ? 'bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-400' : 'bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-400'}`}>
                              +{task.points} XP
                            </span>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              )
            })}
          </>
        )}

        {/* ── Courses tab ────────────────────────────────────────────────────── */}
        {activeTab === 'courses' && (
          <div className="space-y-4">
            {/* Add course button (admins/managers/journeymen) */}
            {isAdmin && !isReadOnly && (
              <button
                onClick={() => { setEditingCourse(null); setShowCourseModal(true) }}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed border-slate-300 dark:border-slate-600 hover:border-blue-500 rounded-xl text-slate-400 hover:text-blue-500 text-sm font-medium transition-colors"
              >
                <Plus size={16}/> Add Course
              </button>
            )}

            {coursesLoading && (
              <div className="flex justify-center py-10 text-slate-500 text-sm gap-2">
                <Loader2 size={16} className="animate-spin"/> Loading courses…
              </div>
            )}

            {!coursesLoading && courses.length === 0 && (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <BookOpen size={32} className="text-slate-700 mb-3"/>
                <p className="text-sm text-slate-500">No courses yet.</p>
                {isAdmin && !isReadOnly && <p className="text-xs text-slate-600 mt-1">Click &ldquo;Add Course&rdquo; above to create the first one.</p>}
              </div>
            )}

            {!coursesLoading && Object.entries(coursesByCat).map(([cat, catCourses]) => (
              <div key={cat} className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl overflow-hidden">
                {/* Category header */}
                <div className="flex items-center gap-2 px-4 py-3 bg-slate-100 dark:bg-slate-700/40 border-b border-slate-200 dark:border-slate-700">
                  <span className="text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider flex-1">{cat}</span>
                  <span className="text-xs text-slate-500">{catCourses.filter(c => c.completion).length}/{catCourses.length} done</span>
                </div>

                <div className="divide-y divide-slate-200 dark:divide-slate-700/50">
                  {catCourses.map(course => {
                    const done = !!course.completion
                    const busy = togglingCourse === course.id
                    const tm   = COURSE_TYPE_META[course.type] ?? COURSE_TYPE_META.article

                    return (
                      <div key={course.id} className={`px-4 py-4 flex items-start gap-3 ${done ? 'opacity-70' : ''}`}>
                        {/* Complete toggle */}
                        <button
                          onClick={() => !isReadOnly && toggleCourse(course)}
                          disabled={busy || isReadOnly}
                          className={`flex-shrink-0 mt-0.5 transition-transform ${isReadOnly ? 'cursor-default' : 'active:scale-90'}`}
                        >
                          {busy ? <Loader2 size={20} className="animate-spin text-blue-400"/>
                            : done ? <CheckCircle2 size={20} className="text-emerald-400"/>
                            : <Circle size={20} className={isReadOnly ? 'text-slate-700' : 'text-slate-600 hover:text-slate-400'}/>}
                        </button>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <p className={`text-sm font-medium ${done ? 'line-through text-slate-400' : 'text-slate-800 dark:text-slate-100'}`}>
                              {course.title}
                            </p>
                            {/* Type badge */}
                            <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded border ${tm.color}`}>
                              {tm.icon} {tm.label}
                            </span>
                          </div>
                          {course.description && (
                            <p className="text-xs text-slate-400 leading-relaxed mb-1.5">{course.description}</p>
                          )}
                          <div className="flex items-center gap-3 flex-wrap">
                            {course.duration_minutes > 0 && (
                              <span className="flex items-center gap-1 text-[10px] text-slate-500">
                                <Clock size={10}/> {course.duration_minutes} min
                              </span>
                            )}
                            {done && course.completion?.completed_at && (
                              <span className="text-[10px] text-emerald-700 dark:text-emerald-500">
                                ✓ Completed {new Date(course.completion.completed_at).toLocaleDateString()}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Right side: XP + link + admin actions */}
                        <div className="flex items-center gap-1.5 flex-shrink-0">
                          <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${done ? 'bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-400' : 'bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-400'}`}>
                            +{course.points} XP
                          </span>
                          {course.url && (
                            <a href={course.url} target="_blank" rel="noopener noreferrer"
                              className="p-1.5 text-slate-500 hover:text-blue-400 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                              title="Open resource"
                            >
                              <ExternalLink size={14}/>
                            </a>
                          )}
                          {isAdmin && !isReadOnly && (
                            <>
                              <button
                                onClick={() => { setEditingCourse(course); setShowCourseModal(true) }}
                                className="p-1.5 text-slate-500 hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                                title="Edit course"
                              >
                                <Pencil size={13}/>
                              </button>
                              <button
                                onClick={() => deleteCourse(course.id)}
                                disabled={deletingCourse === course.id}
                                className="p-1.5 text-slate-500 hover:text-red-400 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors disabled:opacity-40"
                                title="Delete course"
                              >
                                {deletingCourse === course.id ? <Loader2 size={13} className="animate-spin"/> : <Trash2 size={13}/>}
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        )}

      </div>
    </div>
  )
}

export default function TrainingPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-white dark:bg-slate-900 flex items-center justify-center">
        <Loader2 size={24} className="animate-spin text-blue-400" />
      </div>
    }>
      <TrainingInner />
    </Suspense>
  )
}
