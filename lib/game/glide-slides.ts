/** Dew vs bubble on a glide refrigerant, as a short deck.
 *
 *  Every number here was computed from an equation of state (CoolProp, R-448A
 *  by mass fraction; R-404A as its pseudo-pure fluid) rather than recalled, and
 *  cross-checked against the verified table in CLAUDE.md. The whole point of
 *  the deck is that the wrong column gives a wrong answer, so a wrong number
 *  here would be worse than no deck at all. */
export interface Slide {
  heading: string
  body: string[]
  bullets?: string[]
  /** Optional small table: header row then data rows. */
  table?: { head: string[]; rows: string[][] }
}

export const GLIDE_SLIDES: Slide[] = [
  {
    heading: 'One pressure, two temperatures',
    body: [
      'R-404A is near-azeotropic: for a given pressure it boils at essentially one temperature, and a PT chart can give you a single number.',
      'R-448A, R-449A and R-407C are zeotropic blends. Their components boil off at different temperatures, so the refrigerant changes state across a range rather than at a point. At one pressure you get two saturation temperatures, and the spread between them is the glide.'
    ]
  },
  {
    heading: 'Bubble, dew, and which one you want',
    body: [
      'The two ends of that range have names, and each one belongs to a different measurement.'
    ],
    bullets: [
      'Bubble point — the first bubble of vapor appears. The liquid end of the change.',
      'Dew point — the last drop of liquid disappears. The vapor end.',
      'Superheat is measured against the DEW point, because superheat starts where the boiling finished.',
      'Subcooling is measured against the BUBBLE point, because subcooling starts where the condensing finished.'
    ]
  },
  {
    heading: 'How big the glide actually is',
    body: [
      'R-448A, at the pressures a medium-temp rack actually runs. The gap is not a rounding error.'
    ],
    table: {
      head: ['Pressure', 'Bubble', 'Dew', 'Glide'],
      rows: [
        ['38 psig (suction)', '3.5 °F', '14.7 °F', '11.2 °F'],
        ['44.6 psig (suction)', '9.4 °F', '20.6 °F', '11.1 °F'],
        ['224 psig (liquid)', '94.1 °F', '103.4 °F', '9.3 °F']
      ]
    }
  },
  {
    heading: 'Get it backwards on a real rack',
    body: [
      'Suction line 43 °F at 38 psig. Against dew (15 °F) that is 28 °F of superheat — a starved coil, which is the truth. Against bubble (3.5 °F) it reads 39.5 °F.',
      'Liquid line 83 °F at 224 psig. Against bubble (94 °F) that is 11 °F of subcooling — healthy. Against dew (103 °F) it reads 20 °F.',
      'Both errors are the size of the whole glide, and they point opposite ways: "starving badly" plus "looks overcharged" is a combination that fits no real fault. That is how a rack ends up with two top-ups it never needed.'
    ]
  },
  {
    heading: 'Why the habit catches good techs',
    body: [
      'On R-404A the glide is about 1 °F. It never mattered which column you used, so nobody ever had to choose — the habit was free.',
      'Carry that habit onto R-448A and every superheat you take is about 11 °F out, in the direction that makes a healthy valve look starved. Before you trust a number, check which column your chart or app gave you. Most show both, and they do not always label which one is on top.'
    ]
  }
]
