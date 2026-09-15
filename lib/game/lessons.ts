export interface QuizQuestion {
  q: string
  options: string[]
  answer: number
  why: string
}

export interface Lesson {
  id: string
  stationId: string
  title: string
  minutes: number
  sections: { heading: string; body: string[]; bullets?: string[] }[]
  quiz: QuizQuestion[]
  knowledge?: { slug: string; label: string }[]
}

/** Correct answers needed (out of 4) to pass a station. */
export const LESSON_PASS = 3

export const LESSONS: Lesson[] = [
  {
    id: 'cycle',
    stationId: 'WB',
    title: 'How refrigeration moves heat',
    minutes: 4,
    sections: [
      {
        heading: 'Cold is not a thing you make',
        body: [
          'A refrigeration system does not create cold. It moves heat from a place you want cool (the case, the box) to a place you do not care about (the roof, the rack room). The refrigerant is just the truck that carries it.',
          'The trick that makes it work: a liquid absorbs a lot of heat when it boils, and the temperature it boils at depends on its pressure. Lower the pressure and it boils cold. Raise the pressure and it condenses back to liquid hot. Every component in the loop exists to set up one of those two conditions.',
        ],
      },
      {
        heading: 'Four stops around the loop',
        body: ['Follow the refrigerant from the compressor and back.'],
        bullets: [
          'Compressor — pulls in low-pressure vapor from the evaporator and squeezes it into hot, high-pressure vapor. The discharge line is the hottest pipe on the system.',
          'Condenser — outdoor air (or water) carries heat away from that hot vapor until it condenses into warm, high-pressure liquid. This is where the heat leaves the building.',
          'Metering device (TXV, capillary, EEV) — drops the liquid from high pressure to low pressure. Some of it flashes to vapor instantly; the rest is now cold liquid ready to boil.',
          'Evaporator — the cold, low-pressure liquid boils as it absorbs heat from the air blowing over the coil. That air comes off the coil cold. The vapor heads back to the compressor.',
        ],
      },
      {
        heading: 'What you can feel with your hands',
        body: [
          'Suction line: cool and sweating (or frosted on low temp). Discharge line: too hot to hold. Liquid line: warm, roughly outdoor temperature plus a bit. If any of those feel wrong, something in the loop is wrong — and that is where diagnostics begin.',
        ],
      },
    ],
    quiz: [
      { q: 'Where does the heat from the case actually leave the building?', options: ['The evaporator', 'The condenser', 'The metering device', 'The compressor'], answer: 1, why: 'The condenser rejects heat to outdoor air; the evaporator is where heat is picked up.' },
      { q: 'What happens to the refrigerant in the evaporator?', options: ['It condenses into liquid', 'It is compressed', 'It boils, absorbing heat from the air', 'Its pressure rises'], answer: 2, why: 'Cold low-pressure liquid boils in the evaporator, soaking up heat from the air passing over the coil.' },
      { q: 'Which line should be the hottest on a healthy system?', options: ['Suction line', 'Liquid line', 'Discharge line', 'Drain line'], answer: 2, why: 'The discharge line carries hot, high-pressure vapor straight out of the compressor.' },
      { q: 'What does the metering device do?', options: ['Adds heat to the refrigerant', 'Drops the pressure so the liquid can boil cold', 'Pumps refrigerant around the loop', 'Filters the refrigerant'], answer: 1, why: 'The TXV (or cap tube / EEV) drops liquid from condensing pressure to evaporating pressure.' },
    ],
    knowledge: [{ slug: 'refrigeration-fundamentals', label: 'Refrigeration Fundamentals' }, { slug: 'refrigeration-components', label: 'Refrigeration Components' }],
  },
  {
    id: 'pt',
    stationId: 'RIG',
    title: 'PT charts, superheat and subcooling',
    minutes: 6,
    sections: [
      {
        heading: 'Pressure tells you temperature',
        body: [
          'For a given refrigerant, saturation pressure and saturation temperature are locked together. Read the suction pressure, look it up on the PT chart, and you know the temperature the refrigerant is boiling at in the coil. Read the liquid pressure and you know the temperature it is condensing at.',
          'Two numbers worth keeping in your head for R-404A: 20 °F boils at about 57 psig, and 90 °F condenses at about 205 psig. R-448A and R-449A run within a few psi of R-404A across that range.',
        ],
      },
      {
        heading: 'Superheat: how much the vapor warmed after it finished boiling',
        body: [
          'Superheat = actual suction line temperature − saturated suction temperature (from the PT chart). Measure the line temperature with a clamp thermometer right at the evaporator outlet, near the TXV bulb.',
          'A TXV is built to hold about 8–12 °F of superheat at the coil outlet. That guarantees only vapor reaches the compressor.',
        ],
        bullets: [
          'High superheat (20 °F+): the coil is starved. Low charge, an underfeeding TXV, or a restriction upstream of the valve.',
          'Low superheat (0–3 °F): the coil is flooding. Liquid is leaving the evaporator — TXV overfeeding, a loose bulb, or airflow so low the coil cannot boil what it is fed.',
        ],
      },
      {
        heading: 'Subcooling: how far below condensing the liquid is',
        body: [
          'Subcooling = saturated condensing temperature (from liquid pressure) − actual liquid line temperature. Healthy: roughly 8–12 °F. Low subcooling with high superheat points to low charge. High subcooling with high head pressure points to overcharge.',
        ],
      },
      {
        heading: 'Worked example — R-404A medium temp case',
        body: [
          'Suction gauge reads 57 psig → the PT chart says 20 °F saturated. The suction line at the coil outlet measures 30 °F. Superheat = 30 − 20 = 10 °F. That coil is fed correctly.',
          'Same case, but the line measures 48 °F: superheat = 28 °F. The coil is starved — look at the TXV, the strainer, and the charge before anything else.',
        ],
      },
    ],
    quiz: [
      { q: 'Suction pressure reads 57 psig on R-404A (≈ 20 °F saturated). The suction line at the coil outlet is 30 °F. What is the superheat?', options: ['30 °F', '10 °F', '20 °F', '57 °F'], answer: 1, why: 'Superheat = line temperature − saturated suction temperature = 30 − 20 = 10 °F.' },
      { q: 'A case shows 28 °F superheat with a clean coil and strong fans. The coil is most likely…', options: ['Flooding', 'Starved', 'Iced', 'Overcharged'], answer: 1, why: 'High superheat means the coil ran out of liquid early — it is starved.' },
      { q: 'Superheat of 1 °F with a frosted suction line back to the compressor means…', options: ['Perfect operation', 'Low charge', 'Liquid is leaving the evaporator (flooding)', 'The condenser is dirty'], answer: 2, why: 'Near-zero superheat means the vapor never finished boiling — liquid is getting past the coil.' },
      { q: 'Subcooling is calculated as…', options: ['Liquid line temp − suction line temp', 'Condensing temp (from liquid pressure) − liquid line temp', 'Suction line temp − evaporating temp', 'Discharge temp − ambient temp'], answer: 1, why: 'Subcooling measures how far the liquid has cooled below its condensing temperature.' },
    ],
    knowledge: [{ slug: 'sporlan', label: 'Sporlan TXVs' }, { slug: 'system-diagnostics', label: 'System Diagnostics' }],
  },
  {
    id: 'meter',
    stationId: 'BENCH',
    title: 'Meters, clamps and the control circuit',
    minutes: 5,
    sections: [
      {
        heading: 'Three tools, three questions',
        body: ['Almost every electrical diagnosis is one of these three measurements.'],
        bullets: [
          'Voltmeter — "is power getting here?" Measure across two points with the circuit live. Full voltage across a switch, fuse or contact means it is OPEN (the meter is completing the circuit through you). Zero volts across it means it is closed and passing.',
          'Ohmmeter — "is this part intact?" Only ever with power OFF and the part isolated. A motor winding reads some ohms; a coil reads ohms; a fuse reads near zero. Infinite means open. Near zero on a coil that should read tens of ohms means shorted.',
          'Amp clamp — "is it working as hard as it should?" Clamp one conductor and compare to nameplate. Zero amps with voltage present means the load is open. Way over nameplate means it is bound up or shorted.',
        ],
      },
      {
        heading: 'The hopscotch method',
        body: [
          'On a dead control circuit, put one meter lead on the neutral (or L2) and walk the other lead down the series string: fuse, thermostat, pressure switch, overload, contactor coil. The first place you lose voltage is the open device. It is faster than guessing and it never lies.',
        ],
      },
      {
        heading: 'Fuses blow for a reason',
        body: [
          'A blown control fuse or a tripped breaker is a symptom. Before you replace it, find what drew the current: ohm the loads on that circuit — a solenoid coil, a fan motor, a heater — and look for a short to ground. Put a new fuse in without looking and it just blows again, or worse, it does not.',
        ],
      },
    ],
    quiz: [
      { q: 'You measure 120 V across a closed-looking switch in a live series circuit. That switch is…', options: ['Closed and fine', 'Open', 'Shorted to ground', 'Impossible to tell'], answer: 1, why: 'Full voltage across a device means the circuit is broken there — the switch is open.' },
      { q: 'When is it safe to use the ohms function?', options: ['Any time', 'Only with the circuit live', 'Only with power off and the part isolated', 'Only on 24 V circuits'], answer: 2, why: 'Ohms are read by the meter\'s own battery; live voltage gives wrong readings and can destroy the meter.' },
      { q: 'A fan motor has 120 V at its leads and draws 0 A. The most likely problem is…', options: ['Bad capacitor on the compressor', 'The motor winding is open', 'Low refrigerant', 'The breaker is weak'], answer: 1, why: 'Voltage present with no current means no path through the load — an open winding.' },
      { q: 'A 3 A control fuse is blown and blackened. The right first move is…', options: ['Install a 5 A fuse', 'Replace it with a 3 A and walk away', 'Ohm the loads on that circuit for a short before replacing it', 'Jumper the fuse holder to test'], answer: 2, why: 'A fuse that went hard had a reason — find the shorted coil or motor first.' },
    ],
    knowledge: [{ slug: 'math-electrical', label: 'Math & Electrical' }],
  },
  {
    id: 'defrost',
    stationId: 'CTRL',
    title: 'Defrost and case controls',
    minutes: 5,
    sections: [
      {
        heading: 'Why coils need to defrost',
        body: [
          'Any coil running below 32 °F pulls moisture out of the air as frost. A little frost is normal between defrosts. Too much chokes airflow: suction drops, superheat drops (less load), discharge air stops moving, and product warms even though the refrigeration side is doing its job. An iced coil is almost never the fault — it is the symptom of a defrost that stopped working.',
        ],
      },
      {
        heading: 'Three ways to melt it',
        body: [],
        bullets: [
          'Off-cycle — medium temp cases just stop refrigeration and let the fans run. The 35 °F air melts the frost. Cheap, and no heaters to fail.',
          'Electric — low temp cases and freezers energize heater elements on the coil. Typical: two elements at ~4 A each on 208 V, so about 8 A on the clamp during a healthy defrost. Half that means one element is open.',
          'Hot gas — the rack routes discharge gas back through the coil. Fast, but a valve problem here shows up as a case that warms in refrigeration.',
        ],
      },
      {
        heading: 'How a defrost ends — and what goes wrong',
        body: [
          'A timer or controller starts defrost on a schedule. It should END on temperature: a defrost termination (DT) switch on the coil opens around 50–55 °F and tells the controller the ice is gone. A fail-safe timer ends it if temperature never arrives.',
        ],
        bullets: [
          'DT failed open — the controller thinks the coil is already warm and ends defrost within seconds. No melt. Coil ices over days.',
          'DT stuck closed — defrost runs to the fail-safe every cycle; the coil steams and product spikes.',
          'Fan delay (klixon) — keeps fans off after defrost until the coil is cold again so you do not blow warm, wet air on product. Stuck open: the fans never restart. The most-missed case fault.',
          'Welded defrost contactor — heaters run during refrigeration. Heater amps with no defrost commanded is the giveaway.',
        ],
      },
    ],
    quiz: [
      { q: 'A defrost cycle should normally end because…', options: ['The fans turn off', 'The termination switch opens at coil temperature', 'The compressor trips', 'The store closes'], answer: 1, why: 'Defrost terminates on temperature via the DT switch; the timer is only the fail-safe.' },
      { q: 'The controller log shows defrost starting every 6 hours and ending after 30 seconds. Most likely cause:', options: ['Low charge', 'DT switch failed open', 'Heater contactor welded', 'Fan motor dead'], answer: 1, why: 'An open DT tells the controller "already warm" the instant defrost starts.' },
      { q: 'Two 4.2 A heater elements should show about 8.4 A in defrost. You read 4.2 A. That means…', options: ['Normal', 'One element is open', 'Voltage is too high', 'The DT is stuck closed'], answer: 1, why: 'Half the expected current means half the elements — one is open.' },
      { q: 'The coil is cold and clear, the fans are good, but there is no voltage at the fan motors after defrost. Check the…', options: ['Compressor contactor', 'Fan delay klixon', 'TXV bulb', 'Liquid line solenoid'], answer: 1, why: 'A stuck-open fan delay keeps fans off even after the coil is cold.' },
    ],
    knowledge: [{ slug: 'defrost-systems', label: 'Defrost Systems' }],
  },
  {
    id: 'safety',
    stationId: 'PPE',
    title: 'Safety and the shape of a service call',
    minutes: 4,
    sections: [
      {
        heading: 'Lockout / tagout is not optional',
        body: ['Before hands go into a panel, motor, or heater circuit:'],
        bullets: [
          'Identify every energy source — the case circuit, the defrost circuit, the rack disconnect.',
          'Open the breaker or disconnect. Put your lock on it. Hang your tag.',
          'Try to start it. Then verify dead with your meter — and test your meter on a known live source first.',
          'Only your key opens your lock. When the work is done, remove your lock last.',
        ],
      },
      {
        heading: 'Refrigerant and the roof',
        body: [
          'Never vent refrigerant — recover it. Wear eye protection and gloves any time you break into a system; liquid refrigerant causes instant frostbite. A2L refrigerants (R-454A, R-32) are mildly flammable: no open flame, ventilate, use A2L-rated recovery gear. On the roof, three points of contact on the ladder and mind the edge; it is the fall that hurts, not the head pressure.',
        ],
      },
      {
        heading: 'Every call, the same six steps',
        body: [],
        bullets: [
          'Symptom — what the store reported, and what you see walking up. Do not diagnose yet.',
          'Readings — gauges, temperatures, amps. Numbers before opinions.',
          'Differential — list the causes that fit ALL the readings, then use one targeted check to split them.',
          'Fix — the root cause, not the symptom. Scraping ice off a coil is not a repair.',
          'Verify — watch the readings come back into range before you leave.',
          'Document — fault found, work performed, next action. The next tech (or you, in a month) will thank you.',
        ],
      },
    ],
    quiz: [
      { q: 'After locking out a circuit, the last step before working is…', options: ['Tell the manager', 'Verify it is dead with a meter you have tested on a live source', 'Pull the fuses too', 'Remove your tag'], answer: 1, why: 'Try-start plus a verified meter reading is what proves the circuit is actually dead.' },
      { q: 'A colleague needs to run the case for a test while your lock is on the disconnect. They should…', options: ['Cut your lock', 'Use a spare key', 'Wait — only the person who applied the lock removes it', 'Jumper the contactor'], answer: 2, why: 'Your lock protects you. Nobody else removes it.' },
      { q: 'Refrigerant recovered from a system should be…', options: ['Vented on the roof', 'Recovered into a certified cylinder', 'Poured into the drain', 'Left in the lines'], answer: 1, why: 'Venting is illegal and unsafe; recovery is always required.' },
      { q: 'Which step comes before writing the service note?', options: ['Verify the readings are back in range', 'Order parts', 'Call dispatch', 'Reset the breaker'], answer: 0, why: 'Verify the fix worked before you document it — otherwise you are documenting a guess.' },
    ],
    knowledge: [{ slug: 'a2l-refrigerants', label: 'A2L Refrigerants' }, { slug: 'commissioning', label: 'Commissioning' }],
  },
]

export const LESSON_BY_STATION: Record<string, Lesson> = Object.fromEntries(LESSONS.map(l => [l.stationId, l]))
