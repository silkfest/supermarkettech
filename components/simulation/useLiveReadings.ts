'use client'
import { useEffect, useRef, useState } from 'react'

// ── Live sensor simulation ──────────────────────────────────────────────────────
// Real rack readings never sit at a perfect steady-state number: pressure
// transducers jitter, TXVs hunt, compressors stage, case temps cycle between
// defrost pulls. This hook takes the deterministic model output (the "target")
// and produces values that lag toward it with gaussian noise, a slow wander
// (hunting/cycling), and a small persistent per-sensor bias — so two case
// sensors at the same setpoint never read identically.
//
// SSR-safe: the first render returns the targets exactly (no randomness);
// noise begins after mount via setInterval.

export interface LiveSpec {
  key: string
  /** Steady-state value from the physics model (or 0 for delta-style specs). */
  target: number
  /** Gaussian noise added per tick (std-dev-ish). Default 0. */
  jitter?: number
  /** Amplitude of the slow sinusoidal wander (TXV hunting / staging cycles). Default 0. */
  wander?: number
  /** Wander period in seconds. Default 45 (randomized ±25% per sensor). */
  period?: number
  /** Persistent calibration offset amplitude — fixed random value in ±bias. Default 0. */
  bias?: number
  /** Approach rate toward target per tick (0–1). Default 0.22. */
  lag?: number
}

interface SensorState { v: number; phase: number; bias: number; periodMult: number; seeded: boolean }

/** Approximate gaussian, mean 0, std ≈ 0.7 */
function gauss(): number {
  return Math.random() + Math.random() + Math.random() - 1.5
}

export function useLiveReadings(specs: LiveSpec[], tickMs = 1000): Record<string, number> {
  const sensors = useRef<Record<string, SensorState>>({})
  const specsRef = useRef(specs)
  specsRef.current = specs
  const tick = useRef(0)
  const [, force] = useState(0)

  // Deterministic first-render init (no Math.random before mount → no hydration mismatch)
  for (const s of specs) {
    if (!sensors.current[s.key]) {
      sensors.current[s.key] = { v: s.target, phase: 0, bias: 0, periodMult: 1, seeded: false }
    }
  }

  useEffect(() => {
    const id = setInterval(() => {
      tick.current += 1
      const t = tick.current
      for (const s of specsRef.current) {
        let st = sensors.current[s.key]
        if (!st) st = sensors.current[s.key] = { v: s.target, phase: 0, bias: 0, periodMult: 1, seeded: false }
        if (!st.seeded) {
          st.seeded = true
          st.phase = Math.random() * Math.PI * 2
          st.periodMult = 0.75 + Math.random() * 0.5
          st.bias = (Math.random() * 2 - 1) * (s.bias ?? 0)
        }
        const period = (s.period ?? 45) * st.periodMult
        const wander = (s.wander ?? 0) * Math.sin((2 * Math.PI * t * (tickMs / 1000)) / period + st.phase)
        const lag = s.lag ?? 0.22
        st.v += (s.target + st.bias + wander - st.v) * lag + gauss() * (s.jitter ?? 0)
      }
      force(x => x + 1)
    }, tickMs)
    return () => clearInterval(id)
  }, [tickMs])

  const out: Record<string, number> = {}
  for (const s of specs) out[s.key] = sensors.current[s.key]?.v ?? s.target
  return out
}
