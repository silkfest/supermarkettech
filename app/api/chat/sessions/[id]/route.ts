import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseServer, getSupabaseRouteAuth } from '@/lib/supabase/client'

// DELETE /api/chat/sessions/[id] — delete a single chat session (messages cascade)
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { data: { user } } = await getSupabaseRouteAuth(req).auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const supabase = getSupabaseServer()

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
