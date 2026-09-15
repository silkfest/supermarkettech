'use client'
export const dynamic = 'force-dynamic'

import { useCallback, useEffect, useReducer, useRef, useState } from 'react'
import { Flag, X } from 'lucide-react'
import PageHeader from '@/components/PageHeader'
import LearningTabBar from '@/components/layout/LearningTabBar'
import StoreMap from '@/components/game/StoreMap'
import CallPanel from '@/components/game/CallPanel'
import ShiftHUD from '@/components/game/ShiftHUD'
import CharacterSetup from '@/components/game/CharacterSetup'
import ShiftReport from '@/components/game/ShiftReport'
import { shiftReducer, INITIAL_STATE, REAL_MS_PER_GAME_MIN, shiftGrade } from '@/lib/game/engine'
import { FAULT_BY_ID } from '@/lib/game/faults'
import { EQUIPMENT } from '@/lib/game/store'
import type { ActiveCall, CallResult, Character } from '@/lib/game/types'

const CHAR_KEY = 'coldcall_character'
const BEST_KEY = 'coldcall_best'
const TICK_MS = 250

interface Panel { callId: string; faultId: string; equipmentId: string }

export default function ColdCallPage() {
  const [state, dispatch] = useReducer(shiftReducer, INITIAL_STATE)
  const [initialChar, setInitialChar] = useState<Character>(INITIAL_STATE.character)
  const [best, setBest] = useState<{ score: number; grade: string } | null>(null)
  const [panel, setPanel] = useState<Panel | null>(null)
  const [walkTo, setWalkTo] = useState<{ callId: string; nonce: number } | null>(null)
  const [nearCallId, setNearCallId] = useState<string | null>(null)
  const [isBest, setIsBest] = useState(false)
  const savedRef = useRef(false)

  useEffect(() => {
    try {
      const c = localStorage.getItem(CHAR_KEY)
      if (c) setInitialChar(JSON.parse(c))
      const b = localStorage.getItem(BEST_KEY)
      if (b) setBest(JSON.parse(b))
    } catch { /* ignore */ }
  }, [])

  // Game clock
  useEffect(() => {
    if (state.status !== 'running') return
    const id = setInterval(() => dispatch({ type: 'TICK', dtMin: TICK_MS / REAL_MS_PER_GAME_MIN }), TICK_MS)
    return () => clearInterval(id)
  }, [state.status])

  // Toasts auto-dismiss
  useEffect(() => {
    if (!state.toasts.length) return
    const t = state.toasts[0]
    const id = setTimeout(() => dispatch({ type: 'DISMISS_TOAST', id: t.id }), 4500)
    return () => clearTimeout(id)
  }, [state.toasts])

  // Persist best score once per shift
  useEffect(() => {
    if (state.status !== 'over' || savedRef.current) return
    savedRef.current = true
    const g = shiftGrade(state.results, state.results.length + state.calls.length, state.complaints, state.shrink)
    if (!best || g.total > best.score) {
      const nb = { score: g.total, grade: g.grade }
      setBest(nb)
      setIsBest(true)
      try { localStorage.setItem(BEST_KEY, JSON.stringify(nb)) } catch { /* ignore */ }
    }
  }, [state.status, state.results, state.calls.length, state.complaints, state.shrink, best])

  function start(c: Character) {
    try { localStorage.setItem(CHAR_KEY, JSON.stringify(c)) } catch { /* ignore */ }
    setInitialChar(c)
    savedRef.current = false
    setIsBest(false)
    setPanel(null)
    dispatch({ type: 'START', character: c })
  }

  const openCall = useCallback((callId: string) => {
    const call = state.calls.find(c => c.id === callId)
    if (call) setPanel({ callId, faultId: call.faultId, equipmentId: call.equipmentId })
  }, [state.calls])

  const openCallRef = useRef(openCall)
  openCallRef.current = openCall
  const handleArrive = useCallback((id: string) => openCallRef.current(id), [])
  const handleNear = useCallback((id: string | null) => setNearCallId(id), [])

  const panelCall: ActiveCall | null = panel ? state.calls.find(c => c.id === panel.callId) ?? null : null
  const panelFault = panel ? FAULT_BY_ID[panel.faultId] : null
  const panelNode = panel ? EQUIPMENT.find(e => e.id === panel.equipmentId)! : null

  function completeCall(r: CallResult) { dispatch({ type: 'COMPLETE_CALL', result: r }) }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex flex-col">
      <PageHeader
        title="Cold Call"
        home={false}
        back="/simulation"
        variant="learning"
        actions={state.status === 'running' ? (
          <button onClick={() => dispatch({ type: 'END_SHIFT' })}
            className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700">
            <Flag size={13} /> End shift
          </button>
        ) : undefined}
      />
      <LearningTabBar />

      <div className="max-w-6xl mx-auto w-full px-4 py-4">
        {state.status === 'setup' && (
          <div className="py-6">
            <CharacterSetup initial={initialChar} best={best} onStart={start} />
          </div>
        )}

        {state.status === 'over' && (
          <div className="py-6">
            <ShiftReport
              character={state.character}
              results={state.results}
              unfinished={state.calls}
              shrink={state.shrink}
              complaints={state.complaints}
              isBest={isBest}
              onAgain={() => { setPanel(null); dispatch({ type: 'RESET' }) }}
            />
          </div>
        )}

        {state.status === 'running' && (
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
            <div className="min-w-0">
              <StoreMap
                character={state.character}
                calls={state.calls}
                walkTo={walkTo}
                paused={panel !== null}
                onArrive={handleArrive}
                onNearChange={handleNear}
              />
            </div>

            {/* Side column on desktop; on phones the HUD sits under the map and the call panel becomes an overlay */}
            <div className="min-w-0 lg:min-h-[560px]">
              {panel && panelFault && panelNode && (
                <div className="fixed inset-0 z-40 bg-slate-900/50 flex flex-col justify-end lg:static lg:z-auto lg:bg-transparent lg:block lg:h-full">
                  <div className="safe-top h-[92%] p-2 lg:h-full lg:p-0">
                    <CallPanel
                      key={panel.callId}
                      call={panelCall}
                      fault={panelFault}
                      node={panelNode}
                      onUpdate={patch => dispatch({ type: 'UPDATE_CALL', callId: panel.callId, patch })}
                      onSpend={minutes => dispatch({ type: 'SPEND_MINUTES', callId: panel.callId, minutes })}
                      onComplete={completeCall}
                      onClose={() => setPanel(null)}
                    />
                  </div>
                </div>
              )}
              <div className={panel ? 'lg:hidden' : ''}>
                <ShiftHUD
                  elapsedMin={state.elapsedMin} shrink={state.shrink} complaints={state.complaints}
                  results={state.results} calls={state.calls} nearCallId={nearCallId}
                  onWalkTo={id => setWalkTo({ callId: id, nonce: Date.now() })}
                  onOpen={openCall}
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Toasts */}
      <div className="fixed bottom-4 left-3 z-50 flex flex-col gap-2 w-[min(320px,calc(100vw-24px))] pointer-events-none">
        {state.toasts.map(t => (
          <div key={t.id} className={`pointer-events-auto flex items-start gap-2 px-3 py-2 rounded-lg border shadow-md text-[12px] page-fade-in ${
            t.tone === 'crit' ? 'bg-red-50 dark:bg-red-500/15 border-red-200 dark:border-red-500/40 text-red-700 dark:text-red-200'
            : t.tone === 'warn' ? 'bg-amber-50 dark:bg-amber-500/15 border-amber-200 dark:border-amber-500/40 text-amber-700 dark:text-amber-200'
            : t.tone === 'good' ? 'bg-emerald-50 dark:bg-emerald-500/15 border-emerald-200 dark:border-emerald-500/40 text-emerald-700 dark:text-emerald-200'
            : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200'}`}>
            <span className="flex-1">{t.text}</span>
            <button onClick={() => dispatch({ type: 'DISMISS_TOAST', id: t.id })} className="opacity-60 hover:opacity-100"><X size={12} /></button>
          </div>
        ))}
      </div>
    </div>
  )
}
