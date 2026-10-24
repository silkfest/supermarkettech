export interface PathLink { label: string; href: string }
export interface PathStep {
  id: string; title: string; body: string; outcome: string; links: PathLink[]
  branches?: { title: string; body: string; links?: PathLink[] }[]
}
export interface WorkedCall {
  title: string; context: string
  stages: { title: string; evidence: string; prompt: string; reasoning: string }[]
  handover: string
}
export interface LearningPath {
  slug: string; title: string; description: string; keywords: string; href: string
  goal: string; audience: string; steps: PathStep[]
  workedCall?: WorkedCall
  references?: { label: string; href: string; scope: string }[]
  check: { question: string; choices: { text: string; feedback: string }[]; correct: number; reference: PathLink }
}

/** Editorial learning sequences. Completion and field approval belong to assigned training. */
export const LEARNING_PATH_DETAILS: LearningPath[] = [
  {
    slug:'service-call-methodology', title:'Work through a supermarket service call',
    description:'Establish scope, check airflow, electrical and refrigeration, then verify the repair. Includes a worked example of several circuits running warm.',
    keywords:'service call methodology troubleshooting order airflow electrical refrigeration rack supermarket case one system all systems shared fault self contained', href:'/learn/service-call-methodology',
    goal:'Choose the next useful check from the scope and evidence, rather than starting with a part or refrigerant adjustment.',
    audience:'A practical default order for supermarket cases, walk-ins, racks and smaller self-contained units. Urgent hazards, power loss and clear rack-wide failures take priority; follow the fault evidence when it changes the order.',
    workedCall: {
      title:'Several circuits on one rack are running warm',
      context:'Fictional worked example: a conventional HFC supermarket rack with multiple medium-temperature circuits and a shared compressor-enable relay. This wiring arrangement is an example, not a template for every rack or a CO₂ sequence. Use the installed diagram and approved test procedures.',
      stages:[
        {title:'1. Establish the scope',evidence:'Three medium-temperature circuits alarm within the same ten-minute period. Independent temperature checks confirm warming. The store legend places all three on rack A’s medium-temperature suction group. Rack B and a self-contained cabinet are maintaining temperature.',prompt:'What does this pattern tell you — and what does it not prove?',reasoning:'Prioritize equipment shared by the affected group. The pattern does not identify the failed component or prove low charge. Confirm product protection with store staff and retain the alarm timeline before resetting anything.'},
        {title:'2. Check airflow and operating state',evidence:'Representative affected cases have operating fans, clear air paths and no heavy coil ice. They are requesting cooling, not in defrost. At rack A, suction is rising above its normal control target while all compressors in that group remain stopped.',prompt:'Would you continue adjusting individual cases, or move to the rack?',reasoning:'Move to the shared capacity/control problem. The case checks make a common airflow obstruction less likely; they do not prove every case is fault-free. The stopped group is a stronger lead than changing an individual expansion valve.'},
        {title:'3. Separate command from operation',evidence:'The controller requests compressor capacity. The installed diagram shows a shared enable relay ahead of the individual compressor control circuits. Qualified testing finds the specified voltage across its coil, but the relay does not pick up. With power isolated and absence of voltage verified, inspection confirms the relay mechanism has failed.',prompt:'Which evidence supports the diagnosis? Why is the controller display insufficient?',reasoning:'The request alone only shows intent. The verified coil supply and failure of the relay to operate, followed by isolated inspection, locate the failure in the shared enable relay in this example. If coil supply were absent, trace its upstream control path instead. Do not bridge the relay or any protective device to make compressors run.'},
        {title:'4. Repair and prove recovery',evidence:'Under the site isolation procedure, the failed relay is replaced with the correctly specified part. Normal control is restored. Compressors stage as demanded, suction returns toward its control target and all three affected circuits begin recovering.',prompt:'Is a cleared alarm enough to close the call?',reasoning:'No. Confirm normal staging and protective/control operation, restored airflow, and sustained recovery on each affected circuit. Check relevant refrigerant-side operating conditions against the installed equipment requirements under a representative load. Record temperatures and times; confirm product disposition with store staff. If recovery is incomplete, keep investigating and assign follow-up rather than declaring the call complete.'},
      ],
      handover:'Example report: Three circuits on rack A’s MT group warmed together. Case airflow and cooling demand were confirmed; the compressor group was stopped despite demand. Testing and isolated inspection identified a failed shared enable relay. Replaced to the installed specification and restored normal control. Record the actual before/after readings, observation times, circuit recovery, product actions and any follow-up owner. Do not copy invented readings into a service report.',
    },
    steps:[
      {id:'complaint',title:'Confirm the complaint and protect people and product',body:'Ask what changed, when it started and whether there was loading, cleaning, a power interruption or previous work. Confirm the actual condition with suitable temperature measurements and the alarm timeline. Arrange product protection with store staff under site procedures. Record the operating state before resetting alarms or changing settings; establish safe access and isolation for work that requires it.',outcome:'Describe the symptom, timing and urgency without assuming its cause.',links:[{label:'System fault diagnosis reference',href:'/knowledge/system-diagnostics'}]},
      {id:'scope',title:'One case, one circuit, one rack — or unrelated systems?',body:'Walk the affected area and compare the controller overview with actual case conditions. Group alarms by start time and by shared equipment. “Several systems” is a clue to investigate what they share, not proof of a particular failed component.',outcome:'Draw the boundary around the problem and identify a useful unaffected comparison.',links:[{label:'Rack layout and shared components',href:'/knowledge/parallel-rack-systems'}],branches:[
        {title:'One case; others on its circuit are normal',body:'Start locally: loading, doors, air paths, fans, coil condition, sensors and local controls. Verify the circuit assignment rather than assuming adjacent cases share it.'},
        {title:'All cases on one circuit',body:'Look for what those cases share: circuit control, liquid feed, defrost command/termination and circuit valves. Compare another circuit on the same rack.'},
        {title:'Several circuits on the same rack or suction group',body:'Check shared power/control availability, rack alarms, capacity, suction-group behaviour, liquid supply and heat rejection early. Do not spend the whole call adjusting one case while the common fault remains.'},
        {title:'Unrelated racks or self-contained units',body:'Check for a site-wide event such as power interruption, ambient conditions or a monitoring problem. Confirm real temperatures. Independent units can also have separate faults.'},
      ]},
      {id:'airflow',title:'Check airflow and the load first',body:'For an ordinary warm-case complaint, inspect product placement, return/discharge openings, doors, fan operation and direction, coil obstruction and ice. Check heat-rejection airflow where relevant, including the condenser on self-contained equipment. A stopped fan leads directly into electrical/control checks; an iced coil requires investigation of why it iced, not just removal of the ice.',outcome:'Decide whether heat transfer is compromised before interpreting refrigerant-side readings.',links:[{label:'Case reference',href:'/knowledge/hussmann'},{label:'Defrost learning path',href:'/learn/defrost'}]},
      {id:'electrical',title:'Check electrical supply and control operation',body:'Establish whether the equipment should be cooling now or is intentionally in defrost, drip/fan delay or another control state. Compare sensor readings, requests, outputs and actual component operation using the diagram and appropriate safe test methods. Record the reason for a protective trip; do not repeatedly reset it or bypass a safety to make the system run.',outcome:'Distinguish no demand, an intentional delay, no supply, a control/output failure and a failed load.',links:[{label:'Electrical troubleshooting path',href:'/learn/electrical-troubleshooting'},{label:'Micro Thermo controls',href:'/knowledge/micro-thermo'},{label:'E2 / E3 controls',href:'/knowledge/emerson-e2-e3'}]},
      {id:'refrigeration',title:'Evaluate refrigeration with the operating context established',body:'Once airflow and control state are understood, compare relevant pressure and temperature readings with expected operation for the refrigerant and system. On a rack, compare the affected circuit with its shared headers and a suitable working circuit. On a self-contained unit, evaluate its local evaporator, metering device, compressor and condenser together. Do not diagnose charge or adjust a valve from suction pressure alone; use the appropriate HFC or CO₂ procedure.',outcome:'Explain whether the evidence points to a local feed/restriction issue, a shared supply/capacity issue or another cause, and which measurement will test it.',links:[{label:'Refrigeration fundamentals',href:'/knowledge/refrigeration-fundamentals'},{label:'HFC rack operation',href:'/knowledge/system-operation'},{label:'CO₂ rack reference',href:'/knowledge/co2-transcritical'}]},
      {id:'test',title:'Test the diagnosis and make the repair',body:'State your suspected cause and predict what a targeted check should show. Compare the result with that prediction. Change one thing at a time where practical, record the original setting, and repair only what the evidence supports. Return to scope or airflow if the results contradict your explanation.',outcome:'Explain the evidence for the repair and the alternative cause you ruled out.',links:[{label:'Practise rack diagnosis',href:'/simulation/parallel-rack'},{label:'Practise a local case fault',href:'/simulation/dt-bunker'}]},
      {id:'verify',title:'Verify recovery across the original scope',body:'Confirm the repaired component operates, airflow and the intended control sequence are restored, and temperatures trend toward the applicable target under the current load. Recheck every affected circuit for a shared fault. Observe enough of the relevant cycle to establish recovery; a cleared alarm alone is insufficient. Restore normal settings and remove temporary overrides through the approved procedure.',outcome:'Show how your checks demonstrate the original complaint is resolved and identify any remaining monitoring or follow-up.',links:[{label:'Defrost recovery example',href:'/learn/defrost#apply'}]},
      {id:'report',title:'Document, hand over and practise the sequence',body:'Record the complaint and scope, conditions found, measurements, cause, repair and verification. Tell store staff what remains under observation and who owns follow-up. Practise this sequence in Cold Call, then review a real assigned task with your supervisor.',outcome:'Give another technician enough evidence to understand the call without starting the diagnosis again.',links:[{label:'Practise a service call',href:'/game'},{label:'Assigned field tasks',href:'/apprentice/training'}]},
    ],
    check:{question:'Several circuits on the same rack warm up at about the same time. What is the best next move?',correct:1,choices:[
      {text:'Adjust the expansion valve at the first warm case.',feedback:'That changes a local setting before establishing the shared cause. First compare the affected circuits and rack conditions.'},
      {text:'Confirm the affected group and check what it shares, while comparing an unaffected circuit.',feedback:'Correct. The pattern directs you toward a common cause without assuming whether it is electrical, control-related or refrigerant-side.'},
      {text:'Assume every case needs a forced defrost.',feedback:'Concurrent alarms do not establish a defrost fault. Verify the operating states and shared conditions before overriding circuits.'},
    ],reference:{label:'Review the scope decision',href:'/learn/service-call-methodology#scope'}},
    references:[
      {label:'Hussmann DZC-SS — troubleshooting, pages 35–36',href:'https://www.hussmann.com/ns/Technical-Documents/DZC_SS_io.pdf#page=35',scope:'Manufacturer examples of airflow, loading, electrical and defrost checks. Model-specific details apply to the listed merchandisers.'},
      {label:'Copeland — Troubleshooting Fundamentals',href:'https://e360blog.copeland.com/refrigeration-basics-troubleshooting-fundamentals/',scope:'Refrigeration measurements and the interaction between airflow, ice and compressor symptoms. The service-call order here is an editorial teaching framework, not a universal manufacturer procedure.'},
    ],
  },
  {
    slug: 'defrost', title: 'Diagnose a defrost problem',
    description: 'Trace defrost on a rack-fed supermarket case, then compare the self-contained approach.',
    keywords: 'rack supermarket case circuit electric hot gas off cycle defrost heater iced coil frozen evaporator fan self contained', href: '/learn/defrost',
    goal: 'Identify the affected circuit and defrost type, distinguish a command from actual operation, and verify recovery.',
    audience: 'Supermarket refrigeration first: rack-fed cases and walk-ins, with a separate self-contained branch. Use the installed rack, case and controller documentation for settings and overrides.',
    steps: [
      { id: 'identify', title: 'Locate the case, circuit and rack', body: 'Start at the complaint, identify the circuit from the store legend and compare neighbouring cases on that circuit. Check whether the problem is local, circuit-wide or shared across the rack before forcing a defrost.', outcome: 'Name the affected case, circuit, rack/suction group and other equipment sharing the symptom.', links: [{label:'Service-call methodology',href:'/learn/service-call-methodology'},{label:'Parallel rack systems',href:'/knowledge/parallel-rack-systems'}] },
      { id: 'sequence', title: 'Identify the installed defrost sequence', body: 'Confirm electric, hot-gas or off-cycle defrost and who controls it: a store controller, case controller or time clock. Use the circuit diagram and case data sheet to establish initiation, termination, drainage and fan restart. Do not assume every case follows the same sequence.', outcome: 'Explain the expected states of refrigerant flow, heaters if fitted, fans and termination controls.', links:[{label:'Defrost reference',href:'/knowledge/defrost-systems'},{label:'Micro Thermo reference',href:'/knowledge/micro-thermo'},{label:'E2 / E3 reference',href:'/knowledge/emerson-e2-e3'}], branches:[
        {title:'Rack-fed electric defrost — main practice example',body:'Use a frozen bunker circuit. Separate the controller request from the heater circuit, termination signal and actual coil clearing.',links:[{label:'DT bunker trainer',href:'/simulation/dt-bunker'}]},
        {title:'Rack-fed hot-gas or off-cycle defrost',body:'Follow the installed piping and control sequence. Hot-gas diagnosis includes the shared gas supply and circuit valves; off-cycle defrost has no electric heater output to prove. Never transfer the bunker heater sequence to these circuits.'},
        {title:'Self-contained equipment',body:'The compressor, condenser and local controller serve the cabinet. Identify its refrigerant and defrost design from the nameplate and manual, then follow its local sequence. Rack-level valves and commands may not exist.',links:[{label:'Self-contained cabinet reference',href:'/knowledge/true-manufacturing'},{label:'Dixell controller reference',href:'/knowledge/dixell'}]},
      ] },
      { id: 'measure', title: 'Observe a cycle and test the suspected failure', body: 'Record the frost pattern, airflow and current operating state before making changes. For the electric-defrost bunker example, compare the commanded state with simulated voltage, heater current and temperature response. Check termination and drainage against the applicable documentation; a displayed defrost state does not prove heat reached the coil.', outcome: 'Distinguish failure to start, failure to heat or clear, early/late termination and failure to resume cooling.', links:[{label:'Practise on the bunker circuit',href:'/simulation/dt-bunker'}] },
      { id: 'apply', title: 'Resolve the cause and verify the complete recovery', body: 'Clearing ice restores access and airflow but does not establish why the ice formed. After the repair, verify drainage, refrigeration restart, the correct fan behaviour, restored airflow and sustained temperature recovery. Clear temporary overrides through the applicable controller procedure and confirm normal scheduling.', outcome: 'Explain the original cause and what evidence shows both successful defrost and subsequent cooling.', links:[{label:'Practise a frozen-case service call',href:'/game'}] },
      { id: 'field', title: 'Demonstrate it on the actual supermarket system', body: 'With your supervisor, compare the installed circuit with the training example. Document the sequence, measurements, repair, restored settings and recovery. Have the appropriate assigned task reviewed.', outcome: 'State which parts of the example apply to this installation and which do not.', links:[{label:'Open assigned tasks',href:'/apprentice/training'}] },
    ],
    references:[{label:'Hussmann Parallel Rack Systems — defrost controls, section 4-5',href:'https://www.hussmann.com/ns/Technical-Documents/0427598_D_Rack_IO_EN.pdf#page=48',scope:'Rack control arrangements and circuit-specific diagrams; use the installed system documentation for the actual sequence.'}],
    check: {
      question: 'An electric-defrost controller shows its heater command ON. What does that prove?', correct: 1,
      choices: [
        {text:'The heater is drawing current.',feedback:'The command alone does not establish current flow. Distinguish a requested state from measured operation.'},
        {text:'The controller is requesting heat; actual output still needs checking.',feedback:'Correct. A command describes the requested state. Appropriate circuit measurements and temperature response establish what actually happened.'},
        {text:'The whole coil has cleared.',feedback:'A command is not evidence that the coil has cleared. Recovery needs its own observations and verification.'},
      ],
      reference:{label:'Compare command and operation in the bunker trainer',href:'/simulation/dt-bunker'},
    },
  },
  {
    slug:'electrical-troubleshooting', title:'Trace an electrical control fault',
    description:'Read the circuit, compare normal and faulted behaviour, then practise explaining your diagnosis.',
    keywords:'electrical safety circuit wiring meter voltage micro thermo mt sla copeland bitzer compressor', href:'/learn/electrical-troubleshooting',
    goal:'Build a diagnosis from circuit evidence and explain how you verified the repair.',
    audience:'Start with the electrical reference. Use the trainers for simulated measurements; field work requires appropriate supervision and site procedures.',
    steps:[
      {id:'foundations',title:'Review the electrical foundations',body:'Use the electrical reference to review the quantities and circuit relationships you will encounter in the trainer.',outcome:'Explain what you want a measurement to tell you before selecting a meter function.',links:[{label:'Open electrical fundamentals',href:'/knowledge/math-electrical'}]},
      {id:'healthy',title:'Follow a healthy circuit',body:'Open the safety-circuit trainer and choose “No fault — normal run” in Practice mode. Trace the circuit using the displayed diagram and identify the expected state of the controls.',outcome:'Describe the normal path through the circuit and where your proposed measurements fit.',links:[{label:'Open the safety-circuit trainer',href:'/simulation/safety-circuit'}]},
      {id:'fault',title:'Investigate a simulated fault',body:'Select a fault in the trainer. Make a prediction, take a simulated measurement and compare it with the healthy circuit. Change your explanation when the evidence disagrees.',outcome:'Explain which evidence supports the diagnosis and which alternatives it rules out.',links:[{label:'Practise circuit diagnosis',href:'/simulation/safety-circuit'}]},
      {id:'controller',title:'Choose a controller to practise',body:'Apply the same reasoning in one of the controller-specific trainers. Read its matching reference first. These trainers represent educational examples, not every installed wiring arrangement.',outcome:'Explain what changes for your chosen control and what must be confirmed on the real equipment.',links:[
        {label:'Micro Thermo reference',href:'/knowledge/micro-thermo'},{label:'Micro Thermo trainer',href:'/simulation/micro-thermo-control'},
        {label:'Copeland reference',href:'/knowledge/copeland'},{label:'Copeland trainer',href:'/simulation/copeland-control'},
        {label:'Bitzer reference',href:'/knowledge/bitzer'},{label:'Bitzer trainer',href:'/simulation/bitzer-control'},
      ]},
      {id:'explain',title:'Explain and verify your work',body:'Review your diagnosis with a supervisor. On assigned field work, follow the applicable site procedures and equipment documentation, then submit the linked task for approval.',outcome:'Present the symptom, evidence, diagnosis, action and verification as separate parts of your explanation.',links:[{label:'Open assigned training',href:'/apprentice/training'}]},
    ],
    check:{
      question:'Which practice note gives a supervisor the strongest basis for reviewing your diagnosis?',correct:2,
      choices:[
        {text:'The alarm disappeared.',feedback:'That records an outcome, but does not show what caused the fault or how you checked the repair.'},
        {text:'I replaced the component I suspected.',feedback:'That records an action. Add the evidence supporting the diagnosis and how you verified operation afterwards.'},
        {text:'I recorded the symptom, compared measurements with expected operation, explained the cause and checked operation after the repair.',feedback:'Correct. This makes your reasoning and verification reviewable. It still needs the appropriate field-task approval.'},
      ],
      reference:{label:'Revisit the electrical reference',href:'/knowledge/math-electrical'},
    },
  },
]
export function getLearningPath(slug: string) {
  return LEARNING_PATH_DETAILS.find(path => path.slug === slug)
}
