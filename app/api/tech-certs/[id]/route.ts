import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseServer, getSupabaseRouteAuth } from '@/lib/supabase/client'

// PATCH /api/tech-certs/[id]
// DELETE /api/tech-certs/[id]
// Users can modify their own certs; admins/managers can modify anyone's.
async function canMutateCert(req: NextRequest, certId: string): Promise<NextResponse | null> {
  const { data: { user } } = await getSupabaseRouteAuth(req).auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = getSupabaseServer()
  const { data: cert } = await supabase
    .from('tech_certifications')
    .select('user_id')
    .eq('id', certId)
    .single()
  if (!cert) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  if (cert.user_id !== user.id) {
    const { data: profile } = await supabase.from('users').select('role').eq('id', user.id).single()
    const role = (profile as { role?: string } | null)?.role ?? ''
    if (!['admin', 'manager'].includes(role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
  }
  return null
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id?: string }> }) {
  const { id } = await params
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })
  const denied = await canMutateCert(req, id)
  if (denied) return denied

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

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id?: string }> }) {
  const { id } = await params
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })
  const denied = await canMutateCert(req, id)
  if (denied) return denied

  const supabase = getSupabaseServer()
  const { error } = await supabase.from('tech_certifications').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
