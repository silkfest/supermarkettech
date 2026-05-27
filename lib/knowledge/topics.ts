import {
  REFRIGERATION_KNOWLEDGE,
  SPORLAN_KNOWLEDGE,
  COPELAND_KNOWLEDGE,
  HUSSMANN_KNOWLEDGE,
  DANFOSS_KNOWLEDGE,
  ARNEG_KNOWLEDGE,
} from '@/lib/ai/prompts'

export interface KnowledgeTopic {
  slug: string
  title: string
  shortTitle: string
  description: string
  iconName: string           // lucide icon name (string, resolved in UI)
  colorClass: string         // e.g. 'blue' — used to build tailwind classes
  content: string            // full markdown string
  manualKeywords: string[]   // for DB search (ILIKE match on document title or manufacturer)
  tags: string[]
  category: 'manufacturer' | 'fundamentals'
}

export const TOPICS: KnowledgeTopic[] = [
  {
    slug: 'refrigeration-fundamentals',
    title: 'Refrigeration Fundamentals',
    shortTitle: 'Fundamentals',
    description: 'CO₂ transcritical cycle, HFC basics, pressure-temperature relationships, oil management, superheat/subcooling, and system-level diagnostics.',
    iconName: 'Snowflake',
    colorClass: 'sky',
    content: REFRIGERATION_KNOWLEDGE,
    manualKeywords: ['refrigeration', 'fundamentals', 'basics', 'co2'],
    tags: ['CO₂', 'HFC', 'Basics'],
    category: 'fundamentals',
  },
  {
    slug: 'sporlan',
    title: 'Sporlan',
    shortTitle: 'Sporlan',
    description: 'TXVs, EEVs, CDS/CDST stepper EPR valves, solenoids, filter-driers, electronic controls, and 12 common field mistakes.',
    iconName: 'Sliders',
    colorClass: 'blue',
    content: SPORLAN_KNOWLEDGE,
    manualKeywords: ['sporlan'],
    tags: ['Valves', 'EEV', 'TXV', 'Solenoids'],
    category: 'manufacturer',
  },
  {
    slug: 'copeland',
    title: 'Copeland / Emerson',
    shortTitle: 'Copeland',
    description: 'Scroll ZB/ZF compressors, Digital Scroll, Discus reciprocating, CoreSense diagnostics, ASTP, cylinder unloaders, and oil monitoring.',
    iconName: 'Zap',
    colorClass: 'violet',
    content: COPELAND_KNOWLEDGE,
    manualKeywords: ['copeland', 'emerson', 'coresense'],
    tags: ['Compressors', 'Scroll', 'Discus'],
    category: 'manufacturer',
  },
  {
    slug: 'hussmann',
    title: 'Hussmann',
    shortTitle: 'Hussmann',
    description: 'Display case families (RL/RLN/RM/FW), defrost types, KoolGas 2-pipe vs hot gas 3-pipe, DASH controller, parallel racks, Protocol systems, and CO₂.',
    iconName: 'LayoutGrid',
    colorClass: 'emerald',
    content: HUSSMANN_KNOWLEDGE,
    manualKeywords: ['hussmann'],
    tags: ['Cases', 'Racks', 'CO₂', 'KoolGas'],
    category: 'manufacturer',
  },
  {
    slug: 'danfoss',
    title: 'Danfoss',
    shortTitle: 'Danfoss',
    description: 'AK-SM store controllers, AK-PC pack controllers, AK-CC case controllers, CCMT/AKV EEVs, ICM/ICMTS/ICS valves, Booster CO₂ racks, and safety components.',
    iconName: 'Cpu',
    colorClass: 'rose',
    content: DANFOSS_KNOWLEDGE,
    manualKeywords: ['danfoss'],
    tags: ['Controls', 'CO₂', 'EEV', 'Valves'],
    category: 'manufacturer',
  },
  {
    slug: 'arneg',
    title: 'Arneg',
    shortTitle: 'Arneg',
    description: 'Oslo, Trinidad, Venice, Quebec, and Dakar case families, Dixell/Carel controllers, EC fan motors, CO₂ compatibility, and common case faults.',
    iconName: 'Store',
    colorClass: 'amber',
    content: ARNEG_KNOWLEDGE,
    manualKeywords: ['arneg'],
    tags: ['Cases', 'Dixell', 'Carel'],
    category: 'manufacturer',
  },
]

export function getTopicBySlug(slug: string): KnowledgeTopic | undefined {
  return TOPICS.find(t => t.slug === slug)
}
