/** Recorded practice is participation evidence, not a supervised competency assessment. */
export function practiceTarget(path: string | null | undefined): { rack: string; scenarioPrefix?: string } | null {
  const pathname = (path ?? '').split(/[?#]/)[0].replace(/\/$/, '')
  const targets: Record<string, { rack: string; scenarioPrefix?: string }> = {
    '/simulation/parallel-rack': { rack: 'parallel-rack' },
    '/simulation/protocol-rack-a': { rack: 'protocol-rack-a' },
    '/simulation/co2-booster': { rack: 'co2-booster' },
    '/simulation/dt-bunker': { rack: 'dt-bunker' },
    '/simulation/safety-circuit': { rack: 'safety-circuit', scenarioPrefix: 'safety-circuit' },
    '/simulation/micro-thermo-control': { rack: 'safety-circuit', scenarioPrefix: 'mt-cmp-' },
    '/simulation/copeland-control': { rack: 'safety-circuit', scenarioPrefix: 'copeland-dc-' },
    '/simulation/bitzer-control': { rack: 'safety-circuit', scenarioPrefix: 'bitzer-' },
  }
  return targets[pathname] ?? null
}
export function hasFieldSignoff(progress: { status: string; verified_by?: string | null } | null, learnerId: string): boolean {
  return progress?.status === 'completed' && !!progress.verified_by && progress.verified_by !== learnerId
}
