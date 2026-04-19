import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseServer } from '@/lib/supabase/client'
import { ingestDocument } from '@/lib/ai/rag'

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null)
  if (!body?.url) return NextResponse.json({ error: 'url is required' }, { status: 400 })

  const { url, title, equipment_id, model, manufacturer } = body as {
    url: string
    title?: string
    equipment_id?: string
    model?: string
    manufacturer?: string
  }

  return fetchAndImport({ url, title, equipment_id, model, manufacturer, depth: 0 })
}

async function fetchAndImport({
  url, title, equipment_id, model, manufacturer, depth,
}: {
  url: string; title?: string; equipment_id?: string
  model?: string; manufacturer?: string; depth: number
}): Promise<NextResponse> {
  if (depth > 2) return NextResponse.json({ error: 'Could not locate a PDF at this URL' }, { status: 400 })

  let res: Response
  try {
    res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; ColdIQ-manual-importer/1.0)',
        'Accept': 'application/pdf,*/*',
      },
      redirect: 'follow',
    })
  } catch {
    return NextResponse.json({ error: 'Could not reach the URL' }, { status: 400 })
  }

  if (!res.ok) return NextResponse.json({ error: `URL returned ${res.status}` }, { status: 400 })

  const contentType = (res.headers.get('content-type') ?? '').toLowerCase()

  if (!contentType.includes('pdf')) {
    // Not a PDF — scan the HTML for a PDF link and recurse once
    const html = await res.text()
    const pdfMatch = html.match(/href="([^"]+\.pdf[^"]*)"/i)
    if (pdfMatch) {
      const found = pdfMatch[1]
      const absolute = found.startsWith('http') ? found : new URL(found, url).href
      return fetchAndImport({ url: absolute, title, equipment_id, model, manufacturer, depth: depth + 1 })
    }
    return NextResponse.json({ error: 'URL does not point to a PDF (and no PDF link found on the page)' }, { status: 400 })
  }

  const arrayBuf = await res.arrayBuffer()
  if (arrayBuf.byteLength > 50 * 1024 * 1024) {
    return NextResponse.json({ error: 'PDF is too large (max 50 MB)' }, { status: 400 })
  }

  const supabase = getSupabaseServer()

  // Store in Supabase Storage
  const fileName = `${Date.now()}-${(model ?? 'manual').replace(/[^a-z0-9]/gi, '-')}.pdf`
  await supabase.storage
    .from('documents')
    .upload(fileName, Buffer.from(arrayBuf), { contentType: 'application/pdf' })

  // Build a sensible default title
  const docTitle = title
    ?? [manufacturer, model, 'Service Manual'].filter(Boolean).join(' ')

  const { data: doc, error: docError } = await supabase
    .from('documents')
    .insert({
      equipment_id: equipment_id ?? null,
      title: docTitle,
      source_type: 'WEB',
      file_name: fileName,
      file_size: arrayBuf.byteLength,
      status: 'PROCESSING',
    })
    .select()
    .single()

  if (docError || !doc) {
    return NextResponse.json({ error: 'Failed to create document record' }, { status: 500 })
  }

  // Kick off async ingestion (Voyage AI embeddings + chunking)
  if (process.env.VOYAGE_API_KEY) {
    processDoc(doc.id, arrayBuf).catch(err =>
      console.error(`[import-url ingest failed] doc=${doc.id}`, err)
    )
  }

  return NextResponse.json({ id: doc.id, title: doc.title, status: 'PROCESSING' }, { status: 201 })
}

async function processDoc(documentId: string, arrayBuf: ArrayBuffer) {
  const pdfParse = (await import('pdf-parse')).default
  const pdfData  = await pdfParse(Buffer.from(arrayBuf))
  await ingestDocument(documentId, pdfData.text, pdfData.numpages)
}
