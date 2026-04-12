'use client'
import { Upload, FileText, Globe, Thermometer } from 'lucide-react'
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

interface Props {
  equipment: Equipment | null
  documents: Document[]
  snapshot?: SensorSnapshot
  onUpload: () => void
}

export default function ContextPanel({ equipment, documents, snapshot, onUpload }: Props) {
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
          <div className="space-y-1.5 mb-2">
            {documents.map(doc => (
              <div key={doc.id} className="flex items-center gap-2">
                <div className="w-6 h-6 rounded bg-white border border-slate-200 flex items-center justify-center flex-shrink-0">
                  {doc.source_type === 'WEB'
                    ? <Globe size={10} className="text-blue-500"/>
                    : <FileText size={10} className="text-red-400"/>
                  }
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] font-medium text-slate-700 truncate">{doc.title}</p>
                  <p className="text-[10px] text-slate-400">
                    {doc.status === 'PROCESSING' ? 'Processing…' : doc.page_count ? `${doc.page_count}p` : doc.source_type}
                    {doc.file_size ? ` · ${formatBytes(doc.file_size)}` : ''}
                  </p>
                </div>
                {doc.status === 'PROCESSING' && (
                  <div className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse flex-shrink-0"/>
                )}
              </div>
            ))}
          </div>
          <button
            onClick={onUpload}
            className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded-lg border border-dashed border-slate-300 text-[11px] text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-all"
          >
            <Upload size={10}/> Upload PDF
          </button>
        </div>
      </div>
    </aside>
  )
}
