import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseServer } from '@/lib/supabase/client'
import { requireRole } from '@/lib/api/auth'

export const dynamic = 'force-dynamic'

// GET /api/admin/login-activity — admin-only. Backed by the public.user_login_activity
// view (locked to service_role — see the add_user_login_activity_view migration),
// which re-homes auth.sessions data so we don't need any custom presence/heartbeat
// system: every row is a real login, and last_active_at tracks Supabase's own
// background token-refresh activity for that session.
export async function GET(req: NextRequest) {
  const auth = await requireRole(req, ['admin'])
  if (auth instanceof NextResponse) return auth

  const supabase = getSupabaseServer()
  const { data, error } = await supabase
    .from('user_login_activity')
    .select('*')
    .order('logged_in_at', { ascending: false })
    .limit(500)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data ?? [])
}
