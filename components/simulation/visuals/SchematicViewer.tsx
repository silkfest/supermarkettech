'use client'
import { useRef, useState, useEffect, type ReactNode, type PointerEvent as RPointerEvent, type WheelEvent as RWheelEvent } from 'react'
import { ZoomIn, ZoomOut, Maximize2, X, RotateCcw } from 'lucide-react'

// ── Pinch-zoom / pan viewer for the rack schematics ─────────────────────────────
// Phones render the 860-unit-wide SVGs too small to read. This wrapper adds:
//   • pinch-to-zoom (two fingers) and drag-to-pan once zoomed
//   • double-tap (or double-click) to toggle 2.5× at that spot / reset
//   • +/− and reset buttons, ctrl/cmd+scroll wheel on desktop
//   • a fullscreen overlay for small screens
// At 1× the surface keeps `touch-action: pan-y` so normal page scrolling still
// works; once zoomed it owns all gestures.

const MIN_SCALE = 1
const MAX_SCALE = 5

interface XY { x: number; y: number }

function ZoomSurface({ children, heightClass }: { children: ReactNode; heightClass?: string }) {
  const outerRef = useRef<HTMLDivElement>(null)
  const [scale, setScale] = useState(1)
  const [tx, setTx] = useState(0)
  const [ty, setTy] = useState(0)

  const pointers = useRef(new Map<number, XY>())
  const pinch = useRef<{ dist: number; scale: number; mid: XY; tx: number; ty: number } | null>(null)
  const pan = useRef<{ start: XY; tx: number; ty: number } | null>(null)
  const lastTap = useRef<{ t: number; x: number; y: number } | null>(null)

  function clampT(t: number, size: number, s: number) {
    // content (size × s) must cover the viewport: translation ∈ [size − size·s, 0]
    return Math.min(0, Math.max(size - size * s, t))
  }

  function applyZoom(newScale: number, originX: number, originY: number, baseScale = scale, baseTx = tx, baseTy = ty) {
    const el = outerRef.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    const s = Math.min(MAX_SCALE, Math.max(MIN_SCALE, newScale))
    // keep the content point under (originX, originY) stationary
    const ratio = s / baseScale
    const nTx = clampT(originX - (originX - baseTx) * ratio, rect.width, s)
    const nTy = clampT(originY - (originY - baseTy) * ratio, rect.height, s)
    setScale(s); setTx(s <= 1 ? 0 : nTx); setTy(s <= 1 ? 0 : nTy)
  }

  function reset() { setScale(1); setTx(0); setTy(0) }

  function localPoint(e: { clientX: number; clientY: number }): XY {
    const rect = outerRef.current!.getBoundingClientRect()
    return { x: e.clientX - rect.left, y: e.clientY - rect.top }
  }

  function onPointerDown(e: RPointerEvent<HTMLDivElement>) {
    const el = outerRef.current
    if (!el) return
    el.setPointerCapture(e.pointerId)
    const p = localPoint(e)
    pointers.current.set(e.pointerId, p)

    if (pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()]
      pinch.current = {
        dist: Math.hypot(a.x - b.x, a.y - b.y),
        scale, tx, ty,
        mid: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 },
      }
      pan.current = null
    } else if (pointers.current.size === 1 && scale > 1) {
      pan.current = { start: p, tx, ty }
    }
  }

  function onPointerMove(e: RPointerEvent<HTMLDivElement>) {
    if (!pointers.current.has(e.pointerId)) return
    const p = localPoint(e)
    pointers.current.set(e.pointerId, p)

    if (pointers.current.size === 2 && pinch.current) {
      const [a, b] = [...pointers.current.values()]
      const dist = Math.hypot(a.x - b.x, a.y - b.y)
      if (pinch.current.dist > 0) {
        applyZoom(pinch.current.scale * (dist / pinch.current.dist), pinch.current.mid.x, pinch.current.mid.y,
          pinch.current.scale, pinch.current.tx, pinch.current.ty)
      }
    } else if (pointers.current.size === 1 && pan.current && scale > 1) {
      const el = outerRef.current
      if (!el) return
      const rect = el.getBoundingClientRect()
      setTx(clampT(pan.current.tx + (p.x - pan.current.start.x), rect.width, scale))
      setTy(clampT(pan.current.ty + (p.y - pan.current.start.y), rect.height, scale))
    }
  }

  function onPointerUp(e: RPointerEvent<HTMLDivElement>) {
    const p = pointers.current.get(e.pointerId)
    const wasSingle = pointers.current.size === 1 && !pinch.current
    pointers.current.delete(e.pointerId)
    if (pointers.current.size < 2) pinch.current = null
    if (pointers.current.size === 0) pan.current = null

    // double-tap / double-click toggle
    if (wasSingle && p) {
      const now = Date.now()
      const prev = lastTap.current
      if (prev && now - prev.t < 320 && Math.hypot(p.x - prev.x, p.y - prev.y) < 36) {
        lastTap.current = null
        if (scale > 1.05) reset()
        else applyZoom(2.5, p.x, p.y)
      } else {
        lastTap.current = { t: now, x: p.x, y: p.y }
      }
    }
  }

  function onWheel(e: RWheelEvent<HTMLDivElement>) {
    if (!e.ctrlKey && !e.metaKey) return
    e.preventDefault()
    const p = localPoint(e)
    applyZoom(scale * (e.deltaY < 0 ? 1.18 : 0.85), p.x, p.y)
  }

  return (
    <div className="relative">
      <div
        ref={outerRef}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onWheel={onWheel}
        className={`overflow-hidden rounded-lg ${heightClass ?? ''} ${scale > 1 ? 'cursor-grab' : ''}`}
        style={{ touchAction: scale > 1 ? 'none' : 'pan-y' }}
      >
        <div style={{ transform: `translate(${tx}px, ${ty}px) scale(${scale})`, transformOrigin: '0 0' }}>
          {children}
        </div>
      </div>

      {/* zoom controls */}
      <div className="absolute top-1.5 right-1.5 flex items-center gap-1">
        {scale > 1 && (
          <button onClick={reset} title="Reset zoom"
            className="p-1.5 rounded-lg bg-white/85 dark:bg-slate-900/85 border border-slate-200 dark:border-slate-600 text-slate-500 dark:text-slate-300 hover:text-slate-800 dark:hover:text-white shadow-sm">
            <RotateCcw size={13} />
          </button>
        )}
        <button onClick={() => { const el = outerRef.current; if (!el) return; const r = el.getBoundingClientRect(); applyZoom(scale * 0.75, r.width / 2, r.height / 2) }}
          title="Zoom out" disabled={scale <= 1}
          className="p-1.5 rounded-lg bg-white/85 dark:bg-slate-900/85 border border-slate-200 dark:border-slate-600 text-slate-500 dark:text-slate-300 hover:text-slate-800 dark:hover:text-white shadow-sm disabled:opacity-40">
          <ZoomOut size={13} />
        </button>
        <button onClick={() => { const el = outerRef.current; if (!el) return; const r = el.getBoundingClientRect(); applyZoom(scale * 1.35, r.width / 2, r.height / 2) }}
          title="Zoom in" disabled={scale >= MAX_SCALE}
          className="p-1.5 rounded-lg bg-white/85 dark:bg-slate-900/85 border border-slate-200 dark:border-slate-600 text-slate-500 dark:text-slate-300 hover:text-slate-800 dark:hover:text-white shadow-sm disabled:opacity-40">
          <ZoomIn size={13} />
        </button>
      </div>

      {scale > 1 && (
        <span className="absolute bottom-1.5 right-1.5 text-[9px] font-semibold px-1.5 py-0.5 rounded bg-white/85 dark:bg-slate-900/85 border border-slate-200 dark:border-slate-600 text-slate-500 dark:text-slate-300">
          {scale.toFixed(1)}×
        </span>
      )}
    </div>
  )
}

export default function SchematicViewer({ children, label = 'Rack schematic' }: { children: ReactNode; label?: string }) {
  const [fullscreen, setFullscreen] = useState(false)

  // lock body scroll while the fullscreen overlay is open
  useEffect(() => {
    if (!fullscreen) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [fullscreen])

  return (
    <>
      <div className="relative">
        <ZoomSurface>{children}</ZoomSurface>
        <button onClick={() => setFullscreen(true)} title="Expand schematic"
          className="absolute top-1.5 left-1.5 p-1.5 rounded-lg bg-white/85 dark:bg-slate-900/85 border border-slate-200 dark:border-slate-600 text-slate-500 dark:text-slate-300 hover:text-slate-800 dark:hover:text-white shadow-sm">
          <Maximize2 size={13} />
        </button>
        <p className="text-[9px] text-slate-400 dark:text-slate-500 text-center mt-0.5 sm:hidden">
          pinch or double-tap to zoom · expand for full screen
        </p>
      </div>

      {fullscreen && (
        <div className="fixed inset-0 z-50 bg-white dark:bg-slate-900 flex flex-col">
          <div className="safe-top flex items-center gap-2 px-4 py-3 border-b border-slate-200 dark:border-slate-700 flex-shrink-0">
            <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">{label}</span>
            <span className="text-[10px] text-slate-400 hidden sm:inline">pinch / double-tap / ctrl+scroll to zoom</span>
            <button onClick={() => setFullscreen(false)} title="Close"
              className="ml-auto p-2 rounded-lg text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white">
              <X size={18} />
            </button>
          </div>
          <div className="flex-1 flex items-center justify-center overflow-hidden p-2">
            <div className="w-full max-w-5xl">
              <ZoomSurface>{children}</ZoomSurface>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
