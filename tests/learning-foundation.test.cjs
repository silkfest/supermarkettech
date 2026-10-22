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
    compilerOptions: { esModuleInterop: true, module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.ReactJSX }
  }).outputText, filename)
}


const { staticResources } = require('../lib/knowledge/catalog.ts')
const { searchResources } = require('../lib/knowledge/search.ts')
const { buildKnowledgeContext } = require('../lib/knowledge/chat-context.ts')
const { practiceTarget, hasFieldSignoff } = require('../lib/apprentice/practiceEvidence.ts')
const resources = staticResources()
test('Traulsen defrost search prioritises the scoped Next Gen procedure', () => {
 const hits = searchResources(resources, 'Traulsen force defrost')
 assert.equal(hits[0].kind, 'procedure')
 assert.match(hits[0].applicability, /not the legacy/)
 assert.match(hits[0].content, /five seconds/)
})
test('field abbreviations and CO2 typography find relevant resources', () => {
 assert.ok(searchResources(resources, 'MT SLA').some(r => r.href === '/simulation/micro-thermo-control'))
 assert.ok(searchResources(resources, 'CO₂ booster').some(r => r.href === '/simulation/co2-booster'))
 assert.equal(searchResources(resources, 'nonexistentbrand998 defrost').length, 0)
})
test('chat can retrieve Traulsen outside the old static prompt list', () => {
 const text = buildKnowledgeContext(resources, 'How do I force defrost on my Traulsen?')
 assert.match(text, /five seconds/)
 assert.match(text, /TR35731/)
 assert.match(text, /not the legacy/)
})
test('an unrelated question does not silently reuse the preceding equipment', () => {
 assert.match(buildKnowledgeContext(resources, 'unknownbrand998 drive fault', 'Traulsen force defrost'), /No matching/)
})
test('wiring trainers cannot earn credit from another trainer sharing the rack key', () => {
 assert.equal(practiceTarget('/simulation/micro-thermo-control').scenarioPrefix, 'mt-cmp-')
 assert.equal(practiceTarget('/simulation/bitzer-control').scenarioPrefix, 'bitzer-')
 assert.equal(practiceTarget('/simulation/safety-circuit').scenarioPrefix, 'safety-circuit')
 assert.equal(practiceTarget('https://other.example/simulation/dt-bunker'), null)
 assert.equal(practiceTarget('/simulation/untracked'), null)
})
test('field credit requires another reviewer and a completed task', () => {
 assert.equal(hasFieldSignoff(null, 'learner'), false)
 assert.equal(hasFieldSignoff({status:'pending_review', verified_by:'reviewer'}, 'learner'), false)
 assert.equal(hasFieldSignoff({status:'completed', verified_by:'learner'}, 'learner'), false)
 assert.equal(hasFieldSignoff({status:'completed', verified_by:'reviewer'}, 'learner'), true)
})

test('completion API rejects missing practice, pending field work and unassigned access without writes', async () => {
 const client = require('../lib/supabase/client.ts')
 const originalServer = client.getSupabaseServer
 const originalAuth = client.getSupabaseRouteAuth
 let rows = {}, writes = 0
 const db = { from(table) {
   const q = { select(){return q}, eq(){return q}, or(){return q}, like(){return q}, limit(){return q},
     upsert(){writes++; return q}, single(){return Promise.resolve({data:rows[table] ?? null,error:null})},
     maybeSingle(){return q.single()} }
   return q
 } }
 client.getSupabaseServer = () => db
 client.getSupabaseRouteAuth = () => ({auth:{getUser:async()=>({data:{user:{id:'learner'}}})}})
 try {
  const { POST } = require('../app/api/apprentice/lessons/[lessonId]/complete/route.ts')
  const request = new Request('http://localhost/api/complete', {method:'POST'})
  const params = {params:Promise.resolve({lessonId:'lesson'})}
  rows = {users:{role:'apprentice'},course_assignments:{id:'assigned'},course_lessons:{lesson_type:'simulator',course_id:'course',simulator_path:'/simulation/dt-bunker'}}
  assert.equal((await POST(request, params)).status,409)
  rows.course_lessons = {lesson_type:'field_task',course_id:'course',training_task_id:'task'}
  rows.apprentice_progress = {status:'pending_review',verified_by:null}
  assert.equal((await POST(request, params)).status,409)
  rows.course_assignments = null
  assert.equal((await POST(request, params)).status,403)
  assert.equal(writes,0)
 } finally {client.getSupabaseServer=originalServer;client.getSupabaseRouteAuth=originalAuth}
})
