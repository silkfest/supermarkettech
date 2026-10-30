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

test('a technician sees unassigned calls and their own, and nobody else\'s', async () => {
  const db = new PGlite()
  const ids = {
    dispatcher: '30000000-0000-4000-8000-000000000001',
    tech: '30000000-0000-4000-8000-000000000002',
    other: '30000000-0000-4000-8000-000000000003',
  }
  try {
    await db.exec(`create role anon; create role authenticated; create role service_role; create schema auth;
 create table auth.users(id uuid primary key);
 create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
 grant usage on schema auth to authenticated; grant execute on function auth.uid() to authenticated;`)
    for (const f of ['202610280001_dispatch', '202610280002_dispatch_job_requests', '202610280003_dispatch_tech_view'])
      await db.exec(fs.readFileSync(`supabase/migrations/${f}.sql`, 'utf8'))

    const company = (await db.query("select id from companies where slug='major-refrigeration'")).rows[0].id
    for (const id of Object.values(ids)) await db.query('insert into auth.users values ($1)', [id])
    for (const [name, role] of [['dispatcher','dispatcher'],['tech','technician'],['other','technician']])
      await db.query('insert into company_memberships(company_id,user_id,display_name,role) values ($1,$2,$3,$4)',
        [company, ids[name], name, role])

    const asUser = async (id) => {
      await db.exec('reset role')
      await db.query("select set_config('request.jwt.claim.sub',$1,false)", [id])
      await db.exec('set role authenticated')
    }
    const add = (store, assigned) => db.query(
      "insert into dispatch_jobs(company_id,store_name,address,reason,trade,zone,priority,assigned_to) values ($1,$2,'Road','Warm case','Refrigeration',1,3,$3) returning id",
      [company, store, assigned])

    await asUser(ids.dispatcher)
    await add('Unassigned call', null)
    await add('Theirs', ids.tech)
    await add('Someone else\'s', ids.other)
    assert.equal((await db.query('select * from dispatch_jobs')).rows.length, 3, 'a dispatcher sees the whole board')

    await asUser(ids.tech)
    assert.deepEqual(
      (await db.query('select store_name from dispatch_jobs order by store_name')).rows.map((r) => r.store_name),
      ['Theirs', 'Unassigned call'],
      'a technician sees what is unclaimed and what is theirs')

    // Assigning elsewhere takes it off their board, request or no request.
    await db.query('insert into dispatch_job_requests(job_id,company_id,user_id) select id,$1,$2 from dispatch_jobs where store_name=$3',
      [company, ids.tech, 'Unassigned call'])
    await asUser(ids.dispatcher)
    await db.query('update dispatch_jobs set assigned_to=$1 where store_name=$2', [ids.other, 'Unassigned call'])
    await asUser(ids.tech)
    assert.deepEqual(
      (await db.query('select store_name from dispatch_jobs')).rows.map((r) => r.store_name),
      ['Theirs'])
  } finally {
    await db.close()
  }
})

test('a zone preference is private, is checked against real zones, and names its owner', async () => {
  const db = new PGlite()
  const ids = {
    tech: '40000000-0000-4000-8000-000000000001',
    other: '40000000-0000-4000-8000-000000000002',
  }
  try {
    await db.exec(`create role anon; create role authenticated; create role service_role; create schema auth;
 create table auth.users(id uuid primary key);
 create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
 grant usage on schema auth to authenticated; grant execute on function auth.uid() to authenticated;`)
    for (const f of ['202610280001_dispatch', '202610280002_dispatch_job_requests', '202610280003_dispatch_tech_view'])
      await db.exec(fs.readFileSync(`supabase/migrations/${f}.sql`, 'utf8'))
    const company = (await db.query("select id from companies where slug='major-refrigeration'")).rows[0].id
    for (const id of Object.values(ids)) await db.query('insert into auth.users values ($1)', [id])
    for (const name of ['tech', 'other'])
      await db.query('insert into company_memberships(company_id,user_id,display_name,role) values ($1,$2,$3,$4)',
        [company, ids[name], name, 'technician'])
    const asUser = async (id) => {
      await db.exec('reset role')
      await db.query("select set_config('request.jwt.claim.sub',$1,false)", [id])
      await db.exec('set role authenticated')
    }

    await asUser(ids.tech)
    await db.query('insert into dispatch_zone_preferences(company_id,user_id,zones) values ($1,$2,$3)',
      [company, ids.tech, [1, 3]])
    // A zone that does not exist in this company is not a preference.
    await assert.rejects(
      () => db.query('update dispatch_zone_preferences set zones=$1 where user_id=$2', [[1, 99], ids.tech]),
      /Unknown zone/)
    // And it cannot be set for someone else.
    await assert.rejects(
      () => db.query('insert into dispatch_zone_preferences(company_id,user_id,zones) values ($1,$2,$3)',
        [company, ids.other, [1]]),
      /names its own owner|row-level security/)

    // Another technician's choice is none of your business.
    await asUser(ids.other)
    assert.equal((await db.query('select * from dispatch_zone_preferences')).rows.length, 0)
    await asUser(ids.tech)
    assert.deepEqual((await db.query('select zones from dispatch_zone_preferences')).rows[0].zones, [1, 3])
  } finally {
    await db.close()
  }
})

/* ── What each role is shown on the board ─────────────────────────────────── */

test('the company picker only appears to someone who is in more than one', () => {
  // Nearly every member belongs to one company, and a picker with a single
  // entry is a control that does nothing — worse, it advertises the tenant
  // list as a thing to look at.
  assert.match(DISPATCH_PAGE, /\{context\.memberships\.length > 1 && \(/)
})

test('status and the technician filter are a dispatcher\'s, and the preview hides them', () => {
  // Gating on canWrite rather than actualRole is what makes "View as tech"
  // honest: the admin sees the board the technician gets.
  const gated = DISPATCH_PAGE.match(
    /\{canWrite && \(\s*<>([\s\S]*?)<\/>\s*\)\}/,
  )
  assert.ok(gated, 'the page gates a block of filters on canWrite')
  assert.match(gated[1], /label="Status"/, 'status sits inside that block')
  assert.match(gated[1], /Technician/, 'the technician filter sits inside it too')
  // And nothing outside it renders either control.
  const outside = DISPATCH_PAGE.replace(gated[0], '')
  assert.doesNotMatch(outside, /label="Status"/)
  assert.doesNotMatch(outside, /All technicians/)
})

test('a request reaches a dispatcher on the board itself', () => {
  // Nothing sends mail or a push, so the only place a request can surface is
  // the page a dispatcher already keeps open. It has to be counted from the
  // loaded calls and shown only to the people who can act on it.
  assert.match(DISPATCH_PAGE, /const waiting = jobs\.filter\(/)
  assert.match(DISPATCH_PAGE, /\{canWrite && waiting > 0 && \(/)
  // Per-call too, otherwise a count of 4 leaves you scrolling to find them.
  assert.match(DISPATCH_PAGE, /\{canWrite && requests\.length > 0 && \(/)
})

test('every filter chip colour carries its dark-mode pair', () => {
  // CLAUDE.md: a -600 text class with no dark: sibling is unreadable on the
  // dark board, and a bg-*-50 with none is a white chip on a dark card. Checked
  // per hue, since that is the mistake — reaching for a colour and forgetting
  // the dark half of it.
  const pills = DISPATCH_PAGE.match(/function chipClass\([\s\S]*?\n\}\n/)
  assert.ok(pills, 'the chip styling is in this file')
  const hues = new Set()
  for (const [, prop, hue] of pills[0].matchAll(
    /(?<!dark:)\b(bg|text|border)-(red|blue|amber|emerald|violet)-/g,
  )) hues.add(`${prop}-${hue}`)
  assert.ok(hues.size, 'the chips are coloured at all')
  for (const pair of hues) {
    assert.ok(
      pills[0].includes(`dark:${pair}-`),
      `${pair}-* is used with no dark:${pair}-* beside it`,
    )
  }
  // The chips are touch targets on a phone, not 20px text links.
  assert.match(pills[0], /min-h-9/)
})

/* ── The zones a technician watches ───────────────────────────────────────── */

const CONTEXT_ROUTE = fs.readFileSync('app/api/dispatch/context/route.ts', 'utf8')
const PREF_ROUTE = fs.readFileSync(
  'app/api/dispatch/zones/preference/route.ts', 'utf8')

test('the board filters on a set of zones, and the codes are checked first', () => {
  // zone used to go through the same .eq() loop as trade and status. It reaches
  // an integer column, so a list has to be parsed — and parsing without
  // checking would just hand the database a string to choke on.
  assert.doesNotMatch(JOBS_ROUTE, /'trade', 'zone'/, 'zone left the eq loop')
  assert.match(JOBS_ROUTE, /query\.in\('zone', codes\)/)
  assert.match(JOBS_ROUTE, /!Number\.isSafeInteger\(c\) \|\| c <= 0/)
  assert.match(JOBS_ROUTE, /\{ error: 'Invalid zone' \}, \{ status: 400 \}/)
})

test('a preference is saved for whoever is signed in, never for a named user', () => {
  // The trigger refuses a row that names someone else, but the route should
  // never be the thing that tries: the id comes from the session.
  assert.match(PREF_ROUTE, /user_id: a\.userId/)
  assert.doesNotMatch(PREF_ROUTE, /body\??\.\s*user/, 'no user id off the wire')
  // A composite primary key needs its conflict target spelled out, or a second
  // save raises a duplicate key instead of replacing the list.
  assert.match(PREF_ROUTE, /onConflict: 'company_id,user_id'/)
})

test('the board still loads before the preference table exists', () => {
  // The migration that creates it is not applied yet. A missing table must not
  // take the whole board down — but only that: any other failure is real.
  assert.match(CONTEXT_ROUTE, /'42P01' \|\| preference\.error\?\.code === 'PGRST205'/)
  assert.match(CONTEXT_ROUTE, /\(missingTable \? null : preference\.error\)/)
  assert.match(CONTEXT_ROUTE, /zonePreference: missingTable \? \[\] : /)
})

test('the saved list is the default, and does not fight the technician', () => {
  // Re-applying the saved zones on every poll would undo a filter the moment
  // the board refreshed, so it is adopted once per company.
  assert.match(DISPATCH_PAGE, /zonesAdopted\.current !== company/)
  assert.match(DISPATCH_PAGE, /zonesAdopted\.current = company/)
  // Switching company must not carry the previous company's zones across.
  assert.match(DISPATCH_PAGE, /zones: \[\],/)
})

test('an empty zone list means every zone, not none', () => {
  // Clearing the last chip and pressing "All zones" are the same state, and
  // an empty join() sends an empty param the route skips.
  assert.match(DISPATCH_PAGE, /zone: filters\.zones\.join\(','\)/)
  assert.match(JOBS_ROUTE, /const zone = req\.nextUrl\.searchParams\.get\('zone'\)\s*\n\s*if \(zone\) \{/)
})
