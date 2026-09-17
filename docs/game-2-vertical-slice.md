# Game 2.0: F1 field slice

## Play

Open `/game`, create or select your existing technician, and choose **F1 field practice** in Hillcrest's header. Walk to the F1 work order using the existing Walk control, floor clicks/taps, or WASD/arrow keys. Practice uses the Full Supermarket map, supplies any missing instruments as temporary dispatch loaners, dispatches only F1, and awards no career hours/XP. Career Full Supermarket also dispatches F1 first; later calls keep the existing dispatch pool.

Pick the spot on the case you want to work at, then pick what to do there. Each action names the tool it takes and reaches for it, so there is no separate tool to arm first, and a **Next** line above the actions says what the call still needs. Findings are written into the service notebook as you make them; the notebook is for reading back, and the written report at the end is where you put it into words. Readings are timestamped snapshots, including repeated product measurements so pull-down can be compared. There is no live fault-reading table.

The meter keeps the one decision that matters — the function. Choosing V, Ω or A~ places the leads on that measurement's labelled test points, and ohms on a live circuit is still the mistake it teaches.

### Suggested evaluation route

1. Evaporator → inspect the coil.
2. Controller → read the history/nameplate, then request a manual defrost.
3. Defrost circuit → remove the service cover, clamp the heater feeder, read A~ for roughly 5.8 A.
4. Wait/watch the coil, then inspect the evaporator again: two sections clear, the return section still iced.
5. Defrost circuit → secure the heater disconnect OFF, prove the circuit dead on V.
6. Disconnect one lead per element, then ohm H1/H2/H3 on Ω — 19.1 Ω, 18.8 Ω and OL — plus the frame tests if you want them.
7. Diagnose: Defrost → Electric heaters → Heater #3 open.
8. Replace heater 3 only, then reconnect, secure covers and restore.
9. Controller → request another defrost. Remove the service cover, clamp for roughly 8.7 A while energised.
10. Inspect the cleared coil, and read the controller after temperature termination.
11. Allow pull-down, probe the product for a reading at or below −8 °F, secure the service cover.
12. Report: the checklist shows what verification still needs; confirm it, build the service note from the chips or type it, and close. The debrief is also in the existing shift report.

## Integration boundaries

- `lib/game/inspection/types.ts`: serializable evidence, measurements, tool interactions and visual state.
- `f1.ts`: dispatch, inspection areas, measurement definitions and references to `defrost_heater_open` in the existing catalogue.
- `inspection/engine.ts`: physical prerequisites, action costs, frost/temperature evolution, diagnosis and verification gates.
- Existing `shiftReducer`: atomic `INSPECT` actions and the existing clock, dispatch, shrink, complaints and score path. State belongs to each `ActiveCall`, surviving UI closure/reopening.
- `inspection/engine.ts` exports `diagnoseChecklist`, `verifyChecklist` and `nextStep`. `canDiagnose`/`canVerify` are derived from those lists, so what the technician is shown cannot drift from what is enforced.
- `EquipmentInspection`, `EquipmentScene`, `EvidenceNotebook`, `DiagnosisTree`, `ToolInteraction`, `ServiceDebrief`: separate interaction and presentation modules.
- Existing `InstrumentPanel` exports the physical sampling surface; its guided legacy meter/PT benches remain available unchanged.
- `PixelEquipment`: reusable transparent SVG sprites on integer grids with `crispEdges`. Frozen sections/frost, compressor, vessels, electrical panel, fan, shelving, wall, checkout, produce, case/walk-in/RTU and player pieces are rendered in the actual StoreMap. No raster downloads, external asset paths or giant background. Existing navigation geometry is untouched.
- Only Full Supermarket selects the new art, and only F1/`defrost_heater_open` selects inspection. Other calls and maps keep `CallPanel`. Classroom/HandsOnPanel and character/progression serialization are unchanged.

## Validation

```
npm ci
npm test
npm run lint
npm run typecheck
npm run build
npx playwright install chromium
npm run test:e2e
```

Browser tests cover desktop and touch-phone full repair paths, notebook reopening, report, no horizontal overflow/runtime errors, and practice not changing saved progression. They stub the progress API and use a local fixture only. An existing Chromium can be selected with `CHROMIUM_EXECUTABLE_PATH`.

Reducer tests cover electrical prerequisites, tools/functions/leads, wrong parts and checks, failsafe vs temperature termination, evidence history, dispatch isolation, pathfinding and full completion/scoring, plus call-count shift pacing and the checklist/gate equivalence.

## Shift pacing

Corner Gas Station and Full Supermarket end on a **work list** rather than a clock: five and ten closed calls respectively (`LevelDef.callTarget`). Dispatch feeds the board on demand up to `maxOpen`, spaced by `dispatchGapMin`, and stops once the list has been handed out — so a shift always ends with nothing left open. The clock still runs and still drives shrink and complaints; it just no longer cuts the shift off. The deeper stores are unchanged and still run `shiftLenMin` against the fixed `spawnAt` schedule.

## Deliberate limits

- This is one physical fault workflow. The reusable UI/state contracts are ready for another definition; the F1 transition rules and diagnosis vocabulary are still fault-specific.
- Thermal response, accumulated product-at-risk dollars and elapsed actions are teaching approximations, not a refrigeration or food-disposition model. Exposure is softened to one quarter of the original fault's shrink rate for this slice.
- Original reference element resistances and aggregate current are retained. They are not a validated voltage/topology model; do not infer supply voltage from these training values. Frame OL is a DMM continuity screen, not an insulation certification.
- Before repair, the heavily iced coil can reach the existing failsafe timer. After repair, it clears and terminates on temperature; that behavior does not imply the termination device failed.
- Service covers and element-lead isolation are represented as discrete actions; terminal placement uses accessible touch/mouse controls rather than freehand cable dragging.
- Active shifts are in memory as before. Notebook/debrief state survives panel navigation, not a browser reload. Existing career progress saving is preserved.
- Customers/employees and directional player animation are not part of this first equipment interaction slice.

Next conversion: `evap_fan_motor`, reusing three-section visuals, airflow observations, feeder current, isolated motor tests and post-repair verification.
