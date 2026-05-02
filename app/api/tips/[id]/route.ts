import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseServer, getSupabaseRouteAuth } from '@/lib/supabase/client'

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { data: { user } } = await getSupabaseRouteAuth(req).auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = getSupabaseServer()

  // Check ownership (RLS handles this too, but give a clear error)
  const { data: tip } = await supabase
    .from('troubleshooting_tips')
    .select('saved_by')
    .eq('id', id)
    .single()

  if (!tip) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const { data: caller } = await supabase.from('users').select('role').eq('id', user.id).single()
  const role = (caller as { role: string } | null)?.role
  const canDelete = tip.saved_by === user.id || role === 'admin' || role === 'manager'

  if (!canDelete) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { error } = await supabase.from('troubleshooting_tips').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return new NextResponse(null, { status: 204 })
}
