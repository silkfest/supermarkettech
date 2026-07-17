import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseRouteAuth, getSupabaseServer } from '@/lib/supabase/client'
import { processDocumentBuffer } from '@/lib/ai/ingest'
import { fetchPdfFromUrl } from '@/lib/ai/fetch-pdf'

// Backfill indexing for WEB (link-only) documents so the chatbot's
// search_manuals tool can actually find them. These rows were created as bare
// links with no stored file — invisible to RAG search. For each one: fetch the
// PDF from its source_url, store it in the documents bucket (which also gives
// citations a real PDF to open and protects against link rot), then run the
// standard chunk + embed pipeline.
//
// POST { documentId } — index one specific document (retries even if it
//                       previously failed)
// POST { batch: N }   — index up to N pending web documents (default 5),
//                       skipping ones that already recorded an error
export const maxDuration = 300

const PENDING_FILTER = { status: 'READY', source_type: 'WEB' } as const

export async function POST(req: NextRequest) {
  const { data: { user } } = await getSupabaseRouteAuth(req).auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = getSupabaseServer()
  const { data: profile } = await supabase.from('users').select('role').eq('id', user.id).single()
  const role = (profile as { role?: string } | null)?.role
  if (role !== 'admin' && role !== 'manager') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await req.json().catch(() => ({}))
  const documentId = typeof body?.documentId === 'string' ? body.documentId : null
  const batch = Math.min(Math.max(Number(body?.batch) || 5, 1), 10)

  interface WebDoc { id: string; title: string; source_url: string | null; file_name: string | null }
  let targets: WebDoc[] = []

  if (documentId) {
    const { data: doc } = await supabase
      .from('documents')
      .select('id, title, source_url, file_name')
      .eq('id', documentId)
      .single()
    if (!doc) return NextResponse.json({ error: 'Document not found' }, { status: 404 })
    if (!doc.source_url) return NextResponse.json({ error: 'Document has no source URL to fetch' }, { status: 400 })
    targets = [doc as WebDoc]
  } else {
    const { data: docs, error } = await supabase
      .from('documents')
      .select('id, title, source_url, file_name')
      .match(PENDING_FILTER)
      .is('file_name', null)
      .is('error_message', null)
      .not('source_url', 'is', null)
      .order('created_at')
      .limit(batch)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    targets = (docs ?? []) as WebDoc[]
  }

  const results: Array<{ id: string; title: string; status: 'indexed' | 'failed'; chunks?: number; error?: string }> = []

  for (const doc of targets) {
    try {
      const fetched = await fetchPdfFromUrl(doc.source_url!)
      if (!fetched.ok) throw new Error(fetched.error)

      // Store the PDF so citations open a real file and the link can rot safely
      const fileName = doc.file_name ?? `web-${doc.id}.pdf`
      const { error: uploadError } = await supabase.storage
        .from('documents')
        .upload(fileName, Buffer.from(fetched.buffer), { contentType: 'application/pdf', upsert: true })
      if (uploadError) throw new Error(`Storage upload failed: ${uploadError.message}`)

      await supabase.from('documents').update({
        file_name: fileName,
        file_size: fetched.buffer.byteLength,
        status: 'PROCESSING',
        error_message: null,
      }).eq('id', doc.id)

      // Clear any stale chunks (per-doc retries), then run the standard pipeline.
      // processDocumentBuffer handles its own errors (marks the doc FAILED and
      // returns normally), so verify success by counting the chunks it wrote.
      await supabase.from('doc_chunks').delete().eq('document_id', doc.id)
      await processDocumentBuffer(doc.id, fetched.buffer)

      const { count } = await supabase
        .from('doc_chunks')
        .select('id', { count: 'exact', head: true })
        .eq('document_id', doc.id)

      if (!count) {
        // File is stored now, so the existing re-process tools can retry it
        await supabase.from('documents').update({ error_message: 'index failed: no searchable text extracted' }).eq('id', doc.id)
        results.push({ id: doc.id, title: doc.title, status: 'failed', error: 'No searchable text extracted from the PDF' })
        console.error(`[index-web] no chunks doc=${doc.id} title=${doc.title}`)
        continue
      }

      results.push({ id: doc.id, title: doc.title, status: 'indexed', chunks: count })
      console.log(`[index-web] ok doc=${doc.id} chunks=${count} title=${doc.title}`)
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      // Keep the row READY — it is still a valid library link — but record why
      // indexing failed so the batch loop doesn't hammer dead URLs.
      await supabase.from('documents').update({ status: 'READY', error_message: `index failed: ${msg}`.slice(0, 500) }).eq('id', doc.id)
      results.push({ id: doc.id, title: doc.title, status: 'failed', error: msg })
      console.error(`[index-web] failed doc=${doc.id} title=${doc.title}`, msg)
    }
  }

  const { count: remaining } = await supabase
    .from('documents')
    .select('id', { count: 'exact', head: true })
    .match(PENDING_FILTER)
    .is('file_name', null)
    .is('error_message', null)
    .not('source_url', 'is', null)

  return NextResponse.json({ processed: results, remaining: remaining ?? 0 })
}
