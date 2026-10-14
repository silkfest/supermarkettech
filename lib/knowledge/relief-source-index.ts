import { RELIEF_REFERENCES } from './relief-references'

// Curated document passages extend the existing search_manuals result contract.
// Available without a database migration; original PDFs remain linked for verification.
// These are reviewed summaries, not claims that a live Supabase embedding job ran.
const PASSAGES = [
  'Mueller INST-054, dated 20 May 2024, page 1: fully open/out selects the primary outlet; fully closed/in selects secondary. The drawing locates primary farthest from the stem, secondary nearest. Intermediate positions expose both outlets; use fully open or fully closed. Applies only to the illustrated configuration. Seat isolation does not prove depressurization. The document does not establish a clockwise rule for unidentified equipment or a relief setpoint.',
  'Mueller standard RELIEFMASTER changeover manifold product family: published Design Pressure / Maximum abnormal pressure 700 psig (48 bar). This is a manifold rating, not a relief valve opening setpoint. Select the exact assembly using approved equipment design, capacity and pressure/temperature requirements.',
  'Mueller transcritical CO2 RELIEFMASTER changeover manifold product family: published Design Pressure / Maximum abnormal pressure 2030 psig (140 bar), compatible with R744. This is not a relief opening setpoint. Do not substitute the 700-psig standard family where required pressure rating exceeds 700 psig.',
  'Copeland OME/OMTE application guidelines (retrieved Rev04), sections 2.9.8 and 2.17.4–5: high-side/gas-cooler protection and receiver protection have distinct pressure zones and relief assemblies. The pressure limiter acts before the relief opens. After relief activation the specified units require replacement. Use exact unit instructions, not these examples as universal CO2 settings.',
  'Copeland CO2 servicing tips: warming liquid trapped between closed valves can produce a large pressure rise and requires appropriate relief protection. Shutdown does not mean a CO2 system is depressurized. CO2 exposure and high-pressure handling require suitable procedures.',
  'Copeland CO2 system operation: extended shutdown can cause pressure to rise in separately protected zones. Backup receiver cooling can preserve charge; it does not eliminate required pressure relief protection.',
  'TSSA BPV Code Adoption Document amendment BPV-25-01 R1 (May 2026): servicing relief valves in refrigeration service is addressed by CSA B52. Apply the provincially adopted requirements and applicable CSA B51 pressure-equipment rules; verify the current edition and jurisdiction. This does not establish a universal replacement interval.',
]

export function searchReliefSources(query: string) {
  if (!/relief|\bprv\b|change[ -]?over|reliefmaster|frontseat|backseat|inactive.*valve|active.*valve|trapped liquid/i.test(query)) return []
  return RELIEF_REFERENCES.map((ref, i) => ({
    chunk_id: `relief-reference-${i + 1}`,
    document_id: `relief-reference-${i + 1}`,
    document_title: ref.title,
    source_type: 'WEB',
    source_url: ref.localUrl ?? ref.url,
    content: `${PASSAGES[i]} Original source: ${ref.url}`,
    page_number: i === 0 ? 1 : null,
    score: 1,
  }))
}
