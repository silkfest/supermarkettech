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

  const button = (name: string) =>
    page.getByRole('button', { name, exact: true })
  const area = async (name: string) => {
    await button('inspect').click()
    await page.getByRole('button', { name, exact: true }).first().click()
  }
  const tool = async (name: string) =>
    page.getByRole('toolbar').getByRole('button', { name, exact: true }).click()
  const record = async () => {
    await button('evidence').click()
    while (await button('Record evidence').count())
      await button('Record evidence').first().click()
    await button('inspect').click()
  }
  const read = async (mode: string) => {
    await page.getByLabel('Instrument function').selectOption(mode)
    const box = page
      .locator('.border-amber-400')
      .filter({
        has: page.getByRole('button', { name: 'Read instrument', exact: true })
      })
      .last()
    const leads = box
      .getByRole('button')
      .filter({ hasText: /^(Red lead:|Black lead:|Position around:|Close:)/ })
    for (let i = 0; i < (await leads.count()); i++) await leads.nth(i).click()
    await button('Read instrument').click()
  }
  await area('Evaporator')
  await tool('Flashlight')
  await button('Use flashlight on selected area').click()
  await record()
  await button('Back to supermarket').click()
  await page
    .getByRole('button', { name: 'Resume', exact: true })
    .first()
    .click()
  await button('evidence').click()
  await expect(page.getByText('Recorded ✓')).toBeVisible()
  await button('inspect').click()
  await area('Defrost circuit')
  await tool('Hand tools')
  await button('Remove service cover').click()
  await area('Controller')
  await tool('Controller')
  await button('Use interface on selected area').click()
  await button('Request manual defrost').click()
  await area('Defrost circuit')
  await tool('Clamp meter')
  await button('Feeder clamp position').click()
  await read('amps')
  await record()
  await button('Wait 10 min').click()
  await area('Evaporator')
  await tool('Flashlight')
  await button('Use flashlight on selected area').click()
  await record()
  await area('Defrost circuit')
  await tool('Hand tools')
  await button('Secure heater disconnect OFF').click()
  await tool('Multimeter')
  await button('Voltage test points').click()
  await read('volts')
  await tool('Hand tools')
  await button('Disconnect element leads').click()
  await area('Defrost heaters')
  await tool('Multimeter')
  for (let i = 1; i <= 3; i++) {
    await button('H' + i + ' terminals').click()
    await read('ohms')
  }
  await record()
  await button('diagnosis').click()
  await page.getByLabel('Diagnosis system').selectOption('Defrost')
  await page.getByLabel('Diagnosis component').selectOption('Electric heaters')
  await page.getByLabel('Diagnosis failure').selectOption('Heater #3 open')
  await button('Submit diagnosis').click()
  await area('Defrost heaters')
  await tool('Hand tools')
  await button('Replace H3 · $140').click()
  await button('Reconnect / secure covers / restore').click()
  await area('Controller')
  await tool('Controller')
  await button('Request manual defrost').click()
  await area('Defrost circuit')
  await tool('Hand tools')
  await button('Remove service cover').click()
  await tool('Clamp meter')
  await button('Feeder clamp position').click()
  await read('amps')
  await record()
  await button('Wait 10 min').click()
  await area('Evaporator')
  await tool('Flashlight')
  await button('Use flashlight on selected area').click()
  await area('Controller')
  await tool('Controller')
  await button('Use interface on selected area').click()
  await record()
  await button('Wait 10 min').click()
  await button('Wait 10 min').click()
  await button('Wait 10 min').click()
  await area('Glass doors / product')
  await tool('Temp probe')
  await button('Position temperature probe').click()
  await button('Place probe and sample').click()
  await record()
  await area('Defrost circuit')
  await tool('Hand tools')
  await button('Secure service cover').click()
  await button('report').click()
  await button('Confirm verified operation').click()
  await page
    .getByLabel('Service report')
    .fill(
      'Found H3 open with missing heater load and uneven frost. Replaced H3 only. Verified full current, normal termination, clear coil and product pull-down.'
    )
  await button('Complete report and view debrief').click()
  await page
    .getByRole('heading', { name: 'Service debrief · 100/100' })
    .waitFor()
  expect(errors).toEqual([])
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth
    )
  ).toBe(false)
  await button('Back to supermarket').click()
  await button('End shift').click()
  await expect(
    page.getByText('+0 h on the book', { exact: false })
  ).toBeVisible()
  const saved = await page.evaluate(() =>
    JSON.parse(localStorage.getItem('coldcall_save')!)
  )
  expect(saved.progress.hours).toBe(0)
  expect(saved.progress.xp).toBe(0)
})
