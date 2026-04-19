import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseServer } from '@/lib/supabase/client'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const model        = searchParams.get('model')?.trim() ?? ''
  const manufacturer = searchParams.get('manufacturer')?.trim() ?? ''

  if (!model && !manufacturer) return NextResponse.json([])

  const supabase = getSupabaseServer()

  // Build OR filter — match any document whose title contains the model or manufacturer
  const terms   = [model, manufacturer].filter(Boolean)
  const orCond  = terms.map(t => `title.ilike.%${t}%`).join(',')

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
