# ColdIQ — Context for Claude

This file captures intentional product decisions, hidden features, and future plans so Claude
doesn't treat "missing" functionality as a gap or recommend changes to things that are
deliberately incomplete.

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

---

## Recommended Future Work (Backlog)

Captured from a site-wide audit. These are suggestions — confirm with the user before implementing.

### Phase 1 — Functional gaps
- [ ] "Ask ColdIQ" button on knowledge topic pages to pre-load a chat session with topic context
- [ ] Equipment selector + chat context for journeymen/apprentices *(blocked — see above)*
- [ ] Read-only store/site view for non-admins *(blocked — see above)*

### Phase 2 — Navigation restructure
- [ ] Combine Knowledge base, Rack Simulator, and Training courses into a unified "Learning" section with tabs/sub-nav
- [ ] Contacts quick-access shortcut from the dashboard or maintenance report area (contextual "who to call")

### Phase 3 — Polish
- [ ] Synchronize the mobile bottom nav across all pages (currently only on dashboard)
- [ ] Standardize empty states across pages (contacts and policies are well done; others vary)
- [ ] Photo gallery/viewer on maintenance report detail pages (upload API exists, no viewer yet)
- [ ] Manager-side "team certificates expiring soon" view on the team/admin page
- [ ] Manager view of all feedback/reviews they have written (currently only the recipient sees them)
- [ ] Pending user screen: add "resend approval request" option or estimated wait context
