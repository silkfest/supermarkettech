const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const ts = require('typescript')
const Module = require('node:module')
const resolve = Module._resolveFilename
Module._resolveFilename = function (request, ...args) {
  return resolve.call(this, request.startsWith('@/') ? path.resolve(request.slice(2)) : request, ...args)
}
for (const extension of ['.ts', '.tsx']) require.extensions[extension] = (module, filename) => {
  module._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.ReactJSX }
  }).outputText, filename)
}

const { CO2_CHECKLIST, CO2_MACHINE_ROOM_ITEMS, CO2_REGIMES, CO2_BOTTLE_ITEM_ID, isCo2ItemInSeason } =
  require('../lib/maintenance/co2-checklist.ts')
const { buildReportDoc } = require('../lib/reports/doc.ts')

const section = (doc, title) => doc.sections.find(s => s.title === title)
const block = (doc, title, kind) => section(doc, title)?.blocks.find(b => b.kind === kind)

/* ── The checklist, against the paper form ────────────────────────────────── */

test('the checklist carries all 37 items, in the order they are printed', () => {
  // The numbers are not shown any more, but the order still matches the paper
  // so a tech reading down the sheet reads down the app.
  assert.equal(CO2_CHECKLIST.length, 37)
  CO2_CHECKLIST.forEach((item, i) => assert.equal(item.number, i + 1, `item at index ${i}`))
})

test('nothing renders the item numbers', () => {
  // They mean nothing once the list is ticked on a phone, and they crowd the
  // line on a narrow page.
  for (const file of ['app/maintenance/co2-pm/page.tsx', 'app/maintenance/report/[id]/page.tsx', 'lib/reports/doc.ts']) {
    const src = fs.readFileSync(file, 'utf8')
    assert.doesNotMatch(src, /\$\{i\.number\}\./, `${file} prints the number`)
    assert.doesNotMatch(src, /\{item\.number\}\./, `${file} prints the number`)
  }
})

test('every checklist id is unique', () => {
  // A duplicate id would make two items tick as one.
  const ids = [...CO2_CHECKLIST, ...CO2_MACHINE_ROOM_ITEMS].map(i => i.id)
  assert.equal(new Set(ids).size, ids.length)
})

test('the items the paper form words for CO₂ are the CO₂ wording, not the HFC form\'s', () => {
  const byNumber = n => CO2_CHECKLIST.find(i => i.number === n).label
  assert.match(byNumber(7), /OAT \+ gas cooler outlet temp sensors/)
  assert.match(byNumber(9), /flashtank/)
  assert.match(byNumber(10), /flashtank pressure – PC/)
  assert.match(byNumber(12), /MT > 18, LT > 36/)
  assert.match(byNumber(32), /around 80 psi/)
  assert.match(byNumber(37), /CO2 bottle inventory/)
})

test('the once-yearly oil filter item is a Fall item, and the rest are every PM', () => {
  const filters = CO2_CHECKLIST.find(i => i.number === 16)
  assert.deepEqual(filters.season, ['Fall'])
  assert.equal(isCo2ItemInSeason(filters, 'Fall'), true)
  assert.equal(isCo2ItemInSeason(filters, 'Summer'), false)
  // Before a season is picked the whole list shows: hiding items from a tech
  // who has not said which PM this is would silently shorten it.
  assert.equal(isCo2ItemInSeason(filters, ''), true)
  assert.equal(CO2_CHECKLIST.filter(i => i.season).length, 1)
})

test('the three temperature regimes are the ones the form splits every row by', () => {
  assert.deepEqual(CO2_REGIMES.map(r => r.key), ['LT', 'MT', 'DT'])
  assert.deepEqual(CO2_REGIMES.map(r => r.label), ['L/T', 'M/T', 'D/T'])
})

/* ── The report document ──────────────────────────────────────────────────── */

const REPORT = {
  store_name: 'Fortino’s Mall Rd',
  performed_at: '2026-10-14',
  pm_season: 'Fall',
  simpro_number: '81100',
  checklist: { co2_cleanMachineRoom: true, co2_leakCheckStore: true, co2_cleanSelfContained: false },
  notes: [{ id: 'n1', text: 'MT oil pot low', importance: 'IMPORTANT', assetId: 'OP-2', regime: 'MT', systemNumber: '4' }],
  photos: [],
  units: {
    technician: 'Ben Silk',
    storeAddress: '65 Mall Rd',
    rack: {
      rackManufacturer: 'Carnot', compressorManufacturer: 'Bitzer',
      chargeMT: '450 lb', chargeLT: '180 lb', compressorCount: 3,
      omcLevel: ['60', '55', '70', '', '', '', '', ''],
      oilPressReservoir: ['28', '', '32', '', '', '', '', ''],
      compAmps: ['12.1', '13.4', '28.9', '', '', '', '', ''],
      compVolts: ['575', '575', '575', '', '', '', '', ''],
      hpSetPoints: ['1450', '1450', '1450', '', '', '', '', ''],
      lpSetPoints: ['200', '200', '200', '', '', '', '', ''],
      ofcTripTime: ['90', '90', '90', '', '', '', '', ''],
      reservoirPercent: '60', oilLevelReservoir: 'Mid sight glass',
      oilCondition: 'Good - Acid Test Passed', acidTest: 'Pass', llAlarm: 'None',
    },
    regimes: {
      LT: { condenserCondition: 'Good', flashtankLevel: '50%', flashtankPressure: '520', suctionSetpoint: '-30', suctionActual: '-29', dischargeSetpoint: '', dischargeActual: '', defrostDifferential: '4', heatReclaim: '', driersLabeled: 'Yes', phaseProtector: 'OK' },
      MT: { condenserCondition: 'Good', flashtankLevel: '55%', flashtankPressure: '525', suctionSetpoint: '22', suctionActual: '23', dischargeSetpoint: '1200', dischargeActual: '1190', defrostDifferential: '', heatReclaim: 'Operational', driersLabeled: 'Yes', phaseProtector: 'OK' },
      DT: { condenserCondition: '', flashtankLevel: '', flashtankPressure: '', suctionSetpoint: '', suctionActual: '', dischargeSetpoint: '', dischargeActual: '', defrostDifferential: '', heatReclaim: '', driersLabeled: '', phaseProtector: '' },
    },
  },
}

test('a CO₂ PM builds its own document, titled as one', () => {
  const doc = buildReportDoc('co2', REPORT)
  assert.equal(doc.title, 'CO₂ PM')
  assert.equal(doc.storeName, 'Fortino’s Mall Rd')
  assert.deepEqual(doc.meta, ['Fall PM', 'Simpro #81100'])
  assert.deepEqual(doc.sections.map(s => s.title),
    ['Site & Technician', 'PM Checklist', 'CO₂ Rack', 'L/T · M/T · D/T Readings', 'Notes & Deficiencies'])
})

test('the checklist prints the machine-room items first, then the numbered list', () => {
  const c = block(buildReportDoc('co2', REPORT), 'PM Checklist', 'checklist')
  assert.equal(c.items.length, 39, 'two machine-room items plus the 37 numbered ones')
  assert.equal(c.items[0].label, 'Clean machine room')
  assert.equal(c.items[0].done, true)
  assert.equal(c.items[2].label, 'Perform a complete leak check of entire store.')
  assert.equal(c.items[2].done, true)
  assert.equal(c.items[3].done, false)
  assert.match(c.summary, /^2 of 39 items completed · 37 outstanding$/)
})

test('the bottle counts print with the checklist that asks for them', () => {
  // "report back" on the paper form means a phone call; the counts are recorded
  // here so the next tech can read them off the last PM.
  const doc = buildReportDoc('co2', { ...REPORT, units: { ...REPORT.units, bottles: { full: '3', empty: '1' } } })
  const f = block(doc, 'PM Checklist', 'fields')
  assert.deepEqual(f.items, [
    { label: 'CO₂ Bottles — Full', value: '3' },
    { label: 'CO₂ Bottles — Empty', value: '1' },
  ])
})

test('a count of zero is printed, not dropped as a blank', () => {
  // "0 full" is the answer that matters most — it means the store is out.
  const doc = buildReportDoc('co2', { ...REPORT, units: { ...REPORT.units, bottles: { full: '0', empty: '4' } } })
  const f = block(doc, 'PM Checklist', 'fields')
  assert.equal(f.items[0].value, '0')
})

test('no bottle count means no bottle line', () => {
  const doc = buildReportDoc('co2', REPORT)
  assert.equal(block(doc, 'PM Checklist', 'fields'), undefined)
})

test('the bottle counts hang off the inventory item in the form', () => {
  assert.equal(CO2_BOTTLE_ITEM_ID, 'co2_co2BottleInventory')
  assert.ok(CO2_CHECKLIST.some(i => i.id === CO2_BOTTLE_ITEM_ID), 'the id names a real item')
  assert.match(FORM, /item\.id === CO2_BOTTLE_ITEM_ID/)
  assert.match(FORM, /units: \{ technician, storeAddress, rack, regimes, bottles \}/)
})

test('the rack table prints one row per compressor the rack actually has', () => {
  // The readings are stored in eight slots whatever the rack carries, so a
  // three-compressor rack must not print five empty rows.
  const t = block(buildReportDoc('co2', REPORT), 'CO₂ Rack', 'table')
  assert.equal(t.rows.length, 3)
  assert.deepEqual(t.head, ['Comp', 'OMC Level', 'Oil Press', 'Amps', 'Volts', 'H.P. Set', 'L.P. Set', 'OFC (sec)'])
  assert.deepEqual(t.rows[0], ['1', '60', '28', '12.1', '575', '1450', '200', '90'])
  assert.equal(t.rows[1][2], '—', 'a reading not taken stays a dash')
})

test('the rack section names R-744 without being told', () => {
  const f = block(buildReportDoc('co2', REPORT), 'CO₂ Rack', 'fields')
  assert.equal(f.items.find(i => i.label === 'Refrigerant').value, 'R-744')
  assert.equal(f.items.find(i => i.label === 'Charge — MT').value, '450 lb')
})

test('a regime with nothing recorded gets no column', () => {
  // Plenty of stores have no D/T; an empty column reads as missing work.
  const t = block(buildReportDoc('co2', REPORT), 'L/T · M/T · D/T Readings', 'table')
  assert.deepEqual(t.head, ['Reading', 'L/T', 'M/T'])
  assert.equal(t.rows[0][0], 'Condenser Condition')
  assert.equal(t.rows[2][1], '520', 'LT flashtank pressure')
  assert.equal(t.rows[5][1], '—', 'LT discharge setpoint was not recorded')
})

test('the readings section is left out when no regime was filled in at all', () => {
  const doc = buildReportDoc('co2', { units: { rack: { compressorCount: 1 }, regimes: { LT: {}, MT: {}, DT: {} } } })
  assert.equal(section(doc, 'L/T · M/T · D/T Readings'), undefined)
})

test('a deficiency says its asset, system and system number', () => {
  const n = block(buildReportDoc('co2', REPORT), 'Notes & Deficiencies', 'notes')
  assert.equal(n.items[0].meta, 'Asset: OP-2 · System: MT · System #: 4')
})

test('a half-written CO₂ report still builds', () => {
  for (const data of [{}, { units: null, checklist: null, notes: null },
                      { units: { rack: 'nonsense', regimes: 42 } }]) {
    const doc = buildReportDoc('co2', data)
    assert.ok(Array.isArray(doc.sections))
  }
})

test('the PDF folds characters its font cannot draw', () => {
  // jsPDF's built-in fonts are WinAnsi: the subscript in "CO₂ PM" was dropped
  // and the title printed as "CO , PM".
  const { foldForPdf } = require('../lib/reports/pdf.ts')
  const folded = foldForPdf(buildReportDoc('co2', REPORT))
  assert.equal(folded.title, 'CO2 PM')
  assert.equal(folded.sections.find(s => /Readings/.test(s.title)).title, 'L/T · M/T · D/T Readings',
    'middle dots and dashes are in the font and must survive')
  assert.equal(folded.storeName, 'Fortino\u2019s Mall Rd', 'a curly apostrophe is fine')
  // Nested block content is folded too, not just the headings.
  const rack = folded.sections.find(s => /Rack/.test(s.title))
  assert.ok(JSON.stringify(rack).includes('Charge'))

  // And it is actually wired into the builder — folding a document nothing
  // calls would leave the subscript on the page.
  const src = fs.readFileSync('lib/reports/pdf.ts', 'utf8')
  assert.match(src, /const doc = foldForPdf\(input\)/)
})

test('the downloaded file is named CO2, not CO', () => {
  // The subscript is not a word character; stripping it left "CO-PM".
  const { pdfFileName } = require('../lib/reports/doc.ts')
  assert.equal(pdfFileName(buildReportDoc('co2', REPORT)), 'Fortinos-Mall-Rd_CO2-PM_October-14-2026.pdf')
})

/* ── The form, and the column it has to satisfy ───────────────────────────── */

const FORM = fs.readFileSync('app/maintenance/co2-pm/page.tsx', 'utf8')

test('the form saves the report type the database accepts', () => {
  // pm_reports_report_type_check allows 'refrigeration', 'hvac' and 'co2'.
  // Sending anything else is rejected at save time, in a mechanical room.
  assert.match(FORM, /report_type: 'co2'/)
})

test('the form and the report agree on where the rack data lives', () => {
  // The report page and the PDF read units.rack, units.regimes and
  // units.bottles; renaming one here without the others loses the data.
  assert.match(FORM, /units: \{ technician, storeAddress, rack, regimes, bottles \}/)
  const doc = fs.readFileSync('lib/reports/doc.ts', 'utf8')
  for (const key of ['units?.rack', 'units?.regimes', 'units?.bottles']) {
    assert.ok(doc.includes(key), `doc.ts does not read ${key}`)
  }
})

test('the form reads the checklist from the shared module, not its own copy', () => {
  assert.match(FORM, /from '@\/lib\/maintenance\/co2-checklist'/)
  assert.doesNotMatch(FORM, /const CO2_CHECKLIST\s*[:=]/)
})

test('the maintenance page offers the CO₂ form and labels its reports', () => {
  // Without the card there is no way to reach the form; without the label a
  // CO₂ PM shows up in the list as a Refrigeration PM.
  const page = fs.readFileSync('app/maintenance/page.tsx', 'utf8')
  assert.match(page, /path: '\/maintenance\/co2-pm'/)
  assert.match(page, /r\.report_type === 'co2'/)
  assert.match(page, /'CO₂ PM'/)
})

test('the edit link and the form agree on the query parameter', () => {
  // The other PM forms read ?id=; a mismatch opens a blank form instead of the
  // report the tech asked to edit.
  assert.match(FORM, /searchParams\.get\('id'\)/)
  const report = fs.readFileSync('app/maintenance/report/[id]/page.tsx', 'utf8')
  assert.match(report, /\/maintenance\/co2-pm\?id=\$\{id\}/)
})
