import type { ToolId } from '../tools'

export type InspectionTool = ToolId | 'flashlight'
export type ComponentId =
  | 'product'
  | 'controller'
  | 'coil'
  | 'fans'
  | 'heaters'
  | 'txv'
  | 'solenoid'
  | 'drain'
  | 'electrical'
  // Rack-side places, for calls worked at the machine room rather than a case.
  | 'receiver'
  | 'drier'
  | 'compressors'
  | 'condenser'
export interface EvidenceItem {
  id: string
  label: string
  value: string
  kind: 'observation' | 'measurement'
  atMin: number
  recorded: boolean
  phase: 'before' | 'after'
}
export interface Measurement {
  id: string
  label: string
  tool: InspectionTool
  /** Meter function, or — for a manifold set — which port the hose goes on. */
  mode?: 'ohms' | 'volts' | 'amps' | 'low' | 'high'
  terminals?: readonly [string, string]
}
export interface VisualFaultState {
  frost: number[]
  defrost: boolean
  repaired: boolean
  pullingDown: boolean
}
export type InspectionDefId = 'f1-defrost' | 'f2-evap-fan' | 'f3-liquid-drier'
export interface InspectionState {
  definition: InspectionDefId
  evidence: EvidenceItem[]
  isolated: boolean
  provedDead: boolean
  leadsDisconnected: boolean
  coverOpen: boolean
  repaired: boolean
  defrostStarted: number | null
  terminatedAt: number | null
  cycle: number
  frost: number[]
  /** Per-section state the evaporator-fan call needs, absent on older saves
   *  and on calls that have no fan story to tell. */
  fans?: boolean[]
  airTempF?: number[]
  productTemp: number
  diagnosis: string | null
  verified: boolean
  safetyMistakes: string[]
  unnecessary: string[]
  repairs: string[]
  feedback: string
  note: string
  shrink: number
  elapsedMinutes: number
}
export type InspectionAction =
  | { type: 'observe'; component: ComponentId; tool: InspectionTool }
  | { type: 'force-defrost' | 'end-defrost'; tool: InspectionTool }
  | { type: 'wait'; minutes: number }
  | {
      type: 'isolate' | 'restore' | 'disconnect' | 'open-cover' | 'close-cover'
      tool: InspectionTool
    }
  | {
      type: 'measure'
      measurement: string
      tool: InspectionTool
      mode: string
      terminals: string[]
    }
  | { type: 'record'; id: string }
  | { type: 'diagnose'; system: string; component: string; failure: string }
  | { type: 'replace'; part: string; tool: InspectionTool }
  | { type: 'verify' }
  | { type: 'note'; value: string }
