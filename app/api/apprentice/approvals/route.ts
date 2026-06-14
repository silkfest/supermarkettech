import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseServer, getSupabaseRouteAuth } from '@/lib/supabase/client'

const ELEVATED_ROLES = ['admin', 'manager', 'journeyman']

// Returns all task submissions awaiting manager approval (status = 'pending_review'),
// joined with the apprentice name and task details. Elevated roles only.
export async function GET(req: NextRequest) {
  const { data: { user } } = await getSupabaseRouteAuth(req).auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = getSupabaseServer()
  const { data: profile } = await supabase.from('users').select('role').eq('id', user.id).single()
  const role = (profile as { role: string } | null)?.role ?? ''
  if (!ELEVATED_ROLES.includes(role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { data: pending, error } = await supabase
    .from('apprentice_progress')
    .select('user_id, task_id, notes')
    .eq('status', 'pending_review')

  if (error) {
    console.error('[apprentice/approvals] error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const rows = pending ?? []
  if (rows.length === 0) return NextResponse.json([])

  const userIds = [...new Set(rows.map(r => r.user_id))]
  const taskIds = [...new Set(rows.map(r => r.task_id))]

  const [usersRes, tasksRes] = await Promise.all([
    supabase.from('users').select('id, name, email').in('id', userIds),
    supabase.from('training_tasks').select('id, title, category, difficulty, points').in('id', taskIds),
  ])

  const userMap: Record<string, { name: string; email: string }> = {}
  for (const u of usersRes.data ?? []) userMap[u.id] = { name: u.name, email: u.email }
  const taskMap: Record<string, { title: string; category: string; difficulty: string; points: number }> = {}
  for (const t of tasksRes.data ?? []) taskMap[t.id] = { title: t.title, category: t.category, difficulty: t.difficulty, points: t.points }

  const result = rows.map(r => ({
    user_id:    r.user_id,
    user_name:  userMap[r.user_id]?.name || userMap[r.user_id]?.email || 'Unknown',
    task_id:    r.task_id,
    task_title: taskMap[r.task_id]?.title ?? 'Unknown task',
    category:   taskMap[r.task_id]?.category ?? '',
    difficulty: taskMap[r.task_id]?.difficulty ?? '',
    points:     taskMap[r.task_id]?.points ?? 0,
    notes:      r.notes ?? '',
  }))

  // Group by apprentice name for stable display
  result.sort((a, b) => a.user_name.localeCompare(b.user_name) || a.task_title.localeCompare(b.task_title))

  return NextResponse.json(result)
}
