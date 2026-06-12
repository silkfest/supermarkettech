# ColdIQ — Context for Claude

This file captures intentional product decisions, hidden features, and future plans so Claude
doesn't treat "missing" functionality as a gap or recommend changes to things that are
deliberately incomplete.

---

## Navigation Structure (current)

- **Sidebar "Learning"** → `/knowledge` (Knowledge Base tab)
  - Knowledge Base, Rack Simulator, and Training are connected via a shared tab bar (`LearningTabBar`)
  - Knowledge tab: `/knowledge` and `/knowledge/[slug]`
  - Simulator tab: `/simulation`
  - Training tab: `/apprentice/training`
- **Sidebar "Company Hub"** → `/company-hub`
  - Tab 1: Policies & Procedures (was `/policies`)
  - Tab 2: Contact Directory (was `/contacts`)
  - Old `/policies` and `/contacts` routes redirect here
- **"Ask ColdIQ" button** on every knowledge topic page (`/knowledge/[slug]`)
  - Stores `coldiq_prefill` in localStorage, navigates to `/dashboard`
  - ChatPanel picks it up and pre-fills the chat input

---

## Intentionally Hidden / Not Built Yet

These features are scoped for future development. They are purposely restricted or absent
in the current UI. Do NOT recommend surfacing, fixing, or expanding these until the user says
the feature is ready to build.

### Equipment selector & context — non-admin roles
- The sidebar equipment selector and equipment-context for AI chat are **admin-only by design**.
- Journeymen and apprentices do not see equipment in the sidebar and cannot select equipment context for chat sessions.
- **Why hidden**: The equipment data model and live integration aren't complete enough to expose to field users yet.
- **Future plan**: Once equipment data is reliable and comprehensive, extend the equipment selector and chat context to journeymen and apprentices.

### Sites / Stores page — non-admin roles
- The `/stores` page and all store detail pages are **admin-only by design**.
- Non-admins (journeymen, apprentices) have no read-only view of store info, trending issues, or equipment lists.
- **Why hidden**: The stores feature isn't built out sufficiently for field-user consumption yet.
- **Future plan**: Add a read-only "Sites" view for journeymen that shows store name, address, equipment list, trending issues, and last PM date — contextual info useful while on site.

---

## Product Notes & Decisions

- The app targets supermarket refrigeration & HVAC technicians (apprentice → journeyman → manager → admin hierarchy).
- "Admin" in this app = company admin/owner, not a super-admin. Managers are senior techs or service managers.
- Chat AI (ColdIQ Expert) uses Claude via the Anthropic API with equipment context injected into the system prompt.
- Maintenance reports split into two types: PM reports (refrigeration/HVAC checklists) and individual service reports (fault + steps taken + next action).
- The rack simulator physics are all computed in-browser from fault toggles and slider values — no server round-trips during play. `/simulation` is a chooser page; the three sims live at `/simulation/parallel-rack`, `/simulation/protocol-rack-a`, and `/simulation/co2-booster`. The only server interaction is fire-and-forget scenario attempt logging to `/api/simulator/attempts` (table `simulator_attempts`), surfaced as per-rack stats on the chooser. Displayed readings are deliberately noisy: `useLiveReadings` overlays sensor jitter / hunting / per-sensor bias on the deterministic model (alarms still use the clean model). Each sim has an animated SVG schematic (`components/simulation/visuals/`); during scenarios the schematics hide inspection-only fault cues (dirty coil, stuck valves, fan state) so hidden faults aren't given away — only controller-reported state (comp trips, pressures, levels) shows.
- Profile page is intentionally a career-focused page (certifications, feedback, progression) — NOT just account settings.
- Welcome page (`/welcome`) is a management/demo-facing page to showcase the product — not a user onboarding flow.

---

## Color Scheme — Semantic Status Colors

All pages support both light and dark mode. Follow these conventions for semantic/status colors so text stays readable on both white and dark backgrounds:

| Intent | Light mode | Dark mode |
|--------|-----------|-----------|
| Error / critical | `text-red-600` | `dark:text-red-400` |
| Warning | `text-amber-600` or `text-amber-700` | `dark:text-amber-400` |
| Success / OK | `text-emerald-600` or `text-emerald-700` | `dark:text-emerald-400` |
| Info / blue accent | `text-blue-600` | `dark:text-blue-400` |
| Violet / scenario | `text-violet-600` or `text-violet-700` | `dark:text-violet-400` |
| Soft badge bg | `bg-*-50 border-*-200` | `dark:bg-*-500/10 dark:border-*-500/30` |

**Rules:**
- Never use `text-*-300` without a `dark:` prefix — 300-level colors are invisible on white.
- Never use `bg-*-900/XX` without a `dark:` prefix — dark-tinted containers in light mode.
- The `-400` level is acceptable for large/bold text only; use `-600` for small labels and body text.
- Dot indicators (`.bg-*-500` circles) are fine without `dark:` — they're color blocks, not text.

---

## Mobile Safe-Area Rule (iPhone notch / Dynamic Island)

Every page with a sticky or fixed header **MUST** include the `safe-top` CSS class on that header element. This prevents the header from being obscured by the iPhone status bar, notch, or Dynamic Island.

```css
/* defined in app/globals.css */
.safe-top { padding-top: env(safe-area-inset-top); }
```

The root layout (`app/layout.tsx`) sets `viewportFit: 'cover'` so safe-area insets are active.

**Pattern to follow:**
```tsx
<div className="safe-top bg-white border-b border-slate-200 ... sticky top-0 z-10">
```

**Rule:** Any new page or layout with a sticky/fixed top header must add `safe-top` to that element before committing. Pages without a sticky header (full-scroll pages, modals only) don't need it.

---

## New table rule
Any new table created via `apply_migration` MUST receive explicit grants:
```sql
GRANT SELECT ON <table> TO anon, authenticated;
GRANT ALL PRIVILEGES ON <table> TO service_role;
```
Otherwise the table will be inaccessible to the app (even with RLS disabled).

---

## Display Case / Circuit Cataloging Standard

When entering display-case (or similar multi-circuit) data from a store's display case
schedule / legend drawing (e.g. Hussmann drawing "RHDR-A" style schedules listing SYS / SIZE / MODEL
per circuit), catalog **one entry per circuit** — never one grouped entry covering a circuit range.
This was established while cataloging Fortino's Mall Rd (drawing 352892, Remote Header A,
circuits A1–A9) after an initial grouped "circuits #A2–#A9" entry turned out to bake in a wrong
manufacturer assumption that was hard to spot and correct once merged together.

**Per circuit, create BOTH:**
1. An `equipment` row:
   - `name`: short **functional** label + circuit, e.g. `"FF Doors A1"`, `"FF Doors A2"` — name
     by what the system *does* (the user's framing — e.g. "Frozen Food" doors), not by brand/model,
     so mixed-manufacturer circuits serving the same function stay consistently named (Fortino's
     Remote Header A has both Hillphoenix ORZ and Arneg Brema units across its FF Doors circuits;
     all are named "FF Doors A<n>" — manufacturer/model live in their own fields, not the name).
   - `equipment_type`: `'display_case'`
   - `manufacturer` / `model`: from the nameplate/legend MODEL column (trust the nameplate over
     assumptions about "who usually supplies this site" — see the ORZ/Hillphoenix vs. Arneg
     correction in this same dataset as a cautionary example)
   - `specs` (jsonb array of `{label, value}`): always include a `"Doors"` entry decoding the
     legend's SIZE column, e.g. SIZE `"9 (4,5)"` → `{"label": "Doors", "value": "9 total — 4-door + 5-door sections"}`,
     plus a `"Circuit"` entry, e.g. `{"label": "Circuit", "value": "#A1 (Remote Header A)"}`
   - `notes`: cite the drawing number, store name, SYS/SIZE/MODEL values verbatim from the
     legend, the door breakdown, defrost type if known, and flag any manufacturer correction
     made from the nameplate
2. A matching `manual_components` catalog row (`type: 'Display Doors'`, `system_area: 'Display Doors'`,
   `system_type: 'HFC'`, `status: 'active'`) with `equipment_id` pointing at the new equipment row
   and `document_id` pointing at the manufacturer's install/operations manual. **Multiple circuits
   of the same model should all reference the same manual `document_id`** — don't duplicate the
   document row, just add another catalog row pointing to it.

This keeps each circuit individually correctable (manufacturer, door count, manual link) without
having to untangle a grouped record later, and ensures every circuit shows up as its own entry on
the store equipment page (see "New table rule" above on why `equipment` rows — not just
`manual_components` rows — are required for store-page visibility).

---

## Knowledge Base Content Standards

### Manual → Knowledge Base integration (curated, not auto-generated)

Manuals uploaded to the document library are surfaced in the Knowledge Base **only through
curated topics** — never as auto-generated stub topics or runtime-AI-generated pages. (An
auto-stub + "Generate full topic with AI" approach was built and then removed in June 2026:
the generated pages didn't match the curated structure/quality, and many stubs duplicated
existing topics.)

How a manual gets into the KB:
1. **Existing topic covers the subject** → add a keyword to that topic's `manualKeywords` in
   `lib/knowledge/topics.ts` that matches the document's title (ILIKE substring on title).
   The manual then appears in the topic's "Related Manuals" sidebar.
2. **No topic covers it** → write a new curated topic: content in `lib/ai/prompts.ts`
   (following the formatting standards below), registered in `TOPICS` in
   `lib/knowledge/topics.ts` with `manualKeywords` chosen to match the relevant document
   titles. Group related products into one topic (e.g. all SWEP + Alfa Laval plate heat
   exchanger manuals live under one "Brazed Plate Heat Exchangers" topic).

When choosing `manualKeywords`, verify each intended manual title actually matches a keyword
(case-insensitive substring) and that keywords aren't so generic they pull in unrelated
manuals. Note: in Postgres ILIKE, `_` matches any single character — a keyword like
`refplus_evap` works but is a 1-char wildcard at the underscore.

Dynamic DB topics (`knowledge_topics` rows, e.g. the Wirz book chapters) are still supported
for hand-curated content, but should meet the same content standards.

All knowledge topic content lives in `lib/ai/prompts.ts` as exported template-literal strings. The custom markdown renderer in `components/knowledge/MarkdownContent.tsx` has specific rules — follow these to keep pages consistent and professional.

### Heading Structure
- `## Title` — **first heading only**, becomes the page H2 title. Only one per topic.
- `### Section Name` — main sections. These populate the TOC sidebar and are required for the Related Manuals sidebar to render. Every topic **must** have at least one `### ` heading.
- `#### Sub-heading` — sub-sections within a section (smaller, no TOC entry).
- Never use a second `## ` heading — subsequent `## ` headings are silently dropped by the renderer.

### No Sources Blocks
Do **not** add `*Sources: ...*` citation lines to topic content. Manuals and references belong in the Related Manuals section (DB documents linked via `manualKeywords`). Sources text clutters the page and becomes outdated.

### No Code Fences
The renderer does **not** support triple-backtick code fences (` ``` `). They render as literal `` ``` `` characters on screen. Never use them. Instead:
- Lists of items → `- bullet` or `1. numbered list`
- Wiring / terminal descriptions → bullet points or plain paragraphs
- ASCII diagrams → remove; use `[diagram:name]` for SVG components or `![alt](url)` for images
- Checklist items → `- ` bullet list (use `- [ ]` style if desired, but plain `- ` is fine)

### Images
Use `![alt text](url)` on its own line. Optionally add a caption: `![alt](url "Caption text")`.
- Prefer **Wikimedia Commons** for free-to-use technical/refrigeration images (no copyright issues)
- Wikimedia Commons direct image URLs: `https://upload.wikimedia.org/wikipedia/commons/...`
- Do not hotlink from manufacturer sites or Google Images

### Diagrams
Interactive SVG diagrams are registered in `DIAGRAM_REGISTRY` in `MarkdownContent.tsx`. Insert with `[diagram:key-name]` on its own line. Currently registered:
- `rack-style-1`, `rack-style-2`, `paragon-timer`, `compressor-terminals`, `ice-harvest-cycle`

---

## Remaining Backlog

### Phase 2 — Feature integrations
- [x] Chat history scoping: non-admins see only own sessions; admins see all with user filter
- [x] Mobile bottom nav: move into PageShell so it renders on all authenticated pages
- [ ] Equipment selector + chat context for journeymen/apprentices *(blocked — see above)*
- [ ] Read-only store/site view for non-admins *(blocked — see above)*

### Phase 3 — Polish
- [x] Reusable `EmptyState` component, apply across all pages
- [ ] Report photo gallery/viewer on maintenance report detail pages
- [ ] Manager cert expiry: team-wide view on admin/team page
- [ ] Pending user screen: add wait context + "notify admin again" button
- [ ] Manager feedback view: "Reviews I've Written" tab on manager's profile
