/** Reviewed 2026-10-15. Patent examples are not installed-equipment instructions. */
export const EJECTOR_REFERENCES = [
  { title: 'Carnot-associated defrost patent — US20190203993A1', url: 'https://patents.google.com/patent/US20190203993A1/en', scope: 'Figures 3–4; claims 1–9. Defrost-return ejector principle; not a commissioning or service manual.' },
  { title: 'Carnot supermarket brochure', url: 'https://carnotrefrigeration.com/file/carnot_new_supermarkets.pdf', scope: 'Defrost overview: LT hot gas and MT accelerated passive applications; not a valve sequence.' },
  { title: 'Danfoss HP and liquid ejector application guide', url: 'https://assets.danfoss.com/documents/latest/150968/AB351943880096en-000101.pdf', scope: 'HP gas lift, liquid recovery, accumulator protection, heat reclaim and controller integration.' },
  { title: 'Danfoss ejector selection overview', url: 'https://assets.danfoss.com/documents/latest/49449/AV300739150464en-000201.pdf', scope: 'HP, LP, LE and Combi distinctions and operating examples.' },
  { title: 'CAREL EmJ — electronic modulating ejector', url: 'https://www.carel.com/documents/10191/0/%2B3000151EN/5795bd76-cfa2-40d3-a5fd-290d235f4bbb?version=1.0', scope: 'Continuous modulation and model-specific inspection/serviceability.' },
]

export const EJECTOR_SOURCE_GUIDANCE = `
EJECTOR SOURCE RULES:
Use [KB: co2-ejectors | Ejector-Assisted Defrost — Carnot Application] for the documented Carnot principle, or another real section of [KB: co2-ejectors], and identify the supporting reference below. Do not invent [Doc N] citations. A patent is evidence of an embodiment, not proof of a site's installed piping or controller sequence. For Carnot valve order, pressure settings, termination, manual overrides or service procedures, retrieve the exact OEM manual; if unavailable, ask for the rack drawing/startup sheet/model. Never substitute the Danfoss efficiency-ejector circuit for the Carnot defrost-return circuit. Do not dismiss winter inactivity without checking duty and enable conditions. Model-specific claims in older general passages must be verified against these sources and the installed OEM documents.
${EJECTOR_REFERENCES.map(r => `${r.title}: ${r.url} — ${r.scope}`).join('\n')}
`
