import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseRouteAuth, getSupabaseServer } from '@/lib/supabase/client'

const EDGE_FN_URL = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/process-document`

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { data: { user } } = await getSupabaseRouteAuth(req).auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = getSupabaseServer()

  // Only admins/managers can trigger processing
  const { data: profile } = await supabase.from('users').select('role').eq('id', user.id).single()
  const role = (profile as { role?: string } | null)?.role
  if (role !== 'admin' && role !== 'manager') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // Verify document exists
  const { data: doc } = await supabase.from('documents').select('id, title, file_name').eq('id', id).single()
  if (!doc?.file_name) return NextResponse.json({ error: 'Document not found' }, { status: 404 })

  // Call the Edge Function (fire and forget — it returns 202)
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? ''
  const res = await fetch(EDGE_FN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${serviceKey}`,
    },
    body: JSON.stringify({ documentId: id }),
  })

  if (!res.ok && res.status !== 202) {
    const err = await res.text().catch(() => 'Unknown error')
    return NextResponse.json({ error: `Edge function error: ${err}` }, { status: 502 })
  }

  return NextResponse.json({ accepted: true, documentId: id, title: doc.title })
}
