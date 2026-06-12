import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseServer, getSupabaseRouteAuth } from '@/lib/supabase/client'

// Returns the requesting user's id and whether they may access another user's
// session (admins/managers can; everyone else is restricted to their own).
async function getAccess(req: NextRequest) {
  const { data: { user } } = await getSupabaseRouteAuth(req).auth.getUser()
  if (!user) return null
  const supabase = getSupabaseServer()
  const { data: profile } = await supabase.from('users').select('role').eq('id', user.id).single()
  const role = (profile as { role?: string } | null)?.role ?? ''
  return { userId: user.id, isPrivileged: role === 'admin' || role === 'manager' }
}

// GET /api/chat/sessions/[id] — fetch a single session with its messages, for resuming
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const access = await getAccess(req)
  if (!access) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const supabase = getSupabaseServer()

  const { data, error } = await supabase
    .from('chat_sessions')
    .select(`
      id, title, mode, equipment_id, user_id, created_at,
      messages:chat_messages(id, role, content, created_at)
    `)
    .eq('id', id)
    .single()

  if (error || !data) {
    return NextResponse.json({ error: error?.message ?? 'Session not found' }, { status: 404 })
  }

  if (!access.isPrivileged && data.user_id !== access.userId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  return NextResponse.json(data)
}

// PUT /api/chat/sessions/[id] — replace a session's messages (used to keep an
// in-progress conversation backed up as it grows, and to save edits to a
// resumed conversation). Optionally updates the title.
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const access = await getAccess(req)
  if (!access) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json().catch(() => null)
  if (!body?.messages?.length) return NextResponse.json({ error: 'No messages provided' }, { status: 400 })

  const { id } = await params
  const supabase = getSupabaseServer()

  const { data: session, error: sessErr } = await supabase
    .from('chat_sessions')
    .select('user_id')
    .eq('id', id)
    .single()
  if (sessErr || !session) return NextResponse.json({ error: sessErr?.message ?? 'Session not found' }, { status: 404 })
  if (!access.isPrivileged && session.user_id !== access.userId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { error: delErr } = await supabase.from('chat_messages').delete().eq('session_id', id)
  if (delErr) return NextResponse.json({ error: delErr.message }, { status: 500 })

  const msgRows = (body.messages as { role: string; content: string }[]).map(m => ({
    session_id: id,
    role: m.role,
    content: m.content,
  }))
  const { error: insErr } = await supabase.from('chat_messages').insert(msgRows)
  if (insErr) return NextResponse.json({ error: insErr.message }, { status: 500 })

  if (typeof body.title === 'string' && body.title.trim()) {
    await supabase.from('chat_sessions').update({ title: body.title.trim().slice(0, 80) }).eq('id', id)
  }

  return NextResponse.json({ ok: true })
}

// DELETE /api/chat/sessions/[id] — delete a single chat session (messages cascade)
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const access = await getAccess(req)
  if (!access) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const supabase = getSupabaseServer()

  const { data: session, error: sessErr } = await supabase
    .from('chat_sessions')
    .select('user_id')
    .eq('id', id)
    .single()
  if (sessErr || !session) return NextResponse.json({ error: sessErr?.message ?? 'Session not found' }, { status: 404 })
  if (!access.isPrivileged && session.user_id !== access.userId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { error } = await supabase
    .from('chat_sessions')
    .delete()
    .eq('id', id)

  if (error) {
    console.error('[chat sessions DELETE]', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
