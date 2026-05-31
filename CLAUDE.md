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
- The rack simulator is a self-contained training tool — no server calls, all computed in-browser from fault toggles and slider values.
- Profile page is intentionally a career-focused page (certifications, feedback, progression) — NOT just account settings.
- Welcome page (`/welcome`) is a management/demo-facing page to showcase the product — not a user onboarding flow.

---

## New table rule
Any new table created via `apply_migration` MUST receive explicit grants:
```sql
GRANT SELECT ON <table> TO anon, authenticated;
GRANT ALL PRIVILEGES ON <table> TO service_role;
```
Otherwise the table will be inaccessible to the app (even with RLS disabled).

---

## Remaining Backlog

### Phase 2 — Feature integrations
- [ ] Chat history scoping: non-admins see only own sessions; admins see all with user filter
- [ ] Mobile bottom nav: move into PageShell so it renders on all authenticated pages
- [ ] Equipment selector + chat context for journeymen/apprentices *(blocked — see above)*
- [ ] Read-only store/site view for non-admins *(blocked — see above)*

### Phase 3 — Polish
- [ ] Reusable `EmptyState` component, apply across all pages
- [ ] Report photo gallery/viewer on maintenance report detail pages
- [ ] Manager cert expiry: team-wide view on admin/team page
- [ ] Pending user screen: add wait context + "notify admin again" button
- [ ] Manager feedback view: "Reviews I've Written" tab on manager's profile
