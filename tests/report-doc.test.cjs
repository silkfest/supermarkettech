// The reports are filled in and read in Eastern time. Left at the runner's UTC
// default, a date-only value formats correctly by accident and the test below
// would pass whether or not the time-zone handling is right.
process.env.TZ = 'America/Toronto'

const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const ts = require('typescript')
require.extensions['.ts'] = (m, f) => m._compile(ts.transpileModule(fs.readFileSync(f, 'utf8'),
  { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText, f)

const { buildReportDoc, formatReportDate, pdfFileName } = require('../lib/reports/doc.ts')

const section = (doc, title) => doc.sections.find(s => s.title === title)
const block = (doc, title, kind) => section(doc, title)?.blocks.find(b => b.kind === kind)

const HVAC = {
  store_name: 'Freshco 9690',
  performed_at: '2026-10-06',
  pm_season: 'Fall',
  simpro_number: '81018',
  checklist: { item1: true, item2: true, item3: false },
  photos: [{ url: 'https://x.test/report.jpg', label: 'Machine room' }],
  notes: [{ id: 'n1', note: 'Unable to test UHs without a lift', importance: 'ROUTINE', equipmentIndex: 1, assetId: 'A-12' }],
  units: {
    technician: { name: 'B. Silk', cert: '313D' },
    storeAddress: '9690 Mall Rd',
    equipment: [
      { id: 'a', type: 'MAIN_AC', brand: 'Trane', modelNumber: 'RAUCC30EBT', serialNumber: 'C99G13766M', refrigerantType: 'R-22', voltage: '208/3/60', photos: [] },
      { id: 'b', type: 'UNIT_HEATER', serviceArea: 'Receiving', brand: 'Reznor', modelNumber: '', serialNumber: '', refrigerantType: '', voltage: '',
        photos: [{ url: 'https://x.test/uh.jpg', label: 'Nameplate' }] },
    ],
  },
}

test('the header carries what identifies the visit', () => {
  const doc = buildReportDoc('hvac', HVAC)
  assert.equal(doc.title, 'HVAC PM')
  assert.equal(doc.storeName, 'Freshco 9690')
  assert.equal(doc.dateStr, 'October 6, 2026')
  assert.deepEqual(doc.meta, ['Fall PM', 'Simpro #81018'])
})

test('a date-only value is not pushed back a day by the time zone', () => {
  // '2026-10-06' parses as midnight UTC, which is the 5th in every North
  // American zone — the PM would print as the day before it happened.
  assert.equal(new Date().getTimezoneOffset() !== 0, true, 'this test is meaningless in UTC')
  assert.equal(formatReportDate('2026-10-06'), 'October 6, 2026')
  assert.equal(formatReportDate(''), '')
  assert.equal(formatReportDate('not a date'), 'not a date')
})

test('the technician is named when the form saved a plain string', () => {
  // This is how both PM forms actually save it — one "Technician name" box.
  // Reading only the object shape left the technician off the report: the
  // store got a PM with a site on it and nobody's name.
  const doc = buildReportDoc('hvac', { store_name: 'Freshco 9690', units: { technician: 'Ben Silk' } })
  const items = section(doc, 'Site & Technician').blocks[0].items
  assert.deepEqual(items.find(i => i.label === 'Technician'), { label: 'Technician', value: 'Ben Silk' })
})

test('the technician is named when an older report holds an object', () => {
  const doc = buildReportDoc('hvac', { units: { technician: { name: 'B. Silk', cert: '313D' } } })
  const items = section(doc, 'Site & Technician').blocks[0].items
  assert.equal(items.find(i => i.label === 'Technician').value, 'B. Silk')
})

test('no technician at all leaves the field out rather than printing blank', () => {
  for (const technician of [undefined, '', '   ', 42, {}, { name: '' }]) {
    const doc = buildReportDoc('hvac', { store_name: 'S', units: { technician } })
    const items = section(doc, 'Site & Technician').blocks[0].items
    assert.ok(!items.some(i => i.label === 'Technician'), JSON.stringify(technician))
  }
})

test('the certification is not printed', () => {
  // Still recorded on the report, just not on the copy that goes to the store.
  const items = section(buildReportDoc('hvac', HVAC), 'Site & Technician').blocks[0].items
  assert.deepEqual(items.map(i => i.label), ['Store / Site', 'Address', 'Technician'])
  assert.ok(!JSON.stringify(items).includes('313D'))
})

test('the equipment table carries one row per unit, in order', () => {
  const t = block(buildReportDoc('hvac', HVAC), 'Equipment', 'table')
  assert.deepEqual(t.head, ['Unit', 'Brand', 'Model', 'Serial', 'Refrigerant', 'Voltage'])
  assert.equal(t.rows.length, 2)
  assert.equal(t.rows[0][0], 'Main AC')
  assert.equal(t.rows[1][0], 'UH Receiving')
})

test('a gas unit heater reads N/A, not a dash', () => {
  // A dash is how the report shows something the tech left blank. The form
  // never asks a unit heater for a refrigerant, so a dash would read as an
  // omission that someone then goes looking for.
  const t = block(buildReportDoc('hvac', HVAC), 'Equipment', 'table')
  assert.equal(t.rows[0][4], 'R-22')
  assert.equal(t.rows[1][4], 'N/A')
})

test('an empty field still prints a dash so the column lines up', () => {
  const t = block(buildReportDoc('hvac', HVAC), 'Equipment', 'table')
  assert.equal(t.rows[1][2], '—')
})

test("a unit's own photos sit under that unit's name", () => {
  const photos = section(buildReportDoc('hvac', HVAC), 'Equipment').blocks.filter(b => b.kind === 'photos')
  assert.equal(photos.length, 1, 'only the unit that has photos gets a block')
  assert.equal(photos[0].caption, 'UH Receiving')
  assert.equal(photos[0].photos[0].label, 'Nameplate')
})

test('a deficiency says which unit and asset it is against', () => {
  const notes = block(buildReportDoc('hvac', HVAC), 'Deficiencies', 'notes')
  assert.equal(notes.items[0].text, 'Unable to test UHs without a lift')
  assert.equal(notes.items[0].meta, 'Unit: UH Receiving · Asset: A-12')
})

test('the checklist counts what is outstanding', () => {
  const c = block(buildReportDoc('hvac', HVAC), 'PM Checklist', 'checklist')
  assert.equal(c.items.length, 11)
  assert.equal(c.items.filter(i => i.done).length, 2)
  assert.match(c.summary, /^2 of 11 items completed · 9 outstanding$/)
})

test('an unticked box is false, never missing', () => {
  // A checklist key absent from the stored object means not done; treating it
  // as undefined would print neither a tick nor a ring.
  const c = block(buildReportDoc('hvac', { checklist: {} }), 'PM Checklist', 'checklist')
  assert.ok(c.items.every(i => i.done === false))
})

test('sections with nothing in them are left out', () => {
  const doc = buildReportDoc('hvac', { store_name: 'Bare Store' })
  const titles = doc.sections.map(s => s.title)
  assert.deepEqual(titles, ['Site & Technician'], 'only the store name is known')
  assert.equal(section(doc, 'Site & Technician').blocks[0].items.length, 1)
})

test('a refrigeration report gives each rack its own section', () => {
  const doc = buildReportDoc('refrigeration', {
    store_name: 'Fortino’s',
    checklist: { cl_leakCheckStore: true },
    units: {
      racks: [
        { id: 'r1', tabDisplayName: 'Rack A — LT', compressorCount: 3, refrigerant: 'R-448A',
          compressorModels: ['4DES-7Y', '4CES-9Y'], compAmps: ['12.1'] },
        { id: 'r2', compressorCount: 1 },
      ],
    },
    notes: [{ id: 'n', text: 'Oil pot low on #2', importance: 'IMPORTANT' }],
  })
  const titles = doc.sections.map(s => s.title)
  assert.deepEqual(titles, ['Site & Technician', 'Checklist', 'Rack A — LT', 'Rack B', 'Notes & Deficiencies'])

  const t = block(doc, 'Rack A — LT', 'table')
  assert.equal(t.rows.length, 3, 'one row per compressor, even where readings stop')
  assert.equal(t.rows[0][1], '4DES-7Y')
  assert.equal(t.rows[2][1], '—', 'the third compressor has no model recorded')
  assert.equal(t.rows[0][3], '12.1')
})

test('a refrigeration deficiency names the asset, the rack and the system', () => {
  // The form asks for all three against every note. They were recorded and then
  // dropped on the way to the report, so a note about a failed contactor
  // reached the store with nothing saying which unit it was on.
  const doc = buildReportDoc('refrigeration', {
    units: { racks: [{ id: 'r1', tabDisplayName: 'Rack A — LT' }, { id: 'r2' }] },
    notes: [
      { id: 'n1', text: 'Contactor pitted', importance: 'CRITICAL', assetId: 'C-204', rackIndex: 0, systemNumber: '12' },
      { id: 'n2', text: 'Oil pot low', importance: 'ROUTINE', assetId: '', rackIndex: 1, systemNumber: '' },
      { id: 'n3', text: 'Machine room swept', importance: 'ROUTINE', assetId: 'A-9' },
    ],
  })
  const items = block(doc, 'Notes & Deficiencies', 'notes').items
  assert.equal(items[0].meta, 'Asset: C-204 · Rack A — LT · System: 12')
  assert.equal(items[1].meta, 'Rack B', 'an unnamed rack still gets its letter')
  assert.equal(items[2].meta, 'Asset: A-9', 'a note against no rack says only what it has')
})

test('a deficiency with nothing against it carries no meta line', () => {
  const doc = buildReportDoc('refrigeration', {
    notes: [{ id: 'n', text: 'General note', importance: 'ROUTINE', assetId: '', rackIndex: null, systemNumber: '' }],
  })
  assert.equal(block(doc, 'Notes & Deficiencies', 'notes').items[0].meta, undefined)
})

test('a rack index pointing at nothing does not invent a rack', () => {
  // Deleting a rack after writing a note can leave the index dangling.
  const doc = buildReportDoc('refrigeration', {
    units: { racks: [{ id: 'r1', tabDisplayName: 'Rack A' }] },
    notes: [{ id: 'n', text: 'Note', importance: 'ROUTINE', assetId: 'A-1', rackIndex: 7 }],
  })
  assert.equal(block(doc, 'Notes & Deficiencies', 'notes').items[0].meta, 'Asset: A-1')
})

test('a service report keeps the write-ups as their own sections', () => {
  const doc = buildReportDoc('individual', {
    store_name: 'Sobeys',
    equipment: { name: 'Rack B', manufacturer: 'Hussmann', specs: [{ label: 'Refrigerant', value: 'R-448A' }] },
    issue_explanation: 'Store reported case temps climbing overnight.',
    steps_taken: 'Found the liquid line solenoid stuck.',
    whats_next: 'Return with a replacement coil.',
    parts_needed: ['Sporlan MKC-2 coil', ''],
  })
  assert.deepEqual(doc.sections.map(s => s.title),
    ['Equipment', 'Issue / Complaint', 'Steps Taken', "What's Next", 'Parts Needed'])
  assert.equal(block(doc, 'Equipment', 'table').rows[0][0], 'Refrigerant')
  assert.deepEqual(block(doc, 'Parts Needed', 'bullets').items, ['Sporlan MKC-2 coil'])
})

test('a report full of nulls builds rather than throwing', () => {
  // The builder reads whatever the API returns. A half-written report must
  // still produce a document, because the tech is usually downloading it to
  // show someone what is missing.
  for (const kind of ['hvac', 'refrigeration', 'individual']) {
    for (const data of [{}, { units: null, notes: null, photos: null, checklist: null },
                        { units: 'nonsense', notes: 'nonsense', photos: 42, equipment: [] }]) {
      const doc = buildReportDoc(kind, data)
      assert.ok(Array.isArray(doc.sections), `${kind} built`)
    }
  }
})

test('photos without a url are dropped, not drawn as blanks', () => {
  const doc = buildReportDoc('hvac', { photos: [{ label: 'no url' }, { url: 'https://x.test/a.jpg', label: '' }] })
  assert.equal(block(doc, 'Photos', 'photos').photos.length, 1)
})

test('the file name says store, type and date', () => {
  const name = pdfFileName(buildReportDoc('hvac', HVAC))
  assert.equal(name, 'Freshco-9690_HVAC-PM_October-6-2026.pdf')
  assert.doesNotMatch(name, /[\\/:*?"<>|]/, 'nothing a file system would reject')
})

test('a report with no store still names the file something', () => {
  assert.equal(pdfFileName({ title: '', storeName: '', dateStr: '', meta: [], sections: [] }), 'report.pdf')
})
