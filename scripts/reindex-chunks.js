/**
 * reindex-chunks.js
 * Re-embeds all doc_chunks using the current Jina API (jina-embeddings-v3,
 * retrieval.passage) and overwrites the stored embeddings in place.
 *
 * Run with:  node -r dotenv/config scripts/reindex-chunks.js
 *
 * Requires in .env.local (or environment):
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 *   JINA_API_KEY
 */

const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const JINA_URL = 'https://api.jina.ai/v1/embeddings'
const JINA_MODEL = 'jina-embeddings-v3'
const BATCH_SIZE = 50   // chunks per Jina call (stay under rate limits)
const WRITE_BATCH = 50  // rows per Supabase upsert

async function jinaEmbed(texts) {
  const JINA_API_KEY = process.env.JINA_API_KEY
  if (!JINA_API_KEY) throw new Error('JINA_API_KEY not set')

  for (let attempt = 0; attempt < 3; attempt++) {
    const res = await fetch(JINA_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${JINA_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        input: texts.map(t => t.slice(0, 32000)),
        model: JINA_MODEL,
        task: 'retrieval.passage',
      }),
    })
    if (res.status === 429) {
      const wait = 1000 * Math.pow(2, attempt)
      console.warn(`  rate limited, retrying in ${wait}ms`)
      await new Promise(r => setTimeout(r, wait))
      continue
    }
    if (!res.ok) throw new Error(`Jina ${res.status}: ${await res.text()}`)
    const json = await res.json()
    return json.data.map(d => d.embedding)
  }
  throw new Error('Jina failed after 3 attempts')
}

async function main() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
  )

  // Fetch all chunks
  console.log('Fetching all chunks from doc_chunks...')
  const { data: chunks, error } = await supabase
    .from('doc_chunks')
    .select('id, content')
    .order('id')

  if (error) throw error
  console.log(`Found ${chunks.length} chunks to re-index.\n`)

  let done = 0
  for (let i = 0; i < chunks.length; i += BATCH_SIZE) {
    const batch = chunks.slice(i, i + BATCH_SIZE)
    const texts = batch.map(c => c.content)

    process.stdout.write(`  Embedding chunks ${i + 1}–${Math.min(i + BATCH_SIZE, chunks.length)}...`)
    const embeddings = await jinaEmbed(texts)
    console.log(` done (dim=${embeddings[0].length})`)

    // Write back in sub-batches
    for (let j = 0; j < batch.length; j += WRITE_BATCH) {
      const rows = batch.slice(j, j + WRITE_BATCH).map((c, k) => ({
        id: c.id,
        embedding: embeddings[j + k],
      }))
      const { error: upsertErr } = await supabase
        .from('doc_chunks')
        .upsert(rows, { onConflict: 'id' })
      if (upsertErr) throw upsertErr
    }

    done += batch.length
    // Small pause between Jina batches to avoid rate limits
    if (i + BATCH_SIZE < chunks.length) await new Promise(r => setTimeout(r, 300))
  }

  console.log(`\nDone. Re-indexed ${done} chunks.`)
}

main().catch(err => {
  console.error('Fatal:', err)
  process.exit(1)
})
