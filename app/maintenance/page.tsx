'use client'
import { useRouter, useSearchParams } from 'next/navigation'
import { Snowflake, Wind, ClipboardList, ArrowLeft, Clock, ChevronRight, Database } from 'lucide-react'
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

  const registryCard = {
    path: '/maintenance/components',
    icon: <Database size={30} className="text-slate-500" />,
    title: 'Component Registry',
    desc: 'All logged compressors and components across every site',
    color: 'hover:border-slate-300',
  }

  const reportTypes = [
    {
      path: '/maintenance/refrigeration-pm',
      icon: <Snowflake size={30} className="text-blue-500" />,
      title: 'Refrigeration PM',
      desc: 'Rack & conventional unit checklist, pressures, oil levels',
      color: 'hover:border-blue-300',
    },
    {
      path: '/maintenance/hvac-pm',
      icon: <Wind size={30} className="text-emerald-500" />,
      title: 'HVAC PM',
      desc: 'Heating & cooling preventive maintenance checklist',
      color: 'hover:border-emerald-300',
    },
    {
      path: '/maintenance/individual-report',
      icon: <ClipboardList size={30} className="text-purple-500" />,
      title: 'Individual Report',
      desc: 'Service call — issue, steps taken, parts & photos',
      color: 'hover:border-purple-300',
    },
  ]

  const mergedRecent = [
    ...recent.pm.map(r => ({ ...r, kind: 'pm' as const })),
    ...recent.individual.map(r => ({ ...r, kind: 'individual' as const })),
  ]
    .sort((a, b) => new Date(b.performed_at).getTime() - new Date(a.performed_at).getTime())
    .slice(0, 8)

  return (
    <div className="min-h-[100dvh] bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-4 py-4 flex items-center gap-3 sticky top-0 z-10">
        <button
          onClick={() => router.push('/dashboard')}
          className="p-1.5 -ml-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
        >
          <ArrowLeft size={20} />
        </button>
        <div className="flex items-baseline gap-0.5">
          <span className="text-lg font-bold text-blue-600">Cold</span>
          <span className="text-lg font-bold text-slate-800">IQ</span>
        </div>
        <span className="text-slate-300">/</span>
        <span className="text-sm font-medium text-slate-700 truncate">
          {equipmentName ? equipmentName : 'Maintenance Forms'}
        </span>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6 pb-10 space-y-6">
        {/* Create new */}
        <div>
          <h2 className="text-[11px] font-semibold text-slate-400 uppercase tracking-widest mb-3">
            Create New Report
          </h2>
          {/* Mobile: vertical list. Desktop: 3-column grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {[...reportTypes, registryCard].map(rt => (
              <button
                key={rt.path}
                onClick={() => router.push(rt.path)}
                className={`bg-white border border-slate-200 rounded-xl p-5 text-left transition-all active:scale-[0.98] hover:shadow-md ${rt.color} flex sm:flex-col items-center sm:items-start gap-4 sm:gap-0`}
              >
                {/* Icon */}
                <div className="flex-shrink-0 sm:mb-3">{rt.icon}</div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-slate-800 text-sm mb-0.5">{rt.title}</h3>
                  <p className="text-xs text-slate-500 leading-relaxed">{rt.desc}</p>
                </div>
                <ChevronRight size={16} className="text-slate-300 flex-shrink-0 sm:hidden" />
              </button>
            ))}
          </div>
        </div>

        {/* Recent reports */}
        {mergedRecent.length > 0 && (
          <div>
            <h2 className="text-[11px] font-semibold text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
              <Clock size={12} /> Recent Reports
            </h2>
            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-100">
              {mergedRecent.map(r => (
                <button
                  key={r.id}
                  onClick={() => router.push(`/maintenance/${r.kind === 'pm' ? (r.report_type === 'hvac' ? 'hvac-pm' : 'refrigeration-pm') : 'individual-report'}?id=${r.id}`)}
                  className="w-full text-left px-4 py-4 flex items-center justify-between hover:bg-slate-50 active:bg-slate-100 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${r.kind === 'individual' ? 'bg-purple-400' : r.report_type === 'hvac' ? 'bg-emerald-400' : 'bg-blue-400'}`} />
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-slate-800 truncate">{r.store_name}</p>
                      <p className="text-xs text-slate-400 truncate">
                        {r.kind === 'individual' ? 'Individual Report' : r.report_type === 'hvac' ? 'HVAC PM' : 'Refrigeration PM'}
                        {r.technician?.name ? ` · ${r.technician.name}` : ''}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                    <span className="text-xs text-slate-400">{new Date(r.performed_at).toLocaleDateString()}</span>
                    <ChevronRight size={14} className="text-slate-300" />
                  </div>
                </button>
              ))}
            </div>
          </div>
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
