import { test, expect } from '@playwright/test'

test('F1 physical workflow completes without changing practice progression', async ({
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
  await page.getByRole('button', { name: 'F1 field practice' }).click()
  await page.getByRole('button', { name: 'Walk', exact: true }).first().click()
  await page.getByRole('heading', { name: 'WO #38471 — Frozen Food' }).waitFor()

  const nav = page.getByRole('navigation', { name: 'Inspection pages' })
  const tab = (name: string) => nav.getByRole('button', { name })
  /** Actions are labelled by what they do; the tool rides along as a badge. */
  const act = (name: string) => page.getByRole('button', { name })
  /** Pick a spot on the case to work at. */
  const area = async (name: string) => {
    await tab('Work').click()
    await page.getByRole('button', { name, exact: true }).first().click()
  }
  /** Meter: choose the function, the leads land on the labelled points, read. */
  const read = async (fn: 'Voltage' | 'Resistance' | 'Clamp current') => {
    const box = page.locator('.border-amber-400').last()
    await box.getByRole('radio', { name: fn }).click()
    await box.getByRole('button', { name: 'Read it' }).click()
  }
  const probe = async () => {
    const box = page.locator('.border-amber-400').last()
    await box.getByRole('button', { name: 'Read it' }).click()
  }

  await area('Evaporator')
  await act('Inspect the evaporator coil').click()

  // Findings are booked as they are made — reopening the call keeps them.
  const notebook = page.getByRole('region', { name: 'Service notebook' })
  await tab('Notebook').click()
  await expect(notebook.getByText('Coil frost', { exact: true })).toBeVisible()
  await page.reload()
  await expect(page.getByText('Full Supermarket · F1 practice', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Walk', exact: true }).first().click()
  await act('Back to supermarket').click()
  await page.getByRole('button', { name: 'Resume', exact: true }).first().click()
  await tab('Notebook').click()
  await expect(notebook.getByText('Coil frost', { exact: true })).toBeVisible()

  await area('Defrost circuit')
  await act('Remove the service cover').click()
  await area('Controller')
  await act('Read the controller and its history').click()
  await act('Request a manual defrost').click()
  await area('Defrost circuit')
  await act('Clamp the heater feeder').click()
  await read('Clamp current')
  await act('Wait 10 min').click()
  await area('Evaporator')
  await act('Inspect the evaporator coil').click()

  await area('Defrost circuit')
  await act('Secure the heater disconnect OFF').click()
  await act('Prove the circuit dead').click()
  await read('Voltage')
  await act('Disconnect one lead per element').click()
  await area('Defrost heaters')
  for (const n of [1, 2, 3]) {
    await act(`Ohm heater ${n} across its terminals`).click()
    await read('Resistance')
  }

  await tab('Diagnose').click()
  await page.getByRole('radio', { name: 'Defrost', exact: true }).click()
  await page.getByRole('radio', { name: 'Electric heaters' }).click()
  await page.getByRole('radio', { name: 'Heater #3 open' }).click()
  await act('Call it: Heater #3 open').click()

  await area('Defrost heaters')
  await act('Replace heater 3').click()
  await act('Reconnect, secure covers and restore').click()
  await area('Controller')
  await act('Request a manual defrost').click()
  await area('Defrost circuit')
  await act('Remove the service cover').click()
  await act('Clamp the heater feeder').click()
  await read('Clamp current')
  await act('Wait 10 min').click()
  await area('Evaporator')
  await act('Inspect the evaporator coil').click()
  await area('Controller')
  await act('Read the controller and its history').click()
  await act('Wait 10 min').click()
  await act('Wait 10 min').click()
  await act('Wait 10 min').click()
  await area('Glass doors / product')
  await act('Probe between the product packs').click()
  await probe()
  await area('Defrost circuit')
  await act('Secure the service cover').click()

  await tab('Report').click()
  await act('Confirm verified operation').click()
  // The report builds from what was actually found, without a phone keyboard.
  for (const chip of ['+ Found', '+ Measured', '+ Repaired', '+ Verified'])
    await page.getByRole('button', { name: chip, exact: true }).click()
  await expect(page.getByLabel('Service report')).toHaveValue(
    /Heater #3 open[\s\S]*Replaced Heater #3[\s\S]*Verified/
  )
  await act('Complete report and view debrief').click()
  await expect(page.getByRole('heading', { name: 'Shift over, Ben.' })).toBeVisible()
  await page.getByText('Diagnostic debrief', { exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Service debrief · 100/100' })).toBeVisible()
  expect(errors).toEqual([])
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth
    )
  ).toBe(false)
  // Practice ends automatically after its one work order.
  await expect(
    page.getByText('+0 h on the book', { exact: false })
  ).toBeVisible()
  const saved = await page.evaluate(() =>
    JSON.parse(localStorage.getItem('coldcall_save')!)
  )
  expect(saved.progress.hours).toBe(0)
  expect(saved.progress.xp).toBe(0)
})

test('the supermarket work list ends the shift, not the clock', async ({
  page
}) => {
  await page.route('**/api/game/progress', (r) => r.fulfill({ json: null }))
  await page.addInitScript(() =>
    localStorage.setItem(
      'coldcall_save',
      JSON.stringify({
        character: { name: 'Ben', color: '#2563eb', role: 'apprentice' },
        progress: {
          version: 1,
          lessons: {},
          levels: { 'gas-station': { shifts: 3, bestScore: 150, bestGrade: 'B' } },
          xp: 400,
          hours: 40
        }
      })
    )
  )
  await page.goto('/game')
  await page.getByRole('button', { name: /Job list/ }).click()
  // The cards advertise a work list rather than a shift length.
  const card = (name: string) => page.getByRole('button').filter({ hasText: name })
  await expect(card('Full Supermarket')).toContainText('10 calls, then you are done')
  await expect(card('Corner Gas Station')).toContainText('5 calls, then you are done')
  // Neither of the two converted levels advertises a clock any more; the deeper
  // stores are untouched and still run a timed shift.
  await expect(card('Full Supermarket')).not.toContainText('h shift')
  await expect(card('Corner Gas Station')).not.toContainText('h shift')
  await expect(card('Lakeshore Market')).toContainText('8 h shift')
  await card('Full Supermarket').click()
  await page.getByRole('button', { name: 'End shift', exact: true }).click()
  await expect(page.getByText('+0 h on the book', { exact: false })).toBeVisible()
  await expect(page.getByText('0 pts of 1000 possible', { exact: false })).toBeVisible()
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('coldcall_save')!))
  expect(saved.progress.hours).toBe(40)
  expect(saved.progress.levels.supermarket).toBeUndefined()
})
