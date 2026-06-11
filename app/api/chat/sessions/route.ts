import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseServer, getSupabaseRouteAuth } from '@/lib/supabase/client'
import { requireRole } from '@/lib/api/auth'

// POST /api/chat/sessions — save a full conversation explicitly
export async function POST(req: NextRequest) {
  const { data: { user } } = await getSupabaseRouteAuth(req).auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json().catch(() => null)
  if (!body?.messages?.length) return NextResponse.json({ error: 'No messages provided' }, { status: 400 })

  const { messages, equipmentId, mode, title } = body
  const supabase = getSupabaseServer()

  const { data: sess, error: sessErr } = await supabase
    .from('chat_sessions')
    .insert({ equipment_id: equipmentId ?? null, mode: mode ?? 'EXPERT', title: (title ?? 'Untitled').slice(0, 80) })
    .select('id')
    .single()

  if (sessErr || !sess) return NextResponse.json({ error: sessErr?.message ?? 'Failed to create session' }, { status: 500 })

  const msgRows = (messages as { role: string; content: string }[]).map(m => ({
    session_id: sess.id,
    role: m.role,
    content: m.content,
  }))

  const { error: msgErr } = await supabase.from('chat_messages').insert(msgRows)
  if (msgErr) return NextResponse.json({ error: msgErr.message }, { status: 500 })

  return NextResponse.json({ id: sess.id })
}

// DELETE /api/chat/sessions — clear all chat sessions (messages cascade).
// Destructive for the whole company (sessions aren't per-user yet), so admin/manager only.
export async function DELETE(req: NextRequest) {
  const auth = await requireRole(req, ['admin', 'manager'])
  if (auth instanceof NextResponse) return auth

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
