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

test('manual and training filters search beyond the first forty article matches', () => {
 const { searchResourcePage } = require('../lib/knowledge/search.ts')
 const crowded = Array.from({length:60}, (_,i) => ({id:`topic${i}`,kind:'knowledge',title:'Defrost',description:'',href:`/knowledge/topic${i}`}))
 crowded.push({id:'manual',kind:'manual',title:'Service guide',description:'defrost',href:'/api/pdf?docId=test'})
 crowded.push({id:'practice',kind:'practice',title:'Bunker trainer',description:'defrost',href:'/simulation/dt-bunker'})
 assert.equal(searchResourcePage(crowded, 'defrost').total,62)
 assert.equal(searchResourcePage(crowded, 'defrost').results.length,40)
 assert.equal(searchResourcePage(crowded, 'defrost', 'manuals').results[0].id,'manual')
 assert.equal(searchResourcePage(crowded, 'defrost', 'learn').results[0].id,'practice')
})
test('excluded controllers do not surface the Next Gen procedure as an answer', () => {
 for (const query of ['Traulsen legacy defrost','Traulsen SET-key defrost']) {
   assert.ok(!searchResources(resources, query).some(r => r.kind === 'procedure'))
 }
 assert.ok(searchResources(resources, 'Traulsen next gen defrost').some(r => r.kind === 'procedure'))
})
test('wiring trainer histories remain separate and unknown legacy scenarios are not misattributed', () => {
 const { simulatorSummaries } = require('../lib/simulation/summaries.ts')
 const rows = [['mt-cmp-208-open',90],['bitzer-208-olc-open',40],['copeland-dc-208-open',null],['safety-circuit-208',80],['unclassified',100]]
   .map(([scenario_id,score]) => ({rack:'safety-circuit',scenario_id,score,created_at:'2026-10-22T10:00:00Z'}))
 const summary = simulatorSummaries(rows)
 assert.equal(summary['/simulation/micro-thermo-control'].bestScore,90)
 assert.equal(summary['/simulation/bitzer-control'].bestScore,40)
 assert.equal(summary['/simulation/copeland-control'].bestScore,null)
 assert.equal(summary['/simulation/safety-circuit'].attempts,1)
 assert.equal(summary['/simulation/safety-circuit'].bestScore,80)
})
test('related practice links use real topic slugs and existing app routes', () => {
 const { practiceForTopic } = require('../lib/learning/connections.ts')
 const { TOPICS } = require('../lib/knowledge/topics.ts')
 for (const slug of ['traulsen','defrost-systems','micro-thermo','copeland','bitzer','hussmann','co2-transcritical','math-electrical']) {
   assert.ok(TOPICS.some(t => t.slug === slug),slug)
   const related = practiceForTopic(slug)
   assert.ok(related.length,slug)
   for (const r of related) assert.ok(fs.existsSync(path.resolve(`app${r.href}/page.tsx`)),r.href)
 }
 assert.deepEqual(practiceForTopic('unrelated-topic'),[])
})

test('every learning path is discoverable and all step links and article anchors resolve', () => {
 const { LEARNING_PATH_DETAILS } = require('../lib/learning/paths.ts')
 const { LEARNING_PATHS } = require('../lib/learning/resources.ts')
 const { TOPICS } = require('../lib/knowledge/topics.ts')
 const { slugifySection } = require('../lib/knowledge/slugify.ts')
 assert.equal(new Set(LEARNING_PATH_DETAILS.map(p => p.slug)).size,LEARNING_PATH_DETAILS.length)
 for (const learning of LEARNING_PATH_DETAILS) {
   assert.ok(LEARNING_PATHS.some(p => p.href === learning.href))
   assert.ok(searchResources(resources, learning.title).some(r => r.href === learning.href),learning.title)
   assert.equal(new Set(learning.steps.map(s => s.id)).size,learning.steps.length)
   assert.ok(learning.check.correct >= 0 && learning.check.correct < learning.check.choices.length)
   assert.ok(learning.check.choices.every(c => c.feedback && c.text))
   const links = [{href:learning.href}, ...learning.steps.flatMap(s => [...s.links, ...(s.branches ?? []).flatMap(b => b.links ?? [])]), learning.check.reference]
   for (const link of links) {
     const [pathname,anchor] = link.href.split('#')
     assert.ok(pathname.startsWith('/'),link.href)
     if (pathname.startsWith('/knowledge/')) {
       const topic = TOPICS.find(t => t.slug === pathname.slice('/knowledge/'.length))
       assert.ok(topic,link.href)
       if (anchor) assert.ok([...topic.content.matchAll(/^### (.+)$/gm)].some(m => slugifySection(m[1]) === anchor),link.href)
     } else {
       assert.ok(fs.existsSync(path.resolve(`app${pathname}/page.tsx`)),link.href)
       if (anchor && pathname.startsWith('/learn/')) {
         const target = LEARNING_PATH_DETAILS.find(p => p.href === pathname)
         assert.ok(target?.steps.some(s => s.id === anchor),link.href)
       }
     }
   }
 }
})

test('defrost learning leads with rack cases and keeps self-contained equipment explicit', () => {
 const { getLearningPath } = require('../lib/learning/paths.ts')
 const defrost = getLearningPath('defrost')
 assert.doesNotMatch(JSON.stringify(defrost), /traulsen/i)
 const branches = defrost.steps.flatMap(s => s.branches ?? [])
 assert.ok(branches.some(b => /Rack-fed electric/.test(b.title)))
 assert.ok(branches.some(b => /hot-gas or off-cycle/.test(b.title)))
 assert.ok(branches.some(b => /Self-contained/.test(b.title)))
 assert.ok(defrost.steps.flatMap(s => s.links).some(l => l.href === '/simulation/dt-bunker'))
})
test('service method establishes scope before airflow, controls and refrigeration, then verifies', () => {
 const { getLearningPath } = require('../lib/learning/paths.ts')
 const service = getLearningPath('service-call-methodology')
 assert.deepEqual(service.steps.map(s => s.id), ['complaint','scope','airflow','electrical','refrigeration','test','verify','report'])
 assert.equal(service.steps.find(s => s.id === 'scope').branches.length,4)
 assert.match(service.audience,/power loss/)
 assert.match(service.steps.find(s => s.id === 'verify').body,/every affected circuit/)
 assert.ok(searchResources(resources,'service call methodology').some(r => r.href === service.href))
})
