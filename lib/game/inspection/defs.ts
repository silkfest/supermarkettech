import {
  COMPONENTS as F1_COMPONENTS,
  EFFICIENT_PATH as F1_PATH,
  F1_FAULT,
  F1_REPORT,
  F1_TICKET,
  MEASUREMENTS as F1_MEASUREMENTS
} from './f1'
import {
  F2_COMPONENTS,
  F2_DIAGNOSIS,
  F2_FAULT,
  F2_MEASUREMENTS,
  F2_PARTS,
  F2_REPORT,
  F2_TICKET
} from './f2'
import {
  F3_COMPONENTS,
  F3_DIAGNOSIS,
  F3_FAULT,
  F3_MEASUREMENTS,
  F3_PARTS,
  F3_REPORT,
  F3_TICKET
} from './f3'
import type { FaultDef } from '../types'
import type {
  ComponentId,
  InspectionDefId,
  InspectionState,
  Measurement
} from './types'

/** Everything the engine and the panel need that differs between calls. The
 *  behaviour still lives in the per-call modules; this is only the lookup, so
 *  no screen has to know which work order it is showing. */
export interface InspectionDef {
  id: InspectionDefId
  fault: FaultDef
  ticket: string
  report: string
  components: { id: ComponentId; label: string }[]
  measurements: Measurement[]
  parts: Record<string, { label: string; cost: number }>
  /** Full button text for "look at this" where the generic phrasing would be
   *  wrong for the call. Anything omitted falls back to the generic label. */
  lookLabels: Partial<Record<ComponentId, string>>
  /** Readings whose "nothing to see" variant should still show on the meter. */
  readingAliases: Record<string, string>
  diagnosis: {
    systems: string[]
    components: Record<string, string[]>
    failures: Record<string, string[]>
    defaultFailures: string[]
  }
  efficientPath: string
}

export const INSPECTION_DEFS: Record<InspectionDefId, InspectionDef> = {
  'f1-defrost': {
    id: 'f1-defrost',
    fault: F1_FAULT,
    ticket: F1_TICKET,
    report: F1_REPORT,
    components: F1_COMPONENTS,
    measurements: F1_MEASUREMENTS,
    lookLabels: {},
    readingAliases: { current: 'current-off', dead: 'live' },
    parts: {
      H3: { label: 'Defrost heater #3', cost: 140 },
      H1: { label: 'Defrost heater #1', cost: 140 },
      termination: { label: 'Termination thermostat', cost: 75 }
    },
    diagnosis: {
      systems: ['Refrigeration', 'Defrost'],
      components: {
        Defrost: ['Electric heaters', 'Termination control', 'Schedule'],
        Refrigeration: ['TXV', 'Liquid solenoid', 'Evaporator fans']
      },
      failures: {
        'Electric heaters': [
          'Heater #1 open',
          'Heater #2 open',
          'Heater #3 open',
          'Grounded element'
        ]
      },
      defaultFailures: ['Failed open', 'Incorrect adjustment']
    },
    efficientPath: F1_PATH
  },
  'f2-evap-fan': {
    id: 'f2-evap-fan',
    fault: F2_FAULT,
    ticket: F2_TICKET,
    report: F2_REPORT,
    components: F2_COMPONENTS,
    measurements: F2_MEASUREMENTS,
    lookLabels: {
      product: 'Feel the air curtain along the case',
      fans: 'Look at each fan in the bank',
      electrical: 'Inspect the fan circuit',
      coil: 'Inspect the evaporator coil',
      drain: 'Inspect the drain and pan'
    },
    readingAliases: { circuit: 'circuit-off', dead: 'live', leads: 'leads-dead' },
    parts: F2_PARTS,
    diagnosis: {
      systems: F2_DIAGNOSIS.systems,
      components: F2_DIAGNOSIS.components,
      failures: F2_DIAGNOSIS.failures,
      defaultFailures: ['Failed open', 'Incorrect adjustment']
    },
    efficientPath:
      'Feel the air curtain → pull the grille and find the stopped fan → unplug it and read 118 V at its plug, which puts the fault on the motor side → clamp the fan circuit and compare 0.60 A with the 0.90 A nameplate → swap that one motor on its plug → restore power with the panel still open → verify full current, even discharge air, a coil that sheds its ice and product pull-down → secure the cover last.'
  }
  ,
  'f3-liquid-drier': {
    id: 'f3-liquid-drier',
    fault: F3_FAULT,
    ticket: F3_TICKET,
    report: F3_REPORT,
    components: F3_COMPONENTS,
    measurements: F3_MEASUREMENTS,
    lookLabels: {
      receiver: 'Inspect the receiver and sight glass',
      drier: 'Inspect the liquid line drier',
      coil: 'Inspect a case on the header',
      compressors: 'Inspect the compressor group',
      condenser: 'Inspect the condenser'
    },
    readingAliases: {},
    parts: F3_PARTS,
    diagnosis: {
      systems: F3_DIAGNOSIS.systems,
      components: F3_DIAGNOSIS.components,
      failures: F3_DIAGNOSIS.failures,
      defaultFailures: ['Failed open', 'Out of adjustment']
    },
    efficientPath:
      'Subcooling at the receiver first \u2014 11 \u00b0F says the rack is not short \u2192 line temperature either side of the drier, 17 \u00b0F of drop across a device that should show none \u2192 superheat at a case, 28 \u00b0F, starved by the flash that drop creates \u2192 front-seat, pump down, prove 0 psig \u2192 change the cores \u2192 restore \u2192 verify a flat drier, a clear glass, superheat back in range and product pull-down.'
  }
}

export const defOf = (s: InspectionState): InspectionDef =>
  INSPECTION_DEFS[s.definition] ?? INSPECTION_DEFS['f1-defrost']
