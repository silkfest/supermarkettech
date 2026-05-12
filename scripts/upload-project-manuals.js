/**
 * upload-project-manuals.js
 *
 * Uploads PDFs from the Claude Projects / Supermarket Tech Expert / Manuals folder
 * into ColdIQ's document pipeline (Supabase Storage + doc_chunks) and creates
 * a matching manual_components catalog entry for each one.
 *
 * Usage:
 *   node scripts/upload-project-manuals.js
 */

// @ts-check
const fs   = require('fs')
const path = require('path')

const dotenv = require('dotenv')
dotenv.config({ path: path.join(__dirname, '..', '.env.local') })

const { createClient } = require('@supabase/supabase-js')
const pdfParse = require('pdf-parse')

const STORAGE_BUCKET = 'documents'
const JINA_API_KEY   = process.env.JINA_API_KEY ?? ''
const JINA_EMBED_URL = 'https://api.jina.ai/v1/embeddings'
const JINA_MODEL     = 'jina-embeddings-v3'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
)

const MANUALS_DIR = "C:\\Users\\bensi\\OneDrive\\Documents\\Claude\\Projects\\Supermarket Tech Expert\\Manuals"

/**
 * Each entry:
 *   file        – filename in MANUALS_DIR
 *   category    – document category (used for storage path + library filter)
 *   comp        – manual_components row to upsert (null = skip registry entry)
 */
const FILES = [
  // ── Already indexed — will be skipped automatically ──────────────────────
  {
    file: 'Hussmann Parallel Rack Systems.pdf',
    category: 'Rack System',
    comp: null, // already inserted manually
  },
  {
    file: 'RL Doors.pdf',
    category: 'Display Cases',
    comp: null, // already inserted manually
  },

  // ── New files ─────────────────────────────────────────────────────────────

  {
    file: '4851028_EN-DE-FR _BoosterMWT_rev8.1_20220321.pdf',
    category: 'Rack System',
    comp: {
      type: 'Rack System', manufacturer: 'Danfoss', model: 'Booster MWT',
      manual_title: 'Booster MWT Manual',
      system_type: 'CO2', system_area: 'Rack',
    },
  },
  {
    file: 'Advansor CO2 Rack.pdf',
    category: 'Rack System',
    comp: {
      type: 'Rack System', manufacturer: 'Advansor', model: 'CO2 Rack',
      manual_title: 'Advansor CO2 Rack',
      system_type: 'CO2', system_area: 'Rack',
    },
  },
  {
    file: 'Advansor-Booster-Installation-Startup-Operating Manual 06-06-2022-v2(1).pdf',
    category: 'Rack System',
    comp: {
      type: 'Rack System', manufacturer: 'Advansor', model: 'CO2 Booster',
      manual_title: 'Advansor Booster Installation & Startup Manual',
      system_type: 'CO2', system_area: 'Rack',
    },
  },
  {
    file: 'Bitzer CO2 Rack Manual.pdf',
    category: 'Rack System',
    comp: {
      type: 'Rack System', manufacturer: 'Bitzer', model: 'CO2 Rack',
      manual_title: 'Bitzer CO2 Rack Manual',
      system_type: 'CO2', system_area: 'Rack',
    },
  },
  {
    file: 'CO2one-cdu-systems-i-o-manual.pdf',
    category: 'Rack System',
    comp: {
      type: 'Rack System', manufacturer: 'CO2one', model: 'CDU Systems',
      manual_title: 'CO2one CDU Systems I/O Manual',
      system_type: 'CO2', system_area: 'Rack',
    },
  },
  {
    file: 'Carnot CAR-090_General Instructions - Supermarkets.pdf',
    category: 'Rack System',
    comp: {
      type: 'Rack System', manufacturer: 'Carnot', model: 'CAR-090',
      manual_title: 'Carnot CAR-090 General Instructions (Supermarkets)',
      system_type: 'CO2', system_area: 'Rack',
    },
  },
  {
    file: 'Carnot CO2 Warehouse.pdf',
    category: 'Rack System',
    comp: {
      type: 'Rack System', manufacturer: 'Carnot', model: 'CO2 Warehouse',
      manual_title: 'Carnot CO2 Warehouse',
      system_type: 'CO2', system_area: 'Rack',
    },
  },
  {
    file: 'Carnot GC Sensor Installation Instructions E00XXX - D01 rev00 20251015.pdf',
    category: 'Controls',
    comp: {
      type: 'Gas Detector', manufacturer: 'Carnot', model: 'GC Sensor E00XXX',
      manual_title: 'Carnot GC Sensor Installation Instructions',
      system_type: 'CO2', system_area: '',
    },
  },
  {
    file: 'Danfoss Refrigeration Basics.pdf',
    category: 'General',
    comp: {
      type: 'Other', manufacturer: 'Danfoss', model: 'Refrigeration Basics',
      manual_title: 'Danfoss Refrigeration Basics',
      system_type: 'Both', system_area: '',
    },
  },
  {
    file: 'Evapco-LMP-CO2-Hot-Gas-Defrost-–-Superheat-Head-Pressure-Oil-Control.pdf',
    category: 'Rack System',
    comp: {
      type: 'Rack Controller', manufacturer: 'Evapco LMP', model: 'CO2 Hot Gas Defrost Control',
      manual_title: 'Evapco LMP CO2 Hot Gas Defrost / Superheat / Head Pressure / Oil Control',
      system_type: 'CO2', system_area: 'Rack',
    },
  },
  {
    file: 'EvapcoLMP-co2-transcritical-systems-training-manual-eng-1.pdf',
    category: 'Rack System',
    comp: {
      type: 'Rack System', manufacturer: 'Evapco LMP', model: 'CO2 Transcritical',
      manual_title: 'Evapco LMP CO2 Transcritical Systems Training Manual',
      system_type: 'CO2', system_area: 'Rack',
    },
  },
  {
    file: 'Hussmann CO2 Manual PN_3182569_IO_TC_CO2_EN.pdf',
    category: 'Rack System',
    comp: {
      type: 'Rack System', manufacturer: 'Hussmann', model: 'TC CO2 (PN 3182569)',
      manual_title: 'Hussmann CO2 Transcritical Rack Manual (PN 3182569)',
      system_type: 'CO2', system_area: 'Rack',
    },
  },
  {
    file: 'TEWIS manual for CO2 COMPRESSOR RACKS-EN.pdf',
    category: 'Rack System',
    comp: {
      type: 'Rack System', manufacturer: 'TEWIS', model: 'CO2 Compressor Rack',
      manual_title: 'TEWIS CO2 Compressor Rack Manual',
      system_type: 'CO2', system_area: 'Rack',
    },
  },
  {
    file: 'Zero Zone CO2-Packaged-Systems-Manual_66-0168-A-6 (1) (1).pdf',
    category: 'Rack System',
    comp: {
      type: 'Rack System', manufacturer: 'Zero Zone', model: 'CO2 Packaged Systems (66-0168)',
      manual_title: 'Zero Zone CO2 Packaged Systems Manual',
      system_type: 'CO2', system_area: 'Rack',
    },
  },
  {
    file: 'msd-parallel-compressors-and-enviroguard.pdf',
    category: 'Rack System',
    comp: {
      type: 'Rack System', manufacturer: 'MSD', model: 'Parallel Compressors & EnviroGuard',
      manual_title: 'MSD Parallel Compressors & EnviroGuard',
      system_type: 'HFC', system_area: 'Rack',
    },
  },
]

// ── Helpers ───────────────────────────────────────────────────────────────────

function sanitizePathSegment(str) {
  return str
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-zA-Z0-9._\-() ]/g, '_')
    .replace(/_+/g, '_')
    .trim()
}

function sanitizeText(text) {
  return text
    .replace(/[\uD800-\uDFFF]/g, ' ')
    .replace(/\0/g, ' ')
    .replace(/[\x01-\x08\x0B\x0C\x0E-\x1F\x7F]/g, ' ')
}

function chunkText(text) {
  const TARGET_WORDS  = 375
  const OVERLAP_WORDS = 38
  const paragraphs = text.split(/\n\s*\n/).filter(p => p.trim().length > 10)
  const chunks = []
  let current = [], wordCount = 0, idx = 0
  for (const para of paragraphs) {
    const words = para.trim().split(/\s+/)
    if (wordCount + words.length > TARGET_WORDS && current.length > 0) {
      chunks.push({ content: current.join('\n\n').trim(), chunkIndex: idx++ })
      const overlapWords = current.join(' ').split(/\s+/).slice(-OVERLAP_WORDS)
      current = [overlapWords.join(' ')]
      wordCount = OVERLAP_WORDS
    }
    current.push(para.trim())
    wordCount += words.length
  }
  if (current.length > 0) chunks.push({ content: current.join('\n\n').trim(), chunkIndex: idx++ })
  return chunks
}

async function jinaEmbed(texts) {
  const MAX_ATTEMPTS = 5
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const res = await fetch(JINA_EMBED_URL, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${JINA_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ input: texts.map(t => t.slice(0, 32000)), model: JINA_MODEL, task: 'retrieval.passage' }),
    })
    if (res.status === 429 && attempt < MAX_ATTEMPTS - 1) {
      const wait = attempt < 2 ? 65000 : 120000
      console.log(`  [Jina] rate limited, waiting ${Math.round(wait/1000)}s…`)
      await new Promise(r => setTimeout(r, wait))
      continue
    }
    if (!res.ok) throw new Error(`Jina error ${res.status}: ${await res.text()}`)
    return (await res.json()).data.map(d => d.embedding)
  }
  throw new Error('Jina embed failed after max retries')
}

async function ingestDocument(documentId, text, pageCount) {
  const chunks = chunkText(text)
  if (chunks.length === 0) throw new Error('No text chunks produced')

  const BATCH = 20
  const allEmbeddings = []
  for (let i = 0; i < chunks.length; i += BATCH) {
    const embeddings = await jinaEmbed(chunks.slice(i, i + BATCH).map(c => c.content))
    allEmbeddings.push(...embeddings)
    process.stdout.write(`  embedded ${Math.min(i + BATCH, chunks.length)}/${chunks.length} chunks\r`)
  }
  console.log()

  const rows = chunks.map((c, i) => ({
    document_id: documentId,
    content:     c.content,
    chunk_index: c.chunkIndex,
    embedding:   allEmbeddings[i],
  }))

  for (let i = 0; i < rows.length; i += 50) {
    const { error } = await supabase.from('doc_chunks').insert(rows.slice(i, i + 50))
    if (error) throw error
  }

  await supabase.from('documents').update({ status: 'READY', page_count: pageCount ?? null }).eq('id', documentId)
}

async function upsertComponent(documentId, comp) {
  // Skip if a catalog entry already exists for this document
  const { data: existing } = await supabase
    .from('manual_components')
    .select('id')
    .eq('document_id', documentId)
    .maybeSingle()
  if (existing) {
    console.log('   component entry already exists — skipping')
    return
  }

  const { error } = await supabase.from('manual_components').insert({
    type:         comp.type,
    manufacturer: comp.manufacturer,
    model:        comp.model,
    serial:       '',
    manual_id:    '',
    manual_title: comp.manual_title ?? '',
    manual_url:   '',
    store_name:   '',
    rack_label:   '',
    status:       'active',
    defrost_type: '',
    load_category:'',
    supplier:     comp.manufacturer,
    part_number:  '',
    system_type:  comp.system_type ?? 'Both',
    system_area:  comp.system_area ?? '',
    document_id:  documentId,
  })
  if (error) throw error
  console.log(`   ✓ component entry created (${comp.type} · ${comp.manufacturer} ${comp.model})`)
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log('\nColdIQ — uploading project manuals\n')

  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
    process.exit(1)
  }
  if (!JINA_API_KEY) { console.error('Missing JINA_API_KEY'); process.exit(1) }

  let ingested = 0, skipped = 0, failed = 0

  for (const { file, category, comp } of FILES) {
    const localPath   = path.join(MANUALS_DIR, file)
    const title       = file.replace(/\.pdf$/i, '')
    const storagePath = `manuals/${sanitizePathSegment(category)}/${sanitizePathSegment(file)}`

    console.log(`\n── ${title}`)
    console.log(`   storage  : ${storagePath}`)

    if (!fs.existsSync(localPath)) {
      console.error(`   NOT FOUND: ${localPath}`)
      failed++
      continue
    }

    // Skip if already READY; still try to create component entry if missing
    const { data: existing } = await supabase
      .from('documents').select('id, status').eq('file_name', storagePath).maybeSingle()

    if (existing?.status === 'READY') {
      console.log('   already READY — skipping ingest')
      skipped++
      if (comp) await upsertComponent(existing.id, comp).catch(e => console.error(`   comp error: ${e.message}`))
      continue
    }

    // Clean up any previous failed/stuck row
    if (existing) {
      await supabase.from('doc_chunks').delete().eq('document_id', existing.id)
      await supabase.from('manual_components').delete().eq('document_id', existing.id)
      await supabase.from('documents').delete().eq('id', existing.id)
    }

    try {
      const fileBytes = fs.readFileSync(localPath)
      const fileSize  = fileBytes.length

      // Upload to storage
      process.stdout.write('   uploading to storage… ')
      const { error: uploadErr } = await supabase.storage
        .from(STORAGE_BUCKET)
        .upload(storagePath, fileBytes, { contentType: 'application/pdf', upsert: true })
      if (uploadErr) throw uploadErr
      console.log('done')

      // Extract text
      process.stdout.write('   extracting text… ')
      const pdfData = await pdfParse(fileBytes)
      const text    = sanitizeText(pdfData.text)
      console.log(`${pdfData.numpages} pages, ${text.length} chars`)

      // Insert document record
      const { data: doc, error: docErr } = await supabase
        .from('documents')
        .insert({ title, source_type: 'UPLOAD', status: 'PROCESSING', file_name: storagePath, file_size: fileSize, category })
        .select().single()
      if (docErr || !doc) throw docErr ?? new Error('No doc returned')

      // Chunk + embed + insert
      console.log(`   chunking & embedding…`)
      await ingestDocument(doc.id, text, pdfData.numpages)
      console.log(`   ✓ READY  (id: ${doc.id})`)

      // Create component registry entry
      if (comp) await upsertComponent(doc.id, comp)

      ingested++
    } catch (err) {
      console.error(`   ✗ FAILED: ${err.message}`)
      failed++
    }
  }

  console.log(`\nDone. ingested=${ingested} skipped=${skipped} failed=${failed}\n`)
}

main().catch(err => { console.error(err); process.exit(1) })
