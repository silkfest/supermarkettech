'use client'
import { useEffect, useState, use } from 'react'
import { useRouter } from 'next/navigation'
import { getSupabaseBrowser } from '@/lib/supabase/client'
import {
  ArrowLeft, Shield, Plus, Trash2, CheckCircle, AlertTriangle,
  Loader2, Edit2, X, Save, ClipboardList, Wrench, UserCircle,
} from 'lucide-react'

type Role   = 'admin' | 'manager' | 'journeyman' | 'apprentice'
type Status = 'pending' | 'active' | 'suspended'

interface UserRow { id: string; email: string; name: string; role: Role; status: Status; created_at: string }
interface Cert {
  id: string; user_id: string; cert_type: string; cert_subtype: string
  cert_number: string; issued_date: string | null; expiry_date: string | null; notes: string
}
interface Report { id: string; store_name: string; performed_at: string; report_type?: string }

const CERT_TYPES = ['EPA 608', 'NATE', 'State License', 'ESCO', 'OSHA 10', 'OSHA 30', 'Other']
const EPA_SUBTYPES = ['Type I', 'Type II', 'Type III', 'Universal']
const ROLE_LABEL: Record<Role, string> = { admin: 'Admin', manager: 'Manager', journeyman: 'Journeyman', apprentice: 'Apprentice' }
const ROLE_COLOR: Record<Role, string> = {
  admin: 'bg-purple-100 text-purple-700', manager: 'bg-blue-100 text-blue-700',
  journeyman: 'bg-emerald-100 text-emerald-700', apprentice: 'bg-amber-100 text-amber-700',
}

const inputCls = 'w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white'
const labelCls = 'block text-xs font-medium text-slate-600 mb-1'

function certBadge(c: Cert) {
  if (!c.expiry_date) return null
  const now = new Date()
  const exp = new Date(c.expiry_date)
  const soon = new Date(); soon.setDate(soon.getDate() + 90)
  if (exp < now) return <span className="flex items-center gap-1 text-red-600 text-[10px] font-semibold"><AlertTriangle size={10}/>Expired</span>
  if (exp < soon) return <span className="flex items-center gap-1 text-amber-600 text-[10px] font-semibold"><AlertTriangle size={10}/>Expiring soon</span>
  return <span className="flex items-center gap-1 text-emerald-600 text-[10px] font-semibold"><CheckCircle size={10}/>Valid</span>
}

const emptyForm = { certType: 'EPA 608', certSubtype: 'Universal', certNumber: '', issuedDate: '', expiryDate: '', notes: '' }

export default function TechnicianProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()

  const [tech, setTech]     = useState<UserRow | null>(null)
  const [certs, setCerts]   = useState<Cert[]>([])
  const [reports, setReports] = useState<{ pm: Report[]; individual: Report[] }>({ pm: [], individual: [] })
  const [loading, setLoading] = useState(true)

  // Cert form
  const [showForm, setShowForm]   = useState(false)
  const [form, setForm]           = useState(emptyForm)
  const [editId, setEditId]       = useState<string | null>(null)
  const [saving, setSaving]       = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }))

  useEffect(() => {
    async function load() {
      const sb = getSupabaseBrowser()
      const { data: { user } } = await sb.auth.getUser()
      if (!user) { router.push('/login'); return }
      const { data: me } = await sb.from('users').select('role').eq('id', user.id).single()
      if (!me || (me as { role: string }).role !== 'admin') { router.push('/dashboard'); return }

      const [{ data: techData }, { data: certData }, { data: pmData }, { data: irData }] = await Promise.all([
        sb.from('users').select('*').eq('id', id).single(),
        sb.from('tech_certifications').select('*').eq('user_id', id).order('created_at', { ascending: false }),
        sb.from('pm_reports').select('id,store_name,performed_at,report_type')
          .contains('technician', { id })
          .order('performed_at', { ascending: false }).limit(10),
        sb.from('individual_reports').select('id,store_name,performed_at')
          .contains('technician', { id })
          .order('performed_at', { ascending: false }).limit(10),
      ])

      setTech((techData as unknown as UserRow) ?? null)
      setCerts((certData ?? []) as Cert[])
      setReports({ pm: (pmData ?? []) as Report[], individual: (irData ?? []) as Report[] })
      setLoading(false)
    }
    load()
  }, [id, router])

  async function saveCert() {
    setSaving(true)
    const payload = {
      userId:      id,
      certType:    form.certType,
      certSubtype: form.certSubtype,
      certNumber:  form.certNumber,
      issuedDate:  form.issuedDate || null,
      expiryDate:  form.expiryDate || null,
      notes:       form.notes,
    }
    const url   = editId ? `/api/tech-certs/${editId}` : '/api/tech-certs'
    const method = editId ? 'PATCH' : 'POST'
    const res  = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
    const data = await res.json()
    if (res.ok) {
      if (editId) setCerts(prev => prev.map(c => c.id === editId ? data : c))
      else setCerts(prev => [data, ...prev])
      setShowForm(false); setEditId(null); setForm(emptyForm)
    }
    setSaving(false)
  }

  function startEdit(c: Cert) {
    setForm({ certType: c.cert_type, certSubtype: c.cert_subtype, certNumber: c.cert_number,
      issuedDate: c.issued_date ?? '', expiryDate: c.expiry_date ?? '', notes: c.notes })
    setEditId(c.id); setShowForm(true)
  }

  async function deleteCert(certId: string) {
    setDeletingId(certId)
    await fetch(`/api/tech-certs/${certId}`, { method: 'DELETE' })
    setCerts(prev => prev.filter(c => c.id !== certId))
    setDeletingId(null)
  }

  if (loading) return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center text-sm text-slate-400">Loading…</div>
  )
  if (!tech) return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center text-sm text-slate-400">Tech not found.</div>
  )

  const mergedReports = [
    ...reports.pm.map(r => ({ ...r, kind: 'pm' as const })),
    ...reports.individual.map(r => ({ ...r, kind: 'individual' as const })),
  ].sort((a, b) => new Date(b.performed_at).getTime() - new Date(a.performed_at).getTime()).slice(0, 12)

  return (
    <div className="min-h-[100dvh] bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-4 py-4 flex items-center gap-3 sticky top-0 z-10">
        <button onClick={() => router.back()} className="p-1.5 -ml-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100">
          <ArrowLeft size={20} />
        </button>
        <div className="flex items-baseline gap-0.5">
          <span className="text-lg font-bold text-blue-600">Cold</span>
          <span className="text-lg font-bold text-slate-800">IQ</span>
        </div>
        <span className="text-slate-300">/</span>
        <span className="text-sm font-medium text-slate-700 truncate">{tech.name || tech.email}</span>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">

        {/* Profile card */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 flex items-start gap-4">
          <div className="w-14 h-14 rounded-full bg-slate-100 flex items-center justify-center flex-shrink-0">
            <UserCircle size={32} className="text-slate-400" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <h2 className="text-base font-bold text-slate-800">{tech.name || '—'}</h2>
              <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${ROLE_COLOR[tech.role]}`}>
                {ROLE_LABEL[tech.role]}
              </span>
              {tech.status !== 'active' && (
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-red-100 text-red-600">{tech.status}</span>
              )}
            </div>
            <p className="text-sm text-slate-500">{tech.email}</p>
            <p className="text-xs text-slate-400 mt-1">Member since {new Date(tech.created_at).toLocaleDateString()}</p>
          </div>
          <div className="flex-shrink-0 text-right">
            <p className="text-2xl font-bold text-slate-800">{reports.pm.length + reports.individual.length}</p>
            <p className="text-xs text-slate-400">recent jobs</p>
          </div>
        </div>

        {/* Certifications */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-[11px] font-semibold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
              <Shield size={11} /> Certifications
            </h3>
            {!showForm && (
              <button
                onClick={() => { setShowForm(true); setEditId(null); setForm(emptyForm) }}
                className="flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-700"
              >
                <Plus size={13} /> Add
              </button>
            )}
          </div>

          {/* Cert form */}
          {showForm && (
            <div className="bg-white border border-blue-200 rounded-xl p-4 mb-3 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>Certification Type</label>
                  <select value={form.certType} onChange={e => set('certType', e.target.value)} className={inputCls}>
                    {CERT_TYPES.map(t => <option key={t}>{t}</option>)}
                  </select>
                </div>
                {form.certType === 'EPA 608' && (
                  <div>
                    <label className={labelCls}>EPA Type</label>
                    <select value={form.certSubtype} onChange={e => set('certSubtype', e.target.value)} className={inputCls}>
                      {EPA_SUBTYPES.map(t => <option key={t}>{t}</option>)}
                    </select>
                  </div>
                )}
              </div>
              <div>
                <label className={labelCls}>Cert / License Number</label>
                <input value={form.certNumber} onChange={e => set('certNumber', e.target.value)} placeholder="e.g. 608-12345" className={inputCls} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>Issue Date</label>
                  <input type="date" value={form.issuedDate} onChange={e => set('issuedDate', e.target.value)} className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>Expiry Date</label>
                  <input type="date" value={form.expiryDate} onChange={e => set('expiryDate', e.target.value)} className={inputCls} />
                </div>
              </div>
              <div>
                <label className={labelCls}>Notes <span className="text-slate-400 font-normal">(optional)</span></label>
                <input value={form.notes} onChange={e => set('notes', e.target.value)} placeholder="e.g. Proctored by ESCO" className={inputCls} />
              </div>
              <div className="flex gap-2 pt-1">
                <button
                  onClick={saveCert}
                  disabled={saving}
                  className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {saving ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
                  {editId ? 'Save' : 'Add Cert'}
                </button>
                <button
                  onClick={() => { setShowForm(false); setEditId(null); setForm(emptyForm) }}
                  className="flex items-center gap-1.5 px-4 py-2 bg-slate-100 text-slate-600 text-sm rounded-lg hover:bg-slate-200"
                >
                  <X size={13} /> Cancel
                </button>
              </div>
            </div>
          )}

          {certs.length === 0 && !showForm ? (
            <div className="bg-white border border-dashed border-slate-200 rounded-xl p-6 text-center">
              <Shield size={24} className="text-slate-300 mx-auto mb-2" />
              <p className="text-sm text-slate-400">No certifications on record</p>
              <p className="text-xs text-slate-300 mt-0.5">Add EPA 608, NATE, or other credentials</p>
            </div>
          ) : (
            <div className="space-y-2">
              {certs.map(c => (
                <div key={c.id} className="bg-white border border-slate-200 rounded-xl px-4 py-3 flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-0.5">
                      <p className="text-sm font-semibold text-slate-800">
                        {c.cert_type}{c.cert_subtype ? ` — ${c.cert_subtype}` : ''}
                      </p>
                      {certBadge(c)}
                    </div>
                    {c.cert_number && <p className="text-xs text-slate-500">#{c.cert_number}</p>}
                    <div className="flex gap-3 text-xs text-slate-400 mt-1">
                      {c.issued_date && <span>Issued: {new Date(c.issued_date).toLocaleDateString()}</span>}
                      {c.expiry_date && <span>Expires: {new Date(c.expiry_date).toLocaleDateString()}</span>}
                    </div>
                    {c.notes && <p className="text-xs text-slate-400 mt-0.5 italic">{c.notes}</p>}
                  </div>
                  <div className="flex gap-1 flex-shrink-0">
                    <button onClick={() => startEdit(c)} className="p-1.5 text-slate-300 hover:text-blue-500 rounded-lg hover:bg-slate-50 transition-colors">
                      <Edit2 size={13} />
                    </button>
                    <button
                      onClick={() => deleteCert(c.id)}
                      disabled={deletingId === c.id}
                      className="p-1.5 text-slate-300 hover:text-red-500 rounded-lg hover:bg-red-50 transition-colors disabled:opacity-40"
                    >
                      {deletingId === c.id ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent work */}
        {mergedReports.length > 0 && (
          <div>
            <h3 className="text-[11px] font-semibold text-slate-400 uppercase tracking-widest mb-3">Recent Work</h3>
            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-100">
              {mergedReports.map(r => (
                <button
                  key={r.id}
                  onClick={() => router.push(`/maintenance/${
                    r.kind === 'individual' ? 'individual-report'
                    : r.report_type === 'hvac' ? 'hvac-pm'
                    : 'refrigeration-pm'
                  }?id=${r.id}`)}
                  className="w-full text-left px-4 py-3 flex items-center gap-3 hover:bg-slate-50 transition-colors"
                >
                  <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
                    r.kind === 'individual' ? 'bg-purple-400'
                    : r.report_type === 'hvac' ? 'bg-emerald-400'
                    : 'bg-blue-400'
                  }`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-800 truncate">{r.store_name}</p>
                    <p className="text-xs text-slate-400">
                      {r.kind === 'individual' ? 'Individual Report' : r.report_type === 'hvac' ? 'HVAC PM' : 'Refrigeration PM'}
                    </p>
                  </div>
                  <span className="text-xs text-slate-400 flex-shrink-0">{new Date(r.performed_at).toLocaleDateString()}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
