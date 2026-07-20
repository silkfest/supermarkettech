'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, WrenchIcon, Database, MessageSquare, Users, LogOut, X, GraduationCap, Building2, BookOpen, UserCircle, Layers, Moon, Sun, Building, MessageSquareWarning, RadioTower } from 'lucide-react'
import { getSupabaseBrowser } from '@/lib/supabase/client'
import { clearAllChatDrafts } from '@/lib/chat/drafts'
import { cn, statusDot } from '@/lib/utils'
import { useTheme } from '@/components/ThemeProvider'
import type { Equipment, ChatMode, User } from '@/types'

const MODES: { id: ChatMode; label: string; icon: React.ReactNode }[] = [
  { id: 'EXPERT', label: 'ColdIQ Expert', icon: <MessageSquare size={13}/> },
]

interface Props {
  equipment: Equipment[]
  selected: Equipment | null
  mode: ChatMode
  currentUser: User | null
  onSelect: (e: Equipment | null) => void
  onMode:   (m: ChatMode) => void
  onAdd:    () => void
  /** Hides mode selector and equipment list — used on non-dashboard pages */
  minimal?: boolean
  /** Mobile: whether the drawer is open */
  mobileOpen?: boolean
  /** Mobile: close the drawer */
  onMobileClose?: () => void
}

function SidebarContent({
  equipment, selected, mode, currentUser, onSelect, onMode, onAdd, onMobileClose, minimal,
}: Omit<Props, 'mobileOpen'>) {
  const router = useRouter()
  const [loggingOut,    setLoggingOut]    = useState(false)
  const [pendingCount,  setPendingCount]  = useState(0)
  const { theme, toggle: toggleTheme } = useTheme()
  const alarmCount   = equipment.filter(e => e.status === 'ALARM').length
  const warningCount = equipment.filter(e => e.status === 'WARNING').length

  // Fetch pending user count for admins/managers (via API — browser client is RLS-restricted)
  useEffect(() => {
    if (!currentUser || !['admin', 'manager'].includes(currentUser.role)) return
    fetch('/api/users')
      .then(r => r.ok ? r.json() : [])
      .then((users: { status: string }[]) =>
        setPendingCount(Array.isArray(users) ? users.filter(u => u.status === 'pending').length : 0)
      )
  }, [currentUser])

  async function handleLogout() {
    setLoggingOut(true)
    clearAllChatDrafts()
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
      <div className="safe-top px-4 py-4 border-b border-slate-200 dark:border-slate-800 flex items-start justify-between">
        <div>
          <div className="flex items-baseline gap-0.5">
            <span className="text-[17px] font-bold tracking-tight text-blue-600">Cold</span>
            <span className="text-[17px] font-bold tracking-tight text-slate-800 dark:text-slate-100">IQ</span>
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
      {!minimal && (
        <div className="px-2 pt-3 pb-1">
          <p className="px-2 text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-1">Mode</p>
          {MODES.map(m => (
            <button
              key={m.id}
              onClick={() => handleMode(m.id)}
              className={cn(
                'w-full flex items-center gap-2 px-2 py-2.5 md:py-2 rounded-lg text-left text-xs transition-all mb-0.5',
                mode === m.id
                  ? 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm text-slate-900 dark:text-slate-100 font-medium'
                  : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-800 dark:hover:text-slate-200'
              )}
            >
              <span className="opacity-60">{m.icon}</span>
              {m.label}
            </button>
          ))}
        </div>
      )}

      {/* Nav links */}
      <div className="px-2 pb-2 flex flex-col gap-0.5">
        {minimal && (
          <button
            onClick={() => { router.push('/dashboard'); onMobileClose?.() }}
            className="w-full flex items-center gap-2 px-2 py-2.5 md:py-2 rounded-lg text-left text-xs transition-all text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-800 dark:hover:text-slate-200"
          >
            <span className="opacity-60"><MessageSquare size={13}/></span>
            ColdIQ Expert
          </button>
        )}
        {currentUser?.role === 'admin' && (
          <>
            <button
              onClick={() => { router.push('/stores'); onMobileClose?.() }}
              className="w-full flex items-center gap-2 px-2 py-2.5 md:py-2 rounded-lg text-left text-xs transition-all text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-800 dark:hover:text-slate-200"
            >
              <span className="opacity-60"><Building2 size={13}/></span>
              Sites
            </button>
            <button
              onClick={() => { router.push('/maintenance/components'); onMobileClose?.() }}
              className="w-full flex items-center gap-2 px-2 py-2.5 md:py-2 rounded-lg text-left text-xs transition-all text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-800 dark:hover:text-slate-200"
            >
              <span className="opacity-60"><Database size={13}/></span>
              Components
            </button>
          </>
        )}
        <button
          onClick={() => { router.push('/maintenance'); onMobileClose?.() }}
          className="w-full flex items-center gap-2 px-2 py-2.5 md:py-2 rounded-lg text-left text-xs transition-all text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-800 dark:hover:text-slate-200"
        >
          <span className="opacity-60"><WrenchIcon size={13}/></span>
          Maintenance
        </button>
        <button
          onClick={() => { router.push('/knowledge'); onMobileClose?.() }}
          className="w-full flex items-center gap-2 px-2 py-2.5 md:py-2 rounded-lg text-left text-xs transition-all text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-800 dark:hover:text-slate-200"
        >
          <span className="opacity-60"><Layers size={13}/></span>
          Learning
        </button>
        {currentUser?.role === 'admin' && (
          <button
            onClick={() => { router.push('/library'); onMobileClose?.() }}
            className="w-full flex items-center gap-2 px-2 py-2.5 md:py-2 rounded-lg text-left text-xs transition-all text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-800 dark:hover:text-slate-200"
          >
            <span className="opacity-60"><BookOpen size={13}/></span>
            Manual library
          </button>
        )}
        <button
          onClick={() => { router.push('/company-hub'); onMobileClose?.() }}
          className="w-full flex items-center gap-2 px-2 py-2.5 md:py-2 rounded-lg text-left text-xs transition-all text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-800 dark:hover:text-slate-200"
        >
          <span className="opacity-60"><Building size={13}/></span>
          Company Hub
        </button>
        <button
          onClick={() => { router.push('/profile'); onMobileClose?.() }}
          className="w-full flex items-center gap-2 px-2 py-2.5 md:py-2 rounded-lg text-left text-xs transition-all text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-800 dark:hover:text-slate-200"
        >
          <span className="opacity-60"><UserCircle size={13}/></span>
          My profile
        </button>
        <button
          onClick={() => { router.push('/feedback'); onMobileClose?.() }}
          className="w-full flex items-center gap-2 px-2 py-2.5 md:py-2 rounded-lg text-left text-xs transition-all text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-800 dark:hover:text-slate-200"
        >
          <span className="opacity-60"><MessageSquareWarning size={13}/></span>
          Feedback
        </button>
      </div>

      {/* Equipment list — admin only until live integration is ready */}
      {!minimal && currentUser?.role === 'admin' ? (
        <>
          <div className="flex-1 overflow-y-auto px-2 pt-2 min-h-0">
            <p className="px-2 text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-1">Equipment</p>
            <button
              onClick={() => handleSelect(null)}
              className={cn(
                'w-full text-left px-2 py-2.5 md:py-1.5 rounded-lg mb-1 text-xs transition-all',
                !selected ? 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm text-slate-900 dark:text-slate-100 font-medium' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              )}
            >
              General (no unit)
            </button>

            {equipment.map(eq => {
              const alarms = (eq.active_alarms ?? []).filter((a: { resolved_at?: string | null }) => !a.resolved_at)
              const daysSincePm = eq.last_pm_date
                ? Math.floor((Date.now() - new Date(eq.last_pm_date).getTime()) / 86400000)
                : null
              const pmOverdue = daysSincePm === null || daysSincePm > 90
              return (
                <button
                  key={eq.id}
                  onClick={() => handleSelect(eq)}
                  className={cn(
                    'w-full text-left px-2.5 py-2.5 md:py-2 rounded-lg mb-0.5 transition-all',
                    selected?.id === eq.id
                      ? 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm'
                      : 'hover:bg-slate-100 dark:hover:bg-slate-800'
                  )}
                >
                  <div className="flex items-start gap-2">
                    <div className={cn('w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0', statusDot(eq.status))} />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-slate-800 dark:text-slate-200 truncate leading-tight">{eq.name}</p>
                      <p className="text-[10px] text-slate-400 truncate mt-0.5">{eq.manufacturer} {eq.model}</p>
                      {alarms.length > 0 && (
                        <p className="text-[10px] text-red-500 font-medium mt-0.5">
                          ⚠ {alarms.length} alarm{alarms.length>1?'s':''}
                        </p>
                      )}
                      {pmOverdue && alarms.length === 0 && (
                        <p className="text-[10px] text-amber-500 font-medium mt-0.5">
                          {daysSincePm === null ? '⚑ No PM on record' : `⚑ PM overdue (${daysSincePm}d)`}
                        </p>
                      )}
                    </div>
                  </div>
                </button>
              )
            })}
          </div>

          <div className="px-2 pt-1 pb-1 border-t border-slate-200 dark:border-slate-800">
            <button
              onClick={() => { onAdd(); onMobileClose?.() }}
              className="w-full flex items-center justify-center gap-1.5 px-3 py-2.5 md:py-2 rounded-lg border border-dashed border-slate-300 dark:border-slate-700 text-xs text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all"
            >
              <Plus size={12}/> Add equipment
            </button>
          </div>
        </>
      ) : (
        <div className="flex-1 min-h-0" />
      )}

      {/* Apprentices overview — managers, journeymen, admins */}
      {currentUser?.role && ['admin', 'manager', 'journeyman'].includes(currentUser.role) && (
        <div className="px-2 pb-1">
          <button
            onClick={() => { router.push('/admin/apprentices'); onMobileClose?.() }}
            className="w-full flex items-center gap-2 px-2 py-2.5 md:py-2 rounded-lg text-xs text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-800 dark:hover:text-slate-200 transition-all"
          >
            <GraduationCap size={13} className="opacity-60"/>
            Team
          </button>
        </div>
      )}

      {/* Admin link */}
      {currentUser?.role === 'admin' && (
        <div className="px-2 pb-1">
          <button
            onClick={() => { router.push('/admin/users'); onMobileClose?.() }}
            className="w-full flex items-center gap-2 px-2 py-2.5 md:py-2 rounded-lg text-xs text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-800 dark:hover:text-slate-200 transition-all"
          >
            <Users size={13} className="opacity-60"/>
            Manage users
            {pendingCount > 0 && (
              <span className="ml-auto flex items-center justify-center min-w-[18px] h-[18px] px-1 text-[10px] font-bold bg-amber-500 text-white rounded-full">
                {pendingCount}
              </span>
            )}
          </button>
          <button
            onClick={() => { router.push('/admin/login-activity'); onMobileClose?.() }}
            className="w-full flex items-center gap-2 px-2 py-2.5 md:py-2 rounded-lg text-xs text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-800 dark:hover:text-slate-200 transition-all"
          >
            <RadioTower size={13} className="opacity-60"/>
            Login activity
          </button>
        </div>
      )}

      {/* User footer */}
      <div className="px-3 py-3 border-t border-slate-200 dark:border-slate-800">
        {currentUser && (
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <p className="text-xs font-medium text-slate-700 dark:text-slate-300 truncate">{currentUser.name || currentUser.email}</p>
              <p className="text-[10px] text-slate-400">{roleLabel[currentUser.role] ?? currentUser.role}</p>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={toggleTheme}
                title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
                className="flex-shrink-0 p-1.5 rounded-md text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                {theme === 'dark' ? <Sun size={13}/> : <Moon size={13}/>}
              </button>
              <button
                onClick={handleLogout}
                disabled={loggingOut}
                title="Sign out"
                className="flex-shrink-0 p-1.5 rounded-md text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors disabled:opacity-40"
              >
                <LogOut size={13}/>
              </button>
            </div>
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
      <aside className="hidden md:flex w-52 flex-shrink-0 flex-col bg-slate-50 dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 overflow-hidden">
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
        'fixed inset-y-0 left-0 z-50 w-72 flex flex-col bg-slate-50 dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 overflow-hidden transition-transform duration-300 ease-in-out md:hidden',
        mobileOpen ? 'translate-x-0' : '-translate-x-full'
      )}>
        <SidebarContent {...props} onMobileClose={onMobileClose} />
      </aside>
    </>
  )
}
