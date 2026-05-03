import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseServer, getSupabaseRouteAuth } from '@/lib/supabase/client'

export async function GET(req: NextRequest) {
  const { data: { user } } = await getSupabaseRouteAuth(req).auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const model        = searchParams.get('model')?.trim() ?? ''
  const manufacturer = searchParams.get('manufacturer')?.trim() ?? ''

  if (!model && !manufacturer) return NextResponse.json([])

  const supabase = getSupabaseServer()

  // Sanitise inputs before interpolating into PostgREST .or() filter string
  const safe = (s: string) => s.replace(/[,().%_]/g, '').slice(0, 100)
  const terms   = [model, manufacturer].filter(Boolean)
  const orCond  = terms.map(t => `title.ilike.%${safe(t)}%`).join(',')

  const { data, error } = await supabase
    .from('documents')
    .select('id, title, source_type, status, created_at, equipment_id')
    .or(orCond)
    .eq('status', 'READY')
    .order('created_at', { ascending: false })
    .limit(10)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data ?? [])
}
