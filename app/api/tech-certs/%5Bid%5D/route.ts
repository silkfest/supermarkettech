import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseServer } from '@/lib/supabase/client'

// PATCH /api/tech-certs/[id]
// DELETE /api/tech-certs/[id]
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id?: string }> }) {
  const { id } = await params
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })
  const supabase = getSupabaseServer()
  const body = await req.json()
  const { data, error } = await supabase
    .from('tech_certifications')
    .update({
      cert_type:    body.certType,
      cert_subtype: body.certSubtype ?? '',
      cert_number:  body.certNumber ?? '',
      issued_date:  body.issuedDate ?? null,
      expiry_date:  body.expiryDate ?? null,
      notes:        body.notes ?? '',
    })
    .eq('id', id)
    .select()
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id?: string }> }) {
  const { id } = await params
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })
  const supabase = getSupabaseServer()
  const { error } = await supabase.from('tech_certifications').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
