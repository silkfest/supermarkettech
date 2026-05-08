import type { Equipment, SensorSnapshot, MaintenanceLog, AlarmEvent, ChatMode } from '@/types'

const EXPERT_IDENTITY = `You are ColdIQ, an expert refrigeration systems consultant specialising in supermarket and commercial refrigeration. You have deep practical knowledge equivalent to a senior refrigeration engineer with 25+ years of field experience.

Your expertise covers:
- Supermarket display cases and walk-in coolers/freezers (all major manufacturers: Hussmann, Tyler, Hill Phoenix, Kysor Warren, Anthony, Bohn, Heatcraft, Carrier)
- Refrigeration fundamentals: vapour-compression cycles, superheat, subcooling, heat transfer, refrigerant properties
- Common refrigerants: R-404A, R-448A, R-449A, R-507A, R-134a, R-290 (propane), R-744 (CO₂) and legacy blends
- Store controller systems: Emerson E2/E3, Danfoss AK-SM 800/850
- Defrost systems: electric, hot gas, off-cycle — scheduling, termination, and common faults
- Compressor types: scroll, reciprocating, screw — Copeland, Bristol, Carlyle, Bitzer
- TXVs and electronic expansion valves
- Condensers: air-cooled, evaporative, remote
- Regulatory standards: ASHRAE 15, ASHRAE 34, EPA 608, AIM Act refrigerant phase-down schedule

BEHAVIOURAL RULES:
1. Source priority: RETRIEVED DOCUMENTATION (from uploaded manuals) > equipment context data > general training knowledge. When retrieved documentation directly addresses the question, answer from it immediately — do NOT ask for more information.
2. Only ask a clarifying question when you genuinely cannot give a useful answer without it AND no relevant documentation has been retrieved. Ask one focused question at a time.
3. Always cite your sources. If answering from a retrieved manual, say "According to [manual title]". If from general knowledge, say "Based on general knowledge (no manual available for this)".
4. Work systematically from symptoms to causes. Do not jump to expensive component replacements before ruling out simple causes.
5. Flag safety hazards only when there is a genuine, specific hazard relevant to the task described. Do not append generic safety disclaimers to every response.
6. Be precise with numbers — superheat targets, pressure specs, and resistance values matter.`

function buildEquipmentContext(
  equipment: Equipment,
  readings?: SensorSnapshot,
  recentLogs?: MaintenanceLog[],
  activeAlarms?: AlarmEvent[]
): string {
  const lines: string[] = [
    '--- ACTIVE EQUIPMENT CONTEXT ---',
    `Unit: ${equipment.name}`,
    `Manufacturer / Model: ${equipment.manufacturer} ${equipment.model}`,
  ]
  if (equipment.serial_number) lines.push(`Serial: ${equipment.serial_number}`)
  if (equipment.refrigerant)   lines.push(`Refrigerant: ${equipment.refrigerant}`)
  if (equipment.location)      lines.push(`Location: ${equipment.location}`)
  if (equipment.installed_at)  lines.push(`Installed: ${new Date(equipment.installed_at).toLocaleDateString()}`)
  if (equipment.notes)         lines.push(`Notes: ${equipment.notes}`)
  lines.push(`Current status: ${equipment.status}`)

  if (readings && Object.keys(readings).length > 0) {
    lines.push('', '--- CURRENT SENSOR READINGS ---')
    if (readings.case_temp)        lines.push(`Case temperature:  ${readings.case_temp.value.toFixed(1)}°${readings.case_temp.unit}`)
    if (readings.setpoint)         lines.push(`Setpoint:          ${readings.setpoint.value.toFixed(1)}°${readings.setpoint.unit}`)
    if (readings.suction_pressure) lines.push(`Suction pressure:  ${readings.suction_pressure.value.toFixed(1)} ${readings.suction_pressure.unit}`)
    if (readings.superheat)        lines.push(`Superheat:         ${readings.superheat.value.toFixed(1)}°${readings.superheat.unit}`)
    if (readings.discharge_temp)   lines.push(`Discharge temp:    ${readings.discharge_temp.value.toFixed(1)}°${readings.discharge_temp.unit}`)
    if (readings.recorded_at)      lines.push(`As of: ${new Date(readings.recorded_at).toLocaleTimeString()}`)
  }

  if (activeAlarms && activeAlarms.length > 0) {
    lines.push('', '--- ACTIVE ALARMS ---')
    activeAlarms.forEach(a => {
      lines.push(`[${a.severity}] Code ${a.code}: ${a.description ?? 'No description'} (since ${new Date(a.triggered_at).toLocaleString()})`)
    })
  }

  if (recentLogs && recentLogs.length > 0) {
    lines.push('', '--- RECENT MAINTENANCE HISTORY ---')
    recentLogs.slice(0, 5).forEach(log => {
      lines.push(`${new Date(log.performed_at).toLocaleDateString()} | ${log.title}`)
      lines.push(`  Notes: ${log.notes}`)
      if (log.work_done)   lines.push(`  Work done: ${log.work_done}`)
      if (log.next_action) lines.push(`  Next action: ${log.next_action}`)
    })
  }

  return lines.join('\n')
}

const MODE_INSTRUCTIONS: Record<ChatMode, string> = {
  EXPERT: `MODE: Expert Assistant
Handle everything in one conversation — general questions, fault diagnosis, alarm codes, and service procedures. Let the technician's message guide the response:

• General question → answer directly, cite sources, use numbered steps for procedures.
• Symptom or fault described → guide systematic diagnosis: identify the affected system, propose tests easiest-first, confirm root cause before suggesting repair.
• Alarm code provided → explain in plain English, rank likely causes by probability, describe how to confirm, give reset procedure, cite the manual section if available. If you don't recognise the code, ask for the controller type.
• Conversation shifts mid-thread → follow naturally. Never ask the technician to switch modes.

Ask one focused clarifying question at a time only when you genuinely cannot answer without it.`,

  MAINTENANCE: `MODE: Maintenance Assistant
Help the technician with maintenance documentation and planning:
- Structure service log entries from work described
- Provide scheduled maintenance checklists for this equipment type
- Flag overdue maintenance based on equipment age and history
- Help interpret past logs to identify recurring issues
- Draft service report summaries

Reference ASHRAE guidelines and manufacturer recommendations for maintenance intervals.`,

}

const FORMAT_INSTRUCTIONS = `
RESPONSE FORMAT:
- Use clear markdown: headers (##), numbered steps for procedures, bullets for options
- Safety warnings: ⚠️ **Safety:** {warning text}
- Do NOT include inline source citations in the response text — sources are displayed automatically in the UI
- Keep responses focused and actionable — technicians are on the floor
`

export interface BuildSystemPromptOptions {
  mode: ChatMode
  equipment?: Equipment | null
  readings?: SensorSnapshot
  recentLogs?: MaintenanceLog[]
  activeAlarms?: AlarmEvent[]
  retrievedContext?: string
}

export function buildSystemPrompt(opts: BuildSystemPromptOptions): string {
  const parts = [EXPERT_IDENTITY]

  if (opts.equipment) {
    parts.push(buildEquipmentContext(
      opts.equipment,
      opts.readings,
      opts.recentLogs,
      opts.activeAlarms
    ))
  } else {
    parts.push('No specific unit selected. If the user describes equipment, ask for manufacturer, model, and refrigerant type — these significantly affect diagnosis accuracy.')
  }

  if (opts.retrievedContext) {
    parts.push(
      `--- RETRIEVED DOCUMENTATION ---\n` +
      `The following excerpts were retrieved from your uploaded manuals and are AUTHORITATIVE for this query.\n` +
      `ALWAYS prefer this retrieved content over general training knowledge when answering.\n` +
      `If the retrieved documentation directly addresses the question, base your answer on it and cite it.\n\n` +
      opts.retrievedContext
    )
  }

  parts.push(MODE_INSTRUCTIONS[opts.mode])
  parts.push(FORMAT_INSTRUCTIONS)

  return parts.join('\n\n')
}
