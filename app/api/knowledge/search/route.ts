import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseServer } from '@/lib/supabase/client'
import { TOPICS } from '@/lib/knowledge/topics'
import {
  REFRIGERATION_KNOWLEDGE,
  SPORLAN_KNOWLEDGE,
  COPELAND_KNOWLEDGE,
  HUSSMANN_KNOWLEDGE,
  DANFOSS_KNOWLEDGE,
  ARNEG_KNOWLEDGE,
  KEEPRITE_KNOWLEDGE,
  MATH_AND_ELECTRICAL_KNOWLEDGE,
  MICRO_THERMO_KNOWLEDGE,
  EVAPCO_LMP_KNOWLEDGE,
  PENN_CONTROLS_KNOWLEDGE,
  CARNOT_KNOWLEDGE,
  EMERSON_E2_E3_KNOWLEDGE,
  SYSTEM_DIAGNOSTICS_KNOWLEDGE,
  DEFROST_KNOWLEDGE,
  WALK_IN_KNOWLEDGE,
  PARALLEL_RACK_KNOWLEDGE,
  VFD_KNOWLEDGE,
  REFRIGERANT_RETROFIT_KNOWLEDGE,
  TYLER_HILL_PHOENIX_KNOWLEDGE,
  HEATCRAFT_BOHN_KNOWLEDGE,
  BITZER_KNOWLEDGE,
  LENNOX_RTU_KNOWLEDGE,
  CARRIER_RTU_KNOWLEDGE,
  YORK_RTU_KNOWLEDGE,
  TRANE_RTU_KNOWLEDGE,
  RTU_HVAC_DIAGNOSTICS_KNOWLEDGE,
  AAON_RTU_KNOWLEDGE,
} from '@/lib/ai/prompts'

const KNOWLEDGE_MAP: Record<string, string> = {
  'refrigeration-fundamentals': REFRIGERATION_KNOWLEDGE,
  'system-diagnostics':         SYSTEM_DIAGNOSTICS_KNOWLEDGE,
  'defrost-systems':            DEFROST_KNOWLEDGE,
  'sporlan':                    SPORLAN_KNOWLEDGE,
  'copeland':                   COPELAND_KNOWLEDGE,
  'hussmann':                   HUSSMANN_KNOWLEDGE,
  'danfoss':                    DANFOSS_KNOWLEDGE,
  'arneg':                      ARNEG_KNOWLEDGE,
  'keeprite':                   KEEPRITE_KNOWLEDGE,
  'micro-thermo':               MICRO_THERMO_KNOWLEDGE,
  'evapco-lmp':                 EVAPCO_LMP_KNOWLEDGE,
  'penn-controls':              PENN_CONTROLS_KNOWLEDGE,
  'tyler-hill-phoenix':         TYLER_HILL_PHOENIX_KNOWLEDGE,
  'heatcraft-bohn':             HEATCRAFT_BOHN_KNOWLEDGE,
  'bitzer':                     BITZER_KNOWLEDGE,
  'carnot':                     CARNOT_KNOWLEDGE,
  'emerson-e2-e3':              EMERSON_E2_E3_KNOWLEDGE,
  'vfd':                        VFD_KNOWLEDGE,
  'refrigerant-retrofit':       REFRIGERANT_RETROFIT_KNOWLEDGE,
  'math-electrical':            MATH_AND_ELECTRICAL_KNOWLEDGE,
  'walk-in-troubleshooting':    WALK_IN_KNOWLEDGE,
  'parallel-rack-systems':      PARALLEL_RACK_KNOWLEDGE,
  'lennox-rtu':                 LENNOX_RTU_KNOWLEDGE,
  'carrier-rtu':                CARRIER_RTU_KNOWLEDGE,
  'york-rtu':                   YORK_RTU_KNOWLEDGE,
  'trane-rtu':                  TRANE_RTU_KNOWLEDGE,
  'rtu-diagnostics':            RTU_HVAC_DIAGNOSTICS_KNOWLEDGE,
  'aaon-rtu':                   AAON_RTU_KNOWLEDGE,
}

export interface ContentMatch {
  topicSlug: string
  topicTitle: string
  sectionTitle: string
  excerpt: string
}

function extractMatches(slug: string, title: string, content: string, query: string): ContentMatch[] {
  const lower = query.toLowerCase()
  const lines = content.split('\n')
  const results: ContentMatch[] = []
  const seenSections = new Set<string>()
  let currentSection = 'Overview'

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const trimmed = line.trim()

    if (/^#{1,3}\s/.test(trimmed)) {
      currentSection = trimmed.replace(/^#+\s+/, '')
      continue
    }

    if (!trimmed || trimmed.toLowerCase().includes(lower) === false) continue
    if (seenSections.has(currentSection)) continue

    // Build a clean excerpt: merge up to 4 surrounding lines, strip markdown symbols
    const start = Math.max(0, i - 1)
    const end = Math.min(lines.length, i + 4)
    const raw = lines.slice(start, end)
      .map(l => l.replace(/^[-*•]\s+/, '').replace(/\*\*/g, '').trim())
      .filter(Boolean)
      .join(' ')

    // Truncate at word boundary near 200 chars
    const truncated = raw.length > 220
      ? raw.slice(0, raw.lastIndexOf(' ', 220)) + '…'
      : raw

    results.push({ topicSlug: slug, topicTitle: title, sectionTitle: currentSection, excerpt: truncated })
    seenSections.add(currentSection)

    if (results.length >= 4) break
  }

  return results
}

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get('q')?.trim()
  if (!q || q.length < 2) return NextResponse.json({ docSlugs: [], contentMatches: [] })

  // Document title search
  const supabase = getSupabaseServer()
  const { data: docs } = await supabase
    .from('documents')
    .select('title')
    .ilike('title', `%${q}%`)
    .eq('status', 'READY')
    .limit(100)

  const docSlugs: string[] = []
  if (docs?.length) {
    const matched = new Set<string>()
    for (const doc of docs) {
      const lower = doc.title.toLowerCase()
      for (const topic of TOPICS) {
        if (topic.manualKeywords.some(kw => lower.includes(kw.toLowerCase()))) {
          matched.add(topic.slug)
        }
      }
    }
    docSlugs.push(...matched)
  }

  // Knowledge content search
  const contentMatches: ContentMatch[] = []
  for (const topic of TOPICS) {
    const content = KNOWLEDGE_MAP[topic.slug]
    if (!content) continue
    const matches = extractMatches(topic.slug, topic.title, content, q)
    contentMatches.push(...matches)
  }

  return NextResponse.json({ docSlugs, contentMatches })
}
