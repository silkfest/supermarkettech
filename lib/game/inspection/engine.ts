import type { ActiveCall } from '../types'
import { F1_FAULT, MEASUREMENTS } from './f1'
import type {
  ComponentId,
  EvidenceItem,
  InspectionAction,
  InspectionState
} from './types'

export function recorded(
  s: InspectionState,
  id: string,
  phase?: 'before' | 'after'
) {
  return s.evidence.some(
    (e) => e.id === id && e.recorded && (!phase || e.phase === phase)
  )
}
/** One step of what a call still needs. The gates below are derived from these,
 *  so the checklist the technician reads can never drift from what is enforced. */
export interface Step {
  label: string
  done: boolean
}
export function diagnoseChecklist(s: InspectionState): Step[] {
  return [
    {
      label: 'Run a defrost and note which section stays iced',
      done: recorded(s, 'pattern', 'before')
    },
    {
      label: 'Clamp the heater feeder while defrost is energised',
      done: recorded(s, 'current', 'before')
    },
    {
      label: 'Ohm each element on its own — H1, H2 and H3',
      done: ['e1', 'e2', 'e3'].every((id) => recorded(s, id, 'before'))
    }
  ]
}
export function verifyChecklist(s: InspectionState): Step[] {
  return [
    { label: 'Repair installed', done: s.repaired },
    {
      label: 'Leads reconnected, disconnect restored, cover secured',
      done: !s.isolated && !s.leadsDisconnected && !s.coverOpen
    },
    {
      label: 'Full heater current measured during defrost',
      done: recorded(s, 'current', 'after')
    },
    {
      label: 'Coil confirmed clear',
      done: recorded(s, 'cleared', 'after') && s.frost.every((f) => f <= 8)
    },
    {
      label: 'Defrost terminated on temperature',
      done:
        recorded(s, 'termination', 'after') &&
        s.terminatedAt !== null &&
        s.defrostStarted === null
    },
    {
      label: 'Product at or below \u22128 \u00b0F after pull-down',
      done:
        s.productTemp <= -8 &&
        s.evidence.some(
          (e) =>
            e.id === 'product' &&
            e.phase === 'after' &&
            e.recorded &&
            parseFloat(e.value) <= -8
        )
    }
  ]
}
export function canDiagnose(s: InspectionState) {
  return diagnoseChecklist(s).every((x) => x.done)
}
export function canVerify(s: InspectionState) {
  return verifyChecklist(s).every((x) => x.done)
}
/** What to do next, naming the place and the action rather than the goal. A
 *  step that says "note which section stays iced" without saying "inspect the
 *  coil" is a step you cannot act on. `hints` escalate for the Stuck? button:
 *  why first, then where, then the exact button. */
export interface Guidance {
  text: string
  /** Where on the case it happens, so the panel can take you straight there. */
  area?: ComponentId
  hints: string[]
}
export function guidance(s: InspectionState): Guidance {
  if (s.verified)
    return {
      text: 'Write up the work order on the Report page and close the call.',
      hints: [
        'The repair is proved; what is left is the paperwork.',
        'Open the Report page.',
        'Use the chips to build the note from what you found, then Complete report.'
      ]
    }

  if (s.repaired) {
    const left = verifyChecklist(s).find((x) => !x.done)
    if (!left)
      return {
        text: 'Everything checks out — confirm verified operation on the Report page.',
        hints: ['Every verification step is ticked.', 'Open the Report page.', 'Press “Confirm verified operation”.']
      }
    switch (left.label) {
      case 'Leads reconnected, disconnect restored, cover secured':
        return {
          text: 'Put the circuit back: reconnect the leads, restore the disconnect and secure the cover.',
          area: 'electrical',
          hints: [
            'Nothing can be verified while the circuit is still opened up.',
            'Go to the Defrost circuit.',
            'Use “Reconnect, secure covers and restore”.'
          ]
        }
      case 'Full heater current measured during defrost':
        return {
          text: 'Run another defrost and clamp the feeder again — it should pull full current now.',
          area: 'electrical',
          hints: [
            'The before-and-after current is what proves the repair.',
            'Controller → “Request a manual defrost”, then open the service cover.',
            'Defrost circuit → “Clamp the heater feeder”, read on A~.'
          ]
        }
      case 'Coil confirmed clear':
        return {
          text: 'Let the defrost finish, then inspect the evaporator coil and confirm every section cleared.',
          area: 'coil',
          hints: [
            'All three sections should shed their ice now.',
            'Use “Wait 10 min”, then go to the Evaporator.',
            'Press “Inspect the evaporator coil”.'
          ]
        }
      case 'Defrost terminated on temperature':
        return {
          text: 'Let the defrost terminate, then read the controller to confirm it ended on temperature.',
          area: 'controller',
          hints: [
            'A defrost that runs its full failsafe has not really terminated.',
            'Wait until the defrost stops, then go to the Controller.',
            'Press “Read the controller and its history”.'
          ]
        }
      case 'Product at or below \u22128 \u00b0F after pull-down':
        return {
          text: 'Give the case time to pull down, then probe the product again.',
          area: 'product',
          hints: [
            'The number the manager will ask about is the product, not the coil.',
            'Use “Wait 10 min” a few times, then go to the doors and product.',
            'Press “Probe between the product packs” and read it.'
          ]
        }
      default:
        return {
          text: 'Install the repair you called.',
          area: 'heaters',
          hints: ['You have a diagnosis but no repair yet.', 'Go to the Defrost heaters.', 'Replace the element you called.']
        }
    }
  }

  if (s.diagnosis)
    return {
      text: 'Isolate, prove dead and disconnect the leads, then change the element you called.',
      area: 'heaters',
      hints: [
        'Nothing gets replaced on a live circuit.',
        'Defrost circuit → secure the disconnect, prove dead, disconnect the leads.',
        'Then Defrost heaters → “Replace heater 3”.'
      ]
    }

  if (canDiagnose(s))
    return {
      text: 'You have the evidence — open the Diagnose page and call it.',
      hints: [
        'A pattern, a current reading and three element readings is enough to name the fault.',
        'Open the Diagnose page.',
        'Pick the system, the component and the failure, then submit.'
      ]
    }

  if (!recorded(s, 'pattern', 'before')) {
    if (s.cycle === 0)
      return {
        text: 'Ask the controller for a defrost, let it run, then inspect the evaporator coil.',
        area: 'controller',
        hints: [
          'A section that is not heating only shows itself during a defrost.',
          'Go to the Controller and press “Request a manual defrost”.',
          'Then wait about ten minutes and inspect the evaporator coil.'
        ]
      }
    if (s.defrostStarted !== null && (s.frost[0] > 12 || s.frost[1] > 12))
      return {
        text: 'Defrost is running — give it about ten minutes, then inspect the evaporator coil.',
        area: 'coil',
        hints: [
          'Too early and every section still looks iced.',
          'Press “Wait 10 min”, then go to the Evaporator.',
          'Press “Inspect the evaporator coil” and see which one is still white.'
        ]
      }
    return {
      text: 'Now inspect the evaporator coil and note which section is still iced.',
      area: 'coil',
      hints: [
        'The defrost has done its work; looking at the coil is what records it.',
        'Go to the Evaporator.',
        'Press “Inspect the evaporator coil”.'
      ]
    }
  }

  if (!recorded(s, 'current', 'before'))
    return {
      text: 'Clamp the heater feeder while a defrost is actually energised.',
      area: 'electrical',
      hints: [
        'Clamped with the heaters off it reads zero and proves nothing.',
        'Take the service cover off, and have a defrost running.',
        'Defrost circuit → “Clamp the heater feeder”, read on A~.'
      ]
    }

  return {
    text: 'Isolate, prove dead, disconnect the leads, then ohm H1, H2 and H3 on their own.',
    area: 'heaters',
    hints: [
      'Resistance readings only mean something on a dead circuit with the parallel paths broken.',
      'Defrost circuit → secure the disconnect, prove dead, disconnect one lead per element.',
      'Then Defrost heaters → ohm each element across its terminals.'
    ]
  }
}
/** One clock drives visuals, temperature, shrink and both interactive/legacy calls. */
export function tickInspection(
  s: InspectionState,
  now: number,
  dt: number
): InspectionState {
  const active = s.defrostStarted !== null && !s.isolated
  let frost = [...s.frost]
  let defrostStarted = s.defrostStarted
  let terminatedAt = s.terminatedAt
  if (active) {
    frost = frost.map((v, i) =>
      i === 2 && !s.repaired ? v : Math.max(5, v - dt * 9)
    )
    if (now - s.defrostStarted! >= (s.repaired ? 11 : 14)) {
      defrostStarted = null
      if (s.repaired) terminatedAt = now
    }
  } else if (!s.repaired)
    frost = frost.map((v, i) =>
      Math.min(100, v + dt * (i === 2 ? 0.12 : 0.025))
    )
  const cooling = s.repaired && terminatedAt !== null && !active && !s.isolated
  const productTemp = cooling
    ? Math.max(-9, s.productTemp - dt * 0.65)
    : Math.min(18, s.productTemp + dt * (active ? 0.06 : 0.025))
  return {
    ...s,
    frost,
    defrostStarted,
    terminatedAt,
    productTemp,
    elapsedMinutes: s.elapsedMinutes + dt,
    shrink:
      s.shrink +
      (cooling && productTemp <= -8 ? 0 : F1_FAULT.shrinkPerMin * dt * 0.25)
  }
}

/** All prerequisites live here, not just on disabled UI buttons. */
export function interact(
  call: ActiveCall,
  action: InspectionAction,
  now: number,
  random = Math.random
): { call: ActiveCall; minutes: number } {
  if (!call.inspection) return { call, minutes: 0 }
  const s: InspectionState = { ...call.inspection, feedback: '' }
  const next = {
    ...call,
    stage: (call.stage === 'ticket'
      ? 'diagnose'
      : call.stage) as ActiveCall['stage']
  }
  let minutes = 0
  const fail = (message: string, safety = false) => {
    s.feedback = message
    if (safety) s.safetyMistakes = [...s.safetyMistakes, message]
    minutes = 1
  }
  const evidence = (
    id: string,
    label: string,
    value: string,
    kind: EvidenceItem['kind'] = 'observation'
  ) => {
    const phase = s.repaired ? 'after' : 'before'
    s.evidence = [
      ...s.evidence,
      { id, label, value, kind, phase, atMin: now, recorded: true }
    ]
    s.feedback = `${label}: ${value}`
  }
  switch (action.type) {
    case 'note':
      s.note = action.value
      break
    case 'record':
      s.evidence = s.evidence.map((e) =>
        `${e.phase}:${e.id}:${e.atMin}` === action.id
          ? { ...e, recorded: true }
          : e
      )
      break
    case 'wait':
      minutes = Math.min(15, Math.max(1, action.minutes))
      break
    case 'observe': {
      const needs =
        action.component === 'controller' ? 'controller' : 'flashlight'
      if (action.tool !== needs) {
        fail(
          `Select the ${needs === 'controller' ? 'controller interface' : 'flashlight'} first.`
        )
        break
      }
      minutes = action.component === 'controller' ? 2 : 1
      switch (action.component) {
        case 'product':
          evidence(
            'doors',
            'Product area',
            'Doors seal; heavier frost at the return/end grille. Measure product with the temperature probe.'
          )
          break
        case 'coil':
          evidence(
            'frost',
            'Coil frost',
            s.frost.every((f) => f <= 8)
              ? 'All three sections are clear.'
              : 'Uneven frost, heaviest at the return/end section.'
          )
          if (
            s.cycle > 0 &&
            s.frost[0] < 12 &&
            s.frost[1] < 12 &&
            s.frost[2] > 80
          )
            evidence(
              'pattern',
              'Observed defrost pattern',
              'Sections 1 and 2 clear; return section 3 remains heavily iced.'
            )
          // Looking mid-defrost used to record nothing and say nothing, which
          // reads as a broken button rather than "you are early".
          else if (s.cycle > 0 && s.defrostStarted !== null)
            s.feedback =
              'Still early in the defrost — every section is shedding frost. Let it run and look again.'
          else if (s.cycle === 0)
            s.feedback =
              'Frost is uneven, but a cold coil looks much the same all over. Run a defrost and look again to see which section is not heating.'
          if (s.repaired && s.frost.every((f) => f <= 8))
            evidence(
              'cleared',
              'Post-repair coil',
              'All sections cleared during defrost.'
            )
          break
        case 'controller':
          evidence(
            'controller',
            'Controller / history',
            'Four scheduled defrosts; recent cycles ended on the failsafe. Nameplate reference: three equal heater loads, 8.7 A total.'
          )
          if (s.repaired && s.terminatedAt !== null)
            evidence(
              'termination',
              'Defrost termination',
              'Coil reached 52 °F; temperature termination operated, then refrigeration and fan delay resumed.'
            )
          break
        case 'fans':
          evidence(
            'fans',
            'Fan bank',
            s.defrostStarted !== null
              ? 'All fans stopped by defrost control.'
              : 'All three fans running; airflow restricted at the iced end.'
          )
          break
        case 'drain':
          evidence(
            'drain',
            'Drain / pan',
            'Drain clear; meltwater drains normally.'
          )
          break
        case 'heaters':
          evidence(
            'heaters',
            'Heater access',
            'Three elements under the evaporator, labelled H1 supply, H2 centre, H3 return. Open the service cover to access terminals.'
          )
          break
        case 'electrical':
          evidence(
            'circuit',
            'Defrost circuit',
            'Labelled heater disconnect, feeder conductor, three element terminal pairs and case-frame ground.'
          )
          break
        case 'txv':
        case 'solenoid':
          s.unnecessary = [
            ...s.unnecessary,
            `${action.component} inspection (${now.toFixed(0)} min)`
          ]
          evidence(
            action.component,
            action.component === 'txv' ? 'TXV' : 'Liquid solenoid',
            'No visible external defect. This visual check alone does not establish operation.'
          )
          minutes = 4
          break
      }
      break
    }
    case 'force-defrost':
      if (action.tool !== 'controller')
        fail('Use the controller interface to request defrost.')
      else if (s.isolated || s.leadsDisconnected)
        fail(
          'Reconnect the heater leads and restore the heater circuit before requesting defrost.'
        )
      else if (s.defrostStarted !== null) fail('Defrost is already running.')
      else {
        s.defrostStarted = now
        s.terminatedAt = null
        s.cycle++
        s.feedback =
          'Defrost requested. Watch the sections and measure while the heater circuit is energised.'
        minutes = 1
      }
      break
    case 'open-cover':
      if (action.tool !== 'hands') fail('Use hand tools on the service cover.')
      else {
        s.coverOpen = true
        minutes = 2
        s.feedback =
          'Service cover removed; labelled feeder and test points accessible.'
      }
      break
    case 'close-cover':
      if (action.tool !== 'hands')
        fail('Use hand tools to secure the service cover.')
      else {
        s.coverOpen = false
        minutes = 1
        s.feedback = 'Service cover secured.'
      }
      break
    case 'isolate':
      if (action.tool !== 'hands')
        fail('Select hand tools to operate and secure the heater disconnect.')
      else {
        s.isolated = true
        s.provedDead = false
        s.defrostStarted = null
        minutes = 2
        s.feedback =
          'Heater disconnect secured OFF. Prove the load side dead with the voltage meter.'
      }
      break
    case 'disconnect':
      if (action.tool !== 'hands')
        fail('Select hand tools to disconnect one lead on each element.')
      else if (!s.isolated || !s.provedDead)
        fail(
          'Isolate and prove the heater circuit dead before disconnecting leads.',
          true
        )
      else if (!s.coverOpen) fail('Open the heater service cover first.')
      else {
        s.leadsDisconnected = true
        minutes = 3
        s.feedback =
          'One lead removed from each heater, eliminating parallel paths for resistance tests.'
      }
      break
    case 'restore':
      if (action.tool !== 'hands')
        fail('Use hand tools to reconnect leads and restore the circuit.')
      else {
        s.leadsDisconnected = false
        s.isolated = false
        s.provedDead = false
        s.coverOpen = false
        minutes = 3
        s.feedback =
          'Leads reconnected, covers secured, heater circuit restored.'
      }
      break
    case 'measure': {
      const m = MEASUREMENTS.find((m) => m.id === action.measurement)
      if (!m || m.tool !== action.tool || (m.mode && m.mode !== action.mode)) {
        fail('Select the appropriate instrument and meter function.')
        break
      }
      if (
        m.terminals &&
        !m.terminals.every((t) => action.terminals.includes(t))
      ) {
        fail('Place the probes / clamp at the labelled test points.')
        break
      }
      if (m.id !== 'product' && !s.coverOpen) {
        fail('Open the service cover to access the circuit.')
        break
      }
      if (m.mode === 'ohms' && (!s.isolated || !s.provedDead)) {
        fail(
          'Resistance requires the heater circuit isolated and proved dead.',
          true
        )
        break
      }
      if (m.mode === 'ohms' && !s.leadsDisconnected) {
        fail('Disconnect one lead from each element to remove parallel paths.')
        break
      }
      minutes = 1
      if (m.id === 'product')
        evidence(
          'product',
          'Product probe',
          `${(s.productTemp + (random() - 0.5) * 0.4).toFixed(1)} °F`,
          'measurement'
        )
      else if (m.id === 'dead') {
        if (s.isolated) {
          s.provedDead = true
          evidence(
            'dead',
            'Absence-of-voltage test',
            '0 V between load conductors and to ground; meter checked before and after.',
            'measurement'
          )
        } else
          evidence(
            'live',
            'Voltage test',
            'Supply present; circuit is energised.',
            'measurement'
          )
      } else if (m.id === 'current') {
        const energised = !s.isolated && s.defrostStarted !== null
        const value = energised
          ? (s.repaired
              ? 8.7
              : F1_FAULT.readings.find((r) => r.key === 'htrA')!.value) +
            (random() - 0.5) * 0.12
          : 0
        evidence(
          energised ? 'current' : 'current-off',
          'Heater feeder clamp',
          `${value.toFixed(1)} A${energised ? ' during defrost' : ' — heaters not energised'}`,
          'measurement'
        )
      } else {
        const inst = F1_FAULT.checks.find((c) => c.id === 'ohm')!.instrument!
        const value = m.id.startsWith('g')
          ? 'OL — no continuity to frame (DMM screening)'
          : m.id === 'e3' && s.repaired
            ? '19.0 Ω'
            : inst.kind === 'meter'
              ? inst.points.find((p) => p.id === m.id)!.reading
              : ''
        evidence(m.id, m.label, value, 'measurement')
      }
      break
    }
    case 'diagnose':
      if (!canDiagnose(s)) {
        fail(
          'Record a defrost pattern, energised heater current and all three individual element readings to support a diagnosis.'
        )
        break
      }
      next.causeAttempts++
      if (
        action.system === 'Defrost' &&
        action.component === 'Electric heaters' &&
        action.failure === 'Heater #3 open'
      ) {
        s.diagnosis = 'Defrost → Electric heaters → Heater #3 open'
        s.feedback =
          'Diagnosis supported by the measured open circuit and missing heater load.'
      } else {
        s.feedback =
          'That diagnosis does not explain the recorded current and individual element readings.'
        minutes = 5
      }
      break
    case 'replace':
      if (action.tool !== 'hands') {
        fail('Select hand tools to replace a component.')
        break
      }
      if (!s.isolated || !s.provedDead || !s.leadsDisconnected) {
        fail(
          'Isolate, prove dead and disconnect before replacing a heater.',
          true
        )
        break
      }
      if (!s.diagnosis) {
        fail('Record your evidence-based diagnosis before ordering a part.')
        break
      }
      if (s.repaired) {
        fail('Repair is already installed. Restore and verify operation.')
        break
      }
      next.fixAttempts++
      if (action.part === 'H3') {
        s.repaired = true
        s.repairs = [...s.repairs, 'Replaced Heater #3 ($140)']
        minutes = 20
        s.feedback =
          'Replacement H3 fitted. Restore the circuit, then verify a complete defrost and pull-down.'
      } else {
        next.partsWasted += action.part === 'termination' ? 75 : 140
        s.repairs = [...s.repairs, `Unnecessary replacement: ${action.part}`]
        minutes = 15
        s.feedback =
          'That part was functional. The open return-end heater is still installed.'
      }
      break
    case 'verify':
      if (!canVerify(s))
        fail(
          'Verification needs recorded full defrost current, a clear coil, temperature termination a product reading at or below −8 °F after pull-down, and secured service covers.'
        )
      else {
        s.verified = true
        next.stage = 'log'
        s.feedback = 'Operation verified. Complete your service report.'
      }
      break
  }
  return {
    call: { ...next, inspection: s, lotoDone: call.lotoDone || s.provedDead },
    minutes
  }
}
