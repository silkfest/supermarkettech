'use client'
export const dynamic = 'force-dynamic'

import { useRouter, useSearchParams } from 'next/navigation'
import { Snowflake, Wind, ClipboardList, ArrowLeft, Clock, ChevronRight, Filter, AlertTriangle } from 'lucide-react'
import { useEffect, useState, Suspense } from 'react'

interface RecentReport {
  id: string
  store_name: string
  performed_at: string
  report_type?: string
  issue_explanation?: string
  technician?: { name: string }
}

interface Store {
  id: string
  name: string
}

function MaintenanceHubContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const equipmentId = searchParams.get('equipmentId')
  const equipmentName = searchParams.get('equipmentName') ?? ''

  const [recent, setRecent] = useState<{ pm: RecentReport[]; individual: RecentReport[] }>({ pm: [], individual: [] })
  const [stores, setStores] = useState<Store[]>([])
  const [filterStoreId, setFilterStoreId] = useState('')
  const [filterType, setFilterType] = useState<'all' | 'pm' | 'individual'>('all')
  const [storeError, setStoreError] = useState<string | null>(null)

  // Fetch stores for the filter dropdown
  useEffect(() => {
    fetch('/api/stores')
      .then(r => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`)
        return r.json()
      })
      .then(data => { setStores(data); setStoreError(null) })
      .catch(() => setStoreError('Could not load store list'))
  }, [])

  // Re-fetch reports whenever filters change
  useEffect(() => {
    const params = new URLSearchParams()
    if (equipmentId) params.set('equipmentId', equipmentId)
    if (filterStoreId) params.set('storeId', filterStoreId)
    const qs = params.toString() ? `?${params}` : ''

    const fetchPm = filterType !== 'individual'
      ? fetch(`/api/pm-reports${qs}`).then(r => r.ok ? r.json() : [])
      : Promise.resolve([])

    const fetchInd = filterType !== 'pm'
      ? fetch(`/api/individual-reports${qs}`).then(r => r.ok ? r.json() : [])
      : Promise.resolve([])

    Promise.all([fetchPm, fetchInd]).then(([pm, individual]) =>
      setRecent({ pm: pm.slice(0, 20), individual: individual.slice(0, 20) })
    )
  }, [equipmentId, filterStoreId, filterType])

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
    .slice(0, 24)

  const hasFilters = filterStoreId || filterType !== 'all'

  return (
    <div className="min-h-[100dvh] bg-slate-50 dark:bg-slate-950">
      {/* Header */}
      <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 px-4 py-4 flex items-center gap-3 sticky top-0 z-10">
        <button
          onClick={() => router.push('/dashboard')}
          className="p-1.5 -ml-1 text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
        >
          <ArrowLeft size={20} />
        </button>
        <div className="flex items-baseline gap-0.5">
          <span className="text-lg font-bold text-blue-600">Cold</span>
          <span className="text-lg font-bold text-slate-800 dark:text-slate-200">IQ</span>
        </div>
        <span className="text-slate-300 dark:text-slate-600">/</span>
        <span className="text-sm font-medium text-slate-700 dark:text-slate-300 truncate">
          {equipmentName ? equipmentName : 'Maintenance Forms'}
        </span>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6 pb-10 space-y-6">
        {storeError && (
          <div className="flex items-center gap-2 px-4 py-3 bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 rounded-lg text-xs text-red-700 dark:text-red-400">
            <AlertTriangle size={13} className="flex-shrink-0" />
            <span className="flex-1">{storeError}</span>
            <button onClick={() => setStoreError(null)} className="text-red-400 hover:text-red-600 ml-2 leading-none">×</button>
          </div>
        )}
        {/* Create new */}
        <div>
          <h2 className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-3">
            Create New Report
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {reportTypes.map(rt => (
              <button
                key={rt.path}
                onClick={() => router.push(rt.path)}
                className={`bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-5 text-left transition-all active:scale-[0.98] hover:shadow-md ${rt.color} flex sm:flex-col items-center sm:items-start gap-4 sm:gap-0`}
              >
                <div className="flex-shrink-0 sm:mb-3">{rt.icon}</div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-slate-800 dark:text-slate-200 text-sm mb-0.5">{rt.title}</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">{rt.desc}</p>
                </div>
                <ChevronRight size={16} className="text-slate-300 flex-shrink-0 sm:hidden" />
              </button>
            ))}
          </div>
        </div>

        {/* Recent reports */}
        <div>
          <h2 className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-3 flex items-center gap-2">
            <Clock size={12} /> Recent Reports
          </h2>

          {/* Filter bar */}
          <div className="flex flex-wrap gap-2 mb-3">
            {stores.length > 0 && (
              <div className="relative">
                <Filter size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                <select
                  value={filterStoreId}
                  onChange={e => setFilterStoreId(e.target.value)}
                  className="pl-7 pr-8 py-1.5 text-xs border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none cursor-pointer"
                >
                  <option value="">All stores</option>
                  {stores.map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>
            )}

            <div className="flex rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden bg-white dark:bg-slate-800 text-xs">
              {(['all', 'pm', 'individual'] as const).map(t => (
                <button
                  key={t}
                  onClick={() => setFilterType(t)}
                  className={`px-3 py-1.5 font-medium transition-colors ${
                    filterType === t
                      ? 'bg-slate-800 text-white'
                      : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-900'
                  }`}
                >
                  {t === 'all' ? 'All' : t === 'pm' ? 'PM' : <><span className="sm:hidden">Service</span><span className="hidden sm:inline">Service calls</span></>}
                </button>
              ))}
            </div>

            {hasFilters && (
              <button
                onClick={() => { setFilterStoreId(''); setFilterType('all') }}
                className="px-3 py-1.5 text-xs text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900"
              >
                Clear
              </button>
            )}
          </div>

          {mergedRecent.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {mergedRecent.map(r => {
                const isIndividual = r.kind === 'individual'
                const isHvac = r.report_type === 'hvac'
                const icon = isIndividual
                  ? <ClipboardList size={18} className="text-purple-500" />
                  : isHvac
                    ? <Wind size={18} className="text-emerald-500" />
                    : <Snowflake size={18} className="text-blue-500" />
                const typeLabel = isIndividual ? 'Individual Report' : isHvac ? 'HVAC PM' : 'Refrigeration PM'
                const badgeStyle = isIndividual
                  ? 'bg-purple-50 text-purple-700'
                  : isHvac
                    ? 'bg-emerald-50 text-emerald-700'
                    : 'bg-blue-50 text-blue-700'
                return (
                  <button
                    key={r.id}
                    onClick={() => router.push(`/maintenance/report/${r.id}?type=${r.kind}&report_type=${r.report_type ?? ''}`)}
                    className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-4 text-left hover:border-slate-300 dark:hover:border-slate-600 hover:shadow-md active:scale-[0.98] transition-all flex flex-col gap-2.5 group"
                  >
                    {/* Top row: icon + badge + date */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5">
                        {icon}
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${badgeStyle}`}>
                          {typeLabel}
                        </span>
                      </div>
                      <span className="text-[10px] text-slate-400 dark:text-slate-500 whitespace-nowrap">
                        {new Date(r.performed_at).toLocaleDateString('en-CA', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </span>
                    </div>

                    {/* Store name */}
                    <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 truncate leading-snug">
                      {r.store_name}
                    </p>

                    {/* Issue snippet (individual reports only) */}
                    {isIndividual && r.issue_explanation && (
                      <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed">
                        {r.issue_explanation}
                      </p>
                    )}

                    {/* Footer: technician + chevron */}
                    <div className="flex items-center justify-between mt-auto pt-1">
                      <span className="text-[11px] text-slate-400 dark:text-slate-500 truncate">
                        {r.technician?.name ?? ''}
                      </span>
                      <ChevronRight size={13} className="text-slate-300 group-hover:text-slate-400 flex-shrink-0 transition-colors" />
                    </div>
                  </button>
                )
              })}
            </div>
          ) : (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-10 text-center text-sm text-slate-400 dark:text-slate-500">
              {hasFilters ? 'No reports match the current filters.' : 'No reports yet — create your first one above.'}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default function MaintenanceHubPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center text-sm text-slate-400 dark:text-slate-500">Loading…</div>}>
      <MaintenanceHubContent />
    </Suspense>
  )
}
