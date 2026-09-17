/** Pieces shared between the fault catalogues. */

/** Electrical work starts here. Faults that carry `loto` require it before the
 *  repair, and any dead-circuit resistance bench refuses to open without it. */
export const LOTO_CHECK = {
  id: 'loto',
  label: 'Lock out / tag out the circuit',
  tool: 'Lock & tag',
  minutes: 5,
  finding: 'Breaker locked open, tag hung, verified dead with the meter. Safe to open the panel.',
}
