import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseServer, getSupabaseRouteAuth } from '@/lib/supabase/client'

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

  // Generate signed URLs for PDFs stored in Supabase Storage
  const withUrls = await Promise.all(
    results.map(async (doc) => {
      let signed_url: string | null = null
      if (doc.file_name) {
        const { data } = await supabase.storage
          .from('documents')
          .createSignedUrl(doc.file_name, 3600)
        signed_url = data?.signedUrl ?? null
      }
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
        signed_url,
      }
    })
  )

  return NextResponse.json(withUrls)
}
