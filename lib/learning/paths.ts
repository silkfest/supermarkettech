export interface PathLink { label: string; href: string }
export interface PathStep {
  id: string; title: string; body: string; outcome: string; links: PathLink[]
}
export interface LearningPath {
  slug: string; title: string; description: string; keywords: string; href: string
  goal: string; audience: string; steps: PathStep[]
  check: { question: string; choices: { text: string; feedback: string }[]; correct: number; reference: PathLink }
}

/** Editorial learning sequences. Completion and field approval belong to assigned training. */
export const LEARNING_PATH_DETAILS: LearningPath[] = [
  {
    slug: 'defrost', title: 'Diagnose a defrost problem',
    description: 'Identify the control, understand the sequence, then practise measurements and repair verification.',
    keywords: 'traulsen next gen defrost heater iced coil frozen evaporator fan', href: '/learn/defrost',
    goal: 'Distinguish a control request from actual heat, collect evidence and verify recovery.',
    audience: 'Apprentices learning defrost diagnosis and technicians refreshing their approach.',
    steps: [
      { id: 'identify', title: 'Identify the equipment', body: 'Match the installed controller and confirm whether the unit uses electric or off-cycle defrost. The Traulsen page is one controller example, not a universal procedure.', outcome: 'Explain which controller procedure applies and what information you still need from the unit.', links: [{label:'Controller identification',href:'/knowledge/traulsen#start-here-identify-the-controller'}] },
      { id: 'sequence', title: 'Understand the sequence', body: 'Identify initiation, termination, drip time and fan delay. Write down which loads should operate in each state.', outcome: 'Describe the expected sequence before interpreting a fault.', links:[{label:'Read the defrost reference',href:'/knowledge/defrost-systems'}] },
      { id: 'measure', title: 'Practise your measurements', body: 'Use the DT bunker trainer. Compare a healthy cycle with a hidden fault. Values in this simulator are educational examples.', outcome: 'Record the measurement that changed your diagnosis and what it ruled out.', links:[{label:'Open the bunker trainer',href:'/simulation/dt-bunker'}] },
      { id: 'apply', title: 'Apply it to a service call', body: 'Enter Cold Call and work toward a frozen-case call. Diagnose from the evidence, make the repair and verify operation.', outcome: 'Explain why the repair addressed the cause and how you checked recovery.', links:[{label:'Open Cold Call',href:'/game'}] },
      { id: 'field', title: 'Demonstrate it in the field', body: 'With your supervisor, identify the actual system, explain your tests and verify recovery. Submit the appropriate assigned task for approval.', outcome: 'Have your supervisor review your observations and reasoning against the actual equipment.', links:[{label:'Open assigned tasks',href:'/apprentice/training'}] },
    ],
    check: {
      question: 'An electric-defrost controller shows its heater command ON. What does that prove?', correct: 1,
      choices: [
        {text:'The heater is drawing current.',feedback:'The command alone does not establish current flow. Distinguish a requested state from measured operation.'},
        {text:'The controller is requesting heat; actual output still needs checking.',feedback:'Correct. A command describes the requested state. Appropriate circuit measurements and temperature response establish what actually happened.'},
        {text:'The whole coil has cleared.',feedback:'A command is not evidence that the coil has cleared. Recovery needs its own observations and verification.'},
      ],
      reference:{label:'Review command versus output',href:'/knowledge/traulsen#reading-live-sensors-the-fastest-diagnostic-on-the-cabinet'},
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
