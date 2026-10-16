/** The CO₂ store PM checklist, transcribed from the paper form
 *  (Major Refrigeration — REFRIGERATION PREVENTATIVE MAINTENANCE CO2, 2024).
 *
 *  Kept in its own module, like the HFC checklists, so the form, the report
 *  page and the PDF all read one list. The numbers match the paper: a tech
 *  comparing a printed sheet against the app should find item 16 in both.
 *
 *  Seasons on the paper are phases — PHASE 1 FALL, 2 WINTER, 3 SPRING,
 *  4 SUMMER — so an item marked "once yearly in Phase #1" is a Fall item here.
 */

export interface Co2ChecklistItem {
  id: string
  /** Position on the printed form. */
  number: number
  label: string
  /** Seasons this item is asked in; absent means every PM. */
  season?: string[]
}

export const CO2_CHECKLIST: Co2ChecklistItem[] = [
  { id: 'co2_leakCheckStore', number: 1, label: 'Perform a complete leak check of entire store.' },
  { id: 'co2_cleanSelfContained', number: 2, label: 'Clean all self contained condensers.' },
  { id: 'co2_cleanCondensers', number: 3, label: 'Clean all condensers.' },
  { id: 'co2_inspectCheckFans', number: 4, label: 'Inspect condensers and start and check fans.' },
  { id: 'co2_testCompressorSafeties', number: 5, label: "Test compressors oil failures and safety's in all modes." },
  { id: 'co2_checkCleanOilCoolingFans', number: 6, label: 'Check and clean oil head cooling fans.' },
  { id: 'co2_checkOatGasCoolerSensors', number: 7, label: 'Check calibration of OAT + gas cooler outlet temp sensors.' },
  { id: 'co2_checkOilLevels', number: 8, label: 'Check oil levels of all units and racks.' },
  { id: 'co2_checkGasChargeFlashtank', number: 9, label: 'Check gas charge, sight glass and solid liquid column on flashtank. (Tag level on indicator with date)' },
  { id: 'co2_checkFlashtankPressurePC', number: 10, label: 'Check each flashtank pressure – PC.' },
  { id: 'co2_checkRackPressures', number: 11, label: 'Check rack suction and discharge pressures.' },
  { id: 'co2_checkSuctionSuperheatGraph', number: 12, label: 'Check graph of suction superheat. MT > 18, LT > 36' },
  { id: 'co2_checkFlashtankGraph', number: 13, label: 'Check graph of flashtank pressure and compare to set point. Note large fluctuations.' },
  { id: 'co2_checkDefrostSettings', number: 14, label: 'Check pressure and settings on hot or cold gas defrosts.' },
  { id: 'co2_checkElectricalPhase', number: 15, label: 'Check each electrical phase during compressor operation.' },
  { id: 'co2_checkReplaceOilFilters', number: 16, label: 'Check and replace all oil filters as needed. (once yearly in Phase #1)', season: ['Fall'] },
  { id: 'co2_checkHighPressureMtDischarge', number: 17, label: 'Check high pressure MT discharge – record.' },
  { id: 'co2_checkCaseWalkinAirVelocityDrains', number: 18, label: 'Check all cases and walk-ins for proper air velocity and drains.' },
  { id: 'co2_checkAdjustCaseTemps', number: 19, label: 'Check and adjust display case temperatures.' },
  { id: 'co2_performOilAcidTests', number: 20, label: 'Perform oil acid tests on racks. (Record results)' },
  { id: 'co2_checkComputerAlarms', number: 21, label: 'Check computer for ongoing alarms and issues.' },
  { id: 'co2_purgeHotWaterHeatExchangers', number: 22, label: 'Purge hot water heat exchangers' },
  { id: 'co2_checkHoneycombs', number: 23, label: 'Check honeycombs' },
  { id: 'co2_verifyHeatReclaim', number: 24, label: 'Verify heat reclaim operation.' },
  { id: 'co2_calibrateLeakDetector', number: 25, label: 'Calibrate Leak detector' },
  { id: 'co2_checkFrozenFoodDoorsGasketsThermo', number: 26, label: 'Check Frozen Food doors, door gaskets and thermometers' },
  { id: 'co2_checkWalkinFansCleanEvaps', number: 27, label: 'Check walk in cooler fans and clean evaporators' },
  { id: 'co2_checkCaseConditionFloor', number: 28, label: 'Check overall condition of Refrigeration cases on floor (kickplates, bumpers, ice build up, water leaks)' },
  { id: 'co2_inspectRefrigerationLines', number: 29, label: 'Inspect refrigeration lines, Armaflex, Hangers & Cushion Clamps' },
  { id: 'co2_inspectDefrostSchedulesNoiseVibration', number: 30, label: 'Inspect Frozen Food defrost schedules, noise or vibration on racks' },
  { id: 'co2_inspectFanMotorsSweepMachineRoom', number: 31, label: 'Inspect fan motors, brush off compressors, sweep machine room and clear machine room of any garbage or oil on floor.' },
  { id: 'co2_checkOilPressure', number: 32, label: 'Check oil pressure – should be around 80 psi.' },
  { id: 'co2_checkUpsExpiry', number: 33, label: 'Check UPS expiry/condition.' },
  { id: 'co2_checkReliefValves', number: 34, label: 'Check relief valves condition/not leaking.' },
  { id: 'co2_cleanHpvStrainer', number: 35, label: 'Check and clean strainer on HPV, bypass valves (bi-annually).' },
  { id: 'co2_tempriteFilters', number: 36, label: 'Temprite filters – should be labelled and changed annually.' },
  { id: 'co2_co2BottleInventory', number: 37, label: 'CO2 bottle inventory onsite – report back.' },
]

/** The two machine-room items that sit at the top of the paper form rather than
 *  in its numbered list. */
export const CO2_MACHINE_ROOM_ITEMS = [
  { id: 'co2_cleanMachineRoom', label: 'Clean machine room' },
  { id: 'co2_picturesEmailed', label: 'Pictures of machine room emailed to office' },
] as const

/** The three temperature regimes every reading row on the form is split by. */
export const CO2_REGIMES = [
  { key: 'LT', label: 'L/T' },
  { key: 'MT', label: 'M/T' },
  { key: 'DT', label: 'D/T' },
] as const

export type Co2RegimeKey = typeof CO2_REGIMES[number]['key']

/** Whether an item is asked in the season being worked.
 *  With no season picked yet, everything shows — hiding items from a tech who
 *  has not said which PM this is would silently shorten the list. */
export function isCo2ItemInSeason(item: Co2ChecklistItem, season: string): boolean {
  if (!item.season) return true
  if (!season) return true
  return item.season.includes(season)
}
