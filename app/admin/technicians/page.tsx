'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getSupabaseBrowser } from '@/lib/supabase/client'
import { ArrowLeft, Shield, AlertTriangle, CheckCircle, ChevronRight, UserCircle } from 'lucide-react'

type Role   = 'admin' | 'manager' | 'journeyman' | 'apprentice'
type Status = 'pending' | 'active' | 'suspended'

interface UserRow {
  id: string; email: string; name: string; role: Role; status: Status; created_at: string
}
interface Cert {
  id: string; user_id: string; cert_type: string; expiry_date: string | null
}

const ROLE_LABEL: Record<Role, string> = {
  admin: 'Admin', manager: 'Manager', journeyman: 'Journeyman', apprentice: 'Apprentice',
}
const ROLE_COLOR: Record<Role, string> = {
  admin: 'bg-purple-100 text-purple-700',
  manager: 'bg-blue-100 text-blue-700',
  journeyman: 'bg-emerald-100 text-emerald-700',
  apprentice: 'bg-amber-100 text-amber-700',
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

export default function TechniciansPage() {
  const router = useRouter()
  const [users, setUsers]   = useState<UserRow[]>([])
  const [certs, setCerts]   = useState<Cert[]>([])
  const [pmCounts, setPmCounts] = useState<Record<string, number>>({})
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
      setLoading(false)
    }
    load()
  }, [router])

  if (loading) return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center text-sm text-slate-400">Loading…</div>
  )

  const certsByUser: Record<string, Cert[]> = {}
  for (const c of certs) {
    if (!certsByUser[c.user_id]) certsByUser[c.user_id] = []
    certsByUser[c.user_id].push(c)
  }

  const CertIcon = ({ status }: { status: ReturnType<typeof certStatus> }) => {
    if (status === 'none')     return <span className="text-xs text-slate-300">No certs</span>
    if (status === 'expired')  return <AlertTriangle size={14} className="text-red-500" />
    if (status === 'expiring') return <AlertTriangle size={14} className="text-amber-500" />
    return <CheckCircle size={14} className="text-emerald-500" />
  }

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
        <span className="text-sm font-medium text-slate-700">Technicians</span>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6 space-y-3">
        {/* Expired cert alert */}
        {users.some(u => certStatus(certsByUser[u.id] ?? []) === 'expired') && (
          <div className="flex items-center gap-2 px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
            <AlertTriangle size={15} />
            Some technicians have expired certifications — check their profiles.
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {users.map(u => {
            const cs = certStatus(certsByUser[u.id] ?? [])
            const jobCount = pmCounts[u.id] ?? 0
            return (
              <button
                key={u.id}
                onClick={() => router.push(`/admin/technicians/${u.id}`)}
                className="bg-white border border-slate-200 rounded-xl p-4 text-left hover:shadow-md hover:border-blue-200 transition-all active:scale-[0.98] flex items-start gap-3"
              >
                <div className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center flex-shrink-0">
                  <UserCircle size={22} className="text-slate-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <p className="text-sm font-semibold text-slate-800 truncate">{u.name || u.email}</p>
                    <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${ROLE_COLOR[u.role]}`}>
                      {ROLE_LABEL[u.role]}
                    </span>
                    {u.status !== 'active' && (
                      <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-500">
                        {u.status}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-400 truncate mb-2">{u.email}</p>
                  <div className="flex items-center gap-3 text-xs text-slate-500">
                    <span className="flex items-center gap-1">
                      <Shield size={11} />
                      <span>{(certsByUser[u.id] ?? []).length} cert{(certsByUser[u.id] ?? []).length !== 1 ? 's' : ''}</span>
                    </span>
                    <CertIcon status={cs} />
                    {jobCount > 0 && (
                      <span className="text-slate-400">{jobCount} PM{jobCount !== 1 ? 's' : ''}</span>
                    )}
                  </div>
                </div>
                <ChevronRight size={16} className="text-slate-300 flex-shrink-0 mt-1" />
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
