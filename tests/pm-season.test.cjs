const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')

/** The values pm_reports.pm_season accepts.
 *
 *  Mirrors the database CHECK constraint pm_reports_pm_season_check:
 *    CHECK (pm_season = ANY (ARRAY['Spring','Summer','Fall','Winter']))
 *
 *  Every HVAC PM save was rejected because that page sent 'FALL' where the
 *  constraint wants 'Fall'. The <option> label read "Fall" either way, so the
 *  form looked correct and only the database disagreed. */
const ALLOWED = ['Spring', 'Summer', 'Fall', 'Winter']

const PAGES = [
  'app/maintenance/hvac-pm/page.tsx',
  'app/maintenance/refrigeration-pm/page.tsx',
]

const optionValues = src =>
  [...src.matchAll(/<option value="([^"]*)">(Spring|Summer|Fall|Winter)<\/option>/g)]
    .map(m => m[1])

test('both PM forms submit season values the database will accept', () => {
  for (const page of PAGES) {
    const src = fs.readFileSync(page, 'utf8')
    const values = optionValues(src)
    assert.deepEqual(values, ALLOWED, `${page} season <option> values`)
  }
})

test('the option value matches its own visible label', () => {
  // The failure mode that hid this: label "Fall", value "FALL".
  for (const page of PAGES) {
    const src = fs.readFileSync(page, 'utf8')
    for (const [, value, label] of src.matchAll(
      /<option value="([^"]*)">(Spring|Summer|Fall|Winter)<\/option>/g
    )) {
      assert.equal(value, label, `${page}: option labelled "${label}" submits "${value}"`)
    }
  }
})

test('seasonal checklist logic compares against the values actually submitted', () => {
  // Changing the option values without this comparison breaks the Winter and
  // Summer checklist hiding silently - no error, just the wrong checklist.
  const src = fs.readFileSync('app/maintenance/hvac-pm/page.tsx', 'utf8')
  const compared = [...src.matchAll(/season === '([^']+)'/g)].map(m => m[1])
  assert.ok(compared.length > 0, 'expected at least one season comparison')
  for (const v of compared) {
    assert.ok(ALLOWED.includes(v), `season is compared against '${v}', which the database rejects`)
  }
})

test('no page declares a season type the database would reject', () => {
  for (const page of PAGES) {
    const src = fs.readFileSync(page, 'utf8')
    const decl = src.match(/type (?:PM)?Season = ([^\n]+)/)
    if (!decl) continue
    // Split the union first: matching quoted runs directly also captures the
    // " | " that sits between them.
    for (const part of decl[1].split('|')) {
      const m = part.trim().match(/^'(.*)'$/)
      if (!m || m[1] === '') continue
      assert.ok(ALLOWED.includes(m[1]), `${page} declares season '${m[1]}', which the database rejects`)
    }
  }
})
