import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseServer, getSupabaseRouteAuth } from '@/lib/supabase/client'

export async function GET(req: NextRequest) {
  const { data: { user } } = await getSupabaseRouteAuth(req).auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = getSupabaseServer()

  const [{ data: technicians }, { data: allProgress }, { data: tasks }, { data: journeymen }] = await Promise.all([
    supabase.from('users').select('id,name,email,role,mentor_id,created_at').in('role', ['apprentice', 'journeyman']).order('name'),
    supabase.from('apprentice_progress').select('user_id,task_id,status,completed_at'),
    supabase.from('training_tasks').select('id,category,points'),
    supabase.from('users').select('id,name').in('role', ['journeyman', 'admin', 'manager']),
  ])

  const totalPoints = (tasks ?? []).reduce((s, t) => s + t.points, 0)
  const totalTasks  = (tasks ?? []).length

  const journeymanMap: Record<string, string> = {}
  for (const j of journeymen ?? []) journeymanMap[j.id] = j.name

  const result = (technicians ?? []).map(a => {
    const myProgress = (allProgress ?? []).filter(p => p.user_id === a.id)
    const completed  = myProgress.filter(p => p.status === 'completed')
    const earnedXP   = completed.reduce((s, p) => {
      const task = (tasks ?? []).find(t => t.id === p.task_id)
      return s + (task?.points ?? 0)
    }, 0)
    return {
      id:             a.id,
      name:           a.name,
      email:          a.email,
      role:           a.role,
      mentorId:       a.mentor_id,
      mentorName:     a.mentor_id ? (journeymanMap[a.mentor_id] ?? null) : null,
      completedTasks: completed.length,
      totalTasks,
      earnedXP,
      totalXP:        totalPoints,
      joinedAt:       a.created_at,
    }
  })

  return NextResponse.json(result)
}
