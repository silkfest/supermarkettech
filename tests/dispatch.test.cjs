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
