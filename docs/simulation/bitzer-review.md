# Bitzer trainer accuracy review

Reviewed against the existing main-branch trainer, original component photos and
BITZER's ECOLINE Service Guide SG-0012-09 (June 2021), printed pages 63–66.

## Verified reference behaviour

- SE-B3 connection edge: L, N, B1, B2, 12, 14, 11; separate orange PTC leads.
- SE-B3 11–14 is the run-permit contact; 11–12 is made on release.
- B1–B2 fitted enables lockout; removing that link permits automatic reset, subject
  to the manufacturer's start-frequency restrictions. The trainer retains the link.
- Guide values: 4,500 Ω PTC trip; typical ambient 150–650 Ω; 3-second supply-on
  delay; manual reset by interrupting supply for at least 5 seconds.
- Oil-monitor cable: brown supply, blue return, grey common, orange run permit,
  pink alarm, violet compressor run proof via the contactor's NO auxiliary.
- Delta-PII monitors differential oil pressure; OLC-K1 optically monitors oil
  presence at the bearing pocket. These are application-specific alternatives.
- Guide delay table: Delta-PII 5 seconds after start / 90 seconds in operation;
  OLC-K1 90 seconds after start / 5 seconds in operation.

## Corrections

- Same-wire PTC measurements now read continuity. The broken-lead exercise locates
  the break between SE lead 1 and M1; the actual M1–M2 sensor remains healthy.
- Common control-fuse loss releases both powered monitoring relays.
- Independent INT280 supply control matches the separate supply in the drawing.
- Multiple opens leave isolated wire segments indeterminate instead of forcing 0 V.
- D1 follows the auxiliary; its disconnected input is treated as indeterminate
  rather than claiming a guaranteed high-impedance meter reading.
- 208 V connections retain the physical N label and identify connection to L2.
- Added the missing LP fault and corrected the reference pressure-switch symbols.
- Manufacturer cable colours no longer claim to verify all installed field wiring.

## New component view

Five vector illustrations reuse the trainer's probe and measurement state:
SE-B3, oil-monitor body/cable breakout, compressor PTC connections, INT280 housing,
and generic contactor. Each selectable connection explains its wire destination.
An enlarged view and persistent probe/meter controls support phone use.

The original INT280 photo identifies **52 S 581 P071, 230 V**. Its housing is used
as the visual reference; the photograph does not establish connector pin numbers.
Run IN/OUT and supply labels are explicitly functional test points. The oil sensor
has a sealed cable, so its six leads are shown landing on an external field strip,
not on invented screws on the sensor. Main motor terminal links are not drawn
without the compressor's exact motor code.

## Deliberate limits / further verification

This remains a settled diagnostic snapshot model, not a simulation of startup,
thermal cooling, timing accumulation, or reset sequences. The displayed timing
notes do not imply animated timers. PTC 450/6000 Ω and coil 180 Ω are exercise
values. Contact/coil resistances, phantom voltages and earth measurements are not
modelled. INT280 settings, relay pinout and cable assignments require the exact
P071 connection sheet or clear connector photographs before adding field pin
numbers. Its healthy-run safety contact remains the existing circuit assumption.
Actual voltage tolerance must be checked on each selected device, particularly
when using a nominal 230 V OLC-K1 on a 208 V control supply.

## References

- https://bitzerus-training.storage.googleapis.com/media/documents/SG-0012-09_-_Ecoline_Service_Guide_06012021.pdf
- https://www.bitzer.de/shared_media/html/at-170/en-GB/820121611820108427.html
- https://www.bitzer.de/shared_media/html/at-170/en-GB/820181899820112907.html
- https://www.kriwan.com/en/products/oil-level-regulator
- User photos IMG_3036.jpeg (INT280 label), IMG_3037.jpeg (Delta-PII),
  IMG_3041.jpeg (terminal-box connection label).

## 4NES-14-5PU terminal-box reference

Added a connected terminal-box view for user-specified model 4NES-14-5PU,
575 V / three phase / 60 Hz, S/N 2598172095. This identifies the user's unit;
it is not a serial-specific factory drawing or verification of installed wiring.
SG-0012-09 p.59 establishes the direct-start terminal layout (1/2/3 above 7/8/9),
links 1–7, 2–8, 3–9, and contactor T1/T2/T3 feeds to 1/2/3 respectively.
The same guide p.57 identifies 5PU as 575 V with a part-winding option; this view
explicitly shows direct starting, not the two-contactor part-winding arrangement.

The reference retains the trainer's SE-B3 and selectable 120/208 V controls,
separate from motor power, and uses OLC-K1 for the slinger application. Field
control routing is the educational circuit, not a literal reproduction of the
p.59 legacy oil-control circuit (which depicts SE-B1/B2 and 230 V control).
Motor terminals are inspection-only and never feed 575 V into the control meter.
Control and sensor terminals reuse existing meter points. Wire tracing layers
and enlargement support inspection. The optional heater remains omitted pending
its fitted voltage/control arrangement. INT280 pin numbering remains unverified.

## Mounting detection and visual polish

SG-0012-09 printed pp.64–65 documents a five-second lockout with flashing red
LED for incorrect electronic-head mounting OR low supply voltage on Delta-PII
and OLC-K1. Added a settled mounting-fault exercise with normal supply, released
11–14 contact and made 11–12 contact; LED inspection is an observable clue in
both Practice and Find the Fault. Low voltage is explained but is not a separate
simulated fault. LED off alone does not establish powered/healthy operation.

The coworker's seating-switch observation prompted this addition. A sticking
mounting-detection mechanism remains a reported field possibility, not verified
internal microswitch geometry. The drawing marks the mounting interface without
inventing another electrical terminal. Diagnose supply and installation first;
correct the cause before the documented supply interruption of at least 5 seconds.

Updated both component and terminal-box presentation with clearer headers,
metal terminal details and shaded housings. Rounded wire corners retain the
existing route endpoints and electrical model. Motor links remain 1–7/2–8/3–9.
