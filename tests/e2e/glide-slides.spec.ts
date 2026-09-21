import { test, expect } from '@playwright/test'

test('the dew/bubble deck opens in the rack call and pages', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', (e) => errors.push(e.message))
  await page.route('**/api/game/progress', (r) => r.fulfill({ json: null }))
  await page.addInitScript(() =>
    localStorage.setItem(
      'coldcall_save',
      JSON.stringify({
        character: { name: 'Ben', color: '#2563eb', role: 'apprentice' },
        progress: { version: 1, lessons: {}, levels: {}, xp: 0, hours: 0 }
      })
    )
  )
  await page.goto('/game')
  await page.getByRole('button', { name: 'Rack field practice' }).click()
  await expect(page.getByTestId('oblique-scene')).toBeVisible()
  await page.getByRole('button', { name: 'Store overview', exact: true }).click()
  await page.getByRole('button', { name: 'Follow technician', exact: true }).click()
  await page.getByRole('button', { name: 'Walk', exact: true }).first().click()
  await page.getByRole('heading', { name: 'WO #38702 — Rack A, medium temp' }).waitFor()

  await page.getByRole('button', { name: /dew vs bubble, and why it matters/i }).click()
  const deck = page.getByRole('region', { name: 'Dew point versus bubble point' })
  await expect(deck).toContainText('One pressure, two temperatures')
  await expect(deck.getByRole('button', { name: 'Back' })).toBeDisabled()
  await deck.getByRole('button', { name: 'Next' }).click()
  await expect(deck).toContainText('Superheat is measured against the DEW point')
  await deck.getByRole('button', { name: 'Next' }).click()
  // The glide table is the slide that makes the size of the error concrete.
  await expect(deck).toContainText('11.2 °F')
  await deck.getByRole('button', { name: 'Next' }).click()
  await expect(deck).toContainText('reads 39.5 °F')
  await deck.getByRole('button', { name: 'Next' }).click()
  await expect(deck.getByRole('button', { name: 'Next' })).toBeDisabled()
  await deck.getByRole('button', { name: 'Close the dew versus bubble slides' }).click()
  await expect(deck).toBeHidden()
  expect(errors).toEqual([])
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)
  ).toBe(false)
})
