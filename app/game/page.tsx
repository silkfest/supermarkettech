'use client'
export const dynamic = 'force-dynamic'

import { useCallback, useEffect, useReducer, useRef, useState } from 'react'
import { Flag, X, Lock, CheckCircle2, ChevronRight, Pencil, Trophy, Navigation, BookOpen, Wrench, Sparkles, Zap, GraduationCap } from 'lucide-react'
import Image from 'next/image'
import PageHeader from '@/components/PageHeader'
import LearningTabBar from '@/components/layout/LearningTabBar'
import StoreMap, { SYSTEM_COLOR, LESSON_COLOR, type Hotspot } from '@/components/game/StoreMap'
import CallPanel from '@/components/game/CallPanel'
import LessonPanel from '@/components/game/LessonPanel'
import HandsOnPanel from '@/components/game/HandsOnPanel'
import ShiftHUD from '@/components/game/ShiftHUD'
import CharacterSetup from '@/components/game/CharacterSetup'
import ShiftReport from '@/components/game/ShiftReport'
import { shiftReducer, INITIAL_STATE, REAL_MS_PER_GAME_MIN, shiftGrade } from '@/lib/game/engine'
import { FAULT_BY_ID } from '@/lib/game/faults'
import { LEVELS, LEVEL_BY_ID, levelUnlock, lessonsPassed, type LevelDef } from '@/lib/game/levels'
import { LESSONS, LESSON_BY_STATION, type Lesson } from '@/lib/game/lessons'
import { loadGame, saveGame, recordLesson, recordShift, EMPTY_PROGRESS, type SavedGame } from '@/lib/game/progress'
import { portraitFor } from '@/lib/game/art'
import { readShift, writeShift, clearShift } from '@/lib/game/session'
import type { ShiftState } from '@/lib/game/engine'
import type { ActiveCall, CallResult, Character } from '@/lib/game/types'

const TICK_MS = 250

type View = 'hub' | 'setup' | 'classroom' | 'shift'
interface Panel { callId: string; faultId: string; equipmentId: string }

export default function ColdCallPage() {
  const [save, setSave] = useState<SavedGame | null>(null)
  const [view, setView] = useState<View>('hub')
  const [state, dispatch] = useReducer(shiftReducer, INITIAL_STATE)
  const [panel, setPanel] = useState<Panel | null>(null)
  const [lesson, setLesson] = useState<Lesson | null>(null)
  const [walkTo, setWalkTo] = useState<{ hotspotId: string; nonce: number } | null>(null)
  const [nearId, setNearId] = useState<string | null>(null)
  const [shiftOutcome, setShiftOutcome] = useState<{ isBest: boolean; unlocked: string | null } | null>(null)
  const [graduated, setGraduated] = useState(false)
  const [resumeShift, setResumeShift] = useState<ShiftState | null>(null)
  const [practice, setPractice] = useState(false)
  const [checkpointOk, setCheckpointOk] = useState(true)
  const recordedRef = useRef(false)

  useEffect(() => { loadGame().then(s => { setSave(s); if (s.character) setResumeShift(readShift(s.character)) }) }, [])

  useEffect(() => {
    if (state.status === 'running') setCheckpointOk(writeShift(state))
  }, [state])

  useEffect(() => {
    const hide = () => { if (document.hidden) dispatch({ type: 'PAUSE', paused: true }) }
    document.addEventListener('visibilitychange', hide)
    return () => document.removeEventListener('visibilitychange', hide)
  }, [])

  // Game clock
  useEffect(() => {
    if (view !== 'shift' || state.status !== 'running' || state.paused || state.practice) return
    const id = setInterval(() => dispatch({ type: 'TICK', dtMin: TICK_MS / REAL_MS_PER_GAME_MIN }), TICK_MS)
    return () => clearInterval(id)
  }, [view, state.status, state.paused, state.practice])

  useEffect(() => {
    if (!state.toasts.length) return
    const t = state.toasts[0]
    const id = setTimeout(() => dispatch({ type: 'DISMISS_TOAST', id: t.id }), 4500)
    return () => clearTimeout(id)
  }, [state.toasts])

  // Record the shift once it ends
  useEffect(() => {
    if (state.status !== 'over' || recordedRef.current || !save) return
    recordedRef.current = true
    clearShift(); setResumeShift(null)
    if (state.abandoned || state.practice) { setShiftOutcome(null); return }
    const g = shiftGrade(state.results, state.results.length + state.calls.length, state.complaints, state.shrink)
    const before = save.progress
    const after = recordShift(before, state.levelId, g.total, g.grade)
    const next = LEVELS.find(l => l.order === LEVEL_BY_ID[state.levelId].order + 1)
    const unlocked = next && !levelUnlock(before, next.id).ok && levelUnlock(after, next.id).ok ? next.name : null
    const isBest = g.total > (before.levels[state.levelId]?.bestScore ?? 0)
    const ns = { ...save, progress: after }
    setSave(ns)
    saveGame(ns)
    setShiftOutcome({ isBest, unlocked })
  }, [state.status, state.results, state.calls.length, state.complaints, state.shrink, state.levelId, state.abandoned, state.practice, save])

  function persist(ns: SavedGame) { setSave(ns); saveGame(ns) }

  function startLevel(level: LevelDef) {
    if (!save?.character) { setView('setup'); return }
    setPanel(null); setLesson(null); setNearId(null); setWalkTo(null)
    if (level.kind === 'classroom') { setView('classroom'); return }
    recordedRef.current = false
    setShiftOutcome(null)
    if (resumeShift && !window.confirm('Start a new shift and replace the saved shift on this browser?')) return
    setResumeShift(null)
    dispatch({ type: 'START', character: save.character, levelId: level.id, practice })
    setView('shift')
  }

  function saveCharacter(c: Character) {
    persist({ character: c, progress: save?.progress ?? EMPTY_PROGRESS })
    setView('hub')
  }

  const openCall = useCallback((callId: string) => {
    const call = state.calls.find(c => c.id === callId)
    if (call) setPanel({ callId, faultId: call.faultId, equipmentId: call.equipmentId })
  }, [state.calls])
  const openLesson = useCallback((stationId: string) => {
    const l = LESSON_BY_STATION[stationId]
    if (l) setLesson(l)
  }, [])

  const arriveRef = useRef<(id: string) => void>(() => {})
  arriveRef.current = view === 'classroom' ? openLesson : openCall
  const handleArrive = useCallback((id: string) => arriveRef.current(id), [])
  const handleNear = useCallback((id: string | null) => setNearId(id), [])

  function finishLesson(l: Lesson, score: number, passed: boolean) {
    if (!save) return
    const before = lessonsPassed(save.progress)
    const next = recordLesson(save.progress, l.id, score, passed)
    persist({ ...save, progress: next })
    if (before < LESSONS.length && lessonsPassed(next) === LESSONS.length) { setLesson(null); setGraduated(true) }
  }

  const level = LEVEL_BY_ID[state.levelId]
  const progress = save?.progress ?? EMPTY_PROGRESS
  const panelCall: ActiveCall | null = panel ? state.calls.find(c => c.id === panel.callId) ?? null : null
  const panelFault = panel ? FAULT_BY_ID[panel.faultId] : null
  const panelNode = panel ? level.map.equipment.find(e => e.id === panel.equipmentId)! : null

  const hotspots: Hotspot[] = view === 'classroom'
    ? LESSONS.map(l => ({ id: l.stationId, equipmentId: l.stationId, color: LESSON_COLOR, icon: 'lesson' as const, done: !!progress.lessons[l.id]?.passed }))
    : state.calls.map(c => {
        const f = FAULT_BY_ID[c.faultId]
        return { id: c.id, equipmentId: c.equipmentId, color: SYSTEM_COLOR[f.system], icon: f.system, cue: f.system, flagged: c.complained }
      })

  const playing = (view === 'classroom') || (view === 'shift' && state.status === 'running')
  const sidePanelOpen = view === 'classroom' ? lesson !== null : panel !== null
  const handsOn = view === 'classroom' && lesson?.kind === 'handson' ? lesson : null

  function leavePlay() {
    if (view === 'shift' && state.status === 'running') {
      if (window.confirm('End this shift? Partial shifts do not earn career XP or unlock levels. Use Pause to save and return later.')) dispatch({ type: 'END_SHIFT' })
      return
    }
    setLesson(null); setPanel(null); setView('hub')
  }

  // ── Play screen (classroom or running shift) ──
  if (playing) {
    const map = view === 'classroom' ? LEVEL_BY_ID.classroom.map : level.map
    const title = view === 'classroom' ? LEVEL_BY_ID.classroom.name : level.name
    const sidePanel = view === 'classroom'
      ? (lesson && lesson.kind === 'read' && (
          <LessonPanel key={lesson.id} lesson={lesson} alreadyPassed={!!progress.lessons[lesson.id]?.passed}
            onFinish={(score, passed) => finishLesson(lesson, score, passed)} onClose={() => setLesson(null)} />
        ))
      : (panel && panelFault && panelNode && (
          <CallPanel key={panel.callId} call={panelCall} fault={panelFault} node={panelNode}
            onUpdate={patch => dispatch({ type: 'UPDATE_CALL', callId: panel.callId, patch })}
            onSpend={minutes => dispatch({ type: 'SPEND_MINUTES', callId: panel.callId, minutes })}
            onComplete={(r: CallResult) => dispatch({ type: 'COMPLETE_CALL', result: r })}
            onClose={() => setPanel(null)} />
        ))
    const hud = (compact: boolean) => view === 'classroom'
      ? <StationList progress={progress} nearId={nearId} compact={compact} onWalkTo={id => setWalkTo({ hotspotId: id, nonce: Date.now() })} onOpen={openLesson} />
      : <ShiftHUD map={map} shiftLenMin={level.shiftLenMin} elapsedMin={state.elapsedMin} shrink={state.shrink} complaints={state.complaints}
          results={state.results} calls={state.calls} nearCallId={nearId} compact={compact}
          onWalkTo={id => setWalkTo({ hotspotId: id, nonce: Date.now() })} onOpen={openCall} />

    return (
      <div className="h-[100dvh] flex flex-col bg-slate-50 dark:bg-slate-900 overflow-hidden">
        <PageHeader
          title={title}
          home={false}
          back={false}
          variant="learning"
          sticky={false}
          className="safe-top flex-shrink-0 border-b border-slate-200 dark:border-slate-700 py-2.5"
          actions={
            <div className="flex gap-2">
            {view === 'shift' && <button onClick={() => dispatch({ type: 'PAUSE', paused: true })} className="text-xs px-3 py-1.5 rounded-lg border border-slate-400">Pause</button>}
            <button onClick={leavePlay}
              className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700">
              <Flag size={13} /> {view === 'shift' ? 'End shift' : 'Back to hub'}
            </button>
            </div>
          }
        />
        <div className="flex-1 min-h-0 flex flex-col lg:grid lg:grid-cols-[minmax(0,1fr)_360px] gap-2 lg:gap-3 p-2 lg:p-3">
          <div className="flex-1 min-h-0">
            <StoreMap key={map.w + '-' + map.h} map={map} character={save!.character!} hotspots={hotspots} walkTo={walkTo}
              paused={sidePanelOpen || (view === 'shift' && !!state.paused)} onArrive={handleArrive} onNearChange={handleNear} />
          </div>
          {/* Desktop: side column. Phone: the panel becomes a full-screen overlay; the HUD is hidden in favour of the compact one below. */}
          <div className={sidePanel
            ? 'fixed inset-0 z-40 bg-slate-900/50 flex flex-col justify-end lg:static lg:z-auto lg:bg-transparent lg:block lg:min-h-0 lg:overflow-y-auto'
            : 'hidden lg:block lg:min-h-0 lg:overflow-y-auto'}>
            {sidePanel ? <div className="h-[92%] p-2 lg:h-full lg:p-0">{sidePanel}</div> : hud(false)}
          </div>
          <div className="lg:hidden flex-shrink-0 px-1 pb-1">
            {hud(true)}
          </div>
        </div>

        {view === 'shift' && state.practice && <div className="text-center text-xs pb-2">Practice: clock advances with actions only. No career XP or unlocks.
          <button className="ml-2 underline" onClick={() => dispatch({ type: 'TICK', dtMin: 15 })}>Advance 15 game minutes</button>
        </div>}
        {view === 'shift' && state.paused && <div role="dialog" aria-modal="true" aria-label="Shift paused" className="fixed inset-0 z-50 bg-slate-900/80 flex items-center justify-center p-4">
          <div className="max-w-sm rounded-xl bg-white dark:bg-slate-800 p-6 space-y-4 text-slate-900 dark:text-white">
            <h2 className="font-bold">Shift paused</h2>
            <p className="text-sm">{checkpointOk ? 'Your calls and notes are saved on this browser. Resume here after reopening the game.' : 'Browser storage is unavailable. Keep this tab open to retain the shift.'}</p>
            <button autoFocus onClick={() => dispatch({ type: 'PAUSE', paused: false })} className="bg-blue-600 text-white rounded-lg px-4 py-2">Resume</button>
            <button onClick={() => { setResumeShift({ ...state, paused: true }); setView('hub') }} className="ml-3 underline">Back to hub</button>
          </div>
        </div>}
        {/* Hands-on stations need width: a centred modal on every screen size */}
        {handsOn && (
          <div className="fixed inset-0 z-40 bg-slate-900/60 flex items-end sm:items-center justify-center p-0 sm:p-4">
            <div className="w-full sm:max-w-3xl h-[94%] sm:h-[90%]">
              <HandsOnPanel key={handsOn.id} lesson={handsOn} alreadyPassed={!!progress.lessons[handsOn.id]?.passed}
                onFinish={(score, passed) => finishLesson(handsOn, score, passed)} onClose={() => setLesson(null)} />
            </div>
          </div>
        )}

        {graduated && (
          <Graduation
            name={save!.character!.name}
            xp={progress.xp}
            onStay={() => setGraduated(false)}
            onGo={() => { setGraduated(false); startLevel(LEVEL_BY_ID['gas-station']) }}
          />
        )}
        <Toasts toasts={state.toasts} onDismiss={id => dispatch({ type: 'DISMISS_TOAST', id })} />
      </div>
    )
  }

  // ── Scrolling views: hub, setup, report ──
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex flex-col">
      <PageHeader title="Cold Call" home={false} back={view === 'hub' ? '/simulation' : true} variant="learning" />
      <LearningTabBar />
      <div className="max-w-5xl mx-auto w-full px-4 py-6">
        {view === 'setup' && (
          <CharacterSetup initial={save?.character ?? INITIAL_STATE.character} submitLabel={save?.character ? 'Save' : 'Clock in'}
            onStart={saveCharacter} onCancel={save?.character ? () => setView('hub') : undefined} />
        )}

        {view === 'shift' && state.status === 'over' && (
          <ShiftReport
            unranked={state.abandoned ? 'Partial shift — no career XP or unlocks.' : state.practice ? 'Practice shift — no career XP or unlocks.' : undefined}
            levelName={level.name} map={level.map} character={state.character}
            results={state.results} unfinished={state.calls} shrink={state.shrink} complaints={state.complaints}
            isBest={shiftOutcome?.isBest ?? false} unlocked={shiftOutcome?.unlocked ?? null}
            onAgain={() => startLevel(level)}
            onHub={() => { dispatch({ type: 'RESET' }); setView('hub') }}
          />
        )}

        {view === 'hub' && (
          save === null ? (
            <p className="text-sm text-slate-500 dark:text-slate-400">Loading your progress…</p>
          ) : !save.character ? (
            <CharacterSetup initial={INITIAL_STATE.character} onStart={saveCharacter} />
          ) : (
            <>
              {resumeShift && <div className="mb-4 rounded-xl border border-blue-400 p-4"><p className="text-sm mb-2">Saved shift: {LEVEL_BY_ID[resumeShift.levelId].name} · {Math.floor(resumeShift.elapsedMin)} game minutes elapsed</p><button className="bg-blue-600 text-white rounded-lg px-4 py-2" onClick={() => { recordedRef.current = false; setPanel(null); setShiftOutcome(null); dispatch({ type: 'RESTORE', state: resumeShift }); setResumeShift(null); setView('shift') }}>Resume saved shift</button></div>}
              <label className="flex gap-2 mb-4 text-sm"><input type="checkbox" checked={practice} onChange={e => setPractice(e.target.checked)} /> Practice shifts — no real-time countdown or career rewards</label>
              <Hub save={save} onEdit={() => setView('setup')} onStart={startLevel} />
            </>
          )
        )}
      </div>
      <Toasts toasts={state.toasts} onDismiss={id => dispatch({ type: 'DISMISS_TOAST', id })} />
    </div>
  )
}

// ── Hub ──────────────────────────────────────────────────────────────────────
function Hub({ save, onEdit, onStart }: { save: SavedGame; onEdit: () => void; onStart: (l: LevelDef) => void }) {
  const c = save.character!
  const p = save.progress
  const passed = lessonsPassed(p)
  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-4 flex items-center gap-4">
        {portraitFor(c.color) ? (
          <Image src={portraitFor(c.color)!} alt="" width={56} height={56} className="w-14 h-14 rounded-xl object-cover border-2 flex-shrink-0" style={{ borderColor: c.color }} />
        ) : (
          <div className="w-12 h-12 rounded-xl flex items-center justify-center text-white flex-shrink-0" style={{ background: c.color }}>
            <Wrench size={22} />
          </div>
        )}
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-slate-900 dark:text-white truncate">{c.name}</p>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 capitalize">{c.role} · {p.xp} XP · {passed}/{LESSONS.length} stations · {Object.values(p.levels).reduce((a, l) => a + (l?.shifts ?? 0), 0)} shifts</p>
        </div>
        <button onClick={onEdit} className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700">
          <Pencil size={12} /> Edit
        </button>
      </div>

      <div>
        <div className="flex items-center gap-2 mb-1">
          <Sparkles size={15} className="text-blue-600 dark:text-blue-400" />
          <h1 className="text-lg font-bold text-slate-900 dark:text-white">Career path</h1>
        </div>
        <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">Learn the basics in the shop, prove it at a gas station, then run a full supermarket. Progress saves to your account.</p>
        <div className="grid gap-4 md:grid-cols-3">
          {LEVELS.map(l => {
            const unlock = levelUnlock(p, l.id)
            const stat = p.levels[l.id]
            const done = l.kind === 'classroom' ? passed === LESSONS.length : !!stat?.bestGrade && l.passGrades.includes(stat.bestGrade)
            return (
              <button key={l.id} onClick={() => unlock.ok && onStart(l)} disabled={!unlock.ok}
                className={`text-left bg-white dark:bg-slate-800 border rounded-2xl overflow-hidden transition-all flex flex-col ${
                  unlock.ok ? 'border-slate-200 dark:border-slate-700 hover:shadow-md hover:border-blue-400 dark:hover:border-blue-500' : 'border-slate-200 dark:border-slate-700 opacity-70 cursor-not-allowed'}`}>
                <div className="relative h-32 bg-slate-100 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700">
                  <Image src={`/game/level-${l.id === 'classroom' ? 'trade-school' : l.id}.png`} alt={`${l.name} illustration`} fill sizes="(min-width: 768px) 320px, 100vw" className="object-cover" />
                  <span className="absolute top-2 left-2 text-[10px] font-bold px-2 py-0.5 rounded-full bg-white/90 dark:bg-slate-900/90 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700">
                    Level {l.order}
                  </span>
                  {done && <span className="absolute top-2 right-2 text-emerald-600 dark:text-emerald-400 bg-white/90 dark:bg-slate-900/90 rounded-full p-0.5"><CheckCircle2 size={16} /></span>}
                  {!unlock.ok && (
                    <div className="absolute inset-0 bg-slate-900/40 flex items-center justify-center text-white">
                      <Lock size={22} />
                    </div>
                  )}
                </div>
                <div className="p-4 flex flex-col gap-1.5 flex-1">
                  <h2 className="text-sm font-bold text-slate-900 dark:text-white">{l.name}</h2>
                  <p className="text-[11px] font-medium text-blue-600 dark:text-blue-400">{l.subtitle}</p>
                  <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed flex-1">{l.description}</p>
                  <div className="pt-2 mt-1 border-t border-slate-100 dark:border-slate-700 flex items-center justify-between gap-2 text-[11px]">
                    {!unlock.ok ? (
                      <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1"><Lock size={10} /> {unlock.reason}</span>
                    ) : l.kind === 'classroom' ? (
                      <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1"><BookOpen size={10} /> {passed}/{LESSONS.length} stations passed</span>
                    ) : stat ? (
                      <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1"><Trophy size={10} /> Best {stat.bestGrade} · {stat.bestScore} pts · {stat.shifts} shift{stat.shifts !== 1 ? 's' : ''}</span>
                    ) : (
                      <span className="text-slate-500 dark:text-slate-400">No shifts yet</span>
                    )}
                    {unlock.ok && <span className="text-blue-600 dark:text-blue-400 font-semibold flex items-center gap-0.5 flex-shrink-0">{l.kind === 'classroom' ? 'Enter' : 'Clock in'} <ChevronRight size={12} /></span>}
                  </div>
                </div>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// ── Classroom station list ────────────────────────────────────────────────────
function StationList({ progress, nearId, compact, onWalkTo, onOpen }: {
  progress: SavedGame['progress']; nearId: string | null; compact: boolean; onWalkTo: (id: string) => void; onOpen: (id: string) => void
}) {
  const items = LESSONS.map(l => {
    const passed = !!progress.lessons[l.id]?.passed
    const near = nearId === l.stationId
    const hands = l.kind === 'handson'
    return (
      <div key={l.id} className={`flex items-center gap-2 px-2.5 py-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 ${compact ? 'flex-shrink-0 min-w-[220px]' : ''}`}>
        {passed ? <CheckCircle2 size={14} className="text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
          : hands ? <Zap size={13} className="text-amber-500 flex-shrink-0" />
          : <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: LESSON_COLOR }} />}
        <div className="min-w-0 flex-1">
          <p className="text-[12px] font-medium text-slate-800 dark:text-slate-200 truncate">{l.title}</p>
          <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate">{l.minutes} min · {passed ? 'passed' : hands ? `solve ${l.handson?.solvesToPass ?? 2} faults` : `${l.quiz.length} questions`}</p>
        </div>
        {near ? (
          <button onClick={() => onOpen(l.stationId)} className="text-[10px] font-semibold px-2 py-1 rounded-md bg-emerald-600 hover:bg-emerald-700 text-white flex-shrink-0">Open</button>
        ) : (
          <button onClick={() => onWalkTo(l.stationId)} className="text-[10px] font-medium px-2 py-1 rounded-md border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:border-emerald-400 flex items-center gap-1 flex-shrink-0"><Navigation size={10} /> Walk</button>
        )}
      </div>
    )
  })
  const n = lessonsPassed(progress)
  if (compact) {
    return (
      <div className="space-y-1.5">
        <p className="text-[11px] font-semibold text-slate-700 dark:text-slate-200">Stations · {n}/{LESSONS.length} passed</p>
        <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">{items}</div>
      </div>
    )
  }
  return (
    <div className="space-y-2">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Stations · {n}/{LESSONS.length} passed</p>
      <p className="text-[12px] text-slate-500 dark:text-slate-400">Walk to a station and open it. Read, then pass the check. No clock in here.</p>
      <div className="space-y-1.5">{items}</div>
    </div>
  )
}

function Graduation({ name, xp, onStay, onGo }: { name: string; xp: number; onStay: () => void; onGo: () => void }) {
  return (
    <div className="fixed inset-0 z-50 bg-slate-900/70 flex items-center justify-center p-4">
      <div className="relative w-full max-w-md bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-6 overflow-hidden page-fade-in">
        <div className="absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r from-emerald-500 via-cyan-500 to-blue-500" />
        <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
          {['#10b981', '#06b6d4', '#f59e0b', '#8b5cf6', '#ef4444', '#3b82f6'].map((c, i) => (
            <span key={i} className="absolute w-2 h-3 rounded-sm" style={{
              background: c, left: `${8 + i * 15}%`, top: '-6%',
              animation: `grad-fall ${2.2 + (i % 3) * 0.5}s ease-in ${i * 0.15}s infinite`,
            }} />
          ))}
        </div>
        <style>{`@keyframes grad-fall { 0% { transform: translateY(0) rotate(0deg); opacity: 1 } 100% { transform: translateY(420px) rotate(540deg); opacity: 0 } }`}</style>
        <div className="flex items-center gap-3 mb-3">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/30 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
            <GraduationCap size={24} />
          </div>
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">Trade School complete</p>
            <h2 className="text-base font-bold text-slate-900 dark:text-white">Congratulations, {name}.</h2>
          </div>
        </div>
        <p className="text-[13px] text-slate-600 dark:text-slate-400 leading-relaxed">
          All {LESSONS.length} stations signed off — cycle, instruments, PT charts, compressors, condensers, evaporators, service
          procedures, meters, both safety-circuit panels, defrost and safety. {xp} XP banked. The Corner Gas Station is unlocked
          and dispatch has your first call.
        </p>
        <div className="flex gap-2 mt-5">
          <button onClick={onStay} className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-200 text-sm font-semibold hover:bg-slate-50 dark:hover:bg-slate-700">
            Stay in the shop
          </button>
          <button onClick={onGo} className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold">
            Clock in at the gas station <ChevronRight size={14} />
          </button>
        </div>
      </div>
    </div>
  )
}

function Toasts({ toasts, onDismiss }: { toasts: { id: number; text: string; tone: string }[]; onDismiss: (id: number) => void }) {
  return (
    <div className="fixed bottom-4 left-3 z-50 flex flex-col gap-2 w-[min(320px,calc(100vw-24px))] pointer-events-none">
      {toasts.map(t => (
        <div key={t.id} className={`pointer-events-auto flex items-start gap-2 px-3 py-2 rounded-lg border shadow-md text-[12px] page-fade-in ${
          t.tone === 'crit' ? 'bg-red-50 dark:bg-red-500/15 border-red-200 dark:border-red-500/40 text-red-700 dark:text-red-200'
          : t.tone === 'warn' ? 'bg-amber-50 dark:bg-amber-500/15 border-amber-200 dark:border-amber-500/40 text-amber-700 dark:text-amber-200'
          : t.tone === 'good' ? 'bg-emerald-50 dark:bg-emerald-500/15 border-emerald-200 dark:border-emerald-500/40 text-emerald-700 dark:text-emerald-200'
          : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200'}`}>
          <span className="flex-1">{t.text}</span>
          <button onClick={() => onDismiss(t.id)} className="opacity-60 hover:opacity-100"><X size={12} /></button>
        </div>
      ))}
    </div>
  )
}
