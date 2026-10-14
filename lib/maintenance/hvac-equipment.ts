/** What each kind of HVAC unit on a PM actually has.
 *
 *  These rules decide which fields a tech is asked for. They live here rather
 *  than inside the page so they can be tested: the last time a form rule was
 *  only expressible inside a 400-line component, a season value drifted out of
 *  step with the database and nobody noticed until a save failed in the field.
 */

import { photoSlotsLeft as slotsLeft } from '../images/photo-cap'

export type EquipmentType = 'AIR_HANDLER' | 'MAIN_AC' | 'RTU' | 'EXHAUST_FAN' | 'UNIT_HEATER' | ''

/** Units that contain a refrigerant circuit.
 *
 *  A unit heater is a gas appliance — it burns fuel and moves air, and has no
 *  refrigerant in it at all. Asking for its refrigerant type invites a tech to
 *  pick something to get past the field, which puts a made-up refrigerant on a
 *  report that later reads as fact. */
export function usesRefrigerant(type: EquipmentType): boolean {
  return type === 'AIR_HANDLER' || type === 'MAIN_AC' || type === 'RTU'
}

/** Units identified by where they serve rather than by a single name. */
export function needsServiceArea(type: EquipmentType): boolean {
  return type === 'RTU' || type === 'EXHAUST_FAN' || type === 'UNIT_HEATER'
}

export function equipmentLabel(type: EquipmentType, serviceArea?: string): string {
  switch (type) {
    case 'AIR_HANDLER': return 'Air Handler'
    case 'MAIN_AC': return 'Main AC'
    case 'RTU': return serviceArea ? `RTU ${serviceArea}` : 'RTU'
    case 'EXHAUST_FAN': return serviceArea ? `EF ${serviceArea}` : 'Exhaust Fan'
    case 'UNIT_HEATER': return serviceArea ? `UH ${serviceArea}` : 'Unit Heater'
    default: return ''
  }
}

/** Photos kept against an individual unit, over and above the report's own.
 *
 *  Two covers what techs actually want per unit — typically the nameplate and
 *  whatever they are flagging — without turning a twelve-unit PM into a
 *  hundred-photo upload on site data. */
export const MAX_UNIT_PHOTOS = 2

/** How many of a freshly picked batch of photos will fit on a unit.
 *
 *  The clamp itself is shared with the upload grid so the form and the
 *  component can never disagree about when a unit is full. */
export function photoSlotsLeft(current: number, max = MAX_UNIT_PHOTOS): number {
  return slotsLeft(current, max)
}
