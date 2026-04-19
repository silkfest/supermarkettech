'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Thermometer, WrenchIcon, Database, MessageSquare, AlertTriangle, Users, LogOut, X } from 'lucide-react'
import { getSupabaseBrowser } from '@/lib/supabase/client'
import { cn, statusDot } from '@/lib/utils'
import type { Equipment, ChatMode, User } from '@/types'

const MODES: { id: ChatMode; label: string; icon: React.ReactNode }[] = [
  { id: 'ASK',         label: 'Ask the expert', icon: <MessageSquare size={13}/> },
  { id: 'DIAGNOSE',    label: 'Fault diagnosis', icon: <Thermometer size={13}/> },
  { id: 'ALARM',       label: 'Alarm lookup',    icon: <AlertTriangle size={13}/> },
  { id: 'MAINTENANCE', label: 'Maintenance log', icon: <WrenchIcon size={13}/> },
]

interface Props {
  equipment: Equipment[]
  selected: Equipment | null
  mode: ChatMode
  currentUser: User | null
  onSelect: (e: Equipment | null) => void
  onMode:   (m: ChatMode) => void
  onAdd:    () => void
  /** Mobile: whether the drawer is open */
  mobileOpen?: boolean
  /** Mobile: close the drawer */
  onMobileClose?: () => void
}

function SidebarContent({
  equipment, selected, mode, currentUser, onSelect, onMode, onAdd, onMobileClose,
}: Omit<Props, 'mobileOpen'>) {
  const router = useRouter()
  const [loggingOut, setLoggingOut] = useState(false)
  const alarmCount   = equipment.filter(e => e.status === 'ALARM').length
  const warningCount = equipment.filter(e => e.status === 'WARNING').length

  async function handleLogout() {
    setLoggingOut(true)
    await getSupabaseBrowser().auth.signOut()
    window.location.href = '/login'
  }

  const roleLabel: Record<string, string> = {
    admin: 'Admin', manager: 'Manager', journeyman: 'Journeyman', apprentice: 'Apprentice',
  }

  function handleSelect(eq: Equipment | null) {
    onSelect(eq)
    onMobileClose?.()
  }

  function handleMode(m: ChatMode) {
    onMode(m)
    onMobileClose?.()
  }

  return (
    <div className="flex flex-col h-full">
      {/* Logo + close button */}
      <div className="px-4 py-4 border-b border-slate-200 flex items-start justify-between">
        <div>
          <div className="flex items-baseline gap-0.5">
            <span className="text-[17px] font-bold tracking-tight text-blue-600">Cold</span>
            <span className="text-[17px] font-bold tracking-tight text-slate-800">IQ</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-0.5">Refrigeration expert</p>
          {(alarmCount > 0 || warningCount > 0) && (
            <div className="flex gap-1.5 mt-2">
              {alarmCount   > 0 && <span className="text-[10px] font-semibold text-red-600 bg-red-50 border border-red-200 px-1.5 py-0.5 rounded">{alarmCount} alarm{alarmCount>1?'s':''}</span>}
              {warningCount > 0 && <span className="text-[10px] font-semibold text-amber-600 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded">{warningCount} warning{warningCount>1?'s':''}</span>}
            </div>
          )}
        </div>
        {/* Close button — mobile only */}
        {onMobileClose && (
          <button onClick={onMobileClose} className="md:hidden p-1 text-slate-400 hover:text-slate-600 -mt-0.5 -mr-1">
            <X size={18}/>
          </button>
        )}
      </div>

      {/* Modes */}
      <div className="px-2 pt-3 pb-1">
        <p className="px-2 text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-1">Mode</p>
        {MODES.map(m => (
          <button
            key={m.id}
            onClick={() => handleMode(m.id)}
            className={cn(
              'w-full flex items-center gap-2 px-2 py-2.5 md:py-2 rounded-lg text-left text-xs transition-all mb-0.5',
              mode === m.id
                ? 'bg-white border border-slate-200 shadow-sm text-slate-900 font-medium'
                : 'text-slate-500 hover:bg-slate-100 hover:text-slate-800'
            )}
          >
            <span className="opacity-60">{m.icon}</span>
            {m.label}
          </button>
        ))}
      </div>

      {/* Registry link */}
      <div className="px-2 pb-2">
        <button
          onClick={() => { router.push('/maintenance/components'); onMobileClose?.() }}
          className="w-full flex items-center gap-2 px-2 py-2.5 md:py-2 rounded-lg text-left text-xs transition-all text-slate-500 hover:bg-slate-100 hover:text-slate-800"
        >
          <span className="opacity-60"><Database size={13}/></span>
          Component registry
        </button>
      </div>

      {/* Equipment list */}
      <div className="flex-1 overflow-y-auto px-2 pt-2 min-h-0">
        <p className="px-2 text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-1">Equipment</p>
        <button
          onClick={() => handleSelect(null)}
          className={cn(
            'w-full text-left px-2 py-2.5 md:py-1.5 rounded-lg mb-1 text-xs transition-all',
            !selected ? 'bg-white border border-slate-200 shadow-sm text-slate-900 font-medium' : 'text-slate-500 hover:bg-slate-100'
          )}
        >
          General (no unit)
        </button>

        {equipment.map(eq => {
          const alarms = (eq.active_alarms ?? []).filter((a: any) => !a.resolved_at)
          return (
            <button
              key={eq.id}
              onClick={() => handleSelect(eq)}
              className={cn(
                'w-full text-left px-2.5 py-2.5 md:py-2 rounded-lg mb-0.5 transition-all',
                selected?.id === eq.id
                  ? 'bg-white border border-slate-200 shadow-sm'
                  : 'hover:bg-slate-100'
              )}
            >
              <div className="flex items-start gap-2">
                <div className={cn('w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0', statusDot(eq.status))} />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-slate-800 truncate leading-tight">{eq.name}</p>
                  <p className="text-[10px] text-slate-400 truncate mt-0.5">{eq.manufacturer} {eq.model}</p>
                  {alarms.length > 0 && (
                    <p className="text-[10px] text-red-500 font-medium mt-0.5">
                      ⚠ {alarms.length} alarm{alarms.length>1?'s':''}
                    </p>
                  )}
                </div>
              </div>
            </button>
          )
        })}
      </div>

      {/* Add equipment */}
      <div className="px-2 pt-1 pb-1 border-t border-slate-200">
        <button
          onClick={() => { onAdd(); onMobileClose?.() }}
          className="w-full flex items-center justify-center gap-1.5 px-3 py-2.5 md:py-2 rounded-lg border border-dashed border-slate-300 text-xs text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-all"
        >
          <Plus size={12}/> Add equipment
        </button>
      </div>

      {/* Admin link */}
      {currentUser?.role === 'admin' && (
        <div className="px-2 pb-1">
          <button
            onClick={() => { router.push('/admin/users'); onMobileClose?.() }}
            className="w-full flex items-center gap-2 px-2 py-2.5 md:py-2 rounded-lg text-xs text-slate-500 hover:bg-slate-100 hover:text-slate-800 transition-all"
          >
            <Users size={13} className="opacity-60"/>
            Manage users
          </button>
        </div>
      )}

      {/* User footer */}
      <div className="px-3 py-3 border-t border-slate-200">
        {currentUser && (
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <p className="text-xs font-medium text-slate-700 truncate">{currentUser.name || currentUser.email}</p>
              <p className="text-[10px] text-slate-400">{roleLabel[currentUser.role] ?? currentUser.role}</p>
            </div>
            <button
              onClick={handleLogout}
              disabled={loggingOut}
              title="Sign out"
              className="flex-shrink-0 p-1.5 rounded-md text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors disabled:opacity-40"
            >
              <LogOut size={13}/>
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

export default function Sidebar({ mobileOpen, onMobileClose, ...props }: Props) {
  return (
    <>
      {/* ── Desktop sidebar (always visible on md+) ── */}
      <aside className="hidden md:flex w-52 flex-shrink-0 flex-col bg-slate-50 border-r border-slate-200 overflow-hidden">
        <SidebarContent {...props} />
      </aside>

      {/* ── Mobile drawer backdrop ── */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-40 md:hidden"
          onClick={onMobileClose}
        />
      )}

      {/* ── Mobile drawer ── */}
      <aside className={cn(
        'fixed inset-y-0 left-0 z-50 w-72 flex flex-col bg-slate-50 border-r border-slate-200 overflow-hidden transition-transform duration-300 ease-in-out md:hidden',
        mobileOpen ? 'translate-x-0' : '-translate-x-full'
      )}>
        <SidebarContent {...props} onMobileClose={onMobileClose} />
      </aside>
    </>
  )
}
