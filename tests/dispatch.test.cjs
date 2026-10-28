const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const ts = require('typescript')
const { PGlite } = require('@electric-sql/pglite')
require.extensions['.ts'] = (m, f) =>
  m._compile(
    ts.transpileModule(fs.readFileSync(f, 'utf8'), {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2020,
        esModuleInterop: true,
      },
    }).outputText,
    f,
  )
const { jobInput, jobUpdate, blankJob } = require('../lib/dispatch/model.ts')
test('intake rejects missing values, forged tenant fields, invalid priorities and stale version shapes', () => {
  const valid = {
    ...blankJob,
    store_name: 'Store',
    address: '123 Road',
    reason: 'Warm case',
  }
  assert.ok(jobInput.safeParse(valid).success)
  for (const change of [
    { store_name: ' ' },
    { address: '' },
    { priority: 5 },
    { trade: 'Other' },
    { company_id: 'forged' },
    { assigned_to: 'bad' },
    { reason: 'x'.repeat(5001) },
  ])
    assert.equal(jobInput.safeParse({ ...valid, ...change }).success, false)
  assert.equal(jobUpdate.safeParse(valid).success, false)
  assert.ok(jobUpdate.safeParse({ ...valid, version: 1 }).success)
})
test('database enforces tenant isolation, roles, assignment, emergency OT and concurrent editing', async () => {
  const db = new PGlite()
  const ids = {
    admin: '10000000-0000-4000-8000-000000000001',
    dispatcher: '10000000-0000-4000-8000-000000000002',
    tech: '10000000-0000-4000-8000-000000000003',
    outsider: '10000000-0000-4000-8000-000000000004',
    inactive: '10000000-0000-4000-8000-000000000005',
  }
  try {
    await db.exec(`create role anon; create role authenticated; create role service_role; create schema auth;
 create table auth.users(id uuid primary key);
 create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
 grant usage on schema auth to authenticated; grant execute on function auth.uid() to authenticated;`)
    await db.exec(
      fs.readFileSync('supabase/migrations/202610280001_dispatch.sql', 'utf8'),
    )
    const company = (
      await db.query(
        "select id from companies where slug='major-refrigeration'",
      )
    ).rows[0].id
    const other = (
      await db.query(
        "insert into companies(name,slug) values ('Other','other') returning id",
      )
    ).rows[0].id
    for (const id of Object.values(ids))
      await db.query('insert into auth.users values ($1)', [id])
    for (const [name, role] of [
      ['admin', 'admin'],
      ['dispatcher', 'dispatcher'],
      ['tech', 'technician'],
      ['inactive', 'technician'],
    ])
      await db.query(
        'insert into company_memberships(company_id,user_id,display_name,role,active) values ($1,$2,$3,$4,$5)',
        [company, ids[name], name, role, name !== 'inactive'],
      )
    await db.query(
      "insert into company_memberships values ($1,$2,'Outside technician','technician',true)",
      [other, ids.outsider],
    )
    const asUser = async (id) => {
      await db.exec('reset role')
      await db.query("select set_config('request.jwt.claim.sub',$1,false)", [
        id,
      ])
      await db.exec('set role authenticated')
    }
    const insert = async (
      priority = 3,
      assigned = ids.tech,
      tenant = company,
    ) =>
      db.query(
        "insert into dispatch_jobs(company_id,store_name,address,reason,trade,zone,priority,assigned_to) values ($1,'Store','Road','Warm case','Refrigeration',1,$2,$3) returning *",
        [tenant, priority, assigned],
      )
    await asUser(ids.dispatcher)
    assert.equal((await db.query('select * from companies')).rows.length, 1)
    assert.equal(
      (
        await db.query(
          'select * from company_memberships where company_id=$1',
          [other],
        )
      ).rows.length,
      0,
    )
    await assert.rejects(() => insert(3, ids.outsider), /active technician/)
    await assert.rejects(() => insert(3, ids.inactive), /active technician/)
    await assert.rejects(() => insert(3, ids.admin), /active technician/)
    await assert.rejects(
      () => insert(3, ids.outsider, other),
      /row-level security/,
    )
    await assert.rejects(
      () =>
        db.query(
          "update company_memberships set role='admin' where user_id=$1",
          [ids.dispatcher],
        ),
      /permission denied/,
    )
    const emergency = (await insert(1)).rows[0]
    assert.equal(emergency.overtime_status, 'approved')
    assert.equal(emergency.created_by, ids.dispatcher)
    const downgraded = (
      await db.query(
        'update dispatch_jobs set priority=3 where id=$1 returning *',
        [emergency.id],
      )
    ).rows[0]
    assert.equal(downgraded.overtime_status, 'not_requested')
    assert.equal(downgraded.version, 2)
    await assert.rejects(
      () =>
        db.query(
          "update dispatch_jobs set overtime_status='approved' where id=$1",
          [emergency.id],
        ),
      /admin must decide/,
    )
    await db.query(
      "update dispatch_jobs set overtime_status='requested' where id=$1",
      [emergency.id],
    )
    await assert.rejects(
      () =>
        db.query('update dispatch_jobs set company_id=$1 where id=$2', [
          other,
          emergency.id,
        ]),
      /identity cannot change/,
    )
    await asUser(ids.admin)
    const approved = (
      await db.query(
        "update dispatch_jobs set overtime_status='approved' where id=$1 returning *",
        [emergency.id],
      )
    ).rows[0]
    assert.equal(approved.overtime_decided_by, ids.admin)
    assert.ok(approved.overtime_decided_at)
    await asUser(ids.dispatcher)
    const edited = (
      await db.query(
        "update dispatch_jobs set reason='Updated',overtime_decided_by=$1 where id=$2 and version=$3 returning *",
        [ids.dispatcher, emergency.id, approved.version],
      )
    ).rows[0]
    assert.equal(edited.overtime_decided_by, ids.admin)
    assert.equal(
      (
        await db.query(
          "update dispatch_jobs set reason='Stale' where id=$1 and version=$2 returning *",
          [emergency.id, approved.version],
        )
      ).rows.length,
      0,
    )
    await asUser(ids.tech)
    assert.equal((await db.query('select * from dispatch_jobs')).rows.length, 1)
    assert.equal(
      (await db.query("update dispatch_jobs set reason='Forged' returning *"))
        .rows.length,
      0,
    )
    await assert.rejects(() => insert(), /row-level security/)
    await asUser(ids.outsider)
    assert.equal((await db.query('select * from dispatch_jobs')).rows.length, 0)
    assert.equal(
      (
        await db.query(
          "update dispatch_jobs set reason='Forged' where id=$1 returning *",
          [emergency.id],
        )
      ).rows.length,
      0,
    )
    await asUser(ids.inactive)
    assert.equal((await db.query('select * from dispatch_jobs')).rows.length, 0)
    await db.exec('reset role;set role anon')
    assert.equal((await db.query('select * from dispatch_jobs')).rows.length, 0)
  } finally {
    await db.close()
  }
})

test('the dispatch header and call modal clear the iPhone status bar', () => {
  // viewportFit:'cover' puts the top of the page under the notch, so the first
  // thing on screen needs the safe-area inset or it sits on top of the clock.
  const page = fs.readFileSync('app/dispatch/page.tsx', 'utf8')
  const header = page.match(/<header className="([^"]*)"/)
  assert.ok(header, 'dispatch page has a header')
  assert.match(header[1], /\bsafe-top\b/, 'header must carry safe-top')
  // The call modal is fixed to the viewport top with items-start, so it lands
  // under the status bar for the same reason.
  const dialog = page.match(/className="([^"]*fixed inset-0[^"]*)"/)
  assert.ok(dialog, 'dispatch page has a fixed dialog')
  assert.match(dialog[1], /\bsafe-top\b/, 'call modal must carry safe-top')
})

/* ── Previewing the technician view ───────────────────────────────────────── */

const DISPATCH_PAGE = fs.readFileSync('app/dispatch/page.tsx', 'utf8')

test('the technician preview narrows the UI through the same role the page already uses', () => {
  // Every role-dependent branch on this page reads `role` or `canWrite`, so the
  // preview has to swap the role itself — anything else leaves branches behind.
  assert.match(DISPATCH_PAGE, /const role = previewTech \? 'technician' : actualRole/)
  assert.match(DISPATCH_PAGE, /const canWrite = role === 'admin' \|\| role === 'dispatcher'/)
  // The overtime decision is gated on role too, so it follows automatically.
  assert.match(DISPATCH_PAGE, /disabled=\{role !== 'admin'\}/)
})

test('the preview button is the admin\'s alone, and reads from the real membership', () => {
  // Gating the button on `role` would make it vanish the moment you pressed it.
  assert.match(DISPATCH_PAGE, /\{actualRole === 'admin' && \(/)
  assert.doesNotMatch(DISPATCH_PAGE, /\{role === 'admin' && \(/)
})

test('previewing cannot grant anything, and says so', () => {
  // The toggle is presentation only: no request carries it, and the API and its
  // row-level policies still answer to the real membership.
  assert.doesNotMatch(DISPATCH_PAGE, /previewTech[^\n]*fetch\(/)
  assert.doesNotMatch(DISPATCH_PAGE, /previewTech=/, 'never sent as a query parameter')
  assert.match(DISPATCH_PAGE, /Previewing the technician view/)
})

test('switching company or toggling the preview never strands an open editor', () => {
  // A form opened as admin would otherwise stay on screen in the tech preview.
  assert.match(DISPATCH_PAGE, /setEditing\(undefined\)\s*\n\s*setPreviewTech/)
  assert.match(DISPATCH_PAGE, /useEffect\(\(\) => setPreviewTech\(false\), \[company\]\)/)
})

test('a request names its own author, comes from a technician, and stays in its company', async () => {
  const db = new PGlite()
  const ids = {
    admin: '20000000-0000-4000-8000-000000000001',
    dispatcher: '20000000-0000-4000-8000-000000000002',
    tech: '20000000-0000-4000-8000-000000000003',
    tech2: '20000000-0000-4000-8000-000000000004',
    outsider: '20000000-0000-4000-8000-000000000005',
  }
  try {
    await db.exec(`create role anon; create role authenticated; create role service_role; create schema auth;
 create table auth.users(id uuid primary key);
 create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
 grant usage on schema auth to authenticated; grant execute on function auth.uid() to authenticated;`)
    await db.exec(fs.readFileSync('supabase/migrations/202610280001_dispatch.sql', 'utf8'))
    await db.exec(fs.readFileSync('supabase/migrations/202610280002_dispatch_job_requests.sql', 'utf8'))

    const company = (await db.query("select id from companies where slug='major-refrigeration'")).rows[0].id
    const other = (await db.query("insert into companies(name,slug) values ('Other','other') returning id")).rows[0].id
    await db.query('insert into dispatch_zones values ($1,1,$2)', [other, 'Z'])
    await db.query('insert into dispatch_priorities(company_id,level,label) values ($1,3,$2)', [other, 'P'])
    for (const id of Object.values(ids)) await db.query('insert into auth.users values ($1)', [id])
    for (const [name, role] of [['admin','admin'],['dispatcher','dispatcher'],['tech','technician'],['tech2','technician']])
      await db.query('insert into company_memberships(company_id,user_id,display_name,role) values ($1,$2,$3,$4)',
        [company, ids[name], name, role])
    await db.query("insert into company_memberships values ($1,$2,'Outsider','technician',true)", [other, ids.outsider])

    const asUser = async (id) => {
      await db.exec('reset role')
      await db.query("select set_config('request.jwt.claim.sub',$1,false)", [id])
      await db.exec('set role authenticated')
    }
    await asUser(ids.dispatcher)
    const job = (await db.query(
      "insert into dispatch_jobs(company_id,store_name,address,reason,trade,zone,priority) values ($1,'Store','Road','Warm case','Refrigeration',1,3) returning id",
      [company])).rows[0].id
    // A dispatcher is not who gets dispatched.
    await assert.rejects(
      () => db.query('insert into dispatch_job_requests(job_id,company_id,user_id) values ($1,$2,$3)', [job, company, ids.dispatcher]),
      /Only technicians ask for calls|row-level security/)

    await asUser(ids.tech)
    await db.query('insert into dispatch_job_requests(job_id,company_id,user_id) values ($1,$2,$3)', [job, company, ids.tech])
    // Twice is the same request, not two.
    await assert.rejects(
      () => db.query('insert into dispatch_job_requests(job_id,company_id,user_id) values ($1,$2,$3)', [job, company, ids.tech]),
      /duplicate key/)
    // Filing on someone else's behalf is not a request.
    await assert.rejects(
      () => db.query('insert into dispatch_job_requests(job_id,company_id,user_id) values ($1,$2,$3)', [job, company, ids.tech2]),
      /names its own author|row-level security/)

    // Another company's technician cannot reach the call at all.
    await asUser(ids.outsider)
    await assert.rejects(
      () => db.query('insert into dispatch_job_requests(job_id,company_id,user_id) values ($1,$2,$3)', [job, other, ids.outsider]),
      /not in this company|row-level security/)
    assert.equal((await db.query('select * from dispatch_job_requests')).rows.length, 0, 'and cannot read them either')

    // Two technicians may want the same call; the dispatcher decides.
    await asUser(ids.tech2)
    await db.query('insert into dispatch_job_requests(job_id,company_id,user_id) values ($1,$2,$3)', [job, company, ids.tech2])
    assert.equal((await db.query('select * from dispatch_job_requests')).rows.length, 2)

    // A technician withdraws only their own — reaching for someone else's
    // deletes nothing rather than erroring, which is how RLS refuses a delete.
    await db.query('delete from dispatch_job_requests where user_id=$1', [ids.tech])
    assert.equal((await db.query('select * from dispatch_job_requests')).rows.length, 2,
      'tech2 cannot withdraw tech\'s request')
    await asUser(ids.tech)
    await db.query('delete from dispatch_job_requests where user_id=$1', [ids.tech])
    assert.deepEqual(
      (await db.query('select user_id from dispatch_job_requests')).rows.map((r) => r.user_id),
      [ids.tech2],
      'tech withdrew their own and left tech2 alone')

    // A dispatcher can clear a request once they have acted on it.
    await asUser(ids.dispatcher)
    await db.query('delete from dispatch_job_requests where user_id=$1', [ids.tech2])
    assert.equal((await db.query('select * from dispatch_job_requests')).rows.length, 0)

    // Requesting never assigns — that stays a dispatcher's decision.
    await asUser(ids.tech)
    await db.query('insert into dispatch_job_requests(job_id,company_id,user_id) values ($1,$2,$3)', [job, company, ids.tech])
    assert.equal((await db.query('select assigned_to from dispatch_jobs where id=$1', [job])).rows[0].assigned_to, null)
    // And a technician still cannot assign it to themselves: the update policy
    // hides the row rather than erroring, so it changes nothing.
    await db.query('update dispatch_jobs set assigned_to=$1 where id=$2', [ids.tech, job])
    assert.equal(
      (await db.query('select assigned_to from dispatch_jobs where id=$1', [job])).rows[0].assigned_to,
      null,
      'asking for a call does not let a technician take it')
  } finally {
    await db.close()
  }
})

/* ── Collapsed cards, and asking for a call ───────────────────────────────── */

const REQUEST_ROUTE = fs.readFileSync('app/api/dispatch/jobs/[id]/request/route.ts', 'utf8')
const JOBS_ROUTE = fs.readFileSync('app/api/dispatch/jobs/route.ts', 'utf8')

test('a call shows its heading until it is opened out', () => {
  // The board is for scanning. Everything below the reason is behind the
  // toggle, and the reason itself is clamped rather than run in full.
  assert.match(DISPATCH_PAGE, /const isOpen = expanded\.has\(job\.id\)/)
  assert.match(DISPATCH_PAGE, /\{isOpen && \(\s*\n\s*<dl/, 'the detail grid is gated')
  assert.match(DISPATCH_PAGE, /isOpen \? '' : 'line-clamp-2'/)
  assert.match(DISPATCH_PAGE, /aria-expanded=\{isOpen\}/)
  // Collapsed still has to say who it is on, or the board stops being useful.
  assert.match(DISPATCH_PAGE, /const assignedName = job\.assigned_to/)
})

test('opening one call does not open the rest', () => {
  // A Set keyed by id, not a single expanded id and not a flag on the page.
  assert.match(DISPATCH_PAGE, /useState<Set<string>>\(new Set\(\)\)/)
  assert.match(DISPATCH_PAGE, /if \(!next\.delete\(id\)\) next\.add\(id\)/)
})

test('asking for a call is a technician\'s, and never assigns it', () => {
  assert.match(DISPATCH_PAGE, /const canRequest = actualRole === 'technician'/)
  // An admin previewing sees the control but cannot use it: the server answers
  // to their real membership, so offering a working button would just 403.
  assert.match(DISPATCH_PAGE, /disabled=\{!canRequest \|\| requesting === job\.id\}/)
  // The route records interest only — it must not reach dispatch_jobs at all.
  assert.match(REQUEST_ROUTE, /from\('dispatch_job_requests'\)/)
  assert.doesNotMatch(REQUEST_ROUTE, /from\('dispatch_jobs'\)/)
  assert.doesNotMatch(REQUEST_ROUTE, /assigned_to/)
})

test('a request names the caller, not whoever the body claims', () => {
  // user_id comes from the session, never from the request body.
  assert.match(REQUEST_ROUTE, /user_id: a\.userId/)
  assert.doesNotMatch(REQUEST_ROUTE, /user_id: body/)
})

test('the board can see who asked without a second round trip', () => {
  assert.match(JOBS_ROUTE, /dispatch_job_requests\(user_id, note, created_at\)/)
  // And it needs the viewer's id to tell their own ask apart.
  const context = fs.readFileSync('app/api/dispatch/context/route.ts', 'utf8')
  assert.match(context, /userId: user\.id/)
  assert.match(DISPATCH_PAGE, /r\.user_id === context\.userId/)
})
