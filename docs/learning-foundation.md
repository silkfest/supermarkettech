# Field reference and learning foundation

## Navigation and content ownership

`/field` is the entry for a service call. `/learn` introduces learning paths, the reference library, practice and assigned training. Existing topic, simulator and course URLs remain valid. Shared mobile navigation and learning tabs make both entrances reachable.

Article sections, manual titles, practice resources, paths and permitted courses share the discovery catalogue in `lib/knowledge`. Search and chat draw article context from that catalogue. Manual search currently covers titles, not PDF body text; the existing chat manual-retrieval tools remain available. Search requires all non-stopword terms and supports a small explicit alias list. It is not semantic search. Live catalogue failures are shown as partial results.

## Source and review contract

`evidence.ts` records applicability, source locations, procedure steps and source-comparison date. `sources-linked` means the displayed procedure has a source; it does not certify every claim on the page. Unreviewed articles remain clearly marked. Never invent a reviewer, backdate a check, or treat successful field use as validation for every model. Feedback carries the topic and content revision so corrections can be reproduced.

The pilot is Traulsen G-Series Next Gen defrost, linked to TR35731, printed p.29 (§4.4), PDF page 30. Confirm model, refrigerant and controller before using it. The defrost learning path distinguishes this equipment procedure from the DT bunker educational model.

To expand: add a catalogue record, link the source and exact revision/page, state applicability and exclusions, compare all procedural steps, then obtain independent technical review before describing content as reviewed. Prioritise electrical isolation/live measurements, pressure relief, CO2 pressure settings, refrigerant-specific procedures, and controller-specific overrides. The remaining articles have not been fully technically audited by this change.

## Training evidence

Reading/video completion is self-reported. Simulator completion requires a stored attempt from the matching simulator; wiring trainers sharing a rack key also match a scenario prefix. These client-reported practice records are participation evidence, not independent assessment. Field lessons require the linked task to be completed and approved by a different authorised reviewer. Quiz grading keeps its existing endpoint.

No historical completion records are deleted or recertified. Existing records may predate these checks. Re-entering a practical lesson checks current evidence before advancing; previously recorded course completion is preserved. Any historical revalidation needs a separately planned migration. Unsupported simulator links or missing task links must be corrected by the course author.

No database migration is required. Offline packs, semantic search, exhaustive technical review and additional learning paths are outside this foundation change.

## Release checks

Run `npm run typecheck`, `npm test`, and `npm run build`. Check `/field`, `/learn`, `/learn/defrost`, article source panels and course errors on phone and desktop in light/dark themes with a signed-in test account. Verify partial search failures, no course-assignment leakage, and a fresh field-task approval. The local environment may not have production authentication/database configuration; fixture or source checks do not replace those signed-in checks.
