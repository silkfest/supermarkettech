import { PRACTICE_RESOURCES, LEARNING_PATHS } from './resources'
/** Explicit editorial connections; a simulator does not establish equipment applicability. */
const TOPIC_PRACTICE: Record<string, readonly string[]> = {
  traulsen: ['/learn/defrost', '/simulation/dt-bunker'],
  'defrost-systems': ['/learn/defrost', '/simulation/dt-bunker'],
  'micro-thermo': ['/simulation/micro-thermo-control'],
  copeland: ['/simulation/copeland-control'],
  bitzer: ['/simulation/bitzer-control'],
  hussmann: ['/simulation/parallel-rack', '/simulation/protocol-rack-a', '/simulation/dt-bunker'],
  'co2-transcritical': ['/simulation/co2-booster'],
  'math-electrical': ['/simulation/safety-circuit'],
}
export function practiceForTopic(slug: string) {
  const hrefs = TOPIC_PRACTICE[slug] ?? []
  return [...PRACTICE_RESOURCES, ...LEARNING_PATHS].filter(r => hrefs.includes(r.href))
}
