/** Scripted training scenario, not a physical rack model. Extend by fault id. */
export const FIELDWORK = {
  dirty_condenser: {
    measurements: [
      { tool: 'Pressure gauge', location: 'High-side service port', keys: ['disch', 'sct'], minutes: 4 },
      { tool: 'Temperature probe', location: 'Condenser entering air', keys: ['amb'], minutes: 3 },
      { tool: 'Gauge and clamp probe', location: 'Condenser liquid outlet', keys: ['sc'], minutes: 5 },
    ],
    verification: [
      { label: 'Restore operation and observe the condenser fans', minutes: 2, finding: 'Condenser airflow is restored; fans are running. The operating check has started.' },
      { label: 'Allow operation to stabilize and recheck high-side pressure', minutes: 20, finding: 'In this scenario, discharge pressure settles at 238 psig and compressor 3 remains running without another high-pressure trip.' },
      { label: 'Review the controller alarm and record the outcome', minutes: 2, finding: 'The high-pressure alarm is clear. Stable operation confirmed; add condenser cleaning to the maintenance follow-up.' },
    ],
  },
}
export function fieldworkFor(id: string) { return id === 'dirty_condenser' ? FIELDWORK.dirty_condenser : null }
