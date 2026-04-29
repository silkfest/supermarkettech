import type { SensorSnapshot } from '@/types'

export function buildSnapshot(readings: Array<{ reading_type: string; value: number; unit: string; recorded_at: string }>): SensorSnapshot {
  const s: SensorSnapshot = {}
  const seen = new Set<string>()
  for (const r of readings ?? []) {
    if (seen.has(r.reading_type)) continue
    seen.add(r.reading_type)
    if (r.reading_type === 'case_temp')        s.case_temp        = { value: r.value, unit: r.unit }
    if (r.reading_type === 'setpoint')         s.setpoint         = { value: r.value, unit: r.unit }
    if (r.reading_type === 'suction_pressure') s.suction_pressure = { value: r.value, unit: r.unit }
    if (r.reading_type === 'superheat')        s.superheat        = { value: r.value, unit: r.unit }
    if (r.reading_type === 'discharge_temp')   s.discharge_temp   = { value: r.value, unit: r.unit }
  }
  if (readings?.[0]) s.recorded_at = readings[0].recorded_at
  return s
}
