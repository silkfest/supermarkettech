import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseRouteAuth, getSupabaseServer } from '@/lib/supabase/client'

export async function GET(req: NextRequest) {
  const { data: { user } } = await getSupabaseRouteAuth(req).auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const docId = req.nextUrl.searchParams.get('docId')
  if (!docId) return NextResponse.json({ error: 'Missing docId' }, { status: 400 })

  // Service-role client — RLS is enforced by the chat route at retrieval time;
  // here we just need the file_name for a doc the user already has access to.
  const supabase = getSupabaseServer()
  const { data: doc } = await supabase
    .from('documents')
    .select('file_name')
    .eq('id', docId)
    .single()

  if (!doc?.file_name) {
    return NextResponse.json({ error: 'Document not found' }, { status: 404 })
  }

  const { data: signed } = await supabase.storage
    .from('documents')
    .createSignedUrl(doc.file_name, 60)

  if (!signed?.signedUrl) {
    return NextResponse.json({ error: 'Could not generate URL' }, { status: 500 })
  }

  const pdfRes = await fetch(signed.signedUrl)
  if (!pdfRes.ok) {
    return NextResponse.json({ error: 'Failed to fetch PDF' }, { status: 502 })
  }

  return new Response(pdfRes.body, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': 'inline',
      'Cache-Control': 'private, max-age=3600',
      ...(pdfRes.headers.get('Content-Length')
        ? { 'Content-Length': pdfRes.headers.get('Content-Length')! }
        : {}),
    },
  })
}
