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
  mode?: 'ohms' | 'volts' | 'amps'
  terminals?: readonly [string, string]
}
export interface VisualFaultState {
  frost: number[]
  defrost: boolean
  repaired: boolean
  pullingDown: boolean
}
export interface InspectionState {
  definition: 'f1-defrost'
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
  | { type: 'force-defrost'; tool: InspectionTool }
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
