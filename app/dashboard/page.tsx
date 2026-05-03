'use client'
import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { getSupabaseBrowser } from '@/lib/supabase/client'
import type { RealtimeChannel } from '@supabase/supabase-js'
import Sidebar from '@/components/layout/Sidebar'
import ChatPanel from '@/components/chat/ChatPanel'
import ContextPanel from '@/components/equipment/ContextPanel'
import AddEquipmentModal from '@/components/equipment/AddEquipmentModal'
import MaintenancePanel from '@/components/maintenance/MaintenancePanel'
import {
  Menu, MessageSquare, WrenchIcon, Database, Lightbulb, AlertTriangle,
} from 'lucide-react'
import { buildSnapshot } from '@/lib/sensor'
import type { Equipment, Document, ChatMode, User } from '@/types'

const MODE_LABELS: Record<ChatMode, string> = {
  EXPERT:      'Expert',
  MAINTENANCE: 'Maintenance',
}

type NavItem =
  | { id: ChatMode; icon: React.ReactNode; label: string; href?: never }
  | { id: 'REGISTRY' | 'TIPS'; icon: React.ReactNode; label: string; href: string }

const BOTTOM_NAV_ITEMS: NavItem[] = [
  { id: 'EXPERT',      icon: <MessageSquare size={20}/>, label: 'Expert' },
  { id: 'MAINTENANCE', icon: <WrenchIcon    size={20}/>, label: 'Maintenance' },
  { id: 'REGISTRY',    icon: <Database      size={20}/>, label: 'Registry', href: '/maintenance/components' },
  { id: 'TIPS',        icon: <Lightbulb     size={20}/>, label: 'Tips', href: '/tips' },
]


export default function Dashboard() {
  const [equipment,    setEquipment]    = useState<Equipment[]>([])
  const [selected,     setSelected]     = useState<Equipment | null>(null)
  const [mode,         setMode]         = useState<ChatMode>('EXPERT')
  const [documents,    setDocuments]    = useState<Document[]>([])
  const [showAdd,      setShowAdd]      = useState(false)
  const [currentUser,  setCurrentUser]  = useState<User | null>(null)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [fetchError,   setFetchError]   = useState<string | null>(null)
  const [alarmToast,   setAlarmToast]   = useState<string | null>(null)
  const equipmentRef = useRef<Equipment[]>([])
  const autoSelectedRef = useRef(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()

  // Auth gate
  useEffect(() => {
    async function checkAuth() {
      const sb = getSupabaseBrowser()
      const { data: { user } } = await sb.auth.getUser()
      if (!user) { router.push('/login'); return }
      const { data: profileData } = await sb.from('users').select('*').eq('id', user.id).single()
      const profile = profileData as unknown as User | null
      if (!profile) { router.push('/login'); return }
      if (profile.status === 'pending') { router.push('/pending'); return }
      if (profile.status === 'suspended') { router.push('/login'); return }
      setCurrentUser(profile)
    }
    checkAuth()
  }, [router])

  const loadEquipment = useCallback(async () => {
    const res = await fetch('/api/equipment').catch(() => null)
    if (res?.ok) {
      setEquipment(await res.json())
      setFetchError(null)
    } else if (res) {
      setFetchError('Failed to load equipment. Check your connection and try again.')
    } else {
      setFetchError('Network error — could not reach the server. Check your connection and try again.')
    }
  }, [])

  const loadDocuments = useCallback(async (equipmentId?: string) => {
    const url = equipmentId ? `/api/documents?equipmentId=${equipmentId}` : '/api/documents'
    const res = await fetch(url).catch(() => null)
    if (res?.ok) setDocuments(await res.json())
  }, [])

  // Keep a ref to equipment so realtime handler always has the latest list
  useEffect(() => { equipmentRef.current = equipment }, [equipment])

  // Auto-select equipment from URL param (e.g. from a QR code scan)
  useEffect(() => {
    if (autoSelectedRef.current || equipment.length === 0) return
    const params = new URLSearchParams(window.location.search)
    const equipId = params.get('equipment')
    if (equipId) {
      const eq = equipment.find(e => e.id === equipId)
      if (eq) { setSelected(eq); autoSelectedRef.current = true }
    }
  }, [equipment])

  // Auto-poll documents every 10s while any are still PROCESSING
  useEffect(() => {
    const hasProcessing = documents.some(d => d.status === 'PROCESSING')
    if (!hasProcessing) return
    const interval = setInterval(() => loadDocuments(selected?.id), 10000)
    return () => clearInterval(interval)
  }, [documents, selected?.id, loadDocuments])

  // Realtime alarm notifications
  useEffect(() => {
    if (!currentUser) return
    const sb = getSupabaseBrowser()
    let channel: RealtimeChannel
    channel = sb
      .channel('coldiq-alarms')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'alarm_events' }, payload => {
        const alarm = payload.new as { equipment_id: string; alarm_type?: string }
        const eq = equipmentRef.current.find(e => e.id === alarm.equipment_id)
        const name = eq?.name ?? 'Unknown unit'
        const type = alarm.alarm_type ?? 'New alarm'
        setAlarmToast(`🚨 ${name} — ${type}`)
        loadEquipment()
      })
      .subscribe()
    return () => { sb.removeChannel(channel) }
  }, [currentUser, loadEquipment])

  // Auto-dismiss alarm toast after 6s
  useEffect(() => {
    if (!alarmToast) return
    const t = setTimeout(() => setAlarmToast(null), 6000)
    return () => clearTimeout(t)
  }, [alarmToast])

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

  function openFilePicker() { fileInputRef.current?.click() }

  const snapshot = selected ? buildSnapshot(selected.latest_readings ?? []) : undefined

  if (!currentUser) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-sm text-slate-400">Loading…</div>
      </div>
    )
  }

  return (
    // On mobile: flex-col fills the viewport, bottom nav fixed at bottom
    <div className="flex h-[100dvh] overflow-hidden">
      {/* ── Sidebar (desktop: always visible; mobile: controlled drawer) ── */}
      <Sidebar
        equipment={equipment}
        selected={selected}
        mode={mode}
        currentUser={currentUser}
        onSelect={setSelected}
        onMode={setMode}
        onAdd={() => setShowAdd(true)}
        mobileOpen={mobileMenuOpen}
        onMobileClose={() => setMobileMenuOpen(false)}
      />

      {/* ── Main area ── */}
      <div className="flex-1 flex flex-col min-w-0 min-h-0">

        {/* ─── Top bar ─── */}
        <div className="flex items-center gap-2 px-3 md:px-5 py-2.5 border-b border-slate-200 bg-white flex-shrink-0">

          {/* Hamburger — mobile only */}
          <button
            onClick={() => setMobileMenuOpen(true)}
            className="md:hidden flex-shrink-0 p-2 -ml-1 text-slate-500 hover:text-slate-800 rounded-lg hover:bg-slate-100"
            aria-label="Open menu"
          >
            <Menu size={20}/>
          </button>

          {/* Logo — mobile only (desktop shows it in sidebar) */}
          <div className="md:hidden flex items-baseline gap-0.5 flex-shrink-0">
            <span className="text-base font-bold text-blue-600">Cold</span>
            <span className="text-base font-bold text-slate-800">IQ</span>
          </div>

          {/* Mode tabs — desktop */}
          <div className="hidden md:flex gap-0.5 bg-slate-100 rounded-lg p-0.5 flex-shrink-0">
            {(['EXPERT', 'MAINTENANCE'] as ChatMode[]).map(m => (
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
            <button
              onClick={() => router.push('/maintenance/components')}
              className="px-3 py-1.5 rounded-md text-xs font-medium transition-all text-slate-500 hover:text-slate-700 flex items-center gap-1.5"
            >
              <Database size={12}/>
              Registry
            </button>
          </div>

          {/* Current mode label — mobile only */}
          <span className="md:hidden flex-1 text-sm font-medium text-slate-700">
            {MODE_LABELS[mode]}
          </span>

          {/* Active unit badge */}
          {selected ? (
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="ml-auto flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-100 rounded-full text-xs min-w-0 max-w-[140px] md:max-w-none"
            >
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 flex-shrink-0"/>
              <span className="font-medium text-slate-700 truncate">{selected.name}</span>
              <span className="text-slate-400 hidden md:inline truncate">· {selected.manufacturer} {selected.model}</span>
            </button>
          ) : (
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="ml-auto flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-100 rounded-full text-xs text-slate-400"
            >
              <div className="w-1.5 h-1.5 rounded-full bg-slate-300"/>
              <span className="hidden sm:inline">No unit selected</span>
              <span className="sm:hidden">Select unit</span>
            </button>
          )}
        </div>

        {/* ─── Realtime alarm toast ─── */}
        {alarmToast && (
          <div className="flex-shrink-0 flex items-center gap-2 px-4 py-2.5 bg-red-600 text-white text-xs font-medium animate-in slide-in-from-top duration-300">
            <span className="flex-1">{alarmToast}</span>
            <button onClick={() => setAlarmToast(null)} className="text-red-200 hover:text-white leading-none ml-2 flex-shrink-0">×</button>
          </div>
        )}

        {/* ─── Fetch error banner ─── */}
        {fetchError && (
          <div className="flex-shrink-0 flex items-center gap-2 px-4 py-2 bg-red-50 border-b border-red-200 text-xs text-red-700">
            <AlertTriangle size={13} className="flex-shrink-0" />
            <span className="flex-1">{fetchError}</span>
            <button onClick={loadEquipment} className="font-medium underline hover:no-underline flex-shrink-0">Retry</button>
            <button onClick={() => setFetchError(null)} className="ml-2 text-red-400 hover:text-red-600 leading-none flex-shrink-0">×</button>
          </div>
        )}

        {/* ─── Main content ─── */}
        {/* On mobile: extra bottom padding so content doesn't hide behind the bottom nav */}
        <div className="flex-1 flex min-h-0 pb-14 md:pb-0">
          {mode === 'MAINTENANCE' ? (
            <div className="flex-1 min-w-0 bg-slate-50">
              <MaintenancePanel equipmentId={selected?.id} />
            </div>
          ) : (
            <>
              <div className="flex-1 min-w-0">
                <ChatPanel equipment={selected} mode={mode} onUpload={openFilePicker}/>
              </div>
              {/* Context panel — hidden on mobile to save space */}
              <div className="hidden lg:block">
                <ContextPanel equipment={selected} documents={documents} snapshot={snapshot} onUpload={openFilePicker} onDocRetried={() => loadDocuments(selected?.id)}/>
              </div>
            </>
          )}
        </div>
      </div>

      {/* ── Mobile bottom navigation ── */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-30 bg-white border-t border-slate-200 flex items-stretch">
        {BOTTOM_NAV_ITEMS.map(item => {
          const isActive = !item.href && mode === (item.id as ChatMode)
          return (
            <button
              key={item.id}
              onClick={() => item.href ? router.push(item.href) : setMode(item.id as ChatMode)}
              className={[
                'flex-1 flex flex-col items-center justify-center gap-0.5 py-2 text-[10px] font-medium transition-colors',
                isActive ? 'text-blue-600' : 'text-slate-400',
              ].join(' ')}
            >
              <span className={isActive ? 'text-blue-600' : 'text-slate-400'}>{item.icon}</span>
              {item.label}
            </button>
          )
        })}
      </nav>

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
