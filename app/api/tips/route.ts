import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseServer, getSupabaseRouteAuth } from '@/lib/supabase/client'

// GET /api/tips — list all tips with messages + saver name + equipment
export async function GET(req: NextRequest) {
  const { data: { user } } = await getSupabaseRouteAuth(req).auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = getSupabaseServer()

  const { data: tips, error } = await supabase
    .from('troubleshooting_tips')
    .select(`
      id, title, created_at,
      saved_by,
      saver:users!troubleshooting_tips_saved_by_fkey(name),
      session:chat_sessions(
        id, mode, equipment_id,
        equipment:equipment(name, manufacturer, model),
        messages:chat_messages(role, content, sources, created_at)
      )
    `)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('[tips GET]', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(tips ?? [])
}

// POST /api/tips — save a session as a troubleshooting tip
export async function POST(req: NextRequest) {
  const { data: { user } } = await getSupabaseRouteAuth(req).auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json().catch(() => null)
  if (!body?.sessionId || !body?.title?.trim()) {
    return NextResponse.json({ error: 'sessionId and title are required' }, { status: 400 })
  }

  const supabase = getSupabaseServer()

  // Check session exists
  const { data: session } = await supabase
    .from('chat_sessions')
    .select('id')
    .eq('id', body.sessionId)
    .single()

  if (!session) return NextResponse.json({ error: 'Session not found' }, { status: 404 })

  // Prevent duplicate tips for the same session
  const { data: existing } = await supabase
    .from('troubleshooting_tips')
    .select('id')
    .eq('session_id', body.sessionId)
    .single()

  if (existing) return NextResponse.json({ error: 'This chat has already been saved as a tip', id: existing.id }, { status: 409 })

  const { data: tip, error } = await supabase
    .from('troubleshooting_tips')
    .insert({ session_id: body.sessionId, title: body.title.trim(), saved_by: user.id })
    .select()
    .single()

  if (error) {
    console.error('[tips POST]', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(tip, { status: 201 })
}
