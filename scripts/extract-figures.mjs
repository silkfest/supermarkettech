/**
 * extract-figures.mjs
 *
 * Scans a document's PDF for diagrams and figures, classifies them with Claude
 * vision, and stores them in doc_images (linked to knowledge topic slugs).
 *
 * Usage:
 *   node scripts/extract-figures.mjs --docId <uuid>
 *   node scripts/extract-figures.mjs --all          # process all unprocessed docs
 *
 * Requires (in .env.local):
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 *   ANTHROPIC_API_KEY
 */

import { createCanvas } from '@napi-rs/canvas'
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs'
import { createClient } from '@supabase/supabase-js'
import Anthropic from '@anthropic-ai/sdk'
import { resolve, dirname } from 'path'
import { pathToFileURL, fileURLToPath } from 'url'
import { config } from 'dotenv'

config({ path: resolve(dirname(fileURLToPath(import.meta.url)), '..', '.env.local') })

// ── Config ─────────────────────────────────────────────────────────────────────

const STORAGE_BUCKET   = 'documents'
const IMAGE_BUCKET     = 'diagram-images'
const RENDER_SCALE     = 2.0
const MIN_WORDS_TO_SKIP = 300  // pages with more words than this are pure text, skip
const FIGURE_PATTERN   = /\b(fig(?:ure)?\.?\s*\d[\d.-]*|photo\s*\d|diagram\s*\d)/i

const workerPath = resolve(dirname(fileURLToPath(import.meta.url)), '../node_modules/pdfjs-dist/legacy/build/pdf.worker.mjs')
pdfjsLib.GlobalWorkerOptions.workerSrc = pathToFileURL(workerPath).href

const standardFontPath = pathToFileURL(
  resolve(dirname(fileURLToPath(import.meta.url)), '../node_modules/pdfjs-dist/standard_fonts/')
).href + '/'

const TOPICS = [
  { slug: 'refrigeration-fundamentals', title: 'Refrigeration Fundamentals' },
  { slug: 'system-diagnostics',         title: 'System Fault Diagnosis' },
  { slug: 'defrost-systems',            title: 'Defrost Systems' },
  { slug: 'sporlan',                    title: 'Sporlan Valves & Controls' },
  { slug: 'copeland',                   title: 'Copeland / Emerson Compressors' },
  { slug: 'hussmann',                   title: 'Hussmann Equipment' },
  { slug: 'danfoss',                    title: 'Danfoss Controls & Valves' },
  { slug: 'bitzer',                     title: 'Bitzer Compressors' },
  { slug: 'parallel-rack-systems',      title: 'Parallel Rack Systems (HFC Multiplex)' },
  { slug: 'rack-sequence-of-events',    title: 'Parallel Rack — Sequence of Events' },
  { slug: 'walk-in-troubleshooting',    title: 'Walk-In Cooler & Freezer Troubleshooting' },
  { slug: 'filter-driers',             title: 'Filter-Drier Selection & Burnout Cleanup' },
  { slug: 'solenoid-valves',           title: 'Solenoid Valve Troubleshooting' },
  { slug: 'heat-reclaim',              title: 'Heat Reclaim Systems' },
  { slug: 'math-electrical',           title: 'Math & Electrical Reference' },
  { slug: 'vfd',                        title: 'Variable Frequency Drives' },
  { slug: 'refrigerant-retrofit',      title: 'Refrigerant Retrofit (R-404A → R-448A/449A)' },
  { slug: 'lennox-rtu',               title: 'Lennox Rooftop Units' },
  { slug: 'carrier-rtu',              title: 'Carrier Rooftop Units' },
  { slug: 'york-rtu',                 title: 'York Rooftop Units' },
  { slug: 'trane-rtu',               title: 'Trane Rooftop Units' },
  { slug: 'rtu-diagnostics',         title: 'RTU Fault Diagnosis' },
  { slug: 'kysor-warren',            title: 'Kysor Warren Display Cases' },
  { slug: 'temprite',                title: 'Temprite Oil Management' },
  { slug: 'emerson-e2-e3',          title: 'Emerson E2 / E3 Controllers' },
  { slug: 'dixell',                  title: 'Dixell Controllers' },
  { slug: 'heat-reclaim',           title: 'Heat Reclaim' },
]

// ── Canvas factory for pdfjs ───────────────────────────────────────────────────

class NodeCanvasFactory {
  create(w, h)                     { const c = createCanvas(w, h); return { canvas: c, context: c.getContext('2d') } }
  reset({ canvas }, w, h)          { canvas.width = w; canvas.height = h }
  destroy()                        {}
}

// ── Supabase & Anthropic clients ───────────────────────────────────────────────

function makeSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  return createClient(url, key, { auth: { persistSession: false } })
}

function makeAnthropic() {
  if (!process.env.ANTHROPIC_API_KEY) throw new Error('Missing ANTHROPIC_API_KEY')
  return new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
}

// ── Render a single PDF page to PNG buffer ─────────────────────────────────────

async function renderPage(pdf, pageNum) {
  const page      = await pdf.getPage(pageNum)
  const viewport  = page.getViewport({ scale: RENDER_SCALE })
  const factory   = new NodeCanvasFactory()
  const { canvas, context } = factory.create(Math.ceil(viewport.width), Math.ceil(viewport.height))
  await page.render({ canvasContext: context, viewport, canvasFactory: factory }).promise
  return canvas.toBuffer('image/png')
}

// ── Classify a rendered page with Claude vision ────────────────────────────────

async function classifyPage(anthropic, pngBuffer, pageNum, docTitle) {
  const topicList = TOPICS.map(t => `  - "${t.slug}": ${t.title}`).join('\n')
  const prompt = `This is page ${pageNum} from a document titled "${docTitle}".

Determine:
1. Is this page primarily a diagram, schematic, photograph, chart, or technical figure (rather than mostly body text)?
2. If yes: briefly describe what it shows (1-2 sentences, technical terminology welcome).
3. If yes: what figure number or caption is visible, if any?
4. If yes: which single knowledge topic from the list below best matches this figure?

Knowledge topics:
${topicList}

Respond ONLY with valid JSON (no markdown fences):
{
  "is_figure": true/false,
  "description": "...",
  "caption": "...",
  "topic_slug": "slug-from-list-or-null"
}`

  const response = await anthropic.messages.create({
    model:      'claude-haiku-4-5-20251001',
    max_tokens: 256,
    messages: [{
      role: 'user',
      content: [
        {
          type:       'image',
          source:     { type: 'base64', media_type: 'image/png', data: pngBuffer.toString('base64') },
        },
        { type: 'text', text: prompt },
      ],
    }],
  })

  try {
    const text = response.content[0].text.trim()
    return JSON.parse(text)
  } catch {
    return { is_figure: false, description: '', caption: '', topic_slug: null }
  }
}

// ── Check a page for figure candidates using text heuristics ──────────────────

async function getPageText(pdf, pageNum) {
  const page       = await pdf.getPage(pageNum)
  const textContent = await page.getTextContent()
  return textContent.items.map(item => item.str ?? '').join(' ').trim()
}

function isFigureCandidate(pageText) {
  const wordCount = pageText.split(/\s+/).filter(Boolean).length
  if (wordCount < 20)  return true                    // almost no text = likely full-page diagram
  if (wordCount < MIN_WORDS_TO_SKIP && FIGURE_PATTERN.test(pageText)) return true
  return false
}

// ── Process a single document ─────────────────────────────────────────────────

async function processDocument(supabase, anthropic, docId) {
  // Load document metadata
  const { data: doc, error } = await supabase
    .from('documents')
    .select('id, title, file_name, status')
    .eq('id', docId)
    .single()

  if (error || !doc) throw new Error(`Document ${docId} not found`)
  console.log(`\n📄 ${doc.title}`)
  console.log(`   Status: ${doc.status}`)

  // Delete any previously extracted figures so we can re-run cleanly
  const { data: existing } = await supabase
    .from('doc_images')
    .select('storage_path')
    .eq('document_id', docId)

  if (existing?.length) {
    console.log(`   Removing ${existing.length} previously extracted figures...`)
    for (const row of existing) {
      await supabase.storage.from(IMAGE_BUCKET).remove([row.storage_path])
    }
    await supabase.from('doc_images').delete().eq('document_id', docId)
  }

  // Download PDF
  console.log('   Downloading PDF...')
  const { data: blob, error: dlErr } = await supabase.storage.from(STORAGE_BUCKET).download(doc.file_name)
  if (dlErr || !blob) throw new Error(`Download failed: ${dlErr?.message}`)
  const arrayBuf = await blob.arrayBuffer()

  // Load with pdfjs
  const pdf = await pdfjsLib.getDocument({
    data:                new Uint8Array(arrayBuf),
    standardFontDataUrl: standardFontPath,
  }).promise
  const pageCount = pdf.numPages
  console.log(`   Pages: ${pageCount}`)

  // Scan pages for figure candidates
  console.log('   Scanning pages for figures...')
  const candidates = []
  for (let p = 1; p <= pageCount; p++) {
    process.stdout.write(`\r   Scanning page ${p}/${pageCount}...`)
    const text = await getPageText(pdf, p)
    if (isFigureCandidate(text)) {
      candidates.push({ pageNum: p, snippet: text.slice(0, 120) })
    }
  }
  process.stdout.write('\n')
  console.log(`   Found ${candidates.length} candidate pages`)

  if (candidates.length === 0) {
    console.log('   No figures detected.')
    return { extracted: 0 }
  }

  // Render + classify candidates
  console.log('   Rendering and classifying with Claude...')
  const figures = []
  for (const [i, candidate] of candidates.entries()) {
    process.stdout.write(`\r   Page ${candidate.pageNum} (${i + 1}/${candidates.length})...`)
    try {
      const png    = await renderPage(pdf, candidate.pageNum)
      const result = await classifyPage(anthropic, png, candidate.pageNum, doc.title)

      if (!result.is_figure) continue

      // Upload PNG to storage
      const storagePath = `${docId}/page-${candidate.pageNum}.png`
      const { error: uploadErr } = await supabase.storage
        .from(IMAGE_BUCKET)
        .upload(storagePath, png, { contentType: 'image/png', upsert: true })

      if (uploadErr) {
        console.error(`\n   Upload failed for page ${candidate.pageNum}: ${uploadErr.message}`)
        continue
      }

      figures.push({
        document_id:  docId,
        page_number:  candidate.pageNum,
        caption:      result.caption || null,
        description:  result.description || null,
        topic_slug:   result.topic_slug || null,
        storage_path: storagePath,
      })

      const topicLabel = result.topic_slug ? ` → ${result.topic_slug}` : ''
      console.log(`\n   ✓ p${candidate.pageNum}: ${result.caption || 'figure'}${topicLabel}`)
    } catch (err) {
      console.error(`\n   Error on page ${candidate.pageNum}: ${err.message}`)
    }
  }

  // Insert all figures into doc_images
  if (figures.length > 0) {
    const { error: insertErr } = await supabase.from('doc_images').insert(figures)
    if (insertErr) throw new Error(`Insert failed: ${insertErr.message}`)
  }

  console.log(`\n   ✅ Extracted ${figures.length} figures from ${doc.title}`)
  return { extracted: figures.length }
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  const args   = process.argv.slice(2)
  const docIdx = args.indexOf('--docId')
  const all    = args.includes('--all')

  if (!all && docIdx === -1) {
    console.error('Usage:\n  node scripts/extract-figures.mjs --docId <uuid>\n  node scripts/extract-figures.mjs --all')
    process.exit(1)
  }

  const supabase   = makeSupabase()
  const anthropic  = makeAnthropic()

  let docIds = []

  if (all) {
    const { data } = await supabase
      .from('documents')
      .select('id')
      .eq('status', 'READY')
      .order('created_at', { ascending: false })
    docIds = (data ?? []).map(d => d.id)
    console.log(`Processing all ${docIds.length} READY documents`)
  } else {
    docIds = [args[docIdx + 1]]
  }

  let totalExtracted = 0
  for (const id of docIds) {
    try {
      const { extracted } = await processDocument(supabase, anthropic, id)
      totalExtracted += extracted
    } catch (err) {
      console.error(`\nFailed for doc ${id}: ${err.message}`)
    }
  }

  console.log(`\n🎉 Done! Total figures extracted: ${totalExtracted}`)
}

main().catch(err => {
  console.error('Fatal:', err)
  process.exit(1)
})
