import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseServer, getSupabaseRouteAuth } from '@/lib/supabase/client'
import { ingestDocument } from '@/lib/ai/rag'

// POST /api/documents/[id] — re-ingest an existing document using the file already in storage
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { data: { user } } = await getSupabaseRouteAuth(req).auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = getSupabaseServer()

  // Fetch the document record
  const { data: doc, error: docErr } = await supabase
    .from('documents')
    .select('*')
    .eq('id', id)
    .single()

  if (docErr || !doc) return NextResponse.json({ error: 'Document not found' }, { status: 404 })
  if (!doc.file_name) return NextResponse.json({ error: 'No stored file for this document' }, { status: 400 })

  // Reset status to PROCESSING
  await supabase.from('documents').update({ status: 'PROCESSING' }).eq('id', id)

  // Delete old chunks
  await supabase.from('doc_chunks').delete().eq('document_id', id)

  // Download file from storage
  const { data: fileData, error: dlErr } = await supabase.storage
    .from('documents')
    .download(doc.file_name)

  if (dlErr || !fileData) {
    await supabase.from('documents').update({ status: 'FAILED' }).eq('id', id)
    return NextResponse.json({ error: 'Failed to download file from storage' }, { status: 500 })
  }

  const arrayBuf = await fileData.arrayBuffer()

  // Kick off async re-ingestion
  ;(async () => {
    try {
      const pdfParse = (await import('pdf-parse')).default
      const pdfData = await pdfParse(Buffer.from(arrayBuf))
      await ingestDocument(id, pdfData.text, pdfData.numpages)
      console.log(`[reingest] doc=${id} complete, pages=${pdfData.numpages}`)
    } catch (err) {
      console.error(`[reingest] doc=${id} failed`, err)
      await supabase.from('documents').update({ status: 'FAILED' }).eq('id', id)
    }
  })()

  return NextResponse.json({ id, status: 'PROCESSING', message: 'Re-ingestion started' })
}
