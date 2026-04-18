'use client'
import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { getSupabaseBrowser } from '@/lib/supabase/client'
import Sidebar from '@/components/layout/Sidebar'
import ChatPanel from '@/components/chat/ChatPanel'
import ContextPanel from '@/components/equipment/ContextPanel'
import AddEquipmentModal from '@/components/equipment/AddEquipmentModal'
import MaintenancePanel from '@/components/maintenance/MaintenancePanel'
import type { Equipment, Document, SensorSnapshot, ChatMode, User } from '@/types'

const MODE_LABELS: Record<ChatMode, string> = {
  ASK:         'Ask the expert',
  DIAGNOSE:    'Diagnose',
  ALARM:       'Alarms',
  MAINTENANCE: 'Maintenance',
  COMPLIANCE:  'Compliance',
}

function buildSnapshot(readings: any[]): SensorSnapshot {
  const s: SensorSnapshot = {}
  const seen = new Set<string>()
  for (const r of readings ?? []) {
    if (seen.has(r.reading_type)) continue
    seen.add(r.reading_type)
    if (r.reading_type === 'case_temp')        s.case_temp        = { value: r.value, unit: r.unit }
    if (r.reading_type === 'setpoint')          s.setpoint          = { value: r.value, unit: r.unit }
    if (r.reading_type === 'suction_pressure')  s.suction_pressure  = { value: r.value, unit: r.unit }
    if (r.reading_type === 'superheat')         s.superheat         = { value: r.value, unit: r.unit }
    if (r.reading_type === 'discharge_temp')    s.discharge_temp    = { value: r.value, unit: r.unit }
  }
  if (readings?.[0]) s.recorded_at = readings[0].recorded_at
  return s
}

export default function Dashboard() {
  const [equipment,  setEquipment]  = useState<Equipment[]>([])
  const [selected,   setSelected]   = useState<Equipment | null>(null)
  const [mode,       setMode]       = useState<ChatMode>('ASK')
  const [documents,  setDocuments]  = useState<Document[]>([])
  const [showAdd,    setShowAdd]    = useState(false)
  const [currentUser, setCurrentUser] = useState<User | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()

  // Auth gate
  useEffect(() => {
    async function checkAuth() {
      const sb = getSupabaseBrowser()
      const { data: { user } } = await sb.auth.getUser()
      if (!user) { router.push('/login'); return }
      const { data: profileData } = await sb.from('users').select('*').eq('id', user.id).single()
      const profile = profileData as User | null
      if (!profile) { router.push('/login'); return }
      if (profile.status === 'pending') { router.push('/pending'); return }
      if (profile.status === 'suspended') { router.push('/login'); return }
      setCurrentUser(profile)
    }
    checkAuth()
  }, [router])

  const loadEquipment = useCallback(async () => {
    const res = await fetch('/api/equipment').catch(() => null)
    if (res?.ok) setEquipment(await res.json())
  }, [])

  const loadDocuments = useCallback(async (equipmentId?: string) => {
    const url = equipmentId ? `/api/documents?equipmentId=${equipmentId}` : '/api/documents'
    const res = await fetch(url).catch(() => null)
    if (res?.ok) setDocuments(await res.json())
  }, [])

  useEffect(() => { if (currentUser) loadEquipment() }, [currentUser, loadEquipment])
  useEffect(() => { loadDocuments(selected?.id) }, [selected?.id, loadDocuments])

  async function handleUpload(file: File) {
    const fd = new FormData()
    fd.append('file', file)
    if (selected) fd.append('equipmentId', selected.id)
    fd.append('title', file.name.replace(/\.pdf$/i, ''))
    await fetch('/api/documents', { method: 'POST', body: fd })
    loadDocuments(selected?.id)
  }

  function openFilePicker() {
    fileInputRef.current?.click()
  }

  const snapshot = selected ? buildSnapshot(selected.latest_readings ?? []) : undefined

  if (!currentUser) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-sm text-slate-400">Loading…</div>
      </div>
    )
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar
        equipment={equipment}
        selected={selected}
        mode={mode}
        currentUser={currentUser}
        onSelect={setSelected}
        onMode={setMode}
        onAdd={() => setShowAdd(true)}
      />

      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <div className="flex items-center justify-between px-5 py-2.5 border-b border-slate-200 bg-white flex-shrink-0">
          {/* Mode tabs */}
          <div className="flex gap-0.5 bg-slate-100 rounded-lg p-0.5">
            {(['ASK','DIAGNOSE','ALARM'] as ChatMode[]).map(m => (
              <button
                key={m}
                onClick={() => setMode(m)}
                className={[
                  'px-3 py-1.5 rounded-md text-xs font-medium transition-all',
                  mode === m
                    ? 'bg-white text-slate-900 shadow-sm border border-slate-200'
                    : 'text-slate-500 hover:text-slate-700',
                ].join(' ')}
              >
                {MODE_LABELS[m]}
              </button>
            ))}
            <span className="w-px h-5 self-center bg-slate-200 mx-0.5"/>
            {(['MAINTENANCE','COMPLIANCE'] as ChatMode[]).map(m => (
              <button
                key={m}
                onClick={() => setMode(m)}
                className={[
                  'px-3 py-1.5 rounded-md text-xs font-medium transition-all',
                  mode === m
                    ? 'bg-white text-slate-900 shadow-sm border border-slate-200'
                    : 'text-slate-500 hover:text-slate-700',
                ].join(' ')}
              >
                {MODE_LABELS[m]}
              </button>
            ))}
          </div>

          {/* Active unit badge */}
          {selected ? (
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 rounded-full text-xs">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-400"/>
              <span className="font-medium text-slate-700">{selected.name}</span>
              <span className="text-slate-400">· {selected.manufacturer} {selected.model}</span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 rounded-full text-xs text-slate-400">
              <div className="w-1.5 h-1.5 rounded-full bg-slate-300"/>
              No unit selected
            </div>
          )}
        </div>

        {/* Main content */}
        <div className="flex-1 flex min-h-0">
          {mode === 'MAINTENANCE' ? (
            <div className="flex-1 min-w-0 bg-slate-50">
              <MaintenancePanel equipmentId={selected?.id} />
            </div>
          ) : (
            <>
              <div className="flex-1 min-w-0">
                <ChatPanel equipment={selected} mode={mode} onUpload={openFilePicker}/>
              </div>
              <ContextPanel equipment={selected} documents={documents} snapshot={snapshot} onUpload={openFilePicker}/>
            </>
          )}
        </div>
      </div>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="application/pdf"
        className="hidden"
        onChange={e => { const f = e.target.files?.[0]; if (f) handleUpload(f); e.target.value = '' }}
      />

      {/* Add equipment modal */}
      {showAdd && <AddEquipmentModal onClose={() => setShowAdd(false)} onCreated={loadEquipment}/>}
    </div>
  )
}
