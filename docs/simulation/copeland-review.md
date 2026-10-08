# Copeland Discus Demand Cooling / unloader trainer

Reference: user photos IMG_9340.jpeg (Discus nameplate) and IMG_9341.jpeg
(CoreSense Protection and separate Demand Cooling module). Uses a 4D-style
conventional blocked-suction unloader. Does not claim a serial-specific wiring
layout, complete model transcription, actual coil ratings, motor links, or
connector pin geometry from the photos. Physical housing drawings are illustrative.

## Primary references reviewed

- Copeland AE4-1287 R10, Figure 12 and Table 1 (printed p.15); appendix pp.17–20.
  https://webapps.copeland.com/online-product-information/Publication/LaunchPDF?Index=AEB&PDF=1287
- Copeland AE8-1367 R8, supply/pilot wiring pp.9–10, Figures 4/6 pp.15–16.
  https://webapps.copeland.com/online-product-information/Publication/LaunchPDF?Index=AEB&PDF=1367
- Copeland AE21-1216 R17, conventional capacity control pp.7–11.
  https://webapps.copeland.com/online-product-information/Publication/LaunchPDF?Index=AEB&PDF=1216

## Model and limits

CoreSense supply is separate from its L–M run-permit contact. The contact opens
on loss of supply or protection trip; L–A makes. Demand Cooling has a distinct
manual-reset alarm relay with L/M/A, supply L1/L2 and injection output S. The two
modules must not be conflated with CoreSense Diagnostics or a Digital controller.
DC supply loss alone is not assumed to trip its mechanically latched alarm relay.

The reference chain is call/pressure safeties → DC L/M → CS L/M → CC A1/A2.
CoreSense supply is taken from the fused source. The run-proved accessory feed
is an explicit functional OEM interlock (no fabricated CoreSense output pin).
It disables DC and the unloader when the compressor is stopped, including an
open contactor coil. Exact OEM implementation is outside these photographs.
DC S supplies only the injection solenoid. The unloader uses a separate rack
command, energized to unload. Mechanical blocked-flow and stuck-loaded cases
retain coil continuity and voltage so they can be distinguished from open coils.

Control options are documented 120/240 V examples, not 575 V motor voltage.
Actual DC module and solenoid ratings must be matched. No unsupported 208 V
rating has been assumed. No motor terminal links are drawn without the terminal
cover diagram. The original classic Copeland safety trainer remains available.

Snapshots are settled, not a timed engine: 77°F/no demand; 295°F/injection;
310°F/alarm after delay. The UI explains 292°F on/282°F off hysteresis and the
one-minute abnormal-input alarm delay; neither is animated. The 295°F sensor
resistance is explicitly an illustrative interpolation. Coil tests report
continuity, not fabricated ohm values. Switching to a new temperature snapshot
is not presented as an actual automatic alarm reset. Power toggling retains
injected trip conditions. Open sensor alarm removes compressor run and DC feed.

Ideal-wire nets are collapsed; module/coil loads reference disconnected segments
to return. Floating islands are reported as floating. Alarm contacts with no
external load float in their unconnected state. Meter supply/coil diagnostics
are tested at both control voltages. The UI requires control power off and a
component isolated for resistance testing; restoring power reconnects the test
setup. Motor power, Modbus, detailed flash-code timing and rack thermodynamics
are outside this exercise.

## Validation

Model tests cover independent cooling/unloading, stop interlocks, distinct
supply/relay faults, open versus mechanical coil faults, guarded resistance,
NTC open and floating segments. TypeScript and lint checks plus rendered SVG
inspection supplement the tests. Browser interaction was not tested locally
because no browser executable is installed.

## Additional hardware review

Added drawings for the differential oil-pressure sensor and harness, motor PTC
loop, current-sensing toroid, and separate HP/LP controls. Oil sensor and toroid
connections are inspection-only, without invented connector pin numbers or
resistance checks. CoreSense already incorporates the oil and motor protection;
this configuration does not require adding a second Sentronic or INT369R.

Added a separately diagnosable LP cutout fault and HP-out/LP-out test points.
Added isolated motor PTC tests using explicitly simulated 1 kΩ cool / 15 kΩ hot
values. AE8-1367 R8 p.7 documents the applicable 13 kΩ trip, 3.2 kΩ recovery and
five-minute off interval; other motor variants differ. These PTC leads remain
functional labels, not motor power terminals or assumed connector pin numbers.

Accessory notes distinguish oil-level replenishment from oil-pressure protection
and identify crankcase heaters/head fans as application-dependent. Actual models,
ratings and wiring are not inferred. All now 14 injected fault scenarios remain
settled snapshots. The toroid's run-proof signal is not represented as a spare
line-voltage output; the existing OEM interlock stays explicitly functional.
