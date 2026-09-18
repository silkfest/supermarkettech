'use client'
export const dynamic = 'force-dynamic'

import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react'
import { Flag, X, Lock, CheckCircle2, ChevronRight, Pencil, Trophy, Navigation, BookOpen, Wrench, Sparkles, Zap, GraduationCap, Map as MapIcon, LayoutGrid, BadgeCheck, Clock3, Truck } from 'lucide-react'
import Image from 'next/image'
import PageHeader from '@/components/PageHeader'
import LearningTabBar from '@/components/layout/LearningTabBar'
import StoreMap, { MapThumb, SYSTEM_COLOR, LESSON_COLOR, type Hotspot } from '@/components/game/StoreMap'
import EquipmentInspection from '@/components/game/inspection/EquipmentInspection'
import CallPanel from '@/components/game/CallPanel'
import LessonPanel from '@/components/game/LessonPanel'
import HandsOnPanel from '@/components/game/HandsOnPanel'
import ShiftHUD from '@/components/game/ShiftHUD'
import CharacterSetup from '@/components/game/CharacterSetup'
import ShiftReport from '@/components/game/ShiftReport'
import { shiftReducer, INITIAL_STATE, REAL_MS_PER_GAME_MIN, shiftGrade, assignedCalls, earnedShiftHours, shiftCallTarget } from '@/lib/game/engine'
import { FAULT_BY_ID } from '@/lib/game/faults'
import { LEVELS, LEVEL_BY_ID, levelUnlock, lessonsPassed, type LevelDef } from '@/lib/game/levels'
import { TOWN_MAP } from '@/lib/game/maps/town'
import { rankOf, rankGap, RANKS, DIFFICULTY_LABEL, type RankDef } from '@/lib/game/ranks'
import { TOOLS, ownedTools } from '@/lib/game/tools'
import { LESSONS, LESSON_BY_STATION, type Lesson } from '@/lib/game/lessons'
import { loadGame, saveGame, recordLesson, recordShift, EMPTY_PROGRESS, type GameProgress, type LevelId, type SavedGame } from '@/lib/game/progress'
import { loadActiveShift, saveActiveShift } from '@/lib/game/session'
import { portraitFor } from '@/lib/game/art'
import type { ActiveCall, CallResult, Character } from '@/lib/game/types'

const TICK_MS = 250

type View = 'town' | 'hub' | 'setup' | 'classroom' | 'shift'
interface Panel { callId: string; faultId: string; equipmentId: string }

/** Levels the oblique sprite set covers. The deeper stores still draw flat
 *  until their gas coolers, flash tanks and skids have sprites of their own. */
const PIXEL_LEVELS = new Set<LevelId>(['supermarket', 'gas-station'])

export default function ColdCallPage() {
  const [save, setSave] = useState<SavedGame | null>(null)
  const [view, setView] = useState<View>('town')
  const [state, dispatch] = useReducer(shiftReducer, INITIAL_STATE)
  const [panel, setPanel] = useState<Panel | null>(null)
  const [lesson, setLesson] = useState<Lesson | null>(null)
  const [walkTo, setWalkTo] = useState<{ hotspotId: string; nonce: number } | null>(null)
  const [nearId, setNearId] = useState<string | null>(null)
  const [shiftOutcome, setShiftOutcome] = useState<{ isBest: boolean; unlocked: string | null; promoted: string | null; hours: number } | null>(null)
  const [stop, setStop] = useState<string | null>(null)
  const [driveTo, setDriveTo] = useState<{ hotspotId: string; nonce: number } | null>(null)
  const [graduated, setGraduated] = useState(false)
  const [briefing, setBriefing] = useState<LevelDef | null>(null)
  const recordedRef = useRef(false)
  const [checkpointFailed, setCheckpointFailed] = useState(false)

  useEffect(() => {
    let cancelled = false
    loadGame().then(loaded => {
      if (cancelled) return
      setSave(loaded)
      const active = loadActiveShift(loaded)
      if (active) {
        dispatch({ type: 'RESTORE', state: active.state })
        setBriefing(active.briefing ? LEVEL_BY_ID[active.state.levelId] : null)
        setView('shift')
      }
    })
    return () => { cancelled = true }
  }, [])

  // Save after actions and clock ticks. Completed shifts are removed before
  // career credit is recorded, so reloading cannot award the same shift twice.
  useEffect(() => {
    if (!save || state.status === 'idle') return
    setCheckpointFailed(!saveActiveShift(save, state, !!briefing))
  }, [save, state, briefing])

  // Game clock
  useEffect(() => {
    if (view !== 'shift' || state.status !== 'running' || briefing) return
    const id = setInterval(() => dispatch({ type: 'TICK', dtMin: TICK_MS / REAL_MS_PER_GAME_MIN }), TICK_MS)
    return () => clearInterval(id)
  }, [view, state.status, briefing])

  useEffect(() => {
    if (!state.toasts.length) return
    const t = state.toasts[0]
    const id = setTimeout(() => dispatch({ type: 'DISMISS_TOAST', id: t.id }), 4500)
    return () => clearTimeout(id)
  }, [state.toasts])

  // Record the shift once it ends
  useEffect(() => {
    if (state.status !== 'over' || state.practice || recordedRef.current || !save) return
    recordedRef.current = true
    const g = shiftGrade(state.results, assignedCalls(state), state.complaints, state.shrink)
    const before = save.progress
    const hours = earnedShiftHours(state)
    const after = state.results.length ? recordShift(before, state.levelId, g.total, g.grade, hours) : before
    const newly = LEVELS.filter(l => !levelUnlock(before, l.id).ok && levelUnlock(after, l.id).ok)
    const unlocked = newly.length === 0 ? null : newly.length === 1 ? newly[0].name : `${newly.length} new stores`
    const promoted = rankOf(after).tier > rankOf(before).tier ? rankOf(after).name : null
    const isBest = g.total > (before.levels[state.levelId]?.bestScore ?? 0)
    const ns = { ...save, progress: after }
    setSave(ns)
    saveGame(ns)
    setShiftOutcome({ isBest, unlocked, promoted, hours })
  }, [state, save])

  function persist(ns: SavedGame) { setSave(ns); saveGame(ns) }

  function startLevel(level: LevelDef, practice = false) {
    if (!save?.character) { setView('setup'); return }
    setPanel(null); setLesson(null); setNearId(null); setWalkTo(null); setStop(null)
    if (level.kind === 'classroom') { setView('classroom'); return }
    recordedRef.current = false
    setShiftOutcome(null)
    // First time on a level with a briefing, read it before the clock starts.
    setBriefing(!practice && level.briefing && !save.progress.levels[level.id]?.shifts ? level : null)
    // Your rank decides which board you work and how hard a call dispatch will send.
    const rank = rankOf(save.progress)
    dispatch({
      type: 'START',
      character: { ...save.character, role: rank.pacing },
      levelId: level.id,
      maxDifficulty: rank.maxDifficulty,
      practice,
    })
    setView('shift')
  }

  function saveCharacter(c: Character) {
    persist({ character: c, progress: save?.progress ?? EMPTY_PROGRESS })
    setView('town')
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
  // Stable, so the town map's animation loop is not torn down on every frame it renders.
  const handlePullIn = useCallback((id: string) => setStop(id), [])

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
        return { id: c.id, equipmentId: c.equipmentId, color: SYSTEM_COLOR[f.system], icon: f.system, cue: f.system, flagged: c.complained, physical: !!c.inspection }
      })

  // The crib travels with the tech, so the shift and the dispatch board agree on it.
  const owned = useMemo(() => ownedTools(rankOf(progress)), [progress])
  const playing = (view === 'classroom') || (view === 'shift' && state.status === 'running')
  const sidePanelOpen = view === 'classroom' ? lesson !== null : panel !== null
  const handsOn = view === 'classroom' && lesson?.kind === 'handson' ? lesson : null

  function leavePlay() {
    if (view === 'shift' && state.status === 'running') { dispatch({ type: 'END_SHIFT' }); return }
    setLesson(null); setPanel(null); setView('town')
  }

  // ── The town: drive between the stores on the career path ──
  if (view === 'town' && save?.character) {
    const rank = rankOf(progress)
    const townHotspots: Hotspot[] = TOWN_MAP.equipment.map(n => {
      if (n.id === 'shop') return { id: n.id, equipmentId: n.id, color: '#f59e0b', icon: 'shop' as const }
      const l = LEVEL_BY_ID[n.id as LevelId]
      const open = levelUnlock(progress, l.id).ok
      const stat = progress.levels[l.id]
      const done = l.kind === 'classroom'
        ? lessonsPassed(progress) === LESSONS.length
        : !!stat?.bestGrade && l.passGrades.includes(stat.bestGrade)
      return { id: n.id, equipmentId: n.id, color: open ? (n.accent ?? '#2563eb') : '#94a3b8', icon: 'store' as const, done }
    })
    return (
      <div className="h-[100dvh] flex flex-col bg-slate-50 dark:bg-slate-900 overflow-hidden">
        <PageHeader
          title="Hillcrest"
          home={false}
          back={false}
          variant="learning"
          sticky={false}
          className="safe-top flex-shrink-0 border-b border-slate-200 dark:border-slate-700 py-2.5"
          actions={
            <div className="flex gap-2">
            <button onClick={() => startLevel(LEVEL_BY_ID.supermarket, true)} className="text-xs px-3 py-2 rounded-lg bg-blue-600 text-white">F1 field practice</button>
            <button onClick={() => setView('hub')}
              className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700">
              <LayoutGrid size={13} /> Job list
            </button>
            </div>
          }
        />
        <div className="flex-1 min-h-0 p-2 lg:p-3">
          <StoreMap key="town" map={TOWN_MAP} character={save.character} hotspots={townHotspots} walkTo={driveTo}
            paused={stop !== null} vehicle pixelArt onArrive={handlePullIn} onNearChange={handleNear} />
        </div>
        <div className="flex-shrink-0 px-3 pb-2 space-y-1.5">
          <div className="flex items-center gap-2">
            <RankChip rank={rank} hours={progress.hours} />
            <button onClick={() => setStop('shop')}
              className="flex items-center gap-1.5 text-[11px] font-medium px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:border-amber-400">
              <Wrench size={11} /> Dispatch board
            </button>
          </div>
          {/* Every stop in town, so nobody has to hunt for a sign on a phone screen. */}
          <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
            {TOWN_MAP.equipment.filter(n => n.id !== 'shop').map(n => {
              const l = LEVEL_BY_ID[n.id as LevelId]
              const open = levelUnlock(progress, l.id).ok
              const here = nearId === n.id
              return (
                <button key={n.id} onClick={() => here ? setStop(n.id) : setDriveTo({ hotspotId: n.id, nonce: Date.now() })}
                  className={`flex-shrink-0 flex items-center gap-1.5 text-[11px] font-medium px-2.5 py-1.5 rounded-lg border ${
                    here ? 'bg-emerald-600 border-emerald-600 text-white font-semibold'
                    : open ? 'border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:border-blue-400'
                    : 'border-slate-200 dark:border-slate-700 text-slate-400 dark:text-slate-500'}`}>
                  {here ? <ChevronRight size={11} /> : open ? <Navigation size={11} /> : <Lock size={10} />}
                  {n.short}
                </button>
              )
            })}
          </div>
        </div>

        {stop === 'shop' && <DispatchBoard progress={progress} onClose={() => setStop(null)} />}
        {stop && stop !== 'shop' && (
          <StopCard
            level={LEVEL_BY_ID[stop as LevelId]}
            progress={progress}
            onClose={() => setStop(null)}
            onStart={() => startLevel(LEVEL_BY_ID[stop as LevelId])}
          />
        )}
      </div>
    )
  }

  // ── Play screen (classroom or running shift) ──
  if (playing) {
    const map = view === 'classroom' ? LEVEL_BY_ID.classroom.map : level.map
    const title = view === 'classroom' ? LEVEL_BY_ID.classroom.name : state.practice ? 'Full Supermarket · F1 practice' : level.name
    const sidePanel = view === 'classroom'
      ? (lesson && lesson.kind === 'read' && (
          <LessonPanel key={lesson.id} lesson={lesson} alreadyPassed={!!progress.lessons[lesson.id]?.passed}
            onFinish={(score, passed) => finishLesson(lesson, score, passed)} onClose={() => setLesson(null)} />
        ))
      : (panel && panelFault && panelNode && (
          (state.levelId === 'supermarket' && panel.equipmentId === 'F1' && panel.faultId === 'defrost_heater_open'
            ? <EquipmentInspection key={panel.callId} call={panelCall} result={state.results.find(r => r.callId === panel.callId)} owned={owned}
                onAction={action => dispatch({ type: 'INSPECT', callId: panel.callId, action })}
                onComplete={result => dispatch({ type: 'COMPLETE_CALL', result })} onClose={() => setPanel(null)} />
            : <CallPanel key={panel.callId} call={panelCall} fault={panelFault} node={panelNode} owned={owned}
            firstShift={!(save?.progress.levels[state.levelId]?.shifts ?? 0)}
            onUpdate={patch => dispatch({ type: 'UPDATE_CALL', callId: panel.callId, patch })}
            onSpend={minutes => dispatch({ type: 'SPEND_MINUTES', callId: panel.callId, minutes })}
            onComplete={(r: CallResult) => dispatch({ type: 'COMPLETE_CALL', result: r })}
            onClose={() => setPanel(null)} />)
        ))
    const hud = (compact: boolean) => view === 'classroom'
      ? <StationList progress={progress} nearId={nearId} compact={compact} onWalkTo={id => setWalkTo({ hotspotId: id, nonce: Date.now() })} onOpen={openLesson} />
      : <ShiftHUD map={map} shiftLenMin={level.shiftLenMin} callTarget={shiftCallTarget(state)} elapsedMin={state.elapsedMin} shrink={state.shrink} complaints={state.complaints}
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
            <button onClick={leavePlay}
              className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700">
              <Flag size={13} /> {view === 'shift' ? 'End shift' : 'Back to hub'}
            </button>
          }
        />
        {checkpointFailed && <p role="status" className="px-3 py-1 text-xs text-amber-700 dark:text-amber-400">This browser could not save your shift. Keep this tab open to finish.</p>}
        <div className="flex-1 min-h-0 flex flex-col lg:grid lg:grid-cols-[minmax(0,1fr)_360px] gap-2 lg:gap-3 p-2 lg:p-3">
          <div className="flex-1 min-h-0">
            <StoreMap key={map.w + '-' + map.h} map={map} character={save!.character!} hotspots={hotspots} walkTo={walkTo}
              pixelArt={view === 'shift' && PIXEL_LEVELS.has(state.levelId)}
              visualStates={Object.fromEntries([...state.results, ...state.calls].filter(c => c.inspection).map(c => [c.equipmentId, { frost: c.inspection!.frost, defrost: c.inspection!.defrostStarted !== null, repaired: c.inspection!.repaired, pullingDown: c.inspection!.terminatedAt !== null }]))}
              paused={sidePanelOpen} onArrive={handleArrive} onNearChange={handleNear} />
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

        {/* Hands-on stations need width: a centred modal on every screen size */}
        {handsOn && (
          <div className="fixed inset-0 z-40 bg-slate-900/60 flex items-end sm:items-center justify-center p-0 sm:p-4">
            <div className="w-full sm:max-w-3xl h-[94%] sm:h-[90%]">
              <HandsOnPanel key={handsOn.id} lesson={handsOn} alreadyPassed={!!progress.lessons[handsOn.id]?.passed}
                onFinish={(score, passed) => finishLesson(handsOn, score, passed)} onClose={() => setLesson(null)} />
            </div>
          </div>
        )}

        {briefing && briefing.briefing && (
          <Briefing level={briefing} onStart={() => setBriefing(null)} />
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
      <PageHeader title="Cold Call" home={false} back={view === 'hub' || view === 'town' ? '/simulation' : true} variant="learning" />
      <LearningTabBar />
      <div className="max-w-5xl mx-auto w-full px-4 py-6">
        {view === 'setup' && (
          <CharacterSetup initial={save?.character ?? INITIAL_STATE.character} submitLabel={save?.character ? 'Save' : 'Clock in'}
            onStart={saveCharacter} onCancel={save?.character ? () => setView('hub') : undefined} />
        )}

        {view === 'shift' && state.status === 'over' && (
          <ShiftReport
            assignedCalls={assignedCalls(state)} levelName={state.practice ? 'F1 field practice' : level.name} map={level.map} character={state.character}
            results={state.results} unfinished={state.calls} shrink={state.shrink} complaints={state.complaints}
            isBest={shiftOutcome?.isBest ?? false} unlocked={shiftOutcome?.unlocked ?? null}
            promoted={shiftOutcome?.promoted ?? null} hours={shiftOutcome?.hours ?? 0} hoursTotal={progress.hours}
            onAgain={() => startLevel(level, state.practice)}
            onHub={() => { dispatch({ type: 'RESET' }); setView('town') }}
          />
        )}

        {(view === 'hub' || view === 'town') && (
          save === null ? (
            <p className="text-sm text-slate-500 dark:text-slate-400">Loading your progress…</p>
          ) : !save.character ? (
            <CharacterSetup initial={INITIAL_STATE.character} onStart={saveCharacter} />
          ) : (
            <Hub save={save} onEdit={() => setView('setup')} onStart={startLevel} onTown={() => setView('town')} />
          )
        )}
      </div>
      <Toasts toasts={state.toasts} onDismiss={id => dispatch({ type: 'DISMISS_TOAST', id })} />
    </div>
  )
}

// ── Hub ──────────────────────────────────────────────────────────────────────
function Hub({ save, onEdit, onStart, onTown }: { save: SavedGame; onEdit: () => void; onStart: (l: LevelDef) => void; onTown: () => void }) {
  const c = save.character!
  const p = save.progress
  const passed = lessonsPassed(p)
  const rank = rankOf(p)
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
          <p className="text-[11px] font-semibold text-blue-600 dark:text-blue-400">{rank.name}</p>
          <p className="text-[11px] text-slate-500 dark:text-slate-400">{Math.round(p.hours)} h logged · {p.xp} XP · {passed}/{LESSONS.length} stations · {Object.values(p.levels).reduce((a, l) => a + (l?.shifts ?? 0), 0)} shifts</p>
        </div>
        <button onClick={onEdit} className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700">
          <Pencil size={12} /> Edit
        </button>
      </div>

      <div>
        <div className="flex items-center gap-2 mb-1">
          <Sparkles size={15} className="text-blue-600 dark:text-blue-400" />
          <h1 className="text-lg font-bold text-slate-900 dark:text-white">Career path</h1>
          <button onClick={onTown}
            className="ml-auto flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:border-blue-400">
            <MapIcon size={12} /> Town map
          </button>
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
                  {l.card
                    ? <Image src={l.card} alt="" fill sizes="(max-width: 640px) 100vw, 320px" className="object-cover" />
                    : <MapThumb map={l.map} className="w-full h-full" />}
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
                  {l.kind === 'shift' && (
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1">
                      <Clock3 size={10} /> {l.callTarget ? `${l.callTarget} calls, then you are done` : `${l.shiftLenMin / 60} h shift`}
                    </p>
                  )}
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

// ── Town: rank chip, stop card, dispatch board ────────────────────────────────
function RankChip({ rank, hours }: { rank: RankDef; hours: number }) {
  return (
    <span className="flex-shrink-0 flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1.5 rounded-lg bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/30 text-blue-700 dark:text-blue-300">
      <BadgeCheck size={12} /> {rank.name}
      <span className="font-normal text-blue-600/70 dark:text-blue-400/70">· {Math.round(hours)} h</span>
    </span>
  )
}

/** Pulled up outside a store: what this stop is, and whether you can take it. */
function StopCard({ level, progress, onClose, onStart }: {
  level: LevelDef; progress: GameProgress; onClose: () => void; onStart: () => void
}) {
  const unlock = levelUnlock(progress, level.id)
  const stat = progress.levels[level.id]
  const passedStations = lessonsPassed(progress)
  const rank = rankOf(progress)
  return (
    <div className="fixed inset-0 z-50 bg-slate-900/70 flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={onClose}>
      <div className="w-full sm:max-w-md bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-t-2xl sm:rounded-2xl overflow-hidden page-fade-in"
        onClick={e => e.stopPropagation()}>
        <div className="relative h-28 bg-slate-100 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700">
          {level.card
            ? <Image src={level.card} alt="" fill sizes="440px" className="object-cover" />
            : <MapThumb map={level.map} className="w-full h-full" />}
          <button onClick={onClose} aria-label="Close"
            className="absolute top-2 right-2 w-7 h-7 rounded-full bg-white/90 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 flex items-center justify-center">
            <X size={14} />
          </button>
          <span className="absolute top-2 left-2 text-[10px] font-bold px-2 py-0.5 rounded-full bg-white/90 dark:bg-slate-900/90 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700">
            Level {level.order}
          </span>
        </div>
        <div className="p-4 space-y-2">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white">{level.name}</h2>
            <p className="text-[11px] font-medium text-blue-600 dark:text-blue-400">{level.subtitle}</p>
          </div>
          <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">{level.description}</p>
          <div className="flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400 pt-1">
            {level.kind === 'classroom' ? (
              <span className="flex items-center gap-1"><BookOpen size={11} /> {passedStations}/{LESSONS.length} stations passed</span>
            ) : stat ? (
              <span className="flex items-center gap-1"><Trophy size={11} /> Best {stat.bestGrade} · {stat.bestScore} pts · {stat.shifts} shift{stat.shifts !== 1 ? 's' : ''}</span>
            ) : (
              <span>No shifts here yet</span>
            )}
            {level.kind === 'shift' && (
              <span className="flex items-center gap-1 ml-auto"><Clock3 size={11} /> {level.callTarget ? `${level.callTarget} calls` : `${level.shiftLenMin / 60} h shift`}</span>
            )}
          </div>
          {unlock.ok && level.kind === 'shift' && (
            <p className="text-[11px] text-slate-500 dark:text-slate-400 px-2.5 py-2 rounded-lg bg-slate-50 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-700">
              Dispatch has you at <b className="text-slate-700 dark:text-slate-200">{rank.name}</b> — {DIFFICULTY_LABEL[rank.maxDifficulty].toLowerCase()} and everything below it.
            </p>
          )}
          {unlock.ok ? (
            <button onClick={onStart}
              className="w-full flex items-center justify-center gap-1.5 py-2.5 mt-1 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold">
              {level.kind === 'classroom' ? 'Go in' : 'Clock in'} <ChevronRight size={14} />
            </button>
          ) : (
            <p className="flex items-center gap-1.5 text-[12px] text-slate-500 dark:text-slate-400 px-3 py-2.5 mt-1 rounded-xl border border-slate-200 dark:border-slate-600">
              <Lock size={12} className="flex-shrink-0" /> {unlock.reason}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

/** The board on the shop wall: where you are on the ladder and what moves you up. */
function DispatchBoard({ progress, onClose }: { progress: GameProgress; onClose: () => void }) {
  const rank = rankOf(progress)
  const gap = rankGap(progress)
  const span = gap ? Math.max(1, gap.next.hours - rank.hours) : 1
  const pct = gap ? Math.min(100, Math.max(0, ((progress.hours - rank.hours) / span) * 100)) : 100
  return (
    <div className="fixed inset-0 z-50 bg-slate-900/70 flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={onClose}>
      <div className="w-full sm:max-w-md max-h-[92dvh] overflow-y-auto bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-t-2xl sm:rounded-2xl p-5 page-fade-in"
        onClick={e => e.stopPropagation()}>
        <div className="flex items-start gap-3 mb-4">
          <div className="w-11 h-11 rounded-xl bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/30 text-amber-600 dark:text-amber-400 flex items-center justify-center flex-shrink-0">
            <Truck size={22} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-amber-600 dark:text-amber-400">Dispatch board</p>
            <h2 className="text-base font-bold text-slate-900 dark:text-white leading-tight">{rank.name}</h2>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">{Math.round(progress.hours)} hours on the book</p>
          </div>
          <button onClick={onClose} aria-label="Close" className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"><X size={16} /></button>
        </div>

        <p className="text-[12px] text-slate-600 dark:text-slate-400 leading-relaxed mb-3">{rank.blurb}</p>

        {gap ? (
          <div className="px-3 py-3 rounded-xl bg-slate-50 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-700 mb-4">
            <div className="flex items-center justify-between text-[11px] font-semibold text-slate-700 dark:text-slate-200 mb-1.5">
              <span>Next: {gap.next.name}</span>
              <span className="text-slate-500 dark:text-slate-400 tabular-nums">{Math.round(progress.hours)} / {gap.next.hours} h</span>
            </div>
            <div className="h-1.5 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
              <div className="h-full bg-blue-500 transition-[width] duration-500" style={{ width: `${pct}%` }} />
            </div>
            <ul className="mt-2.5 space-y-1">
              {gap.hoursLeft > 0 && (
                <li className="flex items-start gap-1.5 text-[11px] text-slate-600 dark:text-slate-400">
                  <Clock3 size={11} className="mt-0.5 flex-shrink-0 text-slate-400" /> {gap.hoursLeft} more hours on the job
                </li>
              )}
              {gap.needs.map(n => (
                <li key={n} className="flex items-start gap-1.5 text-[11px] text-slate-600 dark:text-slate-400">
                  <Lock size={11} className="mt-0.5 flex-shrink-0 text-slate-400" /> {n}
                </li>
              ))}
              {gap.hoursLeft === 0 && gap.needs.length === 0 && (
                <li className="flex items-start gap-1.5 text-[11px] text-emerald-600 dark:text-emerald-400">
                  <CheckCircle2 size={11} className="mt-0.5 flex-shrink-0" /> Signed off — it takes effect on your next shift.
                </li>
              )}
            </ul>
          </div>
        ) : (
          <p className="text-[12px] text-emerald-700 dark:text-emerald-400 px-3 py-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/30 mb-4">
            Top of the ladder. Every call in town is yours.
          </p>
        )}

        <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-1.5">What we send you</p>
        <ul className="space-y-1 mb-4">
          {([1, 2, 3] as const).map(d => (
            <li key={d} className={`flex items-start gap-1.5 text-[11px] ${d <= rank.maxDifficulty ? 'text-slate-700 dark:text-slate-200' : 'text-slate-400 dark:text-slate-500'}`}>
              {d <= rank.maxDifficulty
                ? <CheckCircle2 size={11} className="mt-0.5 flex-shrink-0 text-emerald-500" />
                : <Lock size={11} className="mt-0.5 flex-shrink-0" />}
              {DIFFICULTY_LABEL[d]}
            </li>
          ))}
        </ul>

        <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-1.5">The truck</p>
        <ul className="space-y-1 mb-4">
          {TOOLS.map(t => {
            const have = t.tier <= rank.tier
            return (
              <li key={t.id} className={`flex items-start gap-1.5 px-2.5 py-1.5 rounded-lg border text-[11px] ${have
                ? 'border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200'
                : 'border-dashed border-slate-200 dark:border-slate-700 text-slate-400 dark:text-slate-500'}`}>
                {have
                  ? <CheckCircle2 size={11} className="mt-0.5 flex-shrink-0 text-emerald-500" />
                  : <Lock size={11} className="mt-0.5 flex-shrink-0" />}
                <span className="min-w-0 flex-1">
                  <b className="font-semibold">{t.name}</b>
                  <span className="block text-[10px] leading-snug opacity-80">{t.blurb}</span>
                </span>
                {!have && <span className="text-[9px] font-bold flex-shrink-0 mt-0.5">{RANKS[t.tier - 1].short}</span>}
              </li>
            )
          })}
        </ul>

        <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-1.5">The ladder</p>
        <ol className="space-y-1">
          {RANKS.map(r => (
            <li key={r.tier} className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg border text-[11px] ${
              r.tier === rank.tier
                ? 'border-blue-300 dark:border-blue-500/40 bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-300 font-semibold'
                : r.tier < rank.tier
                  ? 'border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400'
                  : 'border-slate-200 dark:border-slate-700 text-slate-400 dark:text-slate-500'}`}>
              <span className="w-7 text-center font-bold">{r.short}</span>
              <span className="flex-1 min-w-0 truncate">{r.name}</span>
              <span className="tabular-nums flex-shrink-0">{r.hours} h</span>
            </li>
          ))}
        </ol>
      </div>
    </div>
  )
}

function Briefing({ level, onStart }: { level: LevelDef; onStart: () => void }) {
  const b = level.briefing!
  return (
    <div className="fixed inset-0 z-50 bg-slate-900/70 flex items-center justify-center p-3 sm:p-4">
      <div className="relative w-full max-w-lg max-h-[92dvh] overflow-y-auto bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-5 sm:p-6 page-fade-in">
        <div className="absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r from-amber-500 via-orange-500 to-red-500" />
        <div className="flex items-center gap-3 mb-3 mt-1">
          <div className="w-11 h-11 rounded-xl bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/30 text-amber-600 dark:text-amber-400 flex items-center justify-center flex-shrink-0">
            <BookOpen size={22} />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-amber-600 dark:text-amber-400">Before you start · {level.subtitle}</p>
            <h2 className="text-base font-bold text-slate-900 dark:text-white leading-tight">{level.name}</h2>
          </div>
        </div>
        <p className="text-[13px] text-slate-700 dark:text-slate-300 leading-relaxed mb-3">{b.lead}</p>
        <ul className="space-y-2.5">
          {b.points.map(p => (
            <li key={p.head} className="px-3 py-2.5 rounded-lg bg-slate-50 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-700">
              <p className="text-[12px] font-bold text-slate-900 dark:text-white mb-0.5">{p.head}</p>
              <p className="text-[12px] text-slate-600 dark:text-slate-400 leading-relaxed">{p.body}</p>
            </li>
          ))}
        </ul>
        <p className="text-[11px] text-slate-400 mt-3">The clock is not running yet. It starts when you close this.</p>
        <button onClick={onStart}
          className="w-full flex items-center justify-center gap-1.5 py-2.5 mt-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold">
          Clock in <ChevronRight size={14} />
        </button>
      </div>
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
