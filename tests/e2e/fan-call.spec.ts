import { test, expect } from '@playwright/test'

test('M1 evaporator-fan call plays through to a verified repair', async ({
  page
}) => {
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
  await page.getByRole('button', { name: 'M1 field practice' }).click()
  await expect(page.getByTestId('oblique-scene')).toBeVisible()
  await page.getByRole('button', { name: 'Store overview', exact: true }).click()
  await page.getByRole('button', { name: 'Follow technician', exact: true }).click()
  await page.getByRole('button', { name: 'Walk', exact: true }).first().click()
  await page.getByRole('heading', { name: 'WO #38614 — Meat multideck' }).waitFor()

  const nav = page.getByRole('navigation', { name: 'Inspection pages' })
  const tab = (name: string) => nav.getByRole('button', { name })
  const act = (name: string | RegExp) => page.getByRole('button', { name })
  const area = async (name: string) => {
    await tab('Work').click()
    await page.getByRole('button', { name, exact: true }).first().click()
  }
  const read = async (fn: 'Voltage' | 'Resistance' | 'Clamp current') => {
    const box = page.locator('.border-amber-400').last()
    await box.getByRole('radio', { name: fn }).click()
    await box.getByRole('button', { name: 'Read it' }).click()
  }
  const probe = async () => {
    const box = page.locator('.border-amber-400').last()
    await box.getByRole('button', { name: 'Read it' }).click()
  }

  // The stopped fan is findable by eye before any meter comes out.
  await area('Evaporator fans')
  await act('Look at each fan in the bank').click()
  await tab('Notebook').click()
  await expect(
    page.getByRole('region', { name: 'Service notebook' })
  ).toContainText('return-end fan is stopped')

  // Access is a cleared shelf and a grille, not a stripped case.
  await area('Evaporator fans')
  await act('Clear the bottom shelf and lift the grille').click()
  await act('Clamp the fan circuit conductor').click()
  await read('Clamp current')
  await expect(
    page.getByText('0.8 A against 1.2 A nameplate').first()
  ).toBeVisible()

  // Unplugging that one fan is what makes it safe to work on and what turns
  // the plug into a place you can read supply voltage.
  await act('Unplug the stopped fan').click()
  await act('Voltage at the unplugged fan\u2019s plug').click()
  await read('Voltage')
  await expect(page.getByText(/118 V on the supply half/).first()).toBeVisible()
  await act('Ohm the motor across its own plug').click()
  await read('Resistance')

  await tab('Diagnose').click()
  await page.getByRole('radio', { name: 'Electrical', exact: true }).click()
  await page.getByRole('radio', { name: 'Evaporator fans' }).click()
  await page.getByRole('radio', { name: /Motor open/ }).click()
  await act(/Call it: Motor open/).click()

  await area('Evaporator fans')
  await act(/Swap the motor and plug it in/).click()
  await act('Plug the fan back in').click()
  for (let i = 0; i < 6; i++) await act('Wait 10 min').click()

  await act('Clamp the fan circuit conductor').click()
  await read('Clamp current')
  await expect(
    page.getByText(/1\.2 A against 1\.2 A nameplate/).first()
  ).toBeVisible()

  await area('Product / air curtain')
  await act('Read the discharge air at the return end').click()
  await probe()
  await act('Insert probe into product at the warm end').click()
  await probe()
  await area('Evaporator')
  await act('Inspect the evaporator coil').click()
  await area('Evaporator fans')
  await act('Refit the grille and restock the shelf').click()

  await tab('Report').click()
  await act('Confirm verified operation').click()
  for (const chip of ['+ Found', '+ Measured', '+ Repaired', '+ Verified'])
    await page.getByRole('button', { name: chip, exact: true }).click()
  await expect(page.getByLabel('Service report')).toHaveValue(
    /Motor open[\s\S]*Replaced fan motor #3[\s\S]*Verified/
  )
  await act('Complete report and view debrief').click()
  await expect(page.getByRole('heading', { name: 'Shift over, Ben.' })).toBeVisible()
  expect(errors).toEqual([])
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth
    )
  ).toBe(false)
})
