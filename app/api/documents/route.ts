import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseServer, getSupabaseRouteAuth } from '@/lib/supabase/client'
import { ingestDocument } from '@/lib/ai/rag'

export async function GET(req: NextRequest) {
  const { data: { user } } = await getSupabaseRouteAuth(req).auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { searchParams } = new URL(req.url)
  const equipmentId = searchParams.get('equipmentId')
  const supabase = getSupabaseServer()

  let query = supabase.from('documents').select('*').order('created_at', { ascending: false })

  // When filtering by equipment, also include global docs (equipment_id IS NULL)
  // — mirrors how match_doc_chunks RAG already works.
  if (equipmentId) {
    query = query.or(`equipment_id.eq.${equipmentId},equipment_id.is.null`)
  }

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Generate 1-hour signed URLs for all documents stored in Supabase Storage
  const docs = await Promise.all((data ?? []).map(async (doc) => {
    if (doc.file_name) {
      const { data: signed } = await supabase.storage
        .from('documents')
        .createSignedUrl(doc.file_name, 3600)
      return { ...doc, url: signed?.signedUrl ?? null }
    }
    return { ...doc, url: null }
  }))

  return NextResponse.json(docs)
}

export async function POST(req: NextRequest) {
  const { data: { user } } = await getSupabaseRouteAuth(req).auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const supabase = getSupabaseServer()

  // Parse multipart form
  const formData = await req.formData().catch(() => null)
  if (!formData) return NextResponse.json({ error: 'Invalid form data' }, { status: 400 })

  const file        = formData.get('file') as File | null
  const equipmentId = formData.get('equipmentId') as string | null
  const title       = formData.get('title') as string | null

  if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 })
  if (file.type !== 'application/pdf') return NextResponse.json({ error: 'Only PDFs supported' }, { status: 400 })
  if (file.size > 50 * 1024 * 1024) return NextResponse.json({ error: 'File too large (max 50MB)' }, { status: 400 })

  // Store file in Supabase Storage
  const fileName  = `${Date.now()}-${file.name}`
  const arrayBuf  = await file.arrayBuffer()
  const { error: uploadError } = await supabase.storage
    .from('documents')
    .upload(fileName, Buffer.from(arrayBuf), { contentType: 'application/pdf' })

  if (uploadError) {
    console.error('[Storage upload error]', uploadError)
    return NextResponse.json({ error: 'Failed to upload file to storage' }, { status: 500 })
  }

  // Create document record
  const { data: doc, error: docError } = await supabase
    .from('documents')
    .insert({
      equipment_id: equipmentId ?? null,
      title:        title ?? file.name.replace(/\.pdf$/i, ''),
      source_type:  'UPLOAD',
      file_name:    fileName,
      file_size:    file.size,
      status:       'PROCESSING',
    })
    .select()
    .single()

  if (docError || !doc) return NextResponse.json({ error: 'Failed to create document record' }, { status: 500 })

  // Kick off async ingestion (don't await — return immediately)
  if (process.env.JINA_API_KEY) {
    processDocument(doc.id, arrayBuf).catch(err =>
      console.error(`[Ingest failed] doc=${doc.id}`, err)
    )
  }

  return NextResponse.json({ id: doc.id, title: doc.title, status: 'PROCESSING' }, { status: 201 })
}

async function processDocument(documentId: string, arrayBuf: ArrayBuffer) {
  const pdfParse = (await import('pdf-parse')).default
  const pdfData  = await pdfParse(Buffer.from(arrayBuf))
  await ingestDocument(documentId, pdfData.text, pdfData.numpages)
}
