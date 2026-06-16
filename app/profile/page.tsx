'use client'
export const dynamic = 'force-dynamic'

import { useState, useEffect, useCallback, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { getSupabaseBrowser } from '@/lib/supabase/client'
import {
  Award, GraduationCap, Calendar,
  Clock, Loader2, Plus, Trash2, Pencil, Check, X, ChevronRight,
  Settings, MessageCircle, Send, Compass,
} from 'lucide-react'
import PageShell from '@/components/layout/PageShell'
import PageHeader from '@/components/PageHeader'
import { useConfirm } from '@/components/ConfirmDialog'

// ─── Constants ────────────────────────────────────────────────────────────────
const CERT_TYPES = [
  { type: 'Refrigeration', subtypes: ['313A', '313D', 'ODP Certificate'] },
  { type: 'Gas',           subtypes: ['Gas 1', 'Gas 2', 'Gas 3'] },
  { type: 'Electrical',    subtypes: ['309A', '442A'] },
  { type: 'HVAC',          subtypes: ['313A HVAC', 'R-410A'] },
  { type: 'Safety',        subtypes: ['WHMIS', 'Working at Heights', 'First Aid'] },
  { type: 'Other',         subtypes: ['Other'] },
]

const YEAR_LABELS: Record<number, string> = {
  1: 'Year 1', 2: 'Year 2', 3: 'Year 3', 4: 'Year 4', 5: 'Year 5', 6: 'Journeyman',
}

const ROLE_LABELS: Record<string, string> = {
  admin: 'Admin', manager: 'Manager', journeyman: 'Journeyman', apprentice: 'Apprentice',
}
const ROLE_COLOURS: Record<string, string> = {
  admin:      'bg-red-100 text-red-700',
  manager:    'bg-violet-100 text-violet-700',
  journeyman: 'bg-blue-100 text-blue-700',
  apprentice: 'bg-amber-100 text-amber-700',
}

interface Profile {
  id: string; name: string; email: string; role: string; status: string
  created_at: string; mentor_id: string | null
  apprenticeship_start_date: string | null
  apprenticeship_hours: number
  apprenticeship_year: number
}
interface Cert {
  id: string; cert_type: string; cert_subtype: string; cert_number: string
  issued_date: string | null; expiry_date: string | null; notes: string
}
interface FeedbackEntry {
  id: string
  content: string | null
  strengths: string | null
  improvements: string | null
  review_period: string | null
  rating_overall: number | null
  rating_technical: number | null
  rating_safety: number | null
  rating_teamwork: number | null
  created_at: string
  manager: { name: string; email: string; role: string } | null
}
interface WrittenFeedbackEntry {
  id: string
  content: string | null
  strengths: string | null
  improvements: string | null
  review_period: string | null
  rating_overall: number | null
  rating_technical: number | null
  rating_safety: number | null
  rating_teamwork: number | null
  created_at: string
  technician: { id: string; name: string; email: string; role: string } | null
}

interface FeedbackBodyFields {
  rating_technical: number | null
  rating_safety: number | null
  rating_teamwork: number | null
  strengths: string | null
  improvements: string | null
  content: string | null
}

function FeedbackBody({ f }: { f: FeedbackBodyFields }) {
  return (
    <>
      {/* Category ratings */}
      {(f.rating_technical || f.rating_safety || f.rating_teamwork) && (
        <div className="grid grid-cols-3 gap-2">
          {([
            { label: 'Technical', value: f.rating_technical },
            { label: 'Safety',    value: f.rating_safety },
            { label: 'Teamwork',  value: f.rating_teamwork },
          ] as { label: string; value: number | null }[]).filter(r => r.value).map(r => (
            <div key={r.label} className="bg-slate-50 dark:bg-slate-800 rounded-lg px-2 py-1.5 text-center">
              <p className="text-[10px] text-slate-400 dark:text-slate-500 mb-0.5">{r.label}</p>
              <div className="flex justify-center gap-0.5">
                {[1,2,3,4,5].map(n => (
                  <span key={n} className={`text-xs ${n <= (r.value ?? 0) ? 'text-amber-400' : 'text-slate-200 dark:text-slate-700'}`}>★</span>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Strengths */}
      {f.strengths && (
        <div className="bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-100 dark:border-emerald-900 rounded-lg px-3 py-2">
          <p className="text-[10px] font-semibold text-emerald-700 dark:text-emerald-400 uppercase tracking-wide mb-1">Strengths</p>
          <p className="text-xs text-emerald-800 dark:text-emerald-300 leading-relaxed">{f.strengths}</p>
        </div>
      )}

      {/* Improvements */}
      {f.improvements && (
        <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-100 dark:border-amber-900 rounded-lg px-3 py-2">
          <p className="text-[10px] font-semibold text-amber-700 dark:text-amber-400 uppercase tracking-wide mb-1">Areas for Improvement</p>
          <p className="text-xs text-amber-800 dark:text-amber-300 leading-relaxed">{f.improvements}</p>
        </div>
      )}

      {/* Notes */}
      {f.content && (
        <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">{f.content}</p>
      )}
    </>
  )
}

function fmt(dateStr: string | null) {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleDateString('en-CA', { year: 'numeric', month: 'short', day: 'numeric' })
}

function daysUntil(dateStr: string): number {
  const now   = new Date(); now.setHours(0, 0, 0, 0)
  const target = new Date(dateStr); target.setHours(0, 0, 0, 0)
  return Math.ceil((target.getTime() - now.getTime()) / 86400000)
}

function nextAnniversary(startStr: string): string {
  const start = new Date(startStr)
  const now   = new Date()
  const ann   = new Date(start)
  ann.setFullYear(now.getFullYear())
  if (ann <= now) ann.setFullYear(now.getFullYear() + 1)
  return ann.toISOString().slice(0, 10)
}

function yearsMonths(startStr: string): string {
  const start = new Date(startStr)
  const now   = new Date()
  let years   = now.getFullYear() - start.getFullYear()
  let months  = now.getMonth()    - start.getMonth()
  if (months < 0) { years--; months += 12 }
  if (years === 0) return `${months} month${months !== 1 ? 's' : ''}`
  if (months === 0) return `${years} year${years !== 1 ? 's' : ''}`
  return `${years} yr ${months} mo`
}

// ─── Add cert modal ────────────────────────────────────────────────────────────
function AddCertModal({ userId, onSave, onClose }: { userId: string; onSave: (c: Cert) => void; onClose: () => void }) {
  const [certType,    setCertType]    = useState(CERT_TYPES[0].type)
  const [certSubtype, setCertSubtype] = useState(CERT_TYPES[0].subtypes[0])
  const [certNumber,  setCertNumber]  = useState('')
  const [issuedDate,  setIssuedDate]  = useState('')
  const [expiryDate,  setExpiryDate]  = useState('')
  const [notes,       setNotes]       = useState('')
  const [saving,      setSaving]      = useState(false)
  const [error,       setError]       = useState('')

  const subtypes = CERT_TYPES.find(c => c.type === certType)?.subtypes ?? []

  async function handleSave() {
    setSaving(true); setError('')
    const res = await fetch('/api/tech-certs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId, certType, certSubtype, certNumber,
        issuedDate: issuedDate || null,
        expiryDate: expiryDate || null,
        notes,
      }),
    })
    setSaving(false)
    if (!res.ok) { const d = await res.json(); setError(d.error ?? 'Failed'); return }
    onSave(await res.json())
  }

  const inp = 'w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-800 dark:text-slate-100 dark:placeholder-slate-500'
  const lbl = 'block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1'

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-md shadow-2xl border border-slate-200 dark:border-slate-700">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-700">
          <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-200">Add Certificate / Ticket</h2>
          <button onClick={onClose} className="text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300"><X size={18}/></button>
        </div>
        <div className="p-5 space-y-3">
          {error && <div className="px-3 py-2 bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 text-xs rounded-lg">{error}</div>}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={lbl}>Category</label>
              <select value={certType} onChange={e => { setCertType(e.target.value); setCertSubtype(CERT_TYPES.find(c => c.type === e.target.value)?.subtypes[0] ?? '') }} className={inp}>
                {CERT_TYPES.map(c => <option key={c.type}>{c.type}</option>)}
              </select>
            </div>
            <div>
              <label className={lbl}>Certificate / Ticket</label>
              <select value={certSubtype} onChange={e => setCertSubtype(e.target.value)} className={inp}>
                {subtypes.map(s => <option key={s}>{s}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className={lbl}>Certificate Number (optional)</label>
            <input value={certNumber} onChange={e => setCertNumber(e.target.value)} className={inp} placeholder="e.g. TSSA-123456" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={lbl}>Issued Date</label>
              <input type="date" value={issuedDate} onChange={e => setIssuedDate(e.target.value)} className={inp} />
            </div>
            <div>
              <label className={lbl}>Expiry Date</label>
              <input type="date" value={expiryDate} onChange={e => setExpiryDate(e.target.value)} className={inp} />
            </div>
          </div>
          <div>
            <label className={lbl}>Notes (optional)</label>
            <input value={notes} onChange={e => setNotes(e.target.value)} className={inp} placeholder="Issuing body, location, etc." />
          </div>
        </div>
        <div className="flex justify-end gap-2 px-5 py-4 border-t border-slate-100 dark:border-slate-700">
          <button onClick={onClose} className="px-4 py-2 text-sm text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 rounded-lg">Cancel</button>
          <button onClick={handleSave} disabled={saving}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg">
            {saving && <Loader2 size={13} className="animate-spin"/>}
            {saving ? 'Saving…' : 'Add Certificate'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Main page ─────────────────────────────────────────────────────────────────
function ProfileContent() {
  const router       = useRouter()
  const searchParams = useSearchParams()
  const { confirm, dialog: confirmDialog } = useConfirm()

  const [currentUser,  setCurrentUser]  = useState<Profile | null>(null)
  const [profile,      setProfile]      = useState<Profile | null>(null)
  const [certs,        setCerts]        = useState<Cert[]>([])
  const [loading,      setLoading]      = useState(true)
  const [saving,       setSaving]       = useState(false)
  const [saved,        setSaved]        = useState(false)
  const [showAddCert,  setShowAddCert]  = useState(false)
  const [deletingCert, setDeletingCert] = useState<string | null>(null)

  // Editable apprenticeship fields
  const [editStartDate, setEditStartDate] = useState('')
  const [editHours,     setEditHours]     = useState(0)
  const [editYear,      setEditYear]      = useState(1)
  const [editingAppr,   setEditingAppr]   = useState(false)

  // Feedback
  const [feedback,        setFeedback]         = useState<FeedbackEntry[]>([])
  const [writtenFeedback, setWrittenFeedback]  = useState<WrittenFeedbackEntry[]>([])
  const [reviewsTab,      setReviewsTab]       = useState<'received' | 'written'>('received')
  const [fbStrengths,     setFbStrengths]      = useState('')
  const [fbImprovements,  setFbImprovements]   = useState('')
  const [fbNotes,         setFbNotes]          = useState('')
  const [fbPeriod,        setFbPeriod]         = useState('')
  const [fbRatingOverall, setFbRatingOverall]  = useState(0)
  const [fbRatingTech,    setFbRatingTech]     = useState(0)
  const [fbRatingSafety,  setFbRatingSafety]   = useState(0)
  const [fbRatingTeam,    setFbRatingTeam]     = useState(0)
  const [submittingFb,    setSubmittingFb]     = useState(false)
  const [fbError,         setFbError]          = useState('')

  const isAdmin      = ['admin', 'manager', 'journeyman'].includes(currentUser?.role ?? '')
  const targetUserId = searchParams.get('userId')
  const isOwnProfile = !targetUserId || targetUserId === currentUser?.id
  const canEdit      = isAdmin || isOwnProfile

  const load = useCallback(async (userId?: string) => {
    const sb = getSupabaseBrowser()
    const { data: { user } } = await sb.auth.getUser()
    if (!user) { router.push('/login'); return }

    const { data: me } = await sb.from('users').select('id,name,email,role,status,created_at,mentor_id,apprenticeship_start_date,apprenticeship_hours,apprenticeship_year').eq('id', user.id).single()
    if (!me) { router.push('/login'); return }
    setCurrentUser(me as Profile)

    const targetId = userId ?? targetUserId ?? user.id
    const meRole = (me as Profile).role
    const isManagerSelf = ['admin', 'manager'].includes(meRole) && targetId === user.id

    const [res, fbRes, writtenRes] = await Promise.all([
      fetch(`/api/profile?userId=${targetId}`),
      fetch(`/api/feedback?userId=${targetId}`),
      isManagerSelf ? fetch('/api/feedback?writtenBy=me') : Promise.resolve(null),
    ])
    if (!res.ok) { router.push('/dashboard'); return }
    const data = await res.json()
    setProfile(data.profile as Profile)
    setCerts(data.certs as Cert[])
    if (fbRes.ok) setFeedback(await fbRes.json())
    if (writtenRes?.ok) setWrittenFeedback(await writtenRes.json())

    // Init editable fields
    setEditStartDate(data.profile.apprenticeship_start_date ?? '')
    setEditHours(data.profile.apprenticeship_hours ?? 0)
    setEditYear(data.profile.apprenticeship_year ?? 1)
    setLoading(false)
  }, [router, targetUserId])

  useEffect(() => { load() }, [load])

  async function saveApprenticeshipInfo() {
    if (!profile) return
    setSaving(true)
    const res = await fetch('/api/profile', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: profile.id,
        apprenticeship_start_date: editStartDate || null,
        apprenticeship_hours: editHours,
        apprenticeship_year: editYear,
      }),
    })
    setSaving(false)
    if (res.ok) {
      const updated = await res.json()
      setProfile(p => p ? { ...p, ...updated } : p)
      setSaved(true); setTimeout(() => setSaved(false), 2000)
      setEditingAppr(false)
    }
  }

  async function submitFeedback() {
    if (!profile || (!fbStrengths.trim() && !fbNotes.trim()) || submittingFb) return
    setSubmittingFb(true)
    setFbError('')
    const res = await fetch('/api/feedback', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        technicianId:     profile.id,
        content:          fbNotes       || null,
        strengths:        fbStrengths   || null,
        improvements:     fbImprovements || null,
        review_period:    fbPeriod      || null,
        rating_overall:   fbRatingOverall  || null,
        rating_technical: fbRatingTech     || null,
        rating_safety:    fbRatingSafety   || null,
        rating_teamwork:  fbRatingTeam     || null,
      }),
    })
    setSubmittingFb(false)
    if (!res.ok) { const j = await res.json(); setFbError(j.error ?? 'Failed to save'); return }
    const entry = await res.json()
    setFeedback(prev => [entry, ...prev])
    setFbStrengths(''); setFbImprovements(''); setFbNotes('')
    setFbPeriod(''); setFbRatingOverall(0); setFbRatingTech(0)
    setFbRatingSafety(0); setFbRatingTeam(0)
  }

  async function deleteCert(certId: string) {
    if (!await confirm({ message: 'Remove this certificate?', confirmLabel: 'Remove', danger: true })) return
    setDeletingCert(certId)
    await fetch(`/api/tech-certs/${certId}`, { method: 'DELETE' })
    setCerts(prev => prev.filter(c => c.id !== certId))
    setDeletingCert(null)
  }

  if (loading) return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center">
      <Loader2 size={24} className="animate-spin text-blue-500"/>
    </div>
  )
  if (!profile) return null

  const annDate    = profile.apprenticeship_start_date ? nextAnniversary(profile.apprenticeship_start_date) : null
  const annDays    = annDate ? daysUntil(annDate) : null
  const tenure     = profile.apprenticeship_start_date ? yearsMonths(profile.apprenticeship_start_date) : null
  const isApprentice = profile.role === 'apprentice'

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      {confirmDialog}
      {showAddCert && (
        <AddCertModal
          userId={profile.id}
          onSave={cert => { setCerts(p => [cert, ...p]); setShowAddCert(false) }}
          onClose={() => setShowAddCert(false)}
        />
      )}

      <PageHeader title="Profile" />

      <div className="max-w-2xl mx-auto px-4 md:px-6 py-6 md:py-8 space-y-5">

        {/* ── Identity card ──────────────────────────────────────────────────── */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl p-5 md:p-6">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-2xl bg-blue-600 flex items-center justify-center flex-shrink-0 select-none">
              <span className="text-xl font-bold text-white tracking-tight">
                {(profile.name || profile.email)
                  .split(/\s+/)
                  .filter(Boolean)
                  .map((w: string) => w[0])
                  .join('')
                  .slice(0, 2)
                  .toUpperCase()
                }
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-xl font-bold text-slate-800 dark:text-slate-200 truncate">{profile.name || profile.email}</h1>
              <p className="text-sm text-slate-500 dark:text-slate-400 truncate">{profile.email}</p>
              <div className="flex items-center gap-2 mt-2 flex-wrap">
                <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${ROLE_COLOURS[profile.role] ?? 'bg-slate-100 text-slate-600'}`}>
                  {ROLE_LABELS[profile.role] ?? profile.role}
                </span>
                {profile.status === 'inactive' && (
                  <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-red-100 text-red-700">Inactive</span>
                )}
                <span className="text-xs text-slate-400 dark:text-slate-500">Member since {fmt(profile.created_at)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* ── Apprenticeship tracker ─────────────────────────────────────────── */}
        {(isApprentice || isAdmin) && (
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl p-5 md:p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                <GraduationCap size={16} className="text-blue-500"/>
                Apprenticeship
              </h2>
              {canEdit && !editingAppr && (
                <button onClick={() => setEditingAppr(true)}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg">
                  <Pencil size={12}/> Edit
                </button>
              )}
              {editingAppr && (
                <div className="flex items-center gap-1.5">
                  <button onClick={() => setEditingAppr(false)} className="p-1.5 text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 rounded-lg"><X size={14}/></button>
                  <button onClick={saveApprenticeshipInfo} disabled={saving}
                    className="flex items-center gap-1 px-3 py-1.5 text-xs bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg font-medium">
                    {saving ? <Loader2 size={12} className="animate-spin"/> : <Check size={12}/>}
                    {saved ? 'Saved!' : 'Save'}
                  </button>
                </div>
              )}
            </div>

            {editingAppr ? (
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Start Date</label>
                  <input type="date" value={editStartDate} onChange={e => setEditStartDate(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-800 dark:text-slate-100"/>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Apprenticeship Year</label>
                    <select value={editYear} onChange={e => setEditYear(Number(e.target.value))}
                      className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-800 dark:text-slate-100">
                      {[1,2,3,4,5].map(y => <option key={y} value={y}>Year {y}</option>)}
                      <option value={6}>Journeyman</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Hours Logged</label>
                    <input type="number" min={0} value={editHours} onChange={e => setEditHours(Number(e.target.value))}
                      className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-800 dark:text-slate-100 dark:placeholder-slate-500"
                      placeholder="Total hours"/>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                {/* Year badge + hours */}
                <div className="flex items-center gap-3">
                  <div className="flex-1 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100 rounded-xl px-4 py-3">
                    <p className="text-xs text-blue-600 font-medium uppercase tracking-wide mb-0.5">Current Year</p>
                    <p className="text-2xl font-bold text-blue-700">{YEAR_LABELS[profile.apprenticeship_year] ?? 'Year 1'}</p>
                  </div>
                  <div className="flex-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3">
                    <p className="text-xs text-slate-500 dark:text-slate-400 font-medium uppercase tracking-wide mb-0.5">Hours Logged</p>
                    <p className="text-2xl font-bold text-slate-800 dark:text-slate-200">{profile.apprenticeship_hours.toLocaleString()}</p>
                  </div>
                </div>

                {/* Hours progress bar (9000 hrs total for 313A) */}
                {profile.apprenticeship_hours > 0 && (
                  <div>
                    <div className="flex justify-between text-xs text-slate-500 dark:text-slate-400 mb-1">
                      <span>{profile.apprenticeship_hours.toLocaleString()} hrs</span>
                      <span>9,000 hrs total</span>
                    </div>
                    <div className="h-2 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-blue-500 to-indigo-400 rounded-full transition-all"
                        style={{ width: `${Math.min(100, (profile.apprenticeship_hours / 9000) * 100)}%` }}/>
                    </div>
                  </div>
                )}

                {/* Start date + anniversary */}
                {profile.apprenticeship_start_date ? (
                  <div className="grid grid-cols-2 gap-3 pt-1">
                    <div className="flex items-start gap-2">
                      <Calendar size={14} className="text-slate-400 mt-0.5 flex-shrink-0"/>
                      <div>
                        <p className="text-[10px] text-slate-500 dark:text-slate-400 uppercase tracking-wide">Start Date</p>
                        <p className="text-sm font-medium text-slate-700 dark:text-slate-300">{fmt(profile.apprenticeship_start_date)}</p>
                        {tenure && <p className="text-xs text-slate-400 dark:text-slate-500">{tenure} ago</p>}
                      </div>
                    </div>
                    {annDate && (
                      <div className="flex items-start gap-2">
                        <Clock size={14} className={`mt-0.5 flex-shrink-0 ${annDays !== null && annDays <= 30 ? 'text-amber-500' : 'text-slate-400 dark:text-slate-500'}`}/>
                        <div>
                          <p className="text-[10px] text-slate-500 dark:text-slate-400 uppercase tracking-wide">Anniversary</p>
                          <p className="text-sm font-medium text-slate-700 dark:text-slate-300">{fmt(annDate)}</p>
                          <p className={`text-xs font-medium ${annDays !== null && annDays <= 30 ? 'text-amber-600 dark:text-amber-400' : 'text-slate-400 dark:text-slate-500'}`}>
                            {annDays === 0 ? '🎉 Today!' : annDays !== null && annDays <= 30 ? `${annDays} days away` : `in ${annDays} days`}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-xs text-slate-400 dark:text-slate-500 italic">No start date set — click Edit to add one.</p>
                )}
              </div>
            )}
          </div>
        )}

        {/* ── Certificates & Tickets ─────────────────────────────────────────── */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl p-5 md:p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-2">
              <Award size={16} className="text-amber-500"/>
              Certificates &amp; Tickets
            </h2>
            {canEdit && (
              <button onClick={() => setShowAddCert(true)}
                className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/50 rounded-lg border border-blue-200 dark:border-blue-800 font-medium">
                <Plus size={12}/> Add
              </button>
            )}
          </div>

          {certs.length === 0 ? (
            <p className="text-xs text-slate-400 dark:text-slate-500 text-center py-4">No certificates added yet.</p>
          ) : (
            <div className="space-y-2">
              {certs.map(cert => {
                const expired = cert.expiry_date && new Date(cert.expiry_date) < new Date()
                const expiringSoon = cert.expiry_date && !expired && daysUntil(cert.expiry_date) <= 60
                return (
                  <div key={cert.id} className="flex items-center gap-3 px-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl">
                    <Award size={16} className={expired ? 'text-red-400' : expiringSoon ? 'text-amber-400' : 'text-emerald-500'}/>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">{cert.cert_subtype}</span>
                        <span className="text-xs text-slate-500 dark:text-slate-400">{cert.cert_type}</span>
                        {cert.cert_number && <span className="text-xs text-slate-400 dark:text-slate-500">#{cert.cert_number}</span>}
                        {expired && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-red-100 dark:bg-red-950/50 text-red-600 dark:text-red-400 font-semibold">Expired</span>}
                        {expiringSoon && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950/50 text-amber-700 dark:text-amber-400 font-semibold">Expiring soon</span>}
                      </div>
                      <div className="flex items-center gap-3 mt-0.5">
                        {cert.issued_date && <span className="text-[10px] text-slate-400 dark:text-slate-500">Issued {fmt(cert.issued_date)}</span>}
                        {cert.expiry_date && <span className={`text-[10px] ${expired ? 'text-red-500 dark:text-red-400' : expiringSoon ? 'text-amber-600 dark:text-amber-400' : 'text-slate-400 dark:text-slate-500'}`}>Expires {fmt(cert.expiry_date)}</span>}
                        {cert.notes && <span className="text-[10px] text-slate-400 dark:text-slate-500">{cert.notes}</span>}
                      </div>
                    </div>
                    {canEdit && (
                      <button onClick={() => deleteCert(cert.id)} disabled={deletingCert === cert.id}
                        className="p-1.5 text-slate-300 dark:text-slate-600 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/50 rounded-lg transition-colors disabled:opacity-40 flex-shrink-0">
                        {deletingCert === cert.id ? <Loader2 size={13} className="animate-spin"/> : <Trash2 size={13}/>}
                      </button>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* ── Training quick link — own profile, all roles ──────────────────── */}
        {isOwnProfile && (() => {
          const isField = ['apprentice', 'journeyman'].includes(profile.role)
          return (
            <button
              onClick={() => router.push('/apprentice/training')}
              className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl p-4 flex items-center gap-3 hover:border-blue-300 dark:hover:border-blue-700 hover:bg-blue-50/30 dark:hover:bg-blue-950/20 transition-colors text-left"
            >
              <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-900/30 flex items-center justify-center flex-shrink-0">
                <GraduationCap size={18} className="text-amber-600 dark:text-amber-400"/>
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">{isField ? 'My Training' : 'Training'}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {isField
                    ? 'View your training modules, progress, and assigned tasks'
                    : 'Track apprentice courses, progress, and 313A task stats'}
                </p>
              </div>
              <ChevronRight size={16} className="text-slate-400 dark:text-slate-500 flex-shrink-0"/>
            </button>
          )
        })()}

        {/* ── Reviews & Feedback ───────────────────────────────────────────── */}
        {(isOwnProfile || ['admin', 'manager'].includes(currentUser?.role ?? '')) && (
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800 flex items-center gap-2">
              <MessageCircle size={15} className="text-slate-400 dark:text-slate-500"/>
              <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">Reviews &amp; Feedback</p>
              {reviewsTab === 'received' && feedback.length > 0 && (
                <span className="ml-auto text-[10px] font-medium text-slate-400 dark:text-slate-500">{feedback.length} review{feedback.length > 1 ? 's' : ''}</span>
              )}
              {reviewsTab === 'written' && writtenFeedback.length > 0 && (
                <span className="ml-auto text-[10px] font-medium text-slate-400 dark:text-slate-500">{writtenFeedback.length} review{writtenFeedback.length > 1 ? 's' : ''}</span>
              )}
            </div>

            {/* Received / Written tabs — manager's own profile only */}
            {isOwnProfile && ['admin', 'manager'].includes(currentUser?.role ?? '') && (
              <div className="px-4 pt-3 flex gap-1 border-b border-slate-100 dark:border-slate-800">
                {([
                  { key: 'received', label: 'Reviews I’ve Received' },
                  { key: 'written',  label: 'Reviews I’ve Written' },
                ] as { key: 'received' | 'written'; label: string }[]).map(tab => (
                  <button
                    key={tab.key}
                    onClick={() => setReviewsTab(tab.key)}
                    className={`px-3 py-1.5 -mb-px text-xs font-medium border-b-2 transition-colors ${
                      reviewsTab === tab.key
                        ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                        : 'border-transparent text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            )}

            {/* Manager write form */}
            {reviewsTab === 'received' && !isOwnProfile && ['admin', 'manager'].includes(currentUser?.role ?? '') && (
              <div className="p-4 border-b border-slate-100 dark:border-slate-800 space-y-4">
                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">New Review</p>

                {/* Review period */}
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Review Period <span className="font-normal text-slate-400">(optional)</span></label>
                  <input
                    type="text"
                    value={fbPeriod}
                    onChange={e => setFbPeriod(e.target.value)}
                    placeholder="e.g. Q2 2026, May 2026"
                    className="w-full text-sm px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-500/20 transition-colors"
                  />
                </div>

                {/* Star ratings */}
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-2">Ratings <span className="font-normal text-slate-400">(optional)</span></label>
                  <div className="grid grid-cols-2 gap-3">
                    {([
                      { label: 'Overall',       value: fbRatingOverall, set: setFbRatingOverall },
                      { label: 'Technical',     value: fbRatingTech,    set: setFbRatingTech },
                      { label: 'Safety',        value: fbRatingSafety,  set: setFbRatingSafety },
                      { label: 'Teamwork',      value: fbRatingTeam,    set: setFbRatingTeam },
                    ] as { label: string; value: number; set: (n: number) => void }[]).map(r => (
                      <div key={r.label}>
                        <p className="text-[10px] text-slate-500 dark:text-slate-400 mb-1">{r.label}</p>
                        <div className="flex gap-1">
                          {[1,2,3,4,5].map(n => (
                            <button
                              key={n}
                              type="button"
                              onClick={() => r.set(r.value === n ? 0 : n)}
                              className={`text-lg leading-none transition-colors ${n <= r.value ? 'text-amber-400' : 'text-slate-200 dark:text-slate-700 hover:text-amber-300'}`}
                            >★</button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Strengths */}
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Strengths</label>
                  <textarea
                    value={fbStrengths}
                    onChange={e => setFbStrengths(e.target.value)}
                    placeholder="What is this technician doing well?"
                    rows={2}
                    className="w-full text-sm px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-500/20 resize-none transition-colors"
                  />
                </div>

                {/* Areas for improvement */}
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Areas for Improvement</label>
                  <textarea
                    value={fbImprovements}
                    onChange={e => setFbImprovements(e.target.value)}
                    placeholder="What should this technician work on?"
                    rows={2}
                    className="w-full text-sm px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-500/20 resize-none transition-colors"
                  />
                </div>

                {/* Additional notes */}
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Additional Notes <span className="font-normal text-slate-400">(optional)</span></label>
                  <textarea
                    value={fbNotes}
                    onChange={e => setFbNotes(e.target.value)}
                    placeholder="Any other comments…"
                    rows={2}
                    className="w-full text-sm px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-500/20 resize-none transition-colors"
                  />
                </div>

                {fbError && <p className="text-xs text-red-500">{fbError}</p>}
                <div className="flex justify-end">
                  <button
                    onClick={submitFeedback}
                    disabled={(!fbStrengths.trim() && !fbNotes.trim()) || submittingFb}
                    className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
                  >
                    {submittingFb ? <Loader2 size={11} className="animate-spin"/> : <Send size={11}/>}
                    Submit Review
                  </button>
                </div>
              </div>
            )}

            {/* Feedback list — received */}
            {reviewsTab === 'received' && (
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {feedback.length === 0 ? (
                  <p className="px-4 py-6 text-xs text-slate-400 dark:text-slate-500 text-center">No reviews yet.</p>
                ) : feedback.map(f => (
                  <div key={f.id} className="p-4 space-y-3">
                    {/* Header */}
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                          {f.manager?.name ?? f.manager?.email ?? 'Manager'}
                        </p>
                        <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">
                          {f.review_period ? `${f.review_period} · ` : ''}
                          {new Date(f.created_at).toLocaleDateString('en-CA', { year: 'numeric', month: 'short', day: 'numeric' })}
                        </p>
                      </div>
                      {/* Overall rating badge */}
                      {f.rating_overall && (
                        <div className="flex-shrink-0 flex items-center gap-0.5 bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-800 rounded-lg px-2 py-1">
                          <span className="text-amber-500 text-xs">★</span>
                          <span className="text-xs font-bold text-amber-700 dark:text-amber-400">{f.rating_overall}/5</span>
                        </div>
                      )}
                    </div>

                    <FeedbackBody f={f}/>
                  </div>
                ))}
              </div>
            )}

            {/* Feedback list — written by this manager */}
            {reviewsTab === 'written' && (
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {writtenFeedback.length === 0 ? (
                  <p className="px-4 py-6 text-xs text-slate-400 dark:text-slate-500 text-center">You haven&apos;t written any reviews yet.</p>
                ) : writtenFeedback.map(f => (
                  <div key={f.id} className="p-4 space-y-3">
                    {/* Header */}
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        {f.technician ? (
                          <button
                            onClick={() => router.push(`/profile?userId=${f.technician?.id}`)}
                            className="text-xs font-semibold text-slate-700 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 hover:underline"
                          >
                            {f.technician.name ?? f.technician.email}
                          </button>
                        ) : (
                          <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">Technician</p>
                        )}
                        <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">
                          {f.review_period ? `${f.review_period} · ` : ''}
                          {new Date(f.created_at).toLocaleDateString('en-CA', { year: 'numeric', month: 'short', day: 'numeric' })}
                        </p>
                      </div>
                      {/* Overall rating badge */}
                      {f.rating_overall && (
                        <div className="flex-shrink-0 flex items-center gap-0.5 bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-800 rounded-lg px-2 py-1">
                          <span className="text-amber-500 text-xs">★</span>
                          <span className="text-xs font-bold text-amber-700 dark:text-amber-400">{f.rating_overall}/5</span>
                        </div>
                      )}
                    </div>

                    <FeedbackBody f={f}/>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── Settings quick link ───────────────────────────────────────────── */}
        {isOwnProfile && (
          <button
            onClick={() => router.push('/settings')}
            className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl p-4 flex items-center gap-3 hover:border-blue-300 dark:hover:border-blue-700 hover:bg-blue-50/30 dark:hover:bg-blue-950/20 transition-colors text-left"
          >
            <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center flex-shrink-0">
              <Settings size={18} className="text-slate-500 dark:text-slate-400"/>
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">Settings</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">Update your display name and change your password</p>
            </div>
            <ChevronRight size={16} className="text-slate-400 dark:text-slate-500 flex-shrink-0"/>
          </button>
        )}

        {/* ── Replay app tour ───────────────────────────────────────────────── */}
        {isOwnProfile && (
          <button
            onClick={() => router.push('/dashboard?tour=1')}
            className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl p-4 flex items-center gap-3 hover:border-blue-300 dark:hover:border-blue-700 hover:bg-blue-50/30 dark:hover:bg-blue-950/20 transition-colors text-left"
          >
            <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center flex-shrink-0">
              <Compass size={18} className="text-slate-500 dark:text-slate-400"/>
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">Replay app tour</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">See the getting-started walkthrough again</p>
            </div>
            <ChevronRight size={16} className="text-slate-400 dark:text-slate-500 flex-shrink-0"/>
          </button>
        )}

      </div>
    </div>
  )
}

export default function ProfilePage() {
  return (
    <PageShell>
      <Suspense fallback={<div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center"><Loader2 size={24} className="animate-spin text-blue-500"/></div>}>
        <ProfileContent/>
      </Suspense>
    </PageShell>
  )
}
