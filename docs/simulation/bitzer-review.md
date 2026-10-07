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
