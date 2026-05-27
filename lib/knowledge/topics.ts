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
  {
    slug: 'keeprite',
    title: 'Keeprite',
    shortTitle: 'Keeprite',
    description: 'KLP/KLV unit cooler series, condensing units, walk-in cooler/freezer configurations, defrost systems, fan motors, refrigerant retrofits, and common faults.',
    iconName: 'Thermometer',
    colorClass: 'teal',
    content: KEEPRITE_KNOWLEDGE,
    manualKeywords: ['keeprite', 'keep-rite', 'klp', 'klv'],
    tags: ['Unit Coolers', 'Walk-In', 'Condensing Units'],
    category: 'manufacturer',
  },
  {
    slug: 'micro-thermo',
    title: 'Micro Thermo (MT-Alliance)',
    shortTitle: 'Micro Thermo',
    description: 'MT-Alliance platform boards (MT-500/700 series), LonWorks FTT10 network wiring, Case Controller EEV/relay outputs, pressure transducer selection, and controller fault diagnosis.',
    iconName: 'CircuitBoard',
    colorClass: 'purple',
    content: MICRO_THERMO_KNOWLEDGE,
    manualKeywords: ['microthermo', 'micro-thermo', 'micro thermo', 'mt-alliance', 'mt alliance', '70-mta', '74-mta', '100-50-10', '70-phw'],
    tags: ['Controls', 'LonWorks', 'Case Controllers'],
    category: 'manufacturer',
  },
  {
    slug: 'evapco-lmp',
    title: 'Evapco LMP',
    shortTitle: 'Evapco LMP',
    description: 'CO₂ transcritical booster rack systems: flash tank control, head pressure algorithm (sub/transcritical), hot gas defrost sequencing, MT superheat control, oil management, and CO₂ leak safety.',
    iconName: 'Gauge',
    colorClass: 'cyan',
    content: EVAPCO_LMP_KNOWLEDGE,
    manualKeywords: ['evapco', 'lmp', 'evapco lmp', 'systems lmp'],
    tags: ['CO₂', 'Transcritical', 'Racks', 'Booster'],
    category: 'manufacturer',
  },
  {
    slug: 'penn-controls',
    title: 'Penn Controls (Johnson Controls)',
    shortTitle: 'Penn Controls',
    description: 'A19 electromechanical temperature controls, A421 electronic digital controls, A28 two-stage controls, P70/P78 dual pressure controls, A99 NTC sensors, setpoint tables for R-404A/R-448A, and common field faults.',
    iconName: 'ToggleRight',
    colorClass: 'orange',
    content: PENN_CONTROLS_KNOWLEDGE,
    manualKeywords: ['penn', 'penn controls', 'a421', 'a19', 'p70', 'johnson controls'],
    tags: ['Temperature Controls', 'Pressure Controls', 'A421', 'P70'],
    category: 'manufacturer',
  },
  {
    slug: 'math-electrical',
    title: 'Math & Electrical Reference',
    shortTitle: 'Math & Electrical',
    description: "Refrigeration calculations (superheat, subcooling, compression ratio, heat load, COP), electrical formulas (Ohm's law, 3-phase power, voltage drop, capacitor testing), and how to read ladder diagrams and wiring schematics.",
    iconName: 'Calculator',
    colorClass: 'indigo',
    content: MATH_AND_ELECTRICAL_KNOWLEDGE,
    manualKeywords: [],
    tags: ['Math', 'Electrical', 'Wiring Diagrams'],
    category: 'fundamentals',
  },
]

export function getTopicBySlug(slug: string): KnowledgeTopic | undefined {
  return TOPICS.find(t => t.slug === slug)
}
