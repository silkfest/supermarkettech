import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseServer, getSupabaseRouteAuth } from '@/lib/supabase/client'
import { ingestDocument } from '@/lib/ai/rag'

// PATCH /api/documents/[id] — update document metadata (admin/manager only)
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { data: { user } } = await getSupabaseRouteAuth(req).auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = getSupabaseServer()

  const { data: callerData } = await supabase.from('users').select('role').eq('id', user.id).single()
  const callerRole = callerData?.role
  if (!['admin', 'manager'].includes(callerRole)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await req.json()
  const update: Record<string, unknown> = {}

  if ('equipment_id' in body) update.equipment_id = body.equipment_id ?? null
  if ('category'     in body) update.category     = body.category ?? ''
  if ('title'        in body) update.title        = body.title

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: 'No updatable fields provided' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('documents')
    .update(update)
    .eq('id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

// DELETE /api/documents/[id] — remove document, its chunks, and its storage file (admin/manager only)
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { data: { user } } = await getSupabaseRouteAuth(req).auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = getSupabaseServer()

  const { data: callerData } = await supabase.from('users').select('role').eq('id', user.id).single()
  const callerRole = callerData?.role
  if (!['admin', 'manager'].includes(callerRole)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // Fetch file_name before deletion so we can remove from Storage
  const { data: doc } = await supabase.from('documents').select('file_name').eq('id', id).single()

  // Delete chunks first (foreign key)
  await supabase.from('doc_chunks').delete().eq('document_id', id)

  // Delete document row
  const { error } = await supabase.from('documents').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Best-effort: remove file from storage (don't fail if missing)
  if (doc?.file_name) {
    await supabase.storage.from('documents').remove([doc.file_name])
  }

  return NextResponse.json({ success: true })
}

// POST /api/documents/[id] — re-ingest an existing document using the file already in storage
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { data: { user } } = await getSupabaseRouteAuth(req).auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = getSupabaseServer()

  // Only admin/manager roles may trigger re-ingestion
  const { data: callerData } = await supabase.from('users').select('role').eq('id', user.id).single()
  const callerRole = callerData?.role
  if (!['admin', 'manager'].includes(callerRole)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

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
