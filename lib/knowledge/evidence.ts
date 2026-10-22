export interface ProcedureReference {
  title: string
  url: string
  location: string
}
export interface ProcedureCard {
  id: string
  title: string
  appliesTo: string
  steps: string[]
  expected: string
  source: ProcedureReference
}
export interface TopicEvidence {
  status: 'sources-linked' | 'review-pending'
  scope: string
  checkedOn?: string
  reviewer?: string
  procedures?: ProcedureCard[]
  practice?: string[]
}

/** Source comparison is not a human technical sign-off. Never infer a reviewer. */
const EVIDENCE: Record<string, TopicEvidence> = {
  traulsen: {
    status: 'sources-linked', checkedOn: '2026-10-21',
    scope: 'G-Series. Match the installed controller and the manual’s model/refrigerant coverage. The whole article has not received independent technical sign-off.',
    practice: ['/learn/defrost', '/simulation/dt-bunker'],
    procedures: [{
      id: 'force-a-defrost', title: 'Force defrost — Next Gen',
      appliesTo: 'Illustrated five-key G-Series Next Gen control; not the legacy SET-key controller.',
      steps: ['Double-tap the centre Unlock key.', 'Hold Minus (−) and Esc/Back together for five seconds.'],
      expected: 'This starts a normal, automatically terminating defrost. An output command does not prove that a heater is drawing current.',
      source: { title: 'Traulsen TR35731 · 2018–2023', url: 'https://cdn2.webdamdb.com/md_E77awF3UwrX51w9W.jpg.pdf?1686577793=#page=30', location: 'Printed p.29, §4.4; PDF page 30' },
    }],
  },
  'defrost-systems': { status: 'review-pending', scope: 'General principles. Confirm timings, termination and fan behaviour against the equipment manual.', practice: ['/learn/defrost', '/simulation/dt-bunker'] },
}

export function getTopicEvidence(slug: string): TopicEvidence {
  return EVIDENCE[slug] ?? { status: 'review-pending', scope: 'General reference. Model-specific procedures and values need confirmation against the applicable manufacturer documentation.' }
}
export function contentRevision(content: string): string {
  // Stable content identifier for feedback; not a verification or security hash.
  let hash = 2166136261
  for (let i = 0; i < content.length; i++) hash = Math.imul(hash ^ content.charCodeAt(i), 16777619)
  return (hash >>> 0).toString(16).padStart(8, '0')
}
