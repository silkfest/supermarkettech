/** Shared discovery records. A trainer is an educational model, not an equipment specification. */
export const PRACTICE_RESOURCES = [
  { slug: 'parallel-rack', title: 'Hussmann parallel rack', description: 'R404A rack diagnostics, oil management and safety circuits', keywords: 'compressor head pressure suction oil', href: '/simulation/parallel-rack' },
  { slug: 'protocol-rack-a', title: 'Protocol rack', description: 'R448A low-temperature circuit diagnosis', keywords: 'eev superheat digital scroll frozen case', href: '/simulation/protocol-rack-a' },
  { slug: 'co2-booster', title: 'CO₂ booster', description: 'Transcritical rack, flash tank and gas cooler practice', keywords: 'co2 r744 high pressure', href: '/simulation/co2-booster' },
  { slug: 'dt-bunker', title: 'Defrost and DT bunker trainer', description: 'Measure heater and fan circuits on a simulated frozen case', keywords: 'defrost heater iced coil frozen evaporator fan delay', href: '/simulation/dt-bunker' },
  { slug: 'micro-thermo-control', title: 'Micro Thermo safety loop', description: 'Trace the MT compressor safety loop and SLA faults', keywords: 'mt sla safety compressor voltage', href: '/simulation/micro-thermo-control' },
  { slug: 'copeland-control', title: 'Copeland control wiring', description: 'Demand Cooling and unloader troubleshooting', keywords: 'compressor injection discus coresense electrical', href: '/simulation/copeland-control' },
  { slug: 'bitzer-control', title: 'Bitzer control wiring', description: 'Motor protection and oil control practice', keywords: 'olc int280 delta pii safety electrical', href: '/simulation/bitzer-control' },
  { slug: 'safety-circuit', title: 'Safety circuit trainer', description: 'Find an open contact with a two-probe meter', keywords: 'hopscotch electrical voltage contactor fuse', href: '/simulation/safety-circuit' },
  { slug: 'cold-call', title: 'Cold Call — career game', description: 'Practise service calls in trade school and store environments', keywords: 'defrost heater frozen case apprentice', href: '/game' },
] as const

export const LEARNING_PATHS = [
  { slug: 'defrost', title: 'Diagnose a defrost problem', description: 'Identify the control, understand the sequence, then practise measurements and repair verification.', keywords: 'traulsen next gen defrost heater iced coil frozen evaporator fan', href: '/learn/defrost' },
] as const
