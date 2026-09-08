import { getSupabaseServer } from '@/lib/supabase/client'
import type { CitationSource } from '@/types'

const JINA_EMBED_URL = 'https://api.jina.ai/v1/embeddings'
const JINA_MODEL = 'jina-embeddings-v3'

// Jina enforces a *per-minute* token budget (100k/min on the current plan).
// Embedding a whole document in one call blew straight through it — a large
// manual came to 305k tokens in a single request, which no retry could ever
// satisfy, and the old 1s/2s backoff was far too short for a per-minute window
// anyway. So: split into token-bounded requests and pace them against a rolling
// 60s budget.
const JINA_TOKEN_LIMIT_PER_MIN = 100_000
/** Leave headroom — other requests (chat queries) draw on the same budget. */
const RATE_BUDGET_TOKENS = 80_000
const RATE_WINDOW_MS = 60_000
/** Per-request ceiling. Small enough that one request never exceeds the
 *  per-minute budget on its own, so a retry can actually succeed. */
const MAX_TOKENS_PER_REQUEST = 20_000
/** Jina caps inputs per request independently of tokens. */
const MAX_INPUTS_PER_REQUEST = 96
/** jina-embeddings-v3 per-input ceiling (~8k tokens). */
const MAX_CHARS_PER_INPUT = 32_000

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms))
/** Rough but adequate for budgeting — Jina bills real tokens, we only need to
 *  stay comfortably under the ceiling. */
const estimateTokens = (text: string) => Math.ceil(text.length / 4)

let rateLog: Array<{ at: number; tokens: number }> = []

/** Block until `tokens` fit inside the rolling per-minute budget. */
async function reserveRateBudget(tokens: number): Promise<void> {
  for (;;) {
    const now = Date.now()
    rateLog = rateLog.filter(e => now - e.at < RATE_WINDOW_MS)
    const used = rateLog.reduce((sum, e) => sum + e.tokens, 0)
    // The empty-log case also guards against deadlocking on an oversized batch.
    if (used + tokens <= RATE_BUDGET_TOKENS || rateLog.length === 0) {
      rateLog.push({ at: now, tokens })
      return
    }
    const waitMs = Math.max(500, RATE_WINDOW_MS - (now - rateLog[0].at) + 250)
    console.log(`[Jina] pacing: ${used} tokens used this minute, waiting ${waitMs}ms`)
    await sleep(waitMs)
  }
}

/** Split inputs so no single request exceeds the token or input-count ceiling. */
function batchInputs(texts: string[]): string[][] {
  const batches: string[][] = []
  let current: string[] = []
  let currentTokens = 0
  for (const text of texts) {
    const tokens = estimateTokens(text)
    if (current.length > 0 &&
        (currentTokens + tokens > MAX_TOKENS_PER_REQUEST || current.length >= MAX_INPUTS_PER_REQUEST)) {
      batches.push(current)
      current = []
      currentTokens = 0
    }
    current.push(text)
    currentTokens += tokens
  }
  if (current.length > 0) batches.push(current)
  return batches
}

async function embedBatch(
  batch: string[],
  task: 'retrieval.query' | 'retrieval.passage',
  apiKey: string,
): Promise<number[][]> {
  const MAX_ATTEMPTS = 4
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    await reserveRateBudget(batch.reduce((sum, t) => sum + estimateTokens(t), 0))

    const res = await fetch(JINA_EMBED_URL, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ input: batch, model: JINA_MODEL, task }),
    })

    if (res.status === 429 && attempt < MAX_ATTEMPTS - 1) {
      // The budget is per minute, so back off on that scale — a 1–2s retry just
      // burns an attempt. Honour Retry-After when the API sends one.
      const retryAfter = Number(res.headers.get('retry-after'))
      const waitMs = Number.isFinite(retryAfter) && retryAfter > 0
        ? Math.min(retryAfter * 1000, RATE_WINDOW_MS)
        : RATE_WINDOW_MS
      console.warn(`[Jina] 429 rate limited, waiting ${waitMs}ms (attempt ${attempt + 1}/${MAX_ATTEMPTS})`)
      // The window is clearly exhausted — drop our own accounting so we don't
      // double-wait on top of the sleep.
      rateLog = []
      await sleep(waitMs)
      continue
    }

    if (!res.ok) {
      const err = await res.text()
      throw new Error(`Jina AI embed error ${res.status}: ${err}`)
    }

    const json = await res.json()
    return (json.data as Array<{ embedding: number[] }>).map(d => d.embedding)
  }

  throw new Error(
    `Jina AI embed failed after max retries (rate limit is ${JINA_TOKEN_LIMIT_PER_MIN} tokens/min)`,
  )
}

async function jinaEmbed(texts: string[], task: 'retrieval.query' | 'retrieval.passage'): Promise<number[][]> {
  // Read at call time — module-level process.env is evaluated at build time in Next.js
  // and would be empty string if JINA_API_KEY is only a runtime env var in Vercel
  const JINA_API_KEY = process.env.JINA_API_KEY ?? ''

  const capped = texts.map(t => t.slice(0, MAX_CHARS_PER_INPUT))
  const batches = batchInputs(capped)

  const out: number[][] = []
  for (const batch of batches) {
    out.push(...await embedBatch(batch, task, JINA_API_KEY))
  }
  return out
}

export async function embedQuery(text: string): Promise<number[]> {
  // Use the asymmetric retrieval.query task as Jina intended.
  // retrieval.query (for queries) + retrieval.passage (for stored chunks) is the
  // designed usage of jina-embeddings-v3 — both embed into the same 1024-dim space
  // with LoRA adapters that maximise dot-product similarity between query and
  // relevant passage.
  const [embedding] = await jinaEmbed([text], 'retrieval.query')
  return embedding
}

export async function embedTexts(texts: string[]): Promise<number[][]> {
  return jinaEmbed(texts, 'retrieval.passage')
}

export interface RetrievedChunk {
  chunk_id: string
  document_id: string
  document_title: string
  source_type: string
  content: string
  page_number: number | null
  score: number
}

export async function retrieveChunks(
  query: string,
  equipmentId?: string,
  topK = 8,
  minScore = 0.58
): Promise<RetrievedChunk[]> {
  const embedding = await embedQuery(query)
  const supabase = getSupabaseServer()

  const { data, error } = await supabase.rpc('match_doc_chunks', {
    query_embedding: embedding,
    match_threshold: minScore,
    match_count: topK,
    p_equipment_id: equipmentId ?? null,
  })

  if (error) {
    console.error(JSON.stringify({ ragRpcError: true, msg: error.message, code: error.code }))
    return []
  }

  return (data as RetrievedChunk[]) ?? []
}

export function formatContext(chunks: RetrievedChunk[], maxChars = 12000): string {
  if (!chunks.length) return ''
  const parts: string[] = []
  let total = 0
  for (let i = 0; i < chunks.length; i++) {
    const c = chunks[i]
    const part = `[Doc ${i + 1}: ${c.document_title}${c.page_number ? `, p.${c.page_number}` : ''}]\n${c.content}`
    if (total + part.length > maxChars) break
    parts.push(part)
    total += part.length
  }
  return parts.join('\n\n---\n\n')
}

export function chunksToCitations(chunks: RetrievedChunk[]): CitationSource[] {
  return chunksToCitationsFrom(chunks, 1)
}

// ─── Agentic search_manuals tool helpers ─────────────────────────────────────
// Citation numbers must be unique and stable across all search_manuals calls in
// a single conversation turn, since the model references them as [Doc N]. Each
// call into the tool continues numbering from `startNum` rather than resetting to 1.

export function formatToolResult(chunks: RetrievedChunk[], startNum: number, maxChars = 8000): string {
  if (!chunks.length) return 'No relevant manual content found for this query.'
  const parts: string[] = []
  let total = 0
  for (let i = 0; i < chunks.length; i++) {
    const c = chunks[i]
    const num = startNum + i
    const part = `[Doc ${num}: ${c.document_title}${c.page_number ? `, p.${c.page_number}` : ''}]\n${c.content}`
    if (total + part.length > maxChars) break
    parts.push(part)
    total += part.length
  }
  return parts.join('\n\n---\n\n')
}

export function chunksToCitationsFrom(chunks: RetrievedChunk[], startNum: number): CitationSource[] {
  return chunks.map((c, i) => ({
    documentId: c.document_id,
    chunkId: c.chunk_id,
    citationNumber: startNum + i,
    pageNumber: c.page_number,
    title: c.document_title,
    sourceType: c.source_type,
    relevanceScore: c.score,
  }))
}

// ─── Text chunking for ingestion pipeline ────────────────────────────────────

// Returns false for chunks that are predominantly non-English (German, French, Spanish, etc.)
// based on the density of non-ASCII characters (umlauts, accented chars, etc.).
// Threshold of 12% non-ASCII catches most European-language pages while keeping
// lightly-accented English and technical symbols (°, ±, ², ×).
function isLikelyEnglish(text: string): boolean {
  if (text.length < 30) return true
  let nonAscii = 0
  for (let i = 0; i < text.length; i++) {
    if (text.charCodeAt(i) > 127) nonAscii++
  }
  return nonAscii / text.length < 0.12
}

export function chunkText(text: string): Array<{ content: string; chunkIndex: number }> {
  const TARGET_WORDS = 375
  const OVERLAP_WORDS = 38
  const paragraphs = text.split(/\n\s*\n/).filter(p => p.trim().length > 10)

  const chunks: Array<{ content: string; chunkIndex: number }> = []
  let current: string[] = []
  let wordCount = 0
  let idx = 0

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

  if (current.length > 0) {
    chunks.push({ content: current.join('\n\n').trim(), chunkIndex: idx++ })
  }

  return chunks
}

export async function ingestDocument(documentId: string, pageTexts: string[], pageCount?: number) {
  const supabase = getSupabaseServer()

  // Only store page numbers when we actually have per-page text (pdf-parse split by page).
  // When a single blob arrives (Jina OCR or plain fallback) we can't reliably map chunks
  // back to physical pages, so we leave page_number null to avoid bad page anchors.
  const hasPageBreaks = pageTexts.length > 1

  try {
    // Chunk each page independently so we can store the page number with each chunk.
    // Skip non-English chunks so multilingual PDFs don't pollute the index.
    const allChunks: Array<{ content: string; chunkIndex: number; pageNumber: number | null }> = []
    for (let p = 0; p < pageTexts.length; p++) {
      const pageChunks = chunkText(pageTexts[p])
      pageChunks
        .filter(c => isLikelyEnglish(c.content))
        .forEach(c => {
          allChunks.push({ content: c.content, chunkIndex: allChunks.length, pageNumber: hasPageBreaks ? p + 1 : null })
        })
    }

    if (allChunks.length === 0) throw new Error('No text extracted')

    const embeddings = await embedTexts(allChunks.map(c => c.content))

    const rows = allChunks.map((c, i) => ({
      document_id: documentId,
      content: c.content,
      chunk_index: c.chunkIndex,
      page_number: c.pageNumber ?? null,
      embedding: embeddings[i],
    }))

    for (let i = 0; i < rows.length; i += 50) {
      const { error } = await supabase.from('doc_chunks').insert(rows.slice(i, i + 50))
      if (error) throw error
    }

    await supabase
      .from('documents')
      .update({ status: 'READY', page_count: pageCount ?? null })
      .eq('id', documentId)
  } catch (err) {
    await supabase.from('documents').update({ status: 'FAILED' }).eq('id', documentId)
    throw err
  }
}
