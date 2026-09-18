import { test, expect } from '@playwright/test'
import { readFileSync } from 'node:fs'
const src = readFileSync('lib/game/lessons.ts', 'utf8')
const lessons = Object.fromEntries(src.split(/\n  \{\n    id: '/).slice(1)
  .map((b) => b.slice(0, b.indexOf("'"))).map((id) => [id, { passed: true, bestScore: 100 }]))

test('stuck state now names the action', async ({ page }, testInfo) => {
  const errors: string[] = []
  page.on('pageerror', (e) => errors.push(e.message))
  await page.route('**/api/game/progress', (r) => r.fulfill({ json: null }))
  await page.addInitScript(() => localStorage.setItem('coldcall_save', JSON.stringify({
    character: { name: 'Ben', color: '#2563eb', role: 'apprentice' },
    progress: { version: 1, lessons: {}, levels: {}, xp: 0, hours: 0 }
  })))
  await page.goto('/game')
  await page.getByRole('button', { name: 'F1 field practice' }).click()
  await page.getByRole('button', { name: 'Walk', exact: true }).first().click()
  await page.getByRole('heading', { name: 'WO #38471 — Frozen Food' }).waitFor()
  const act = (n: string) => page.getByRole('button', { name: n })
  // Ben's exact route: defrost + clamp, no second look at the coil.
  await page.getByRole('button', { name: 'Defrost circuit', exact: true }).first().click()
  await act('Remove the service cover').click()
  await page.getByRole('button', { name: 'Controller', exact: true }).first().click()
  await act('Request a manual defrost').click()
  await page.getByRole('button', { name: 'Defrost circuit', exact: true }).first().click()
  await act('Clamp the heater feeder').click()
  const box = page.locator('.border-amber-400').last()
  await box.getByRole('radio', { name: 'Clamp current' }).click()
  await box.getByRole('button', { name: 'Read it' }).click()
  await act('Wait 10 min').click()
  const next = page.getByRole('region', { name: 'Next step' })
  await expect(next).toContainText(/inspect the evaporator coil/i)
  await page.screenshot({ path: testInfo.outputPath('help-1-next.png') })
  // Stuck? ladders, and Take me there jumps to the right area.
  await next.getByRole('button', { name: /Stuck/ }).click()
  await next.getByRole('button', { name: /More help/ }).click()
  await next.getByRole('button', { name: /More help/ }).click()
  await page.screenshot({ path: testInfo.outputPath('help-2-hints.png') })
  await next.getByRole('button', { name: /Take me there/ }).click()
  await expect(act('Inspect the evaporator coil')).toBeVisible()
  await act('Inspect the evaporator coil').click()
  await expect(next).not.toContainText(/inspect the evaporator coil/i)
  await page.screenshot({ path: testInfo.outputPath('help-3-cleared.png') })
  expect(errors).toEqual([])
})

test('gas station opens the walkthrough on a first shift', async ({ page }, testInfo) => {
  const errors: string[] = []
  page.on('pageerror', (e) => errors.push(e.message))
  await page.route('**/api/game/progress', (r) => r.fulfill({ json: null }))
  await page.addInitScript((l) => localStorage.setItem('coldcall_save', JSON.stringify({
    character: { name: 'Ben', color: '#2563eb', role: 'apprentice' },
    progress: { version: 1, lessons: l, levels: {}, xp: 500, hours: 100 }
  })), lessons)
  await page.goto('/game')
  await page.waitForTimeout(1000)
  await page.getByRole('button', { name: /CORNER GAS/i }).first().click()
  await page.waitForTimeout(1500)
  const clock = page.getByRole('button', { name: /^Clock in/ })
  if (await clock.count()) { await clock.first().click(); await page.waitForTimeout(2000) }
  await page.getByRole('button', { name: 'Walk', exact: true }).first().click()
  await page.getByRole('button', { name: /Start diagnosing/ }).waitFor({ timeout: 30000 })
  const coach = page.getByRole('region', { name: 'How this step works' })
  await expect(coach).toBeVisible()
  await page.screenshot({ path: testInfo.outputPath('help-4-gas-ticket.png') })
  await page.getByRole('button', { name: /Start diagnosing/ }).click()
  await page.waitForTimeout(500)
  await expect(coach).toContainText(/Readings first/)
  await coach.getByRole('button', { name: /nudge/i }).click()
  await page.screenshot({ path: testInfo.outputPath('help-5-gas-diagnose.png') })
  expect(errors).toEqual([])
})

test('a manual defrost holds until you end it', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', (e) => errors.push(e.message))
  await page.route('**/api/game/progress', (r) => r.fulfill({ json: null }))
  await page.addInitScript(() => localStorage.setItem('coldcall_save', JSON.stringify({
    character: { name: 'Ben', color: '#2563eb', role: 'apprentice' },
    progress: { version: 1, lessons: {}, levels: {}, xp: 0, hours: 0 }
  })))
  await page.goto('/game')
  await page.getByRole('button', { name: 'F1 field practice' }).click()
  await page.getByRole('button', { name: 'Walk', exact: true }).first().click()
  await page.getByRole('heading', { name: 'WO #38471 — Frozen Food' }).waitFor()
  const act = (n: string) => page.getByRole('button', { name: n })
  const area = async (n: string) => {
    await page.getByRole('navigation', { name: 'Inspection pages' }).getByRole('button', { name: 'Work' }).click()
    await page.getByRole('button', { name: n, exact: true }).first().click()
  }
  await area('Defrost circuit')
  await act('Remove the service cover').click()
  await area('Controller')
  await act('Request a manual defrost').click()
  // The button flips to ending it, and the status says it is yours to end.
  await expect(act('End the defrost')).toBeVisible()
  await expect(page.getByText('Defrost running — ends when you end it')).toBeVisible()
  // Burn far more shift time than the old 14-minute failsafe allowed.
  for (let i = 0; i < 5; i++) await act('Wait 10 min').click()
  await area('Defrost circuit')
  await act('Clamp the heater feeder').click()
  const box = page.locator('.border-amber-400').last()
  await box.getByRole('radio', { name: 'Clamp current' }).click()
  await box.getByRole('button', { name: 'Read it' }).click()
  // Still energised 50+ minutes later, so the reading is a real one.
  await expect(box.locator('output')).toContainText(/5\.[6-9] A during defrost/)
  await area('Controller')
  await expect(act('End the defrost')).toBeVisible()
  await act('End the defrost').click()
  await expect(act('Request a manual defrost')).toBeVisible()
  console.log('errors:', errors.length ? errors : 'none')
})
