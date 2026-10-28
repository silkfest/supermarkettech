# Major Refrigeration dispatch

Review branch: `feat/major-refrigeration-dispatch`. Do not merge or apply the database migration until review is complete.

## What is included

`/dispatch` uses ColdIQ's existing Supabase cookie authentication, database connection, PageShell, desktop/mobile navigation and light/dark styles. Intake captures store name/number/address/contact, Simpro reference, customer work-order reference, reason, trade, zone, priority, technician, status and overtime decision. One active technician can be assigned per call. Dispatchers and company admins create/edit calls; technicians and viewers have read-only company dispatch access. Company admins approve/decline normal-priority overtime requests. LVL 1–2 automatically approve overtime. Changing priority resets the old approval before evaluating the new priority.

Major Refrigeration defaults:

| Zone | Area |
| --- | --- |
| 1 | Niagara–Mississauga |
| 2 | Toronto/North |
| 3 | London/Kitchener |
| 4 | Windsor |
| 5 | New Brunswick |
| 6 | Nova Scotia |

LVL 1: emergency, 2-hour reference. LVL 2: emergency, 4-hour reference. LVL 3–4: normal. There are no response timers, SLA tracking or overdue alerts. Zones/priorities are company-owned configuration rows, not global application constants.

## Architecture and isolation boundary

The new `companies` and `company_memberships` tables provide shared tenant identity. Membership roles are independent of legacy `users.role`; a ColdIQ admin is **not** automatically granted access to every company. There is no automatic enrollment or global-role bypass.

Every dispatch API uses the existing cookie-authenticated Supabase client (not the service-role client). It checks active company membership; PostgreSQL RLS independently protects reads and writes. Composite foreign keys ensure zones, priorities and assigned technicians belong to the same company. A database trigger rejects inactive/non-technician assignments, prevents identity changes, stamps OT decisions and increments versions. Edits use a version predicate so stale updates return 409 rather than silently overwrite other dispatchers.

This additive change isolates the **dispatch module**. Existing ColdIQ maintenance, stores, chat and other legacy tables/APIs are unchanged and are not represented as fully multi-tenant. Do not onboard an unrelated company into unrestricted legacy modules until those modules have their own reviewed tenant migration. Dispatch deliberately stores intake address/contact snapshots rather than linking to unscoped legacy stores.

## Reviewed deployment / provisioning

1. Apply `supabase/migrations/202610280001_dispatch.sql` to a staging Supabase database first, then to the intended database after approval. The SQL transaction creates tables, grants, RLS policies, validation triggers and Major Refrigeration configuration. It creates no memberships and changes no existing tables or users.
2. Add explicit memberships using verified existing Supabase auth user IDs. Run through a trusted database administrator; never expose the service-role key in the browser. Example (replace placeholders before execution):

```sql
insert into public.company_memberships(company_id,user_id,display_name,role)
select id, '<verified-auth-user-uuid>'::uuid, '<display name>', 'admin'
from public.companies where slug='major-refrigeration';
```

Repeat with `dispatcher`, `technician` or `viewer` roles as appropriate. Configuration and membership administration are trusted SQL operations in this first version, not public signup or self-service APIs. For another tenant, create its company and its own zone/priority rows before provisioning memberships. Do not clone Major Refrigeration memberships.

3. Deploy the reviewed application branch. Verify two companies with distinct accounts: neither account can read/edit the other's calls or select the other's technicians. Verify inactive memberships lose access, normal OT requires a company admin, and a priority downgrade removes automatic approval.
4. On rollback, revert the application commit first; retain the additive tables and any saved operational data. Do not drop tables containing dispatch records.

## Validation

- `node --test tests/dispatch.test.cjs`: input validation plus executable PostgreSQL (PGlite) migration/RLS/trigger tests covering tenant isolation, inactive membership, read-only roles, cross-company assignment, OT rules and optimistic concurrency.
- `npx playwright test tests/e2e/dispatch.spec.ts`: mocked-session UI flow on desktop and phone; creates a call, assigns a technician, verifies references, filters trades and checks priority/OT editing. No production services or records are used.
- `npm run typecheck`, `npm run lint`, `npm test`, `npm run build`.

The migration has not been applied to live Supabase. Real deployment and provisioned-account verification remain required after review. PGlite exercises PostgreSQL behavior but does not replace staging verification of Supabase/PostgREST permissions.
