import { test, expect } from '@playwright/test'
const company = '20000000-0000-4000-8000-000000000001'
const user = '10000000-0000-4000-8000-000000000001'
const technician = '10000000-0000-4000-8000-000000000002'
const zones = [
  'Niagara–Mississauga',
  'Toronto/North',
  'London/Kitchener',
  'Windsor',
  'New Brunswick',
  'Nova Scotia',
].map((name, i) => ({ code: i + 1, name }))
const priorities = [1, 2, 3, 4].map((level) => ({
  level,
  label: `LVL ${level}`,
  emergency: level < 3,
  response_hours: level < 3 ? level * 2 : null,
  overtime_approved: level < 3,
}))
test('dispatch intake, filters and edits work on desktop and phone', async ({
  page,
}) => {
  const errors: string[] = []
  page.on('pageerror', (e) => errors.push(e.message))
  const token = [
    { alg: 'HS256', typ: 'JWT' },
    { sub: user, exp: Math.floor(Date.now() / 1000) + 3600 },
    'signature',
  ]
    .map((v) =>
      typeof v === 'string'
        ? v
        : Buffer.from(JSON.stringify(v)).toString('base64url'),
    )
    .join('.')
  // Set the fixture session after the initial server request. Only browser auth
  // is mocked; no fake token is sent to the real middleware's auth backend.
  const session =
    'base64-' +
    Buffer.from(
      JSON.stringify({
        access_token: token,
        refresh_token: 'fixture',
        expires_at: Math.floor(Date.now() / 1000) + 3600,
        expires_in: 3600,
        token_type: 'bearer',
        user: { id: user },
      }),
    ).toString('base64url')
  await page.addInitScript((value) => {
    document.cookie = `sb-example-auth-token=${value}; path=/`
  }, session)
  await page.route('https://example.supabase.co/**', (r) =>
    r.fulfill({
      json: r.request().url().includes('/auth/')
        ? { id: user, email: 'fixture@example.com' }
        : { id: user, name: 'Dispatcher', role: 'manager', status: 'active' },
    }),
  )
  await page.route('**/api/users', (r) => r.fulfill({ json: [] }))
  await page.route('**/api/dispatch/context*', (r) =>
    r.fulfill({
      json: {
        memberships: [
          {
            company_id: company,
            role: 'admin',
            companies: { name: 'Major Refrigeration' },
          },
        ],
        zones,
        priorities,
        technicians: [
          { user_id: technician, display_name: 'Fixture Technician' },
        ],
      },
    }),
  )
  let saved: any = null
  await page.route('**/api/dispatch/jobs*', async (r) => {
    if (r.request().method() === 'POST') {
      saved = {
        ...r.request().postDataJSON(),
        id: '30000000-0000-4000-8000-000000000001',
        company_id: company,
        version: 1,
        created_at: new Date().toISOString(),
        overtime_status: 'approved',
      }
      return r.fulfill({ status: 201, json: saved })
    }
    const trade = new URL(r.request().url()).searchParams.get('trade')
    return r.fulfill({
      json: {
        jobs: saved && (!trade || trade === saved.trade) ? [saved] : [],
        total: saved && (!trade || trade === saved.trade) ? 1 : 0,
      },
    })
  })
  await page.goto('/dispatch')
  await page.getByRole('button', { name: 'New call' }).click()
  const dialog = page.getByRole('dialog')
  await dialog.getByLabel('Store name').fill('Fixture supermarket')
  await dialog.getByLabel('Store number').fill('42')
  await dialog.getByLabel('Address').fill('123 Test Road')
  await dialog.getByLabel('Reason for call').fill('Freezer case warming')
  await dialog.getByLabel('Simpro reference').fill('SIM-42')
  await dialog.getByLabel('Customer work order').fill('CUSTOMER-17')
  await dialog.getByLabel('Technician').selectOption(technician)
  await dialog.getByLabel('Priority').selectOption('1')
  await expect(dialog.getByLabel('Overtime')).toHaveValue('approved')
  await expect(dialog.getByLabel('Overtime')).toBeDisabled()
  await dialog.getByRole('button', { name: 'Save call' }).click()
  await expect(dialog).toBeHidden()
  await expect(
    page.getByRole('heading', { name: 'Fixture supermarket · #42' }),
  ).toBeVisible()
  await expect(page.getByRole('article')).toContainText('CUSTOMER-17')
  await expect(page.getByRole('article')).toContainText('Fixture Technician')
  await page.getByLabel('Trade').selectOption('HVAC')
  await expect(page.getByText('No calls match these filters.')).toBeVisible()
  await page.getByLabel('Trade').selectOption('Refrigeration')
  await page.getByRole('button', { name: 'Edit', exact: true }).click()
  await expect(dialog.getByLabel('Customer work order')).toHaveValue(
    'CUSTOMER-17',
  )
  await dialog.getByLabel('Priority').selectOption('3')
  await expect(dialog.getByLabel('Overtime')).toHaveValue('not_requested')
  await dialog.getByRole('button', { name: 'Cancel', exact: true }).click()
  await page.screenshot({
    path: `/tmp/dispatch-${test.info().project.name}.png`,
    fullPage: true,
  })
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth,
    ),
  ).toBe(false)
  expect(errors).toEqual([])
})
