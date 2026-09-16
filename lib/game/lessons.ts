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
  kind: 'read' | 'handson'
  sections: { heading: string; body: string[]; bullets?: string[] }[]
  quiz: QuizQuestion[]
  /** Hands-on stations embed a simulator; pass by solving this many Find-the-Fault rounds. */
  handson?: { trainer: 'safety-circuit'; variant: '120' | '208'; solvesToPass: number }
  knowledge?: { slug: string; label: string }[]
}

/** Correct answers needed (out of 4) to pass a reading station. */
export const LESSON_PASS = 3

export const LESSONS: Lesson[] = [
  {
    id: 'cycle',
    stationId: 'WB',
    title: 'How refrigeration moves heat',
    minutes: 4,
    kind: 'read',
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
    id: 'tools',
    stationId: 'CRIB',
    title: 'Know your instruments',
    minutes: 5,
    kind: 'read',
    sections: [
      {
        heading: 'Every reading in this game comes from one of these',
        body: ['A diagnosis is only as good as the number it is built on. Know what each tool actually measures — and what it cannot.'],
        bullets: [
          'Gauge manifold — blue hose to the low side (suction), red to the high side (liquid or discharge). A digital manifold with pipe clamps reads pressure and line temperature together and computes superheat and subcooling for you.',
          'Pipe-clamp thermometer — the only honest way to read a line temperature for superheat or subcooling. Clamp it on bare, clean copper and insulate over it.',
          'Infrared thermometer — surface temperature only, and it lies on shiny copper (low emissivity). Fine for coil faces, panels, and finding a hot terminal; not for superheat.',
          'Clamp-on ammeter — clamp ONE conductor. Around both conductors of a circuit the fields cancel and you read zero. Compare to nameplate RLA / FLA.',
          'Multimeter — volts across a device, ohms only with power off and the part isolated, µF for capacitors. Test it on a known live source before you trust a zero.',
          'Refrigerant scale — charge by weight on capillary systems and when the nameplate gives a charge. Guessing by gauges alone is how self-contained units get overcharged.',
          'Micron gauge — measures how deep a vacuum really is. It goes on the system, not on the pump. Target 500 microns and a decay test before you charge.',
          'Leak detection — nitrogen pressure test first, then soap bubbles or an electronic detector. Never pressure-test with oxygen or compressed air.',
          'Recovery machine and cylinder — refrigerant is recovered, never vented. Fill a recovery cylinder to no more than 80 % by weight.',
          'Hygrometer / psychrometer and a manometer — store humidity and duct static pressure. Half of the "refrigeration" complaints in a store are really an HVAC number.',
        ],
      },
      {
        heading: 'The check-out rule',
        body: [
          'On a shift you only get credit for readings you actually took. Every check in this game names the tool it uses. If you would not have that tool on the truck, you would not have that number in real life either.',
        ],
      },
    ],
    quiz: [
      { q: 'You need superheat at the evaporator outlet. Which reading is required besides suction pressure?', options: ['Discharge line temperature from an IR gun', 'Suction line temperature from a pipe clamp', 'Compressor amps', 'Liquid line pressure'], answer: 1, why: 'Superheat = suction line temperature − saturated suction temperature. A clamp thermometer on the line gives the first number; the PT chart gives the second.' },
      { q: 'You clamp the ammeter around the whole power cord to a fan and read 0 A while it runs. Why?', options: ['The fan has a bad capacitor', 'The meter is broken', 'The two conductors\' fields cancel — clamp one conductor', 'The fan is DC'], answer: 2, why: 'Current in and current out cancel. Clamp a single conductor.' },
      { q: 'Where does the micron gauge belong during evacuation?', options: ['On the vacuum pump inlet', 'On the system, as far from the pump as practical', 'On the recovery cylinder', 'It is not needed if the pump runs long enough'], answer: 1, why: 'A gauge on the pump reads the pump. You want to know the vacuum inside the system.' },
      { q: 'Why is an IR thermometer a poor choice for reading a copper suction line?', options: ['It only reads above 100 °F', 'Shiny copper has low emissivity, so the reading is wrong', 'It needs a pipe clamp adapter', 'It reads pressure, not temperature'], answer: 1, why: 'IR guns assume a surface emissivity; bare copper reflects and reads low. Use a pipe clamp.' },
    ],
    knowledge: [{ slug: 'system-diagnostics', label: 'System Diagnostics' }, { slug: 'commissioning', label: 'Commissioning' }],
  },
  {
    id: 'pt',
    stationId: 'RIG',
    title: 'PT charts, superheat and subcooling',
    minutes: 6,
    kind: 'read',
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
    id: 'compressors',
    stationId: 'COMP',
    title: 'Compressors: what they need and how they fail',
    minutes: 6,
    kind: 'read',
    sections: [
      {
        heading: 'Three kinds you will meet',
        body: [],
        bullets: [
          'Reciprocating (Copeland Discus and friends) — pistons and valves. Serviceable semi-hermetics on racks; tolerant of wide conditions; noisy; valve plates and rings wear.',
          'Scroll — two spirals, one orbiting. Quiet, efficient, fewer parts, the standard on RTUs and modern racks. Hates liquid and running backwards (a scroll on reversed phases makes a racket and pumps nothing).',
          'Hermetic (welded) — self-contained coolers, ice machines, chest freezers. Not serviceable: a burnout is a compressor swap and an acid test.',
        ],
      },
      {
        heading: 'What every compressor needs',
        body: [],
        bullets: [
          'Vapor only. Liquid does not compress — slugging breaks valves and rods. Floodback (low superheat) and flooded starts (migration) are the two ways liquid gets in.',
          'Cool return gas. Suction-cooled motors rely on the vapor to carry heat away. Starve the coil and the motor cooks even though the compressor is "not working hard."',
          'Oil where it belongs. Semi-hermetics have a sight glass — keep it mid-glass per the manufacturer. Oil that left with the refrigerant has to come back; long suction risers and low velocity strand it.',
          'Clean power. Voltage within ±10 % of nameplate, phase imbalance under 2 %. A 5 % imbalance can raise winding heat by 50 %.',
        ],
      },
      {
        heading: 'Reading a compressor in five minutes',
        body: [],
        bullets: [
          'Amps vs RLA — well under is normal at low load; well over means high head, low voltage, or a mechanical problem.',
          'Discharge line temperature — over ~225 °F six inches from the compressor means the internal temperature is heading past where oil breaks down. Find the high compression ratio (low suction, high head) causing it.',
          'Pumping — high suction and low head together on a compressor that runs means it is not compressing: broken valves or a failed scroll set. Confirm with a pump-down test before you condemn it.',
        ],
      },
      {
        heading: 'Ohming windings — and why it depends on the motor',
        body: [
          'Power off, leads disconnected, and know which kind of motor you have before you decide a reading is bad. The two cases read completely differently, and judging a single-phase compressor by the three-phase rule is how good compressors get condemned.',
        ],
        bullets: [
          'Three-phase (most rack semi-hermetics and larger scrolls) — T1-T2, T2-T3 and T1-T3 should all read the SAME, within a few percent. One leg off from the other two is a winding problem.',
          'Single-phase (reach-ins, ice machines, small condensing units — PSC and CSR hermetics) — three terminals, Common, Start and Run, and the readings are SUPPOSED to differ. Start winding (C-S) is the high one: more turns of finer wire. Run winding (C-R) is the low one. And S-R is the two in series, so the check is C-S + C-R = S-R.',
          'Finding Common on an unmarked single-phase compressor: measure all three pairs. The LARGEST reading is Start to Run, so the terminal left out of that pair is Common.',
          'Either type: any winding to the shell should read open. A decent meter reading "OL" is not proof — use a megger for the real answer, and expect a burnout to show up there first.',
        ],
      },
    ],
    quiz: [
      { q: 'A rack compressor runs, suction is high, head is low, and the case never satisfies. Most likely:', options: ['Low charge', 'Broken discharge valve — not pumping', 'Dirty condenser', 'TXV starving'], answer: 1, why: 'High suction and low head on a running compressor means it is not compressing. Low charge would drop suction, not raise it.' },
      { q: 'What is the practical limit for three-phase voltage imbalance?', options: ['10 %', '5 %', '2 %', '0.1 %'], answer: 2, why: 'Above about 2 % imbalance winding heating climbs fast — 5 % roughly halves motor life.' },
      { q: 'Discharge line reads 240 °F near the compressor. The right conclusion is:', options: ['Normal for a freezer', 'The compressor is being run at a high compression ratio — find why suction is low or head is high', 'Add oil', 'Replace the contactor'], answer: 1, why: 'Hot discharge is a symptom of compression ratio. Fix the low-suction or high-head cause before the oil cokes.' },
      { q: 'A single-phase reach-in compressor ohms C-R 2.1 Ω, C-S 7.8 Ω, S-R 9.9 Ω. This compressor is…', options: ['Bad — the windings do not match', 'Normal — start reads higher than run, and C-S + C-R = S-R', 'Shorted to ground', 'Wired backwards'], answer: 1, why: 'Single-phase windings are supposed to differ: the start winding is the high reading, and the two in series equal S-R. Only three-phase windings should match each other.' },
    ],
    knowledge: [{ slug: 'copeland', label: 'Copeland Compressors' }, { slug: 'compound-compressors', label: 'Compound Compressors' }],
  },
  {
    id: 'condensers',
    stationId: 'COND',
    title: 'Condensers and head pressure',
    minutes: 5,
    kind: 'read',
    sections: [
      {
        heading: 'Three jobs in one coil',
        body: [
          'Hot discharge vapor enters, gives up its superheat, condenses to liquid, and then cools a little more — that last part is subcooling. How well the coil does this shows up as the temperature difference (TD) between the condensing temperature (from liquid pressure on the PT chart) and the air entering the coil.',
          'Air-cooled: TD around 15–30 °F, depending on the design and how hard the rack is working. A TD that has crept up over the summer is a coil that is dirtier than it was.',
        ],
      },
      {
        heading: 'Why head pressure is controlled, not just tolerated',
        body: [
          'High head costs energy and cooks compressors. But LOW head is the winter problem: a TXV needs pressure drop across it to feed the coil. On a cold day with all the fans running, head collapses, the valve starves, and cases go warm in January.',
        ],
        bullets: [
          'Fan cycling / VFD — fewer or slower fans in cold weather to hold a minimum head pressure.',
          'Flooding (holdback) valves — back liquid up into the condenser to reduce its usable area. This is why a rack carries so much charge: the receiver has to hold that flooded liquid in summer.',
          'Heat reclaim — sends discharge gas through a coil in the store\'s air handler first. Free heat, but a stuck reclaim valve is a head-pressure fault in disguise.',
        ],
      },
      {
        heading: 'Sorting out high head',
        body: [],
        bullets: [
          'Dirty coil / blocked airflow — high head, low-to-normal subcooling, fans running. Clean it before you diagnose anything else.',
          'Fan failure — high head with a still blade. Capacitor, motor, or fan control.',
          'Overcharge — high head AND high subcooling. The condenser is backed up with liquid.',
          'Non-condensables (air) — high head, normal subcooling, clean coil, good fans. Confirm with the system off and equalized: the pressure should match the PT value for ambient; air makes it read higher.',
        ],
      },
    ],
    quiz: [
      { q: 'High head, high subcooling, clean coil, fans fine. Most likely:', options: ['Non-condensables', 'Overcharge', 'Dirty coil', 'Fan capacitor'], answer: 1, why: 'Overcharge backs liquid up in the condenser, raising both head pressure and subcooling.' },
      { q: 'Why does a rack need minimum head pressure in winter?', options: ['To keep the oil warm', 'So the TXVs have enough pressure drop to feed the coils', 'To stop the fans freezing', 'To protect the HPCO'], answer: 1, why: 'A TXV meters on pressure drop. Let head collapse and the valve starves the evaporator.' },
      { q: 'How do you confirm non-condensables?', options: ['High head alone', 'System off and equalized: pressure reads higher than the PT value for ambient', 'Bubbles in the sight glass', 'Low subcooling'], answer: 1, why: 'With the system settled, refrigerant alone sits at the PT pressure for the ambient temperature; air adds pressure on top.' },
      { q: 'Condensing TD is:', options: ['Discharge temp − suction temp', 'Condensing temp (from liquid pressure) − air entering the condenser', 'Liquid line temp − ambient', 'Ambient − suction temp'], answer: 1, why: 'TD compares the saturated condensing temperature to the air the coil is rejecting heat into.' },
    ],
    knowledge: [{ slug: 'parallel-rack-systems', label: 'Parallel Rack Systems' }, { slug: 'heat-reclaim', label: 'Heat Reclaim' }],
  },
  {
    id: 'evaporators',
    stationId: 'EVAP',
    title: 'Evaporators, metering devices and airflow',
    minutes: 5,
    kind: 'read',
    sections: [
      {
        heading: 'The TXV, and the bulb that runs it',
        body: [
          'A thermostatic expansion valve balances three forces: bulb pressure pushing it open, spring pressure and evaporator pressure pushing it closed. The bulb is strapped to the suction line at the coil outlet and "feels" superheat — warm line, valve opens; cold line, valve throttles.',
        ],
        bullets: [
          'Bulb at 10 or 2 o\'clock on a horizontal line, strapped tight to clean copper, insulated. A loose bulb reads air, not pipe, and floods the coil.',
          'Externally equalized valves are required on coils with a distributor: the pressure drop across the distributor would otherwise fool the valve into starving the coil.',
          'Hunting — superheat swinging up and down — is usually an oversized valve, a bulb in the wrong spot, or a coil short on load.',
        ],
      },
      {
        heading: 'The other metering devices',
        body: [],
        bullets: [
          'Capillary tube — self-contained coolers, chest freezers, ice machines. No moving parts, no adjustment, and the charge is critical: a few ounces over or under changes everything. Charge by weight.',
          'Electronic expansion valve (EEV) — a stepper motor driven by the case controller from a pressure transducer and a temperature probe. Same superheat rules, but the diagnosis includes the sensors.',
        ],
      },
      {
        heading: 'Airflow is half the evaporator',
        body: [
          'Evaporator TD is box (or return air) temperature minus saturated suction temperature. Walk-ins are designed around roughly 10 °F. A higher TD pulls more moisture out of the air — good for a meat cooler, bad for produce. A frosted coil, a blocked return grille, a dead fan, or a torn night curtain all reduce airflow and show up as low suction and low superheat together.',
        ],
      },
    ],
    quiz: [
      { q: 'Where does a TXV bulb belong on a horizontal suction line?', options: ['On the bottom of the pipe', 'At 10 or 2 o\'clock, strapped and insulated', 'Anywhere in the fan air stream', 'On the liquid line'], answer: 1, why: 'Off the bottom (oil pools there) and off the top (hot spot), tight to the pipe so it reads line temperature.' },
      { q: 'Why must a coil with a distributor use an externally equalized TXV?', options: ['It flows more refrigerant', 'The distributor pressure drop would otherwise starve the coil', 'It has no bulb', 'It is cheaper'], answer: 1, why: 'The valve needs to see evaporator pressure after the distributor, not before it.' },
      { q: 'On a capillary-tube reach-in, how should the charge be set?', options: ['By superheat', 'By weight, per the nameplate', 'Until the sight glass clears', 'Until the suction line frosts'], answer: 1, why: 'Cap tubes have no valve to adjust; the charge amount is the control. Weigh it.' },
      { q: 'Low suction and low superheat together most often mean:', options: ['Low charge', 'Poor airflow across the evaporator', 'Dirty condenser', 'Overcharge'], answer: 1, why: 'Less air means less load: the coil boils less, suction drops, and the vapor barely superheats.' },
    ],
    knowledge: [{ slug: 'sporlan', label: 'Sporlan TXVs' }, { slug: 'walk-in-troubleshooting', label: 'Walk-in Troubleshooting' }],
  },
  {
    id: 'service',
    stationId: 'SERV',
    title: 'Recover, evacuate, leak-check, charge',
    minutes: 6,
    kind: 'read',
    sections: [
      {
        heading: 'Recovery — it never goes in the air',
        body: [
          'Any time a system is opened, the refrigerant comes out through a recovery machine into a certified cylinder. Fill the cylinder to no more than 80 % by weight — the scale is not optional. Pull liquid first if the machine supports it; it is faster and cooler on the machine.',
        ],
      },
      {
        heading: 'Leak check with nitrogen',
        body: [],
        bullets: [
          'Pressurize with dry nitrogen — never oxygen, never shop air. On systems with flammable refrigerant there is no room for a mistake here.',
          'Soap every joint you touched. An electronic detector needs a trace of refrigerant in the nitrogen to see anything.',
          'Let it stand. A test that holds for ten minutes and drops overnight is a small leak you will be back for.',
        ],
      },
      {
        heading: 'Evacuation — moisture is the enemy',
        body: [],
        bullets: [
          'Pull from both sides through core-removal tools and large-bore hoses. The pump is rarely the bottleneck; the hoses are.',
          'The micron gauge goes on the system. Target 500 microns, then isolate the pump and watch: a rise that stops under 1,000 microns is a dry, tight system. A rise that keeps climbing is a leak. A rise that stalls around 1,500–2,000 is moisture — keep pulling.',
          'Replace the filter drier every time the system is opened. Every time.',
        ],
      },
      {
        heading: 'Charging',
        body: [],
        bullets: [
          'Cap-tube and nameplate systems: by weight.',
          'TXV systems: charge until subcooling is right, then confirm superheat. The sight glass clearing is a hint, not a target.',
          'Blends (R-404A, R-448A and the rest) are charged as liquid, throttled into the suction side, so the mix that goes in is the mix on the label.',
        ],
      },
    ],
    quiz: [
      { q: 'Maximum fill for a recovery cylinder is:', options: ['100 % by volume', '80 % by weight', '50 % by weight', 'Until the hose frosts'], answer: 1, why: 'Liquid expands with temperature; 80 % by weight leaves room so the cylinder does not go hydrostatic.' },
      { q: 'You isolate the pump at 500 microns. The gauge climbs to 1,800 and stops. That means:', options: ['A tight, dry system', 'A leak', 'Moisture still boiling off — keep pulling', 'The gauge is broken'], answer: 2, why: 'A rise that stalls in the low thousands is water vapor reaching equilibrium; a leak keeps climbing.' },
      { q: 'Why are blends charged as liquid?', options: ['It is faster', 'So the refrigerant entering the system has the same composition as the cylinder', 'Vapor charging damages the compressor', 'The scale only reads liquid'], answer: 1, why: 'Components of a blend boil at different rates; vapor charging fractionates the blend.' },
      { q: 'Which gas is acceptable for a pressure test?', options: ['Oxygen', 'Shop air', 'Dry nitrogen', 'CO2 from a fire extinguisher'], answer: 2, why: 'Oxygen with oil is an explosion; shop air adds moisture and, with flammables, a fire. Dry nitrogen only.' },
    ],
    knowledge: [{ slug: 'filter-driers', label: 'Filter Driers' }, { slug: 'commissioning', label: 'Commissioning' }],
  },
  {
    id: 'meter',
    stationId: 'BENCH',
    title: 'Meters, clamps and the control circuit',
    minutes: 5,
    kind: 'read',
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
          'On a dead control circuit, put one meter lead on the return (neutral on 120 V, the other leg on 208 V) and walk the other lead down the series string: fuse, thermostat, pressure switch, overload, contactor coil. The first place you lose voltage is the open device. It is faster than guessing and it never lies — as long as your reference lead is on the right point. Practice it for real on the two panels next door.',
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
    id: 'safe120',
    stationId: 'SAFE120',
    title: 'Hands-on: 120 V safety circuit',
    minutes: 8,
    kind: 'handson',
    handson: { trainer: 'safety-circuit', variant: '120', solvesToPass: 2 },
    sections: [
      {
        heading: 'The panel',
        body: [
          'A real Copeland Discus safety string wired as a ladder: control fuse, switch, high- and low-pressure cutouts, oil pressure control, a wire pull across the panel, discharge temperature klixon, motor protector, and the contactor coil back to neutral.',
          'Start in Practice — inject a fault and watch where the voltage dies. Then switch to Find the Fault: put the black probe on N, walk the red probe down the string, and condemn the device where 120 V turns into 0 V. Solve two hidden faults to sign off this station.',
        ],
      },
    ],
    quiz: [],
    knowledge: [{ slug: 'math-electrical', label: 'Math & Electrical' }, { slug: 'pressure-switches', label: 'Pressure Switches' }],
  },
  {
    id: 'safe208',
    stationId: 'SAFE208',
    title: 'Hands-on: 208 V single-phase safety circuit',
    minutes: 10,
    kind: 'handson',
    handson: { trainer: 'safety-circuit', variant: '208', solvesToPass: 2 },
    sections: [
      {
        heading: 'Same string, both legs hot',
        body: [
          'This panel is fed line-to-line: L1 and L2, 208 V between them, and — here is the trap — about 120 V from EITHER leg to ground. There is a fuse on each leg.',
          'Put the black probe on ground and every live point on the string reads 120 V whether the circuit is complete or not. That reading tells you nothing about where the open is. Reference L2 instead and hopscotch: 208 V until you cross the open device. If everything reads 208 V to L2 and the compressor still will not run, the open is in the L2 leg — check FU2. Solve two hidden faults to sign off.',
        ],
      },
    ],
    quiz: [],
    knowledge: [{ slug: 'math-electrical', label: 'Math & Electrical' }],
  },
  {
    id: 'defrost',
    stationId: 'CTRL',
    title: 'Defrost and case controls',
    minutes: 5,
    kind: 'read',
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
    kind: 'read',
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
