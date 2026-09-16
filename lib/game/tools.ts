import type { RankDef } from './ranks'

/** Everything that can come off the truck. Tier is the apprenticeship level that
 *  puts it in your hands — a first-year has eyes, hand tools, a pocket thermometer
 *  and permission to read a controller; the meters and gauges come with Level 2;
 *  the specialist instruments come later. */
export type ToolId =
  | 'hands' | 'controller' | 'thermometer'
  | 'gauges' | 'multimeter' | 'clamp' | 'thermocouples'
  | 'megger' | 'refractometer' | 'leakdet' | 'anemometer'
  | 'thermal' | 'laptop'

export interface ToolDef {
  id: ToolId
  name: string
  /** Apprenticeship level that grants it. */
  tier: 1 | 2 | 3 | 4
  blurb: string
}

export const TOOLS: ToolDef[] = [
  { id: 'hands', tier: 1, name: 'Hand tools and a flashlight', blurb: 'Nut drivers, screwdrivers, a mirror and your own eyes. Most calls are still solved with these.' },
  { id: 'controller', tier: 1, name: 'Controller front end', blurb: 'Reading case and rack controllers: temperatures, alarm history, defrost schedules, levels.' },
  { id: 'thermometer', tier: 1, name: 'Pocket thermometer', blurb: 'Product temperature, discharge air, return air. The number the manager is going to ask you about.' },

  { id: 'gauges', tier: 2, name: 'Manifold gauge set + PT chart', blurb: 'Suction, discharge and liquid pressure — and the chart that turns a pressure into a saturation temperature.' },
  { id: 'multimeter', tier: 2, name: 'True-RMS multimeter', blurb: 'Volts, ohms and microfarads. The instrument that tells you whether a control circuit is open and where.' },
  { id: 'clamp', tier: 2, name: 'Amp clamp', blurb: 'Running current against nameplate — locked rotor, a motor pulling nothing, a heater that is not heating.' },
  { id: 'thermocouples', tier: 2, name: 'Clamp-on thermocouples', blurb: 'Line temperatures. With the gauges, this is superheat and subcooling; on its own it is a temperature split.' },

  { id: 'megger', tier: 3, name: 'Megohmmeter', blurb: 'Winding insulation to ground. The difference between a compressor that is grounded and one that merely tripped.' },
  { id: 'refractometer', tier: 3, name: 'Glycol refractometer', blurb: 'Concentration and freeze point of a secondary loop, in thirty seconds, without sending a sample anywhere.' },
  { id: 'leakdet', tier: 3, name: 'Electronic leak detector', blurb: 'Finding the leak rather than guessing at it. Useless in a breeze and worse when it is dirty — learn its limits.' },
  { id: 'anemometer', tier: 3, name: 'Anemometer', blurb: 'Face velocity across a coil or an air curtain. Turns "feels weak" into a number you can put in a report.' },

  { id: 'thermal', tier: 4, name: 'Thermal imaging camera', blurb: 'A loose lug, a restricted drier, a liquid level through a vessel wall — the things you would otherwise find by hand.' },
  { id: 'laptop', tier: 4, name: 'Service laptop', blurb: 'Drive parameters, controller programming and the trend logs that show you what happened at three in the morning.' },
]

export const TOOL_BY_ID: Record<ToolId, ToolDef> = Object.fromEntries(TOOLS.map(t => [t.id, t])) as Record<ToolId, ToolDef>

/** The `tool:` line on a check is flavour text written for a technician. This maps
 *  each of those strings onto what actually has to be in the bag. Anything
 *  unrecognised falls back to hand tools, so a new check never locks itself. */
const TOOL_STRINGS: Record<string, ToolId[]> = {}
function map(ids: ToolId[], ...strings: string[]) { for (const s of strings) TOOL_STRINGS[s] = ids }

map(['hands'], 'Eyes', 'Hands', 'Eyes / hands', 'Hands / eyes', 'Flashlight', 'Eyes / flashlight',
  'Screwdriver', 'Cup of water', 'Service log', 'Panel schedule', 'Timer', 'Eyes / stopwatch',
  'Lock & tag', 'Eyes / torque wrench', 'CO2 detector')
map(['controller'], 'Controller', 'Case controller', 'Controller / hands', 'Eyes / controller',
  'Service log / controller', 'Level probe', 'Level', 'Level / manual', 'Level probe / sight glass')
map(['thermometer'], 'Thermometer', 'Thermometer / eyes', 'Hands / thermometer', 'Hygrometer')
map(['gauges'], 'Gauges', 'Pressure gauges', 'Gauges / manual', 'Gauges / eyes', 'Eyes / gauges', 'Ears / gauges')
map(['thermocouples'], 'Thermocouple', 'Thermocouples')
map(['gauges', 'thermometer'], 'Thermometer / gauges')
map(['gauges', 'thermocouples'], 'Thermocouple / gauges', 'Thermocouples / gauges')
map(['multimeter'], 'Multimeter', 'Multimeter (Ω)', 'Multimeter (V)', 'Multimeter (µF)', 'Meter',
  'Meter / eyes', 'Eyes / meter', 'Eyes / multimeter', 'Hands / meter', 'Meter / 120 V cord', 'Meter / controller')
map(['clamp'], 'Clamp meter', 'Amp clamp', 'Eyes / clamp', 'Hands / clamp meter')
map(['megger'], 'Megohmmeter')
map(['refractometer'], 'Refractometer', 'Sample kit')
map(['leakdet'], 'Electronic leak detector')
map(['thermal'], 'Thermal camera')
// Feeling a strainer for a temperature drop is a bare-hands check; the IR gun is a nicety.
map(['hands'], 'Hands / IR gun')
map(['anemometer'], 'Eyes / anemometer')
map(['laptop'], 'VFD keypad')

/** What a check's tool line requires. Unknown strings need nothing but your hands. */
export function toolsFor(toolLine: string): ToolId[] {
  return TOOL_STRINGS[toolLine] ?? ['hands']
}

/** The crib as it stands at a given rank. */
export function ownedTools(rank: RankDef): Set<ToolId> {
  return new Set(TOOLS.filter(t => t.tier <= rank.tier).map(t => t.id))
}

/** Tools a check needs that are not in the bag yet. */
export function missingTools(toolLine: string, owned: Set<ToolId>): ToolDef[] {
  return toolsFor(toolLine).filter(id => !owned.has(id)).map(id => TOOL_BY_ID[id])
}

/** The tier a check is out of reach below — the highest-tier tool it needs. */
export function checkTier(toolLine: string): number {
  return Math.max(...toolsFor(toolLine).map(id => TOOL_BY_ID[id].tier))
}

/** The lowest rank that can actually work a fault: you need at least one of its
 *  discriminating checks to be runnable with the tools you carry. Dispatch uses
 *  this alongside the fault's own difficulty, so a call can never land on a board
 *  where every key check is locked — including for faults added later. */
export function requiredTier(checks: { tool: string; key?: boolean }[]): number {
  const keys = checks.filter(c => c.key)
  if (keys.length === 0) return 1
  return Math.min(...keys.map(c => checkTier(c.tool)))
}
