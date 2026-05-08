import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseServer, getSupabaseRouteAuth } from '@/lib/supabase/client'

// DELETE /api/chat/sessions — clear all chat sessions (messages cascade)
export async function DELETE(req: NextRequest) {
  const { data: { user } } = await getSupabaseRouteAuth(req).auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = getSupabaseServer()
  const { error } = await supabase
    .from('chat_sessions')
    .delete()
    .not('id', 'is', null) // delete all rows; PostgREST requires a filter clause

  if (error) {
    console.error('[chat sessions DELETE all]', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}

// GET /api/chat/sessions — list all chat sessions (most recent first)
export async function GET(req: NextRequest) {
  const { data: { user } } = await getSupabaseRouteAuth(req).auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = getSupabaseServer()

  const { data: sessions, error } = await supabase
    .from('chat_sessions')
    .select(`
      id, title, mode, created_at, equipment_id,
      equipment:equipment(name, manufacturer, model),
      messages:chat_messages(id, role, content, created_at),
      tip:troubleshooting_tips(id, title)
    `)
    .order('created_at', { ascending: false })
    .limit(100)

  if (error) {
    console.error('[chat sessions GET]', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(sessions ?? [])
}
