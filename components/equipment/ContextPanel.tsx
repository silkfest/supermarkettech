'use client'
import { useState, useEffect, useRef } from 'react'
import { Upload, FileText, Globe, Thermometer, ExternalLink, Loader2, AlertTriangle, RefreshCw, QrCode, X, Plus, Cpu } from 'lucide-react'
import { cn, formatBytes, timeAgo } from '@/lib/utils'
import type { Equipment, Document, SensorSnapshot } from '@/types'

function Reading({ label, value, warn, alarm }: { label: string; value: string; warn?: boolean; alarm?: boolean }) {
  return (
    <div className="flex items-baseline justify-between py-1 border-b border-slate-100 last:border-0">
      <span className="text-[11px] text-slate-400">{label}</span>
      <span className={cn('text-xs font-semibold tabular-nums', alarm ? 'text-red-600' : warn ? 'text-amber-600' : 'text-slate-800')}>
        {value}
      </span>
    </div>
  )
}

interface DocWithUrl extends Document {
  url?: string | null
}

interface LinkedComponent {
  id: string // equipment_components.id
  component: {
    id: string
    type: string
    manufacturer: string
    model: string
    manual_title: string
    document_id: string
  }
}

interface ComponentResult {
  key: string
  catalogId: string | null
  isCatalog: boolean
  type: string
  manufacturer: string
  model: string
  manualTitle: string
}

interface Props {
  equipment: Equipment | null
  documents: DocWithUrl[]
  snapshot?: SensorSnapshot
  onUpload: () => void
  userRole?: string
  onComponentsChanged?: () => void
}

export default function ContextPanel({ equipment, documents, snapshot, onUpload, onDocRetried, userRole, onComponentsChanged }: Props & { onDocRetried?: () => void }) {
  const [retrying,       setRetrying]       = useState<Record<string, boolean>>({})
  const [showQr,         setShowQr]         = useState(false)
  const [components,     setComponents]     = useState<LinkedComponent[]>([])
  const [loadingComps,   setLoadingComps]   = useState(false)
  const [showAddComp,    setShowAddComp]    = useState(false)
  const [compSearch,     setCompSearch]     = useState('')
  const [compResults,    setCompResults]    = useState<ComponentResult[]>([])
  const [searchingComps, setSearchingComps] = useState(false)
  const [linkingComp,    setLinkingComp]    = useState(false)
  const [unlinkingId,    setUnlinkingId]    = useState<string | null>(null)
  const searchTimeout                        = useRef<ReturnType<typeof setTimeout> | null>(null)

  const canManage = userRole ? ['admin', 'manager', 'journeyman'].includes(userRole) : false

  // Fetch linked components whenever equipment changes
  useEffect(() => {
    if (!equipment?.id) { setComponents([]); return }
    setLoadingComps(true)
    fetch(`/api/equipment/${equipment.id}/components`)
      .then(r => r.ok ? r.json() : [])
      .then((data: LinkedComponent[]) => setComponents(Array.isArray(data) ? data : []))
      .catch(() => setComponents([]))
      .finally(() => setLoadingComps(false))
  }, [equipment?.id])

  // Debounced component search
  useEffect(() => {
    if (searchTimeout.current) clearTimeout(searchTimeout.current)
    if (!compSearch.trim()) { setCompResults([]); return }
    setSearchingComps(true)
    searchTimeout.current = setTimeout(() => {
      fetch(`/api/components?q=${encodeURIComponent(compSearch)}`)
        .then(r => r.ok ? r.json() : [])
        .then((data: ComponentResult[]) => {
          // Only show catalog entries (manual_components rows with a catalogId for linking)
          setCompResults(Array.isArray(data) ? data.filter(c => c.isCatalog && c.catalogId) : [])
        })
        .catch(() => setCompResults([]))
        .finally(() => setSearchingComps(false))
    }, 350)
  }, [compSearch])

  async function handleLinkComponent(componentId: string) {
    if (!equipment?.id) return
    setLinkingComp(true)
    try {
      const res = await fetch(`/api/equipment/${equipment.id}/components`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ componentId }),
      })
      if (res.ok) {
        const newLink: LinkedComponent = await res.json()
        setComponents(c => [...c, newLink])
        setShowAddComp(false)
        setCompSearch('')
        setCompResults([])
        onComponentsChanged?.()
      }
    } catch { /* ignore */ }
    finally { setLinkingComp(false) }
  }

  async function handleUnlinkComponent(linkId: string, componentId: string) {
    if (!equipment?.id) return
    setUnlinkingId(linkId)
    try {
      const res = await fetch(`/api/equipment/${equipment.id}/components`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ componentId }),
      })
      if (res.ok) {
        setComponents(c => c.filter(lc => lc.id !== linkId))
        onComponentsChanged?.()
      }
    } catch { /* ignore */ }
    finally { setUnlinkingId(null) }
  }

  async function handleRetry(docId: string) {
    setRetrying(r => ({ ...r, [docId]: true }))
    try {
      await fetch(`/api/documents/${docId}`, { method: 'POST' })
      onDocRetried?.()
    } catch { /* ignore — parent will refresh on next poll */ }
    finally {
      setRetrying(r => ({ ...r, [docId]: false }))
    }
  }
  if (!equipment) {
    return (
      <aside className="w-52 flex-shrink-0 border-l border-slate-200 bg-slate-50 flex items-center justify-center p-4">
        <div className="text-center">
          <Thermometer size={20} className="text-slate-300 mx-auto mb-2"/>
          <p className="text-[11px] text-slate-400 leading-relaxed">Select a unit to see live readings and documents</p>
        </div>
      </aside>
    )
  }

  const hasReadings = snapshot && Object.keys(snapshot).length > 1

  return (
    <aside className="w-52 flex-shrink-0 border-l border-slate-200 bg-slate-50 flex flex-col overflow-hidden">
      <div className="px-3 py-2.5 border-b border-slate-200">
        <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest">Context</p>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* Live readings */}
        {hasReadings && (
          <div className="px-3 py-3 border-b border-slate-200">
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-2">Live readings</p>
            {snapshot.case_temp && (
              <Reading
                label="Case temp"
                value={`${snapshot.case_temp.value.toFixed(1)}°${snapshot.case_temp.unit}`}
                warn={!!snapshot.setpoint && snapshot.case_temp.value > snapshot.setpoint.value + 3}
                alarm={!!snapshot.setpoint && snapshot.case_temp.value > snapshot.setpoint.value + 6}
              />
            )}
            {snapshot.setpoint && (
              <Reading label="Setpoint" value={`${snapshot.setpoint.value.toFixed(1)}°${snapshot.setpoint.unit}`}/>
            )}
            {snapshot.suction_pressure && (
              <Reading
                label="Suction press."
                value={`${snapshot.suction_pressure.value.toFixed(0)} psi`}
                warn={snapshot.suction_pressure.value < 45}
              />
            )}
            {snapshot.superheat && (
              <Reading
                label="Superheat"
                value={`${snapshot.superheat.value.toFixed(1)}°${snapshot.case_temp?.unit ?? 'F'}`}
                warn={snapshot.superheat.value > 15}
                alarm={snapshot.superheat.value > 20}
              />
            )}
            {snapshot.discharge_temp && (
              <Reading label="Discharge" value={`${snapshot.discharge_temp.value.toFixed(1)}°F`}/>
            )}
            {snapshot.recorded_at && (
              <p className="text-[10px] text-slate-300 mt-1.5">{timeAgo(snapshot.recorded_at)}</p>
            )}
          </div>
        )}

        {/* Unit info */}
        <div className="px-3 py-3 border-b border-slate-200">
          <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-2">Unit info</p>
          <div className="space-y-1.5">
            {[
              ['Model',       `${equipment.manufacturer} ${equipment.model}`],
              ['Serial',      equipment.serial_number],
              ['Refrigerant', equipment.refrigerant],
              ['Location',    equipment.location],
              ['Installed',   equipment.installed_at ? new Date(equipment.installed_at).toLocaleDateString('en-US',{year:'numeric',month:'short'}) : null],
            ].filter(([,v]) => v).map(([k,v]) => (
              <div key={k as string} className="flex justify-between gap-2">
                <span className="text-[11px] text-slate-400 flex-shrink-0">{k}</span>
                <span className="text-[11px] font-medium text-slate-700 text-right truncate">{v as string}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Components */}
        <div className="px-3 py-3 border-b border-slate-200">
          <div className="flex items-center justify-between mb-2">
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest">Components</p>
            {canManage && (
              <button
                onClick={() => { setShowAddComp(v => !v); setCompSearch(''); setCompResults([]) }}
                className="p-0.5 rounded hover:bg-slate-200 text-slate-400 hover:text-slate-600 transition-colors"
                title="Link a component"
              >
                <Plus size={11}/>
              </button>
            )}
          </div>

          {/* Add component search */}
          {showAddComp && (
            <div className="mb-2 relative">
              <input
                type="text"
                value={compSearch}
                onChange={e => setCompSearch(e.target.value)}
                placeholder="Search components…"
                autoFocus
                className="w-full border border-slate-300 rounded-md px-2 py-1 text-[11px] placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
              {(searchingComps || compResults.length > 0) && (
                <div className="absolute top-full left-0 right-0 z-20 mt-0.5 bg-white border border-slate-200 rounded-md shadow-lg max-h-40 overflow-y-auto">
                  {searchingComps && (
                    <div className="flex items-center gap-1.5 px-2 py-2 text-[11px] text-slate-400">
                      <Loader2 size={10} className="animate-spin"/> Searching…
                    </div>
                  )}
                  {!searchingComps && compResults.map(comp => {
                    const alreadyLinked = components.some(lc => lc.component.id === comp.catalogId)
                    return (
                      <button
                        key={comp.key}
                        onClick={() => !alreadyLinked && comp.catalogId && handleLinkComponent(comp.catalogId)}
                        disabled={alreadyLinked || linkingComp}
                        className={cn(
                          'w-full text-left px-2 py-1.5 text-[11px] transition-colors',
                          alreadyLinked
                            ? 'text-slate-400 cursor-default'
                            : 'hover:bg-blue-50 text-slate-700 cursor-pointer'
                        )}
                      >
                        <span className="font-medium">{comp.manufacturer} {comp.model}</span>
                        <span className="text-slate-400 ml-1">· {comp.type}</span>
                        {alreadyLinked && <span className="ml-1 text-[10px] text-slate-400">(linked)</span>}
                      </button>
                    )
                  })}
                  {!searchingComps && compResults.length === 0 && compSearch.trim() && (
                    <p className="px-2 py-2 text-[11px] text-slate-400">No components found</p>
                  )}
                </div>
              )}
            </div>
          )}

          {loadingComps && (
            <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
              <Loader2 size={10} className="animate-spin"/> Loading…
            </div>
          )}
          {!loadingComps && components.length === 0 && (
            <p className="text-[11px] text-slate-400">
              {canManage ? 'No components linked — use + to add' : 'No components linked'}
            </p>
          )}
          <div className="space-y-1">
            {components.map(lc => (
              <div key={lc.id} className="flex items-center gap-1.5 group">
                <div className="w-5 h-5 rounded bg-white border border-slate-200 flex items-center justify-center flex-shrink-0">
                  <Cpu size={9} className="text-slate-400"/>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] font-medium text-slate-700 truncate leading-tight">
                    {lc.component.manufacturer} {lc.component.model}
                  </p>
                  <p className="text-[10px] text-slate-400 truncate">{lc.component.type}</p>
                </div>
                {canManage && (
                  <button
                    onClick={() => handleUnlinkComponent(lc.id, lc.component.id)}
                    disabled={unlinkingId === lc.id}
                    title="Unlink"
                    className="flex-shrink-0 opacity-0 group-hover:opacity-100 p-0.5 text-slate-300 hover:text-red-500 transition-all"
                  >
                    {unlinkingId === lc.id
                      ? <Loader2 size={10} className="animate-spin"/>
                      : <X size={10}/>
                    }
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Documents */}
        <div className="px-3 py-3">
          <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-2">Documents</p>
          {documents.length === 0 && (
            <p className="text-[11px] text-slate-400 mb-2">No manuals uploaded yet</p>
          )}
          <div className="space-y-1 mb-2">
            {documents.map(doc => {
              const isProcessing = doc.status === 'PROCESSING'
              const isFailed     = doc.status === 'FAILED'
              const canOpen = !!doc.url && !isProcessing && !isFailed
              const icon = doc.source_type === 'WEB'
                ? <Globe size={10} className="text-blue-500"/>
                : <FileText size={10} className="text-red-400"/>

              const inner = (
                <div className="flex items-center gap-2 w-full group">
                  <div className="w-6 h-6 rounded bg-white border border-slate-200 flex items-center justify-center flex-shrink-0">
                    {isProcessing
                      ? <Loader2 size={10} className="text-amber-400 animate-spin"/>
                      : isFailed
                        ? <AlertTriangle size={10} className="text-red-400"/>
                        : icon
                    }
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={cn(
                      'text-[11px] font-medium truncate leading-tight',
                      canOpen ? 'text-blue-600 group-hover:underline' : isFailed ? 'text-red-500' : 'text-slate-700'
                    )}>
                      {doc.title}
                    </p>
                    <p className="text-[10px] text-slate-400">
                      {isProcessing ? 'Processing…' : isFailed ? 'Failed' : doc.page_count ? `${doc.page_count}p` : doc.source_type}
                      {doc.file_size ? ` · ${formatBytes(doc.file_size)}` : ''}
                    </p>
                  </div>
                  {canOpen && (
                    <ExternalLink size={10} className="text-slate-300 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"/>
                  )}
                  {isFailed && (
                    <button
                      onClick={e => { e.preventDefault(); e.stopPropagation(); handleRetry(doc.id) }}
                      disabled={retrying[doc.id]}
                      title="Retry ingestion"
                      className="flex-shrink-0 p-0.5 text-slate-400 hover:text-blue-600 transition-colors disabled:opacity-50"
                    >
                      <RefreshCw size={10} className={retrying[doc.id] ? 'animate-spin' : ''} />
                    </button>
                  )}
                </div>
              )

              return canOpen ? (
                <a
                  key={doc.id}
                  href={doc.url!}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 rounded-md px-1 py-1 -mx-1 hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  {inner}
                </a>
              ) : (
                <div key={doc.id} className="flex items-center gap-2 px-1 py-1">
                  {inner}
                </div>
              )
            })}
          </div>
          <button
            onClick={onUpload}
            className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded-lg border border-dashed border-slate-300 text-[11px] text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-all"
          >
            <Upload size={10}/> Upload PDF
          </button>
          <button
            onClick={() => setShowQr(true)}
            className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded-lg border border-dashed border-slate-300 text-[11px] text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-all mt-1"
          >
            <QrCode size={10}/> QR Code
          </button>
        </div>
      </div>

      {/* QR code modal */}
      {showQr && equipment && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
          onClick={() => setShowQr(false)}
        >
          <div
            className="bg-white rounded-2xl shadow-xl p-6 w-64 flex flex-col items-center gap-4"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between w-full">
              <p className="text-xs font-semibold text-slate-700">Scan to open in ColdIQ</p>
              <button onClick={() => setShowQr(false)} className="text-slate-400 hover:text-slate-600">
                <X size={16} />
              </button>
            </div>
            <img
              src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&margin=4&data=${encodeURIComponent(
                typeof window !== 'undefined'
                  ? `${window.location.origin}/dashboard?equipment=${equipment.id}`
                  : ''
              )}`}
              alt="QR code"
              width={180}
              height={180}
              className="rounded-lg border border-slate-100"
            />
            <div className="text-center">
              <p className="text-xs font-medium text-slate-800 truncate max-w-[200px]">{equipment.name}</p>
              <p className="text-[10px] text-slate-400 mt-0.5">{equipment.manufacturer} {equipment.model}</p>
            </div>
            <button
              onClick={() => window.print()}
              className="text-[11px] text-slate-500 hover:text-slate-700 underline"
            >
              Print QR code
            </button>
          </div>
        </div>
      )}
    </aside>
  )
}
