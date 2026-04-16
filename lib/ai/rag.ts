import { getSupabaseServer } from '@/lib/supabase/client'
import type { CitationSource } from '@/types'

const VOYAGE_API_KEY = process.env.VOYAGE_API_KEY ?? ''
const VOYAGE_EMBED_URL = 'https://api.voyageai.com/v1/embeddings'
const VOYAGE_MODEL = 'voyage-3'

async function voyageEmbed(texts: string[], inputType: 'query' | 'document'): Promise<number[][]> {
  const res = await fetch(VOYAGE_EMBED_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${VOYAGE_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      input: texts.map(t => t.slice(0, 32000)),
      model: VOYAGE_MODEL,
      input_type: inputType,
    }),
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Voyage AI embed error ${res.status}: ${err}`)
  }

  const json = await res.json()
  return (json.data as Array<{ embedding: number[] }>).map(d => d.embedding)
}

export async function embedQuery(text: string): Promise<number[]> {
  const [embedding] = await voyageEmbed([text], 'query')
  return embedding
}

export async function embedTexts(texts: string[]): Promise<number[][]> {
  return voyageEmbed(texts, 'document')
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

  const { data, error } = await supabase.rpc('match_doc_chunks', {
    query_embedding: embedding,
    match_threshold: minScore,
    match_count: topK,
    p_equipment_id: equipmentId ?? null,
  })

  if (error) {
    console.error('[RAG retrieval error]', error)
    return []
  }

  return (data as RetrievedChunk[]) ?? []
}

export function formatContext(chunks: RetrievedChunk[]): string {
  if (!chunks.length) return ''
  return chunks
    .map((c, i) =>
      `[Doc ${i + 1}: ${c.document_title}${c.page_number ? `, p.${c.page_number}` : ''}]\n${c.content}`
    )
    .join('\n\n---\n\n')
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
