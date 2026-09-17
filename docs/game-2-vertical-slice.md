# Game 2.0: F1 field slice

## Play

Open `/game`, create or select your existing technician, and choose **F1 field practice** in Hillcrest's header. Walk to the F1 work order using the existing Walk control, floor clicks/taps, or WASD/arrow keys. Practice uses the Full Supermarket map, supplies any missing instruments as temporary dispatch loaners, dispatches only F1, and awards no career hours/XP. Career Full Supermarket also dispatches F1 first; later calls keep the existing dispatch pool.

Select equipment areas, select a tool, then interact. The service notebook separates measured/observed evidence from recorded evidence. Readings are snapshots with timestamps, including repeated product measurements so pull-down can be compared. There is no live fault-reading table.

### Suggested evaluation route

1. Flashlight: inspect evaporator and record the frost observation.
2. Controller: inspect history/nameplate, then request manual defrost.
3. Hand tools: remove the service cover. Clamp meter: select feeder position, A function, conductor and clamp jaw, then read and record approximately 5.8 A.
4. Wait/watch the coil. Flashlight: observe two clear sections and one iced section, then record.
5. Hand tools: secure heater disconnect OFF. Multimeter: voltage test points, V function, place both leads and read to prove dead.
6. Hand tools: disconnect element leads. Multimeter: use H1/H2/H3 terminal pairs in Ω mode, plus frame tests if desired. Record 19.1 Ω, 18.8 Ω and OL.
7. Diagnosis: Defrost → Electric heaters → Heater #3 open.
8. Hand tools: replace H3 only, reconnect/secure covers/restore.
9. Controller: request another defrost. Open the service cover, then clamp and record approximately 8.7 A while energised.
10. Observe and record the cleared coil, and read/record the controller after temperature termination.
11. Allow pull-down. Sample product with the temperature probe and record a reading at or below −8 °F. Secure the service cover.
12. Report: confirm verification, write the service note and close. The debrief is also accessible in the existing shift report.

## Integration boundaries

- `lib/game/inspection/types.ts`: serializable evidence, measurements, tool interactions and visual state.
- `f1.ts`: dispatch, inspection areas, measurement definitions and references to `defrost_heater_open` in the existing catalogue.
- `inspection/engine.ts`: physical prerequisites, action costs, frost/temperature evolution, diagnosis and verification gates.
- Existing `shiftReducer`: atomic `INSPECT` actions and the existing clock, dispatch, shrink, complaints and score path. State belongs to each `ActiveCall`, surviving UI closure/reopening.
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

Reducer tests cover electrical prerequisites, tools/functions/leads, wrong parts and checks, failsafe vs temperature termination, evidence recording/history, dispatch isolation, pathfinding and full completion/scoring.

## Deliberate limits

- This is one physical fault workflow. The reusable UI/state contracts are ready for another definition; the F1 transition rules and diagnosis vocabulary are still fault-specific.
- Thermal response, accumulated product-at-risk dollars and elapsed actions are teaching approximations, not a refrigeration or food-disposition model. Exposure is softened to one quarter of the original fault's shrink rate for this slice.
- Original reference element resistances and aggregate current are retained. They are not a validated voltage/topology model; do not infer supply voltage from these training values. Frame OL is a DMM continuity screen, not an insulation certification.
- Before repair, the heavily iced coil can reach the existing failsafe timer. After repair, it clears and terminates on temperature; that behavior does not imply the termination device failed.
- Service covers and element-lead isolation are represented as discrete actions; terminal placement uses accessible touch/mouse controls rather than freehand cable dragging.
- Active shifts are in memory as before. Notebook/debrief state survives panel navigation, not a browser reload. Existing career progress saving is preserved.
- Customers/employees and directional player animation are not part of this first equipment interaction slice.

Next conversion: `evap_fan_motor`, reusing three-section visuals, airflow observations, feeder current, isolated motor tests and post-repair verification.
