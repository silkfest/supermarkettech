import { test, expect } from '@playwright/test'

const save = () =>
  localStorage.setItem(
    'coldcall_save',
    JSON.stringify({
      character: { name: 'Ben', color: '#2563eb', role: 'apprentice' },
      progress: { version: 1, lessons: {}, levels: {}, xp: 0, hours: 0 }
    })
  )

test('the RL sheet steps electric defrost, where the fans return at termination', async ({
  page
}) => {
  const errors: string[] = []
  page.on('pageerror', (e) => errors.push(e.message))
  await page.route('**/api/game/progress', (r) => r.fulfill({ json: null }))
  await page.addInitScript(save)

  await page.goto('/game')
  await page.getByRole('button', { name: 'M1 field practice' }).click()
  await expect(page.getByTestId('oblique-scene')).toBeVisible()
  await page.getByRole('button', { name: 'Store overview', exact: true }).click()
  await page.getByRole('button', { name: 'Follow technician', exact: true }).click()
  await page.getByRole('button', { name: 'Walk', exact: true }).first().click()
  await page.getByRole('heading', { name: 'WO #38614 — Meat multideck' }).waitFor()

  await page
    .getByRole('button', { name: /what has to close before a fan turns/i })
    .click()
  const sheet = page.getByRole('region', {
    name: 'Hussmann RL wiring diagram trainer'
  })
  await expect(sheet).toContainText('Electric defrost (standard)')
  await expect(sheet).toContainText('P/N 0425644_P')

  // Tapping a device explains it, and names the terminals it lands on.
  await sheet.getByText('Evaporator Fans', { exact: true }).first().click()
  await expect(sheet).toContainText('Evaporator fans')
  await expect(sheet).toContainText('terminals 14, 26')
  await expect(sheet).toContainText('bottom shelf')

  await sheet.getByRole('button', { name: 'Sequence', exact: true }).click()
  await expect(sheet).toContainText('Refrigerating')
  await expect(sheet.getByText('fans running')).toBeVisible()

  await sheet.getByRole('button', { name: 'Next' }).click()
  await expect(sheet).toContainText('Defrost starts')
  await expect(sheet.getByText('fans off')).toBeVisible()

  for (let i = 0; i < 3; i++) await sheet.getByRole('button', { name: 'Next' }).click()
  // Step 5 is the one the sheet spells out and the one that is easy to get
  // backwards: termination drops the contactor and the fans come straight back.
  await expect(sheet).toContainText('Termination')
  await expect(sheet.getByText('fans running')).toBeVisible()
  await expect(sheet).toContainText('no fan delay on an electric case')

  await sheet.getByRole('button', { name: 'Next' }).click()
  await expect(sheet).toContainText('20 °F')
  await expect(sheet.getByText('fans running')).toBeVisible()
  await expect(sheet.getByRole('button', { name: 'Restart' })).toBeVisible()

  expect(errors).toEqual([])
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)
  ).toBe(false)
})

test('the gas defrost variant is the one that holds the fans out to 20 °F', async ({
  page
}) => {
  const errors: string[] = []
  page.on('pageerror', (e) => errors.push(e.message))
  await page.route('**/api/game/progress', (r) => r.fulfill({ json: null }))
  await page.addInitScript(save)

  await page.goto('/game')
  await page.getByRole('button', { name: 'TRADE SCHOOL', exact: true }).first().click()
  await page.getByRole('button', { name: 'Go in', exact: true }).first().click()
  const walk = page.getByRole('button', { name: 'Walk', exact: true })
  const card = page
    .locator('div')
    .filter({ hasText: /^Defrost and case controls/ })
    .filter({ has: walk })
    .last()
  await card.getByRole('button', { name: 'Walk', exact: true }).click()
  await page
    .getByRole('heading', { name: 'Defrost and case controls' })
    .waitFor({ timeout: 20000 })

  const sheet = page.getByRole('region', {
    name: 'Hussmann RL wiring diagram trainer'
  })
  await expect(sheet).toBeVisible()

  await sheet.getByRole('button', { name: 'Gas defrost (optional)' }).click()
  await sheet.getByRole('button', { name: 'Sequence', exact: true }).click()
  // Four steps in, the timer has ended defrost and the fans are STILL out.
  for (let i = 0; i < 3; i++) await sheet.getByRole('button', { name: 'Next' }).click()
  await expect(sheet).toContainText('Timer ends defrost')
  await expect(sheet.getByText('fans off')).toBeVisible()
  await sheet.getByRole('button', { name: 'Next' }).click()
  await expect(sheet).toContainText('fans and heaters return together')
  await expect(sheet.getByText('fans running')).toBeVisible()

  // The raceway strip and the published table are both on the sheet.
  await sheet.getByRole('button', { name: 'Terminals', exact: true }).click()
  await expect(sheet).toContainText('Defrost heaters (208 V)')
  await expect(sheet).toContainText('NOT for case-to-case wire connection')
  await sheet.getByRole('button', { name: 'Electrical data' }).click()
  await sheet.getByRole('button', { name: '5 door' }).click()
  await expect(sheet).toContainText('1.50')
  await expect(sheet).toContainText('16.82')

  expect(errors).toEqual([])
})
