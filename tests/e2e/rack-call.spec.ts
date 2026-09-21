import { test, expect } from '@playwright/test'

test('rack drier call plays through to a verified repair', async ({ page }) => {
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

  const nav = page.getByRole('navigation', { name: 'Inspection pages' })
  const tab = (name: string) => nav.getByRole('button', { name })
  const act = (name: string) => page.getByRole('button', { name })
  const area = async (name: string) => {
    await tab('Work').click()
    await page.getByRole('button', { name, exact: true }).first().click()
  }
  /** Manifold: pick the port, the hose lands on the labelled valve, read. */
  const gauge = async (port: 'Low side' | 'High side') => {
    const box = page.locator('.border-amber-400').last()
    await box.getByRole('radio', { name: port }).click()
    await box.getByRole('button', { name: 'Read it' }).click()
  }
  const probe = async () => {
    const box = page.locator('.border-amber-400').last()
    await box.getByRole('button', { name: 'Read it' }).click()
  }

  // Subcooling first: it is what rules out the top-up the last tech reached for.
  await area('Receiver / sight glass')
  await act('Inspect the receiver and sight glass').click()
  await act('Liquid pressure at the receiver outlet').click()
  await gauge('High side')
  await expect(
    page.getByText(/psig — 94 °F saturated \(R-448A\)/).first()
  ).toBeVisible()
  await act('Liquid line temperature at the drier inlet').click()
  await probe()

  await area('Liquid line drier')
  await act('Inspect the liquid line drier').click()
  await act('Liquid line temperature at the drier outlet').click()
  await probe()

  await area('A case on the header')
  await act('Suction pressure at the rack').click()
  await gauge('Low side')
  await act('Suction line temperature at the case').click()
  await probe()

  await tab('Diagnose').click()
  await page.getByRole('radio', { name: 'Refrigeration', exact: true }).click()
  await page.getByRole('radio', { name: 'Liquid line drier' }).click()
  await page.getByRole('radio', { name: 'Restricted — flashing across it' }).click()
  await act('Call it: Restricted — flashing across it').click()

  await area('Liquid line drier')
  await act('Front-seat and pump the section down').click()
  await act('Confirm the section is at 0 psig').click()
  await gauge('Low side')
  await act('Change the drier cores · $190').click()
  await act('Open the valves and restore the section').click()
  for (let i = 0; i < 4; i++) await act('Wait 10 min').click()

  await act('Liquid line temperature at the drier inlet').click()
  await probe()
  await act('Liquid line temperature at the drier outlet').click()
  await probe()
  await area('Receiver / sight glass')
  await act('Inspect the receiver and sight glass').click()
  await area('A case on the header')
  await act('Suction pressure at the rack').click()
  await gauge('Low side')
  await act('Suction line temperature at the case').click()
  await probe()
  await act('Probe product in a warm case').click()
  await probe()

  await tab('Report').click()
  await act('Confirm verified operation').click()
  for (const chip of ['+ Found', '+ Repaired', '+ Verified'])
    await page.getByRole('button', { name: chip, exact: true }).click()
  await expect(page.getByLabel('Service report')).toHaveValue(
    /Restricted[\s\S]*drier cores[\s\S]*Verified/
  )
  await act('Complete report and view debrief').click()
  await expect(page.getByRole('heading', { name: 'Shift over, Ben.' })).toBeVisible()
  expect(errors).toEqual([])
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)
  ).toBe(false)
})
