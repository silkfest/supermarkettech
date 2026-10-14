/** The PM checklist labels, in the order techs work them.
 *
 *  Shared by the report page and the PDF builder. They were declared inside the
 *  report page; a second copy in the PDF would have let the two drift, and a
 *  printed report quietly disagreeing with the screen is worse than either.
 */

export const REFRIG_CHECKLIST: { id: string; label: string }[] = [
  { id: 'cl_leakCheckStore', label: 'Perform a complete leak check of entire store.' },
  { id: 'cl_cleanSelfContained', label: 'Clean all self contained condensers.' },
  { id: 'cl_cleanCondensersPowerWash', label: 'Clean all condensers. (Power Wash)' },
  { id: 'cl_inspectCheckFans', label: 'Inspect condensers and start and check fans.' },
  { id: 'cl_testCompressorSafeties', label: "Test compressors oil failures and safety's in all modes." },
  { id: 'cl_checkCleanOilCoolingFans', label: 'Check and clean oil head cooling fans.' },
  { id: 'cl_checkRunningOilPressures', label: 'Check running oil pressures on all compressors.' },
  { id: 'cl_checkOilLevelsUnitsRacks', label: 'Check oil levels of all units and racks.' },
  { id: 'cl_checkGasChargeSightGlass', label: 'Check gas charge, sight glass and solid liquid column on receivers.' },
  { id: 'cl_checkReceiverPressureItem', label: 'Check each receiver pressure.' },
  { id: 'cl_checkRackPressures', label: 'Check rack suction and discharge pressures.' },
  { id: 'cl_checkPressureDifferentials', label: 'Check pressure differentials across each drier and suction core.' },
  { id: 'cl_checkDefrostSettings', label: 'Check pressure and settings on hot or cold gas defrosts.' },
  { id: 'cl_checkElectricalPhase', label: 'Check each electrical phase during compressor operation.' },
  { id: 'cl_checkReplaceOilFilters', label: 'Check and replace all oil filters as needed.' },
  { id: 'cl_checkTagEprValves', label: 'Check and tag each EPR valve pressure setting.' },
  { id: 'cl_checkCaseWalkinAirVelocityDrains', label: 'Check all cases and walk-ins for proper air velocity and drains.' },
  { id: 'cl_checkAdjustCaseTemps', label: 'Check and adjust display case temperatures.' },
  { id: 'cl_performOilAcidTests', label: 'Perform oil acid tests on racks. (Record results)' },
  { id: 'cl_checkComputerAlarms', label: 'Check computer for ongoing alarms and issues.' },
  { id: 'cl_checkHoneycombs', label: 'Check honeycombs' },
  { id: 'cl_verifyHeatReclaim', label: 'Verify heat reclaim operation.' },
  { id: 'cl_calibrateLeakDetector', label: 'Calibrate Leak detector' },
  { id: 'cl_checkFrozenFoodDoorsGasketsThermo', label: 'Check Frozen Food doors, door gaskets and thermometers' },
  { id: 'cl_checkWalkinFansCleanEvaps', label: 'Check walk in cooler fans and clean evaporators' },
  { id: 'cl_checkCaseConditionFloor', label: 'Check overall condition of Refrigeration cases on floor' },
  { id: 'cl_inspectRefrigerationLines', label: 'Inspect refrigeration lines, Armaflex, Hangers & Cushion Clamps' },
  { id: 'cl_inspectDefrostSchedulesNoiseVibration', label: 'Inspect Frozen Food defrost schedules, noise or vibration on racks' },
  { id: 'cl_inspectFanMotorsBrushSweepClear', label: 'Inspect fan motors, brush off compressors, sweep machine room.' },
  { id: 'cl_cleanMachineRoom', label: 'Clean Machine Room' },
  { id: 'cl_picturesEmailed', label: 'Pictures of Machine Room emailed to Office' },
]

export const HVAC_CHECKLIST = [
  'Check all heating and A/C systems.',
  'Check all heat exchangers and chimney.',
  'Oil motors and grease fittings on all HVAC.',
  'Grease all fittings on air handler.',
  'Replace all filters.',
  'Check returns. (Visual)',
  'Check all controls for accuracy and proper operation.',
  'Check all sensors and thermostats for proper operation.',
  'Check condition of belts on air handler, HVAC and exhaust and change as needed.',
  'Check access door seals on all HVAC.',
  'Check drainpipes and condensation pans.',
]
