import { test, expect } from '@playwright/test'

const save = () =>
  localStorage.setItem(
    'coldcall_save',
    JSON.stringify({
      character: { name: 'Ben', color: '#2563eb', role: 'apprentice' },
      progress: { version: 1, lessons: {}, levels: {}, xp: 0, hours: 0 }
    })
  )

test('the RL sheet opens in the fan call and answers what holds a fan out', async ({
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
  await expect(sheet).toContainText('Two circuits, four thermostats, two relays')

  // Tapping a load explains it rather than just highlighting it.
  await sheet.getByText('Fans', { exact: true }).click()
  await expect(sheet).toContainText('Evaporator fan assemblies')
  await expect(sheet).toContainText('each fan is plugged')

  // The sequence is the part that decides whether a motor is dead or waiting.
  await sheet.getByRole('button', { name: 'Defrost sequence' }).click()
  await expect(sheet).toContainText('Refrigerating')
  await expect(sheet.getByText('fans running')).toBeVisible()
  await expect(sheet.getByRole('button', { name: 'Back' })).toBeDisabled()

  await sheet.getByRole('button', { name: 'Next' }).click()
  await expect(sheet).toContainText('Defrost starts')
  await expect(sheet.getByText('fans off')).toBeVisible()

  for (let i = 0; i < 3; i++) await sheet.getByRole('button', { name: 'Next' }).click()
  // Step 5: the heat has stopped and the fans are still out. This is the
  // window in which a good motor gets condemned.
  await expect(sheet).toContainText('Termination')
  await expect(sheet.getByText('fans off')).toBeVisible()

  await sheet.getByRole('button', { name: 'Next' }).click()
  await expect(sheet).toContainText('Fan delay')
  await expect(sheet.getByText('fans running')).toBeVisible()
  await expect(sheet.getByRole('button', { name: 'Restart' })).toBeVisible()

  // The published table, and the per-door figure behind the nameplate.
  await sheet.getByRole('button', { name: 'Electrical data' }).click()
  await sheet.getByRole('button', { name: '5 door' }).click()
  await expect(sheet).toContainText('1.50')
  await expect(sheet).toContainText('16.82')
  await sheet.getByRole('button', { name: '3 door' }).click()
  await expect(sheet).toContainText('0.90')

  await sheet.getByRole('button', { name: 'Close the RL wiring diagram' }).click()
  await expect(sheet).toBeHidden()
  expect(errors).toEqual([])
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)
  ).toBe(false)
})

test('the same sheet is in the classroom on the controls station', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', (e) => errors.push(e.message))
  await page.route('**/api/game/progress', (r) => r.fulfill({ json: null }))
  await page.addInitScript(save)

  await page.goto('/game')
  await page.getByRole('button', { name: 'TRADE SCHOOL', exact: true }).first().click()
  await page.getByRole('button', { name: 'Go in', exact: true }).first().click()

  // Find the controls station by its lesson, not by its position on the map.
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
  await expect(sheet).toContainText('Two circuits, four thermostats, two relays')
  // The station teaches the thresholds the diagram encodes.
  await expect(page.getByText(/relay control thermostat energises/i).first()).toBeVisible()
  expect(errors).toEqual([])
})
