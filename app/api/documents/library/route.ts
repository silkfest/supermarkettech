import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseServer, getSupabaseRouteAuth } from '@/lib/supabase/client'

export const maxDuration = 60

// GET /api/documents/library — all documents (global + equipment-assigned) with signed URLs
// Optional query params: ?category=Compressor&search=bitzer
export async function GET(req: NextRequest) {
  const { data: { user } } = await getSupabaseRouteAuth(req).auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = getSupabaseServer()
  const { searchParams } = new URL(req.url)
  const category = searchParams.get('category')?.trim() ?? ''
  const search   = searchParams.get('search')?.toLowerCase().trim() ?? ''

  let query = supabase
    .from('documents')
    .select('id, title, category, status, page_count, file_size, file_name, equipment_id, source_type, created_at, equipment:equipment_id(name)')
    .eq('status', 'READY')
    .order('category')
    .order('title')

  if (category) query = query.eq('category', category)

  const { data: docs, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  let results = docs ?? []

  // Client-side search filter (title match)
  if (search) {
    results = results.filter(d =>
      d.title.toLowerCase().includes(search) ||
      (d.category ?? '').toLowerCase().includes(search)
    )
  }

  // Batch-generate all signed URLs in a single Storage API call (avoids N×round-trips timing out)
  const filePaths = results.map(d => d.file_name).filter((p): p is string => !!p)
  const signedUrlMap: Record<string, string> = {}
  if (filePaths.length > 0) {
    const { data: signedData } = await supabase.storage
      .from('documents')
      .createSignedUrls(filePaths, 3600)
    ;(signedData ?? []).forEach(item => {
      if (item.signedUrl && item.path) signedUrlMap[item.path] = item.signedUrl
    })
  }

  const withUrls = results.map(doc => {
    const rawEq = doc.equipment
    const eq = (Array.isArray(rawEq) ? rawEq[0] : rawEq) as { name: string } | null
    return {
      id:             doc.id,
      title:          doc.title,
      category:       doc.category ?? '',
      status:         doc.status,
      page_count:     doc.page_count,
      file_size:      doc.file_size,
      source_type:    doc.source_type,
      created_at:     doc.created_at,
      equipment_id:   doc.equipment_id,
      equipment_name: eq?.name ?? null,
      signed_url:     doc.file_name ? (signedUrlMap[doc.file_name] ?? null) : null,
    }
  })

  return NextResponse.json(withUrls)
}
