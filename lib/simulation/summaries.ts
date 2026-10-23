import { practiceTarget } from '@/lib/apprentice/practiceEvidence'
import { PRACTICE_RESOURCES } from '@/lib/learning/resources'
export interface PracticeSummary {
  attempts: number; bestScore: number | null; avgScore: number | null; lastAt: string | null
}
interface Attempt { rack: string; scenario_id: string; score: number | null; created_at: string }
/** Keep each wiring trainer separate even though older records share one rack key. */
export function simulatorSummaries(rows: Attempt[]): Record<string, PracticeSummary> {
  const summaries: Record<string, PracticeSummary> = {}
  for (const resource of PRACTICE_RESOURCES) {
    const target = practiceTarget(resource.href)
    if (!target) continue
    const attempts = rows.filter(r => r.rack === target.rack && (!target.scenarioPrefix || r.scenario_id.startsWith(target.scenarioPrefix)))
    if (!attempts.length) continue
    const scores = attempts.map(r => r.score).filter((s): s is number => typeof s === 'number')
    summaries[resource.href] = {
      attempts: attempts.length,
      bestScore: scores.length ? Math.max(...scores) : null,
      avgScore: scores.length ? Math.round(scores.reduce((a,b) => a+b, 0) / scores.length) : null,
      lastAt: attempts.map(r => r.created_at).sort().at(-1) ?? null,
    }
  }
  return summaries
}
