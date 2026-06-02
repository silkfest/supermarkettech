import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseServer, getSupabaseRouteAuth } from '@/lib/supabase/client'

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  const authClient = getSupabaseRouteAuth(req)
  const { data: { user } } = await authClient.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { body } = await req.json()
  if (!body?.trim()) {
    return NextResponse.json({ error: 'Answer body is required' }, { status: 400 })
  }

  const supabase = getSupabaseServer()
  const { data, error } = await supabase
    .from('team_answers')
    .insert({ question_id: id, user_id: user.id, body: body.trim() })
    .select('id')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}
