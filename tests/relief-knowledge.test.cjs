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
const { buildSystemPromptParts } = require('../lib/ai/prompts.ts')
const { searchReliefSources } = require('../lib/knowledge/relief-source-index.ts')
const { formatToolResult, chunksToCitationsFrom } = require('../lib/ai/rag.ts')
const React = require('react')
const { renderToStaticMarkup } = require('react-dom/server')
const { ReliefChangeoverDiagram } = require('../components/knowledge/diagrams/ReliefChangeoverDiagram.tsx')
const topic = TOPICS.find(t => t.slug === 'pressure-relief-valves')

test('relief article retains its existing route and exposes all five requested sections', () => {
  assert.equal(topic.title, 'Pressure Relief Valves')
  for (const section of ['Relief Valve Basics', 'Dual Relief Valves & Changeover Manifolds', 'High-Side Relief Valves', 'Receiver & Low-Pressure Relief Valves', 'Testing, Inspection & Replacement']) assert.ok(topic.content.includes(`### ${section}`))
  assert.match(TOPICS.find(t => t.slug === 'co2-transcritical').content, /### Safety & Pressure Relief/)
  for (const q of ['PRV', 'changeover', 'active relief', 'high-side', 'receiver', '700', '2,030']) assert.ok((topic.content + topic.tags.join(' ')).toLowerCase().includes(q.toLowerCase()), q)
})

test('both chat domains receive verified guidance, source URLs and valid KB citation slug', () => {
  for (const domain of ['REFRIGERATION', 'HVAC']) {
    const { staticContent } = buildSystemPromptParts({ mode: 'EXPERT', domain })
    assert.ok(staticContent.includes(topic.content.split('[diagram:relief-references]')[0]))
    assert.match(staticContent, /pressure-relief-valves — Pressure Relief Valves/)
    assert.match(staticContent, /INST-054_Changeover_Manifold.pdf/)
    assert.match(staticContent, /Never invent setpoints/)
    assert.doesNotMatch(topic.content, /flash tank reliefs typically|mid-position throttles both|replacement every 5 years/)
  }
})

test('all requested questions retrieve reviewed source passages through existing citation format', () => {
  for (const q of ['Which relief valve is active?', 'What happens when I turn the changeover stem clockwise?', 'How do I identify the inactive relief?', 'What is the difference between high-side and receiver relief valves?', 'Can I use a 700-psi relief manifold on a transcritical CO2 high side?', 'How do I determine the correct relief valve pressure setting?']) {
    const chunks = searchReliefSources(q)
    assert.equal(chunks.length, 7, q)
    const result = formatToolResult(chunks, 4)
    const citations = chunksToCitationsFrom(chunks, 4)
    assert.equal(citations[0].citationNumber, 4)
    assert.equal(citations[0].pageNumber, 1)
    assert.equal(citations[0].signedUrl, '/manuals/mueller-inst-054-changeover-manifold.pdf')
    for (const c of citations) assert.ok(result.includes(`[Doc ${c.citationNumber}: ${c.title}`))
    assert.match(result, /not a relief valve opening setpoint/)
  }
  assert.deepEqual(searchReliefSources('compressor winding resistance'), [])
})

test('schematic renders mobile scalable, keyboard controls and explicit non-removal warning', () => {
  const html = renderToStaticMarkup(React.createElement(ReliefChangeoverDiagram))
  assert.match(html, /viewBox="0 0 360 270"/)
  assert.match(html, /aria-pressed="true"/)
  assert.match(html, /Backseated/)
  assert.match(html, /Frontseated/)
  assert.match(html, /Intermediate/)
  assert.match(html, /does not authorize removal/)
  assert.match(html, /left far relief active, right near branch isolated/)
  assert.equal(fs.readFileSync('public/manuals/mueller-inst-054-changeover-manifold.pdf').subarray(0,5).toString(), '%PDF-')
})
