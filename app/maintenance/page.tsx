'use client'
import { useRouter, useSearchParams } from 'next/navigation'
import { Snowflake, Wind, ClipboardList, ArrowLeft, Clock } from 'lucide-react'
import { useEffect, useState, Suspense } from 'react'

interface RecentReport {
  id: string
  store_name: string
  performed_at: string
  report_type?: string
  issue_explanation?: string
  technician?: { name: string }
}

function MaintenanceHubContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const equipmentId = searchParams.get('equipmentId')
  const equipmentName = searchParams.get('equipmentName') ?? ''
  const [recent, setRecent] = useState<{ pm: RecentReport[]; individual: RecentReport[] }>({ pm: [], individual: [] })

  useEffect(() => {
    const params = equipmentId ? `?equipmentId=${equipmentId}` : ''
    Promise.all([
      fetch(`/api/pm-reports${params}`).then(r => r.ok ? r.json() : []),
      fetch(`/api/individual-reports${params}`).then(r => r.ok ? r.json() : []),
    ]).then(([pm, individual]) => setRecent({ pm: pm.slice(0, 5), individual: individual.slice(0, 5) }))
  }, [equipmentId])

  const nav = (path: string) => {
    const params = new URLSearchParams()
    if (equipmentId) params.set('equipmentId', equipmentId)
    if (equipmentName) params.set('equipmentName', equipmentName)
    router.push(`${path}?${params}`)
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="bg-white border-b border-slate-200 px-6 py-4 flex items-center gap-3">
        <button onClick={() => router.push('/dashboard')} className="text-slate-400 hover:text-slate-600">
          <ArrowLeft size={18} />
        </button>
        <div className="flex items-baseline gap-0.5">
          <span className="text-lg font-bold text-blue-600">Cold</span>
          <span className="text-lg font-bold text-slate-800">IQ</span>
        </div>
        <span className="text-slate-400">/</span>
        <span className="text-sm font-medium text-slate-700">Maintenance Forms</span>
        {equipmentName && (
          <>
            <span className="text-slate-400">/</span>
            <span className="text-sm text-slate-500">{equipmentName}</span>
          </>
        )}
      </div>

      <div className="max-w-4xl mx-auto px-6 py-8">
        <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-3">Create New Report</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-10">
          <button
            onClick={() => nav('/maintenance/refrigeration-pm')}
            className="bg-white border border-slate-200 rounded-xl p-5 text-left hover:border-blue-300 hover:shadow-md transition-all group"
          >
            <Snowflake size={28} className="text-blue-500 mb-3 group-hover:scale-110 transition-transform" />
            <h3 className="font-semibold text-slate-800 mb-1">Refrigeration PM</h3>
            <p className="text-xs text-slate-500">Rack & conventional unit checklist, pressures, oil levels</p>
          </button>

          <button
            onClick={() => nav('/maintenance/hvac-pm')}
            className="bg-white border border-slate-200 rounded-xl p-5 text-left hover:border-blue-300 hover:shadow-md transition-all group"
          >
            <Wind size={28} className="text-emerald-500 mb-3 group-hover:scale-110 transition-transform" />
            <h3 className="font-semibold text-slate-800 mb-1">HVAC PM</h3>
            <p className="text-xs text-slate-500">Heating & cooling preventive maintenance checklist</p>
          </button>

          <button
            onClick={() => nav('/maintenance/individual-report')}
            className="bg-white border border-slate-200 rounded-xl p-5 text-left hover:border-blue-300 hover:shadow-md transition-all group"
          >
            <ClipboardList size={28} className="text-purple-500 mb-3 group-hover:scale-110 transition-transform" />
            <h3 className="font-semibold text-slate-800 mb-1">Individual Report</h3>
            <p className="text-xs text-slate-500">Service call report with issue, steps taken, parts & photos</p>
          </button>
        </div>

        {(recent.pm.length > 0 || recent.individual.length > 0) && (
          <>
            <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
              <Clock size={12} /> Recent Reports
            </h2>
            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
              {[...recent.pm.map(r => ({ ...r, kind: 'pm' as const })), ...recent.individual.map(r => ({ ...r, kind: 'individual' as const }))]
                .sort((a, b) => new Date(b.performed_at).getTime() - new Date(a.performed_at).getTime())
                .slice(0, 8)
                .map((r, i) => (
                  <button
                    key={r.id}
                    onClick={() => router.push(`/maintenance/${r.kind === 'pm' ? (r.report_type === 'hvac' ? 'hvac-pm' : 'refrigeration-pm') : 'individual-report'}?id=${r.id}`)}
                    className={`w-full text-left px-5 py-3.5 flex items-center justify-between hover:bg-slate-50 transition-colors ${i > 0 ? 'border-t border-slate-100' : ''}`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-2 h-2 rounded-full flex-shrink-0 ${r.kind === 'individual' ? 'bg-purple-400' : r.report_type === 'hvac' ? 'bg-emerald-400' : 'bg-blue-400'}`} />
                      <div>
                        <p className="text-sm font-medium text-slate-800">{r.store_name}</p>
                        <p className="text-xs text-slate-400">
                          {r.kind === 'individual' ? 'Individual Report' : r.report_type === 'hvac' ? 'HVAC PM' : 'Refrigeration PM'}
                          {r.technician?.name ? ` · ${r.technician.name}` : ''}
                        </p>
                      </div>
                    </div>
                    <span className="text-xs text-slate-400">{new Date(r.performed_at).toLocaleDateString()}</span>
                  </button>
                ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}

export default function MaintenanceHubPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-50 flex items-center justify-center text-sm text-slate-400">Loading…</div>}>
      <MaintenanceHubContent />
    </Suspense>
  )
}
