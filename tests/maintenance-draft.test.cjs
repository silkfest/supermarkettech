const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const ts = require('typescript')
require.extensions['.ts'] = (m, f) => m._compile(ts.transpileModule(fs.readFileSync(f, 'utf8'),
  { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText, f)

const {
  DRAFT_VERSION, DRAFT_MAX_AGE_MS, draftKey, serializeDraft, parseDraft,
  isDraftFresh, describeDraftAge, isWorthSaving,
} = require('../lib/maintenance/draft.ts')
const { describeSaveError } = require('../lib/maintenance/save-errors.ts')

const NOW = 1_700_000_000_000

/* ---------------- draft keys ---------------- */

test('a draft of one report can never be restored onto another', () => {
  // The failure this prevents: opening report B and being handed report A's
  // readings, which would look like real data for the wrong store.
  assert.notEqual(draftKey('hvac-pm', 'report-a'), draftKey('hvac-pm', 'report-b'))
  assert.notEqual(draftKey('hvac-pm', null), draftKey('hvac-pm', 'report-a'))
  assert.notEqual(draftKey('hvac-pm', null), draftKey('refrigeration-pm', null))
})

/* ---------------- round trip and rejection ---------------- */

test('a draft survives a round trip', () => {
  const data = { storeName: 'Freshco 9690', season: 'Fall', checkItems: { 1: true } }
  const back = parseDraft(serializeDraft(data, NOW))
  assert.deepEqual(back.data, data)
  assert.equal(back.savedAt, NOW)
  assert.equal(back.version, DRAFT_VERSION)
})

test('malformed storage returns null instead of throwing', () => {
  // A corrupt draft must never stop the form from loading.
  for (const raw of [null, '', 'not json', '{', '[]', 'null', '123', '"text"']) {
    assert.doesNotThrow(() => parseDraft(raw), `input ${JSON.stringify(raw)}`)
    assert.equal(parseDraft(raw), null, `input ${JSON.stringify(raw)}`)
  }
})

test('a draft from an older version is discarded, not half-restored', () => {
  const stale = JSON.stringify({ version: DRAFT_VERSION - 1, savedAt: NOW, data: { storeName: 'x' } })
  assert.equal(parseDraft(stale), null)
})

test('a draft missing its timestamp is discarded', () => {
  for (const savedAt of [undefined, null, 'yesterday', NaN, Infinity]) {
    const raw = JSON.stringify({ version: DRAFT_VERSION, savedAt, data: { a: 1 } })
    assert.equal(parseDraft(raw), null, `savedAt ${String(savedAt)}`)
  }
})

/* ---------------- freshness ---------------- */

test('a draft expires rather than reviving last month work', () => {
  const fresh = { version: DRAFT_VERSION, savedAt: NOW - 1000, data: {} }
  const old = { version: DRAFT_VERSION, savedAt: NOW - DRAFT_MAX_AGE_MS - 1, data: {} }
  assert.equal(isDraftFresh(fresh, NOW), true)
  assert.equal(isDraftFresh(old, NOW), false)
  assert.equal(isDraftFresh(null, NOW), false)
})

test('a draft stamped in the future is treated as a clock change, not a draft', () => {
  const future = { version: DRAFT_VERSION, savedAt: NOW + 60_000, data: {} }
  assert.equal(isDraftFresh(future, NOW), false)
})

test('age reads in words a tech would use', () => {
  const ago = ms => describeDraftAge(NOW - ms, NOW)
  assert.equal(ago(0), 'just now')
  assert.equal(ago(60_000), '1 minute ago')
  assert.equal(ago(42 * 60_000), '42 minutes ago')
  assert.equal(ago(60 * 60_000), '1 hour ago')
  assert.equal(ago(5 * 60 * 60_000), '5 hours ago')
  assert.equal(ago(24 * 60 * 60_000), 'yesterday')
  assert.equal(ago(3 * 24 * 60 * 60_000), '3 days ago')
})

/* ---------------- not every page view is a draft ---------------- */

test('an untouched form is not stored as a draft', () => {
  // Otherwise every tech who merely opens the page is later told they have
  // unsaved work waiting.
  const empty = { storeName: '', season: '', equipment: [] }
  assert.equal(isWorthSaving({ storeName: '', season: '', equipment: [] }, empty), false)
  assert.equal(isWorthSaving({ storeName: 'Freshco 9690', season: '', equipment: [] }, empty), true)
  assert.equal(isWorthSaving({ storeName: '', season: 'Fall', equipment: [] }, empty), true)
})

/* ---------------- error messages ---------------- */

test('the season constraint names the field and says what to do', () => {
  // The exact error that was shown on a phone, verbatim.
  const raw = 'new row for relation "pm_reports" violates check constraint "pm_reports_pm_season_check"'
  const e = describeSaveError(raw, 400)
  assert.match(e.message, /Season/)
  assert.match(e.message, /Spring, Summer, Fall or Winter/)
  assert.doesNotMatch(e.message, /violates check constraint/, 'must not just echo the database')
  assert.equal(e.detail, raw, 'the raw text is kept for support')
})

test('an unmapped check constraint still names itself and suggests an action', () => {
  const e = describeSaveError('violates check constraint "pm_reports_some_future_check"')
  assert.match(e.message, /pm_reports_some_future_check/)
  assert.match(e.message, /Re-pick/)
})

test('a missing required column is reported by its form label', () => {
  const e = describeSaveError('null value in column "store_name" violates not-null constraint')
  assert.match(e.message, /Store \/ Site Name/)
  assert.match(e.message, /required/)
})

test('other database rejections get their own plain-language message', () => {
  assert.match(describeSaveError('violates unique constraint "pm_reports_pkey"').message, /already exists/)
  assert.match(describeSaveError('violates foreign key constraint "pm_reports_store_id_fkey"').message, /no longer exists/)
  assert.match(describeSaveError('value too long for type character varying(120)').message, /120 characters/)
})

test('an empty failure still tells the tech their work is safe', () => {
  // The point of the draft: the message must not imply the form is lost.
  for (const status of [undefined, 500, 503]) {
    const e = describeSaveError('', status)
    assert.match(e.message, /kept on this device/)
  }
})

test('an expired session is distinguished from a server failure', () => {
  for (const status of [401, 403]) {
    const e = describeSaveError('', status)
    assert.match(e.message, /Sign in again/)
    assert.match(e.message, /nothing is lost/)
  }
  assert.doesNotMatch(describeSaveError('', 500).message, /Sign in again/)
})

test('an unmapped message is passed through rather than swallowed', () => {
  const e = describeSaveError('connection terminated unexpectedly')
  assert.equal(e.message, 'connection terminated unexpectedly')
})
