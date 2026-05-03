/**
 * import-manuals.js
 *
 * Bulk-imports all PDFs from the LMP CO2 store USB drive into ColdIQ's
 * document pipeline (Supabase Storage + doc_chunks with Jina embeddings).
 *
 * Usage:
 *   node -r dotenv/config scripts/import-manuals.js
 *
 * Requires env vars (from .env.local):
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 *   JINA_API_KEY
 */

// @ts-check
const fs   = require('fs')
const path = require('path')

// Load dotenv manually so we can run with node -r dotenv/config
const dotenv = require('dotenv')
dotenv.config({ path: path.join(__dirname, '..', '.env.local') })

const { createClient } = require('@supabase/supabase-js')
const pdfParse = require('pdf-parse')

// ── Config ────────────────────────────────────────────────────────────────────

const USB_ROOT = "C:\\Users\\bensi\\OneDrive\\Documents\\Owner's Manual (USB)"
const STORAGE_BUCKET = 'documents'
const JINA_API_KEY = process.env.JINA_API_KEY ?? ''
const JINA_EMBED_URL = 'https://api.jina.ai/v1/embeddings'
const JINA_MODEL = 'jina-embeddings-v3'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
)

// ── Category mapping from folder name ─────────────────────────────────────────
// Strips leading "Section XX - " prefix from folder name
function folderToCategory(folderName) {
  // Remove leading "Section 00 - " style prefixes
  const stripped = folderName.replace(/^Section\s+\d+\s+-\s+/i, '').trim()
  // Normalise common variations
  const MAP = {
    'Compressor':                  'Compressor',
    'Electronic valve':            'Electronic Valve',
    'Component':                   'Component',
    'Electrical':                  'Electrical',
    'Heat transfert':              'Heat Transfer',
    'Heat transfer':               'Heat Transfer',
    'Piping & Technique':          'Piping',
    'Piping':                      'Piping',
    'Start up':                    'Start Up',
    'Coolant & Lubricant':         'Coolant & Lubricant',
    'Installation requirment':     'Installation',
    'Installation':                'Installation',
    'Maintenance':                 'Maintenance',
    'Stand-by generator & Condensing unit': 'Stand-by Generator',
    'Warranty':                    'Warranty',
    'Certification':               'Certification',
    'Refrigeration requierement':  'Refrigeration',
    'Refrigeration requirement':   'Refrigeration',
    'Pressure vessel':             'Pressure Vessel',
    'Table of contents':           'General',
  }
  return MAP[stripped] ?? stripped ?? 'General'
}

// ── Sanitize a string for use as a Supabase Storage path segment ──────────────
// Strips diacritics and removes characters that Storage rejects
function sanitizePathSegment(str) {
  return str
    .normalize('NFD')                      // decompose accented chars (é → e + combining accent)
    .replace(/[̀-ͯ]/g, '')       // strip combining diacritical marks
    .replace(/[^a-zA-Z0-9._\-() ]/g, '_') // replace any remaining special chars with _
    .replace(/_+/g, '_')                   // collapse consecutive underscores
    .trim()
}

// ── Walk directory recursively, collect all .pdf paths ────────────────────────
function collectPDFs(dir) {
  const results = []
  for (const entry of fs.readdirSync(dir)) {
    const full = path.join(dir, entry)
    const stat = fs.statSync(full)
    if (stat.isDirectory()) {
      results.push(...collectPDFs(full))
    } else if (entry.toLowerCase().endsWith('.pdf')) {
      results.push(full)
    }
  }
  return results
}

// ── Jina embedding with 429 retry ─────────────────────────────────────────────
async function jinaEmbed(texts) {
  const MAX_ATTEMPTS = 5
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const res = await fetch(JINA_EMBED_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${JINA_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        input: texts.map(t => t.slice(0, 32000)),
        model: JINA_MODEL,
        task: 'retrieval.passage',
      }),
    })

    if (res.status === 429 && attempt < MAX_ATTEMPTS - 1) {
      // Wait long enough for the 1-minute rate-limit window to reset
      const backoffMs = attempt < 2 ? 65000 : 120000
      console.log(`  [Jina] rate limited, waiting ${Math.round(backoffMs/1000)}s…`)
      await new Promise(r => setTimeout(r, backoffMs))
      continue
    }

    if (!res.ok) {
      const err = await res.text()
      throw new Error(`Jina AI error ${res.status}: ${err}`)
    }

    const json = await res.json()
    return json.data.map(d => d.embedding)
  }
  throw new Error('Jina AI embed failed after max retries')
}

// ── Sanitize text extracted from PDF ─────────────────────────────────────────
// Removes lone surrogates and null bytes that cause JSON.stringify to throw
function sanitizeText(text) {
  return text
    .replace(/[\uD800-\uDFFF]/g, ' ')  // lone surrogate halves
    .replace(/\0/g, ' ')               // null bytes
    .replace(/[\x01-\x08\x0B\x0C\x0E-\x1F\x7F]/g, ' ') // other control chars
}

// ── Text chunking (mirrors rag.ts) ────────────────────────────────────────────
function chunkText(text) {
  const TARGET_WORDS  = 375
  const OVERLAP_WORDS = 38
  const paragraphs = text.split(/\n\s*\n/).filter(p => p.trim().length > 10)

  const chunks = []
  let current = []
  let wordCount = 0
  let idx = 0

  for (const para of paragraphs) {
    const words = para.trim().split(/\s+/)
    if (wordCount + words.length > TARGET_WORDS && current.length > 0) {
      chunks.push({ content: current.join('\n\n').trim(), chunkIndex: idx++ })
      const overlapWords = current.join(' ').split(/\s+/).slice(-OVERLAP_WORDS)
      current    = [overlapWords.join(' ')]
      wordCount  = OVERLAP_WORDS
    }
    current.push(para.trim())
    wordCount += words.length
  }
  if (current.length > 0) {
    chunks.push({ content: current.join('\n\n').trim(), chunkIndex: idx++ })
  }
  return chunks
}

// ── Ingest a single document ──────────────────────────────────────────────────
async function ingestDocument(documentId, text, pageCount) {
  const chunks = chunkText(text)
  if (chunks.length === 0) throw new Error('No text extracted from PDF')

  // Embed in batches of 20 to stay well within request size limits
  const BATCH = 20
  const allEmbeddings = []
  for (let i = 0; i < chunks.length; i += BATCH) {
    const batchTexts = chunks.slice(i, i + BATCH).map(c => c.content)
    const embeddings = await jinaEmbed(batchTexts)
    allEmbeddings.push(...embeddings)
  }

  const rows = chunks.map((c, i) => ({
    document_id: documentId,
    content:     c.content,
    chunk_index: c.chunkIndex,
    embedding:   allEmbeddings[i],
  }))

  // Insert doc_chunks in batches of 50
  for (let i = 0; i < rows.length; i += 50) {
    const { error } = await supabase.from('doc_chunks').insert(rows.slice(i, i + 50))
    if (error) throw error
  }

  // Mark document READY
  const { error: updateErr } = await supabase
    .from('documents')
    .update({ status: 'READY', page_count: pageCount ?? null })
    .eq('id', documentId)
  if (updateErr) throw updateErr
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  console.log('\n🗂  ColdIQ Manual Importer')
  console.log(`📁 Source: ${USB_ROOT}\n`)

  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error('❌  Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local')
    process.exit(1)
  }
  if (!JINA_API_KEY) {
    console.error('❌  Missing JINA_API_KEY in .env.local')
    process.exit(1)
  }

  const pdfs = collectPDFs(USB_ROOT)
  console.log(`Found ${pdfs.length} PDF files\n`)

  let imported = 0
  let skipped  = 0
  let failed   = 0

  for (const [i, pdfPath] of pdfs.entries()) {
    const filename     = path.basename(pdfPath)
    const parentDir    = path.basename(path.dirname(pdfPath))
    const category     = folderToCategory(parentDir)
    const title        = filename.replace(/\.pdf$/i, '')
    const safeFilename = sanitizePathSegment(filename)
    const storagePath  = `manuals/${sanitizePathSegment(category)}/${safeFilename}`

    process.stdout.write(`[${i + 1}/${pdfs.length}] ${category} / ${filename} … `)

    // ── Skip if already successfully imported; re-try PROCESSING/FAILED ──
    const { data: existing } = await supabase
      .from('documents')
      .select('id, status')
      .eq('file_name', storagePath)
      .maybeSingle()

    if (existing?.status === 'READY') {
      console.log(`SKIP (already READY)`)
      skipped++
      continue
    }

    // If stuck in PROCESSING/FAILED, delete the old row + chunks so we can re-insert cleanly
    if (existing) {
      await supabase.from('doc_chunks').delete().eq('document_id', existing.id)
      await supabase.from('documents').delete().eq('id', existing.id)
    }

    try {
      // ── Read file ──
      const fileBuffer = fs.readFileSync(pdfPath)
      const fileSizeBytes = fileBuffer.length

      // ── Upload to Supabase Storage ──
      const { error: uploadErr } = await supabase.storage
        .from(STORAGE_BUCKET)
        .upload(storagePath, fileBuffer, {
          contentType: 'application/pdf',
          upsert: false,
        })

      if (uploadErr && !uploadErr.message.includes('already exists')) {
        throw new Error(`Storage upload failed: ${uploadErr.message}`)
      }

      // ── Insert document row ──
      const { data: docRow, error: insertErr } = await supabase
        .from('documents')
        .insert({
          title,
          source_type: 'UPLOAD',
          status:      'PROCESSING',
          file_name:   storagePath,
          file_size:   fileSizeBytes,
          category,
          equipment_id: null,
        })
        .select('id')
        .single()

      if (insertErr) throw insertErr

      // ── Parse PDF ──
      let pdfData
      try {
        pdfData = await pdfParse(fileBuffer)
      } catch (parseErr) {
        // Some PDFs have invalid unicode or unsupported encoding — treat as no text layer
        pdfData = { text: '', numpages: null }
      }
      const text = sanitizeText(pdfData.text?.trim() ?? '')

      if (!text) {
        // Scanned PDF with no text layer — mark as READY with no chunks
        await supabase
          .from('documents')
          .update({ status: 'READY', page_count: pdfData.numpages ?? null })
          .eq('id', docRow.id)
        console.log(`OK (no text layer, ${pdfData.numpages ?? 0}p)`)
      } else {
        // ── Run embedding pipeline ──
        await ingestDocument(docRow.id, text, pdfData.numpages)
        console.log(`OK (${pdfData.numpages ?? 0}p)`)
      }

      imported++
    } catch (err) {
      console.log(`FAILED: ${err.message}`)
      failed++
      // Clean up the documents row if it was created
      // (storage file stays — can retry later)
    }
  }

  console.log(`\n✅  Done!\n`)
  console.log(`  Imported: ${imported}`)
  console.log(`  Skipped:  ${skipped}  (already in DB)`)
  console.log(`  Failed:   ${failed}\n`)
}

main().catch(err => {
  console.error('Fatal error:', err)
  process.exit(1)
})
