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
  const act = (name: string) => page.getByRole('button', { name })
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

  await area('Fan circuit')
  await act('Open the fan compartment cover').click()
  await act('Clamp the fan circuit conductor').click()
  await read('Clamp current')
  // The value shows on the meter face and again on the feedback line.
  await expect(
    page.getByText('0.8 A against 1.2 A nameplate').first()
  ).toBeVisible()

  await act('Secure the fan disconnect OFF').click()
  await act('Prove the circuit dead').click()
  await read('Voltage')
  await act('Separate the motor leads').click()
  await area('Evaporator fans')
  for (const n of [1, 2, 3]) {
    await act(`Ohm fan motor ${n} winding`).click()
    await read('Resistance')
  }

  await tab('Diagnose').click()
  await page.getByRole('radio', { name: 'Electrical', exact: true }).click()
  await page.getByRole('radio', { name: 'Evaporator fans' }).click()
  await page.getByRole('radio', { name: 'Motor #3 open winding' }).click()
  await act('Call it: Motor #3 open winding').click()

  await area('Evaporator fans')
  await act('Replace fan motor 3 · $95').click()
  await act('Reconnect, secure covers and restore').click()
  for (let i = 0; i < 6; i++) await act('Wait 10 min').click()

  await area('Fan circuit')
  await act('Open the fan compartment cover').click()
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
  await area('Fan circuit')
  await act('Reconnect, secure covers and restore').click()

  await tab('Report').click()
  await act('Confirm verified operation').click()
  for (const chip of ['+ Found', '+ Measured', '+ Repaired', '+ Verified'])
    await page.getByRole('button', { name: chip, exact: true }).click()
  await expect(page.getByLabel('Service report')).toHaveValue(
    /Motor #3 open winding[\s\S]*Replaced fan motor #3[\s\S]*Verified/
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
