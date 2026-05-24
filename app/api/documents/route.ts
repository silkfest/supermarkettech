import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseServer, getSupabaseRouteAuth } from '@/lib/supabase/client'
import { processDocumentBuffer } from '@/lib/ai/ingest'

// Allow up to 60 s so the async ingest (pdf-parse + Jina embed) has time to finish
export const maxDuration = 60

export async function GET(req: NextRequest) {
  const { data: { user } } = await getSupabaseRouteAuth(req).auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { searchParams } = new URL(req.url)
  const equipmentId = searchParams.get('equipmentId')
  const search      = searchParams.get('search')       // free-text title search (for link-doc UI)
  const supabase = getSupabaseServer()

  let docIds: string[] | null = null

  if (equipmentId) {
    // 1. Docs directly assigned to this equipment
    const { data: directDocs } = await supabase
      .from('documents')
      .select('id')
      .eq('equipment_id', equipmentId)

    // 2. Look up equipment's manufacturer + model, then find matching manual_components docs
    const { data: eq } = await supabase
      .from('equipment')
      .select('manufacturer, model')
      .eq('id', equipmentId)
      .single()

    let manufacturerDocIds: string[] = []
    if (eq?.manufacturer || eq?.model) {
      let compQuery = supabase.from('manual_components').select('document_id')
      if (eq.manufacturer) compQuery = compQuery.ilike('manufacturer', `%${eq.manufacturer}%`)
      if (eq.model)        compQuery = compQuery.ilike('model',        `%${eq.model}%`)
      const { data: matchedComps } = await compQuery
      manufacturerDocIds = (matchedComps ?? [])
        .map(c => c.document_id as string)
        .filter(Boolean)
    }

    // 3. Docs from explicitly linked components (equipment_components → manual_components → document_id)
    const { data: linkedComps } = await supabase
      .from('equipment_components')
      .select('component:manual_components(document_id)')
      .eq('equipment_id', equipmentId)

    // Supabase returns the joined relation as an array — handle both array and object shapes
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const linkedDocIds: string[] = (linkedComps ?? []).flatMap((row: any) => {
      const c = row.component
      if (!c) return []
      if (Array.isArray(c)) return (c as { document_id: string }[]).map(x => x.document_id).filter(Boolean)
      return c.document_id ? [c.document_id as string] : []
    })

    // 4. Document title directly contains the equipment model (catches manuals not in manual_components)
    let titleMatchIds: string[] = []
    if (eq?.model) {
      const modelTrim = eq.model.trim()
      const modelNorm = modelTrim.replace(/[-\s]+/g, '') // "RL-5" → "RL5"
      const { data: titleDocs } = await supabase
        .from('documents')
        .select('id')
        .ilike('title', `%${modelTrim}%`)
      titleMatchIds = (titleDocs ?? []).map(d => d.id as string)
      // Also try hyphen-stripped form if different
      if (modelNorm !== modelTrim && modelNorm.length >= 2) {
        const { data: titleDocs2 } = await supabase
          .from('documents')
          .select('id')
          .ilike('title', `%${modelNorm}%`)
        titleMatchIds.push(...(titleDocs2 ?? []).map(d => d.id as string))
      }
    }

    // Merge and deduplicate all four sources
    const directIds = (directDocs ?? []).map(d => d.id as string)
    docIds = [...new Set([...directIds, ...manufacturerDocIds, ...linkedDocIds, ...titleMatchIds])]
  }

  let query = supabase.from('documents').select('*').order('created_at', { ascending: false })
  if (search) {
    // Free-text title search used by the "link document" picker in the Context panel
    query = query.ilike('title', `%${search}%`)
  }
  if (docIds !== null) {
    if (docIds.length === 0) {
      // No relevant docs found — return empty array immediately
      return NextResponse.json([])
    }
    query = query.in('id', docIds)
  }

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Batch-generate signed URLs in a single Storage API call
  const rows = data ?? []
  const filePaths = rows.map(d => d.file_name).filter((p): p is string => !!p)
  const signedUrlMap: Record<string, string> = {}
  if (filePaths.length > 0) {
    const { data: signedData } = await supabase.storage
      .from('documents')
      .createSignedUrls(filePaths, 3600)
    ;(signedData ?? []).forEach(item => {
      if (item.signedUrl && item.path) signedUrlMap[item.path] = item.signedUrl
    })
  }

  const docs = rows.map(doc => ({
    ...doc,
    url: doc.file_name ? (signedUrlMap[doc.file_name] ?? null) : null,
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
  await processDocumentBuffer(documentId, arrayBuf)
}
