// Client-side helper for recording simulator scenario attempts.
// Fire-and-forget: a failed save never interrupts the training flow.

export type SimRack = 'parallel-rack' | 'protocol-rack-a' | 'co2-booster' | 'safety-circuit' | 'dt-bunker'

export interface SimAttempt {
  rack: SimRack
  scenarioId: string
  scenarioName: string
  difficulty?: string | null
  mode?: 'scenario' | 'mystery' | 'wiring'
  score?: number | null
  correct?: number | null
  total?: number | null
  falsePositives?: number | null
}

export function saveSimAttempt(attempt: SimAttempt): void {
  try {
    void fetch('/api/simulator/attempts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(attempt),
    }).catch(() => {})
  } catch { /* never block the UI on attempt logging */ }
}
