import { getSupabaseServer } from '@/lib/supabase/client'
import type { CitationSource } from '@/types'

const JINA_EMBED_URL = 'https://api.jina.ai/v1/embeddings'
const JINA_MODEL = 'jina-embeddings-v3'

async function jinaEmbed(texts: string[], task: 'retrieval.query' | 'retrieval.passage'): Promise<number[][]> {
  // Read at call time — module-level process.env is evaluated at build time in Next.js
  // and would be empty string if JINA_API_KEY is only a runtime env var in Vercel
  const JINA_API_KEY = process.env.JINA_API_KEY ?? ''
  const MAX_ATTEMPTS = 3
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
        task,
      }),
    })

    if (res.status === 429 && attempt < MAX_ATTEMPTS - 1) {
      const backoffMs = 1000 * Math.pow(2, attempt)
      console.warn(`[Jina] rate limited, retrying in ${backoffMs}ms (attempt ${attempt + 1}/${MAX_ATTEMPTS})`)
      await new Promise(r => setTimeout(r, backoffMs))
      continue
    }

    if (!res.ok) {
      const err = await res.text()
      throw new Error(`Jina AI embed error ${res.status}: ${err}`)
    }

    const json = await res.json()
    return (json.data as Array<{ embedding: number[] }>).map(d => d.embedding)
  }

  throw new Error('Jina AI embed failed after max retries')
}

export async function embedQuery(text: string): Promise<number[]> {
  // Use 'retrieval.passage' to match the task used when chunks were indexed.
  // Jina jina-embeddings-v3 asymmetric tasks (query vs passage) produce vectors
  // in incompatible subspaces for cosine distance (best score ~0.16 vs expected
  // ~0.75). Symmetric retrieval (same task for both) keeps everything in the
  // same embedding space and gives correct cosine similarities.
  const [embedding] = await jinaEmbed([text], 'retrieval.passage')
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
  topK = 5,
  minScore = 0.65
): Promise<RetrievedChunk[]> {
  const embedding = await embedQuery(query)
  const supabase = getSupabaseServer()

  // Pass as float8[] — PostgREST serialises JS number[] to PostgreSQL float8[]
  // natively with no ambiguity. The RPC now accepts float8[] and casts to vector
  // internally, which is more reliable than relying on PostgREST's implicit
  // vector cast (which silently returned 0 rows).
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
  return chunks.map(c => ({
    documentId: c.document_id,
    chunkId: c.chunk_id,
    pageNumber: c.page_number,
    title: c.document_title,
    sourceType: c.source_type,
    relevanceScore: c.score,
  }))
}

// ─── Text chunking for ingestion pipeline ────────────────────────────────────

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

export async function ingestDocument(documentId: string, text: string, pageCount?: number) {
  const supabase = getSupabaseServer()

  try {
    const chunks = chunkText(text)
    if (chunks.length === 0) throw new Error('No text extracted')

    const embeddings = await embedTexts(chunks.map(c => c.content))

    const rows = chunks.map((c, i) => ({
      document_id: documentId,
      content: c.content,
      chunk_index: c.chunkIndex,
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
