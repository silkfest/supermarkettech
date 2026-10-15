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

const { TOPICS } = require('../lib/knowledge/topics.ts')
const ejectors = TOPICS.find(t => t.slug === 'co2-ejectors')

/* ── House rules from CLAUDE.md, checked against every topic ──────────────── */

/** Topics that already break the heading rules, left as they were found.
 *
 *  The renderer takes the first "## " as the page title and silently drops
 *  every later one, and it has no rule for "# " at all — that line prints on
 *  the page with its hash still on it. These pages are therefore missing
 *  section headings today. Fixing them is a content job (each page's sections
 *  have to be re-levelled by hand, and the table of contents changes with it),
 *  so they are recorded here rather than quietly tolerated.
 *
 *  Delete a slug from this list when its page is fixed. Adding one needs a
 *  reason: the rule below is what keeps new topics from joining them. */
const KNOWN_BAD_HEADINGS = [
  'temprite', 'emerson-e2-e3', 'rack-sequence-of-events', 'trane-rauc',
  'filter-driers', 'solenoid-valves', 'heat-reclaim', 'kysor-warren',
  'dixell', 'aaon-rtu',
]

test('every topic has exactly one page title and no stray H1', () => {
  for (const topic of TOPICS) {
    if (KNOWN_BAD_HEADINGS.includes(topic.slug)) continue
    const lines = topic.content.split('\n')
    const h2 = lines.filter(l => /^## /.test(l))
    const h1 = lines.filter(l => /^# /.test(l))
    assert.equal(h2.length, 1, `${topic.slug} has ${h2.length} "## " headings; later ones never render`)
    assert.equal(h1.length, 0, `${topic.slug} has a "# " heading, which renders with its hash visible`)
  }
})

test('the known-bad list names real topics and nothing already fixed', () => {
  // A stale entry here would silently exempt a page that is fine.
  for (const slug of KNOWN_BAD_HEADINGS) {
    const topic = TOPICS.find(t => t.slug === slug)
    assert.ok(topic, `${slug} is not a topic — remove it from the list`)
    const lines = topic.content.split('\n')
    const broken = lines.filter(l => /^## /.test(l)).length !== 1 || lines.some(l => /^# /.test(l))
    assert.ok(broken, `${slug} now obeys the heading rules — delete it from KNOWN_BAD_HEADINGS`)
  }
})

test('every topic has sections, which the TOC and Related Manuals need', () => {
  for (const topic of TOPICS) {
    assert.ok(/^### /m.test(topic.content), `${topic.slug} has no "### " section`)
  }
})

test('no topic uses a code fence or a sources line', () => {
  // Fences render as literal backticks on screen; sources lines go stale.
  for (const topic of TOPICS) {
    assert.doesNotMatch(topic.content, /```/, `${topic.slug} contains a code fence`)
    assert.doesNotMatch(topic.content, /^\*Sources:/m, `${topic.slug} contains a sources line`)
  }
})

test('every diagram a topic inserts is registered in the renderer', () => {
  // An unregistered key renders as the literal text [diagram:whatever].
  const renderer = fs.readFileSync('components/knowledge/MarkdownContent.tsx', 'utf8')
  const registry = renderer.slice(renderer.indexOf('DIAGRAM_REGISTRY'))
  for (const topic of TOPICS) {
    for (const [, key] of topic.content.matchAll(/\[diagram:([a-z0-9-]+)\]/g)) {
      assert.ok(registry.includes(`'${key}'`), `${topic.slug} inserts unregistered diagram "${key}"`)
    }
  }
})

test('slugs are unique — two topics on one route would hide one of them', () => {
  const slugs = TOPICS.map(t => t.slug)
  assert.equal(new Set(slugs).size, slugs.length)
})

/* ── The ejector topic ────────────────────────────────────────────────────── */

test('the ejector topic is registered and reachable', () => {
  assert.ok(ejectors, 'no topic with slug co2-ejectors')
  assert.equal(ejectors.title, 'CO₂ Ejectors')
  assert.equal(ejectors.category, 'rack-systems')
  assert.ok(ejectors.tags.includes('Ejector'))
})

test('the ejector topic covers what a tech standing at the rack needs', () => {
  // Whole lines, not substrings: "### Diagnosing an Ejector" is a prefix of
  // any longer heading, so a renamed section would slip past an includes().
  const headings = ejectors.content.split('\n').filter(l => l.startsWith('### '))
  for (const section of [
    'How an Ejector Works',
    'Why Transcritical CO₂ Wants One',
    'Two Arrangements You Will Meet',
    'Multi-Ejector Blocks',
    'Pressures a Tech Actually Reads',
    'Diagnosing an Ejector',
  ]) {
    assert.ok(headings.includes(`### ${section}`), `missing section: ${section}`)
  }
  for (const term of ['Motive', 'Suction', 'Discharge', 'Lift', 'Entrainment ratio', 'Cartridge', 'Parallel compression']) {
    assert.ok(ejectors.content.includes(term), `missing term: ${term}`)
  }
})

test('the ejector topic says an idle ejector in cold weather is normal', () => {
  // The most likely false callout: there is not enough motive energy below the
  // critical point, so the controller runs the high-pressure valve instead.
  assert.match(ejectors.content, /not a fault|idle/i)
  assert.match(ejectors.content, /critical point/)
})

test('the ejector topic carries the safety call-out, not a plain note', () => {
  // Transcritical pressure plus dry-ice formation is a real hazard, which is
  // what [!SAFETY] is reserved for.
  assert.match(ejectors.content, /> \[!SAFETY\]/)
  assert.match(ejectors.content, /dry ice/i)
  assert.match(ejectors.content, /isolated, recovered/)
})

test('its CO₂ pressure/temperature pairs match the equation of state', () => {
  // Computed with CoolProp (R-744 saturation, bubble point), not recalled:
  //   PropsSI('P','T',T,'Q',0,'CO2') → Pa × 0.000145037737730 − 14.696
  // A wrong pair here would be read off a gauge at a rack and believed.
  // Written as strings: a trailing-zero decimal such as 45.0 is not a number
  // the table can be matched against, it is text on the page.
  const expected = [
    ['−20°F', '200', '14.8'],
    ['0°F', '291', '21.1'],
    ['20°F', '407', '29.1'],
    ['30°F', '476', '33.8'],
    ['40°F', '553', '39.1'],
    ['50°F', '638', '45.0'],
    ['Critical point, 87.8°F', '1,055', '73.8'],
  ]
  for (const [label, psig, bar] of expected) {
    assert.ok(
      ejectors.content.includes(`| ${label} | ${psig} | ${bar} |`),
      `row not found or changed: ${label} | ${psig} | ${bar}`
    )
  }
})

test('the worked example stays inside the verified pairs', () => {
  // 520 psig ≈ 36°F and 420 psig ≈ 22°F saturated, both interpolated between
  // rows above; the lift is their difference.
  assert.match(ejectors.content, /520 psig/)
  assert.match(ejectors.content, /420 psig/)
  assert.match(ejectors.content, /lifting entrained gas 100 psi/)
  assert.match(ejectors.content, /> \[!EXAMPLE\]/)
})

test('the Carnot topic points at the general one', () => {
  // Ejectors were only ever documented as a Carnot feature; a tech meeting one
  // on another rack found nothing.
  const carnot = TOPICS.find(t => t.slug === 'carnot')
  assert.match(carnot.content, /\[diagram:co2-ejector-navigation\]/)
  assert.match(carnot.content, /see the CO₂ Ejectors topic/)
})

test('its manual keywords match real document titles and nothing wild', () => {
  // ILIKE substring match on document title. 'transcritical' pulls the CO₂
  // training and rack manuals; 'ejector' matches nothing today and is there for
  // when an ejector manual is uploaded.
  assert.deepEqual(ejectors.manualKeywords, ['ejector', 'transcritical'])
  for (const kw of ejectors.manualKeywords) {
    assert.doesNotMatch(kw, /_/, `"${kw}" — underscore is a single-character wildcard in ILIKE`)
    assert.ok(kw.length >= 7, `"${kw}" is short enough to pull in unrelated manuals`)
  }
})

/* ── What the page actually renders ───────────────────────────────────────── */

const React = require('react')
const { renderToStaticMarkup } = require('react-dom/server')
const MarkdownContent = require('../components/knowledge/MarkdownContent.tsx').default

const render = (content) => renderToStaticMarkup(React.createElement(MarkdownContent, { content }))

test('the ejector topic renders as a page, not as markdown source', () => {
  const html = render(ejectors.content)
  assert.match(html, /<h2[^>]*>CO₂ Ejectors<\/h2>/)
  assert.equal((html.match(/<h3/g) || []).length, 7, 'seven sections')
  assert.equal((html.match(/<table/g) || []).length, 2, 'the saturation table and the fault table')
  // Row count, not just table count: a mangled header row still leaves a table
  // behind, with a line of the page swallowed into it.
  assert.equal((html.match(/<tr/g) || []).length, 15, 'eight saturation rows and seven fault rows, headers included')
  // Anything the renderer does not understand ends up on screen as typed.
  for (const literal of ['[diagram:', '## ', '**', '[!']) {
    assert.ok(!html.includes(literal), `"${literal}" was left on the page`)
  }
})

test('every callout in the ejector topic renders as a box', () => {
  const html = render(ejectors.content)
  // A default-labelled box shows its type; a titled one shows the title.
  for (const text of ['Note', 'Tip', 'Protect the nozzles', 'Transcritical pressures and dry ice', 'Reading a lift']) {
    assert.ok(html.includes(text), `callout missing: ${text}`)
  }
  // The box colours are how a tech tells a safety warning from a field tip.
  for (const colour of ['amber', 'red', 'emerald', 'violet', 'blue']) {
    assert.ok(html.includes(colour), `no ${colour} callout rendered`)
  }
})
