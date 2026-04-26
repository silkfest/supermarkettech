import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseServer } from '@/lib/supabase/client'

// GET  /api/tech-certs?userId=xxx  — list certs for a user
// POST /api/tech-certs              — create cert
export async function GET(req: NextRequest) {
  const userId = new URL(req.url).searchParams.get('userId')
  if (!userId) return NextResponse.json({ error: 'Missing userId' }, { status: 400 })
  const supabase = getSupabaseServer()
  const { data, error } = await supabase
    .from('tech_certifications')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(req: NextRequest) {
  const supabase = getSupabaseServer()
  const body = await req.json()
  const { data, error } = await supabase
    .from('tech_certifications')
    .insert({
      user_id:      body.userId,
      cert_type:    body.certType,
      cert_subtype: body.certSubtype ?? '',
      cert_number:  body.certNumber ?? '',
      issued_date:  body.issuedDate ?? null,
      expiry_date:  body.expiryDate ?? null,
      notes:        body.notes ?? '',
    })
    .select()
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}
