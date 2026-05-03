'use client'
import { useState } from 'react'
import { Upload, FileText, Globe, Thermometer, ExternalLink, Loader2, AlertTriangle, RefreshCw, QrCode, X } from 'lucide-react'
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

interface Props {
  equipment: Equipment | null
  documents: DocWithUrl[]
  snapshot?: SensorSnapshot
  onUpload: () => void
}

export default function ContextPanel({ equipment, documents, snapshot, onUpload, onDocRetried }: Props & { onDocRetried?: () => void }) {
  const [retrying, setRetrying] = useState<Record<string, boolean>>({})
  const [showQr, setShowQr]     = useState(false)

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
