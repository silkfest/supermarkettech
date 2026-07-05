import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseServer, getSupabaseRouteAuth } from '@/lib/supabase/client'

const ELEVATED_ROLES = ['admin', 'manager']

export async function GET(req: NextRequest) {
  const { data: { user } } = await getSupabaseRouteAuth(req).auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = getSupabaseServer()
  const { data: callerProfile } = await supabase.from('users').select('role').eq('id', user.id).single()
  const callerRole = (callerProfile as { role: string } | null)?.role ?? ''
  const callerElevated = ELEVATED_ROLES.includes(callerRole)

  // Non-elevated callers (apprentices/journeymen) can only ever see their own
  // training; elevated callers may pass ?userId= to view someone else's.
  const requestedId = new URL(req.url).searchParams.get('userId')
  const targetId = callerElevated ? (requestedId ?? user.id) : user.id

  // Resolve the target's role (their role-based assignments count toward visibility)
  let targetRole = callerRole
  if (targetId !== user.id) {
    const { data: tp } = await supabase.from('users').select('role').eq('id', targetId).single()
    targetRole = (tp as { role: string } | null)?.role ?? ''
  }

  const [coursesRes, completionsRes, lessonsRes, assignmentsRes] = await Promise.all([
    supabase.from('courses').select('*').eq('is_published', true).order('sort_order').order('created_at'),
    supabase.from('course_completions').select('course_id, completed_at, notes').eq('user_id', targetId),
    supabase.from('course_lessons').select('course_id'),
    supabase.from('course_assignments').select('course_id, user_id, role'),
  ])

  if (coursesRes.error) return NextResponse.json({ error: coursesRes.error.message }, { status: 500 })

  // Courses assigned to the target — directly (user_id) or via their role.
  const assignedToTarget = new Set(
    (assignmentsRes.data ?? [])
      .filter(a => a.user_id === targetId || (a.role && a.role === targetRole))
      .map(a => a.course_id)
  )

  const completionMap: Record<string, { completed_at: string; notes: string }> = {}
  for (const c of completionsRes.data ?? []) {
    completionMap[c.course_id] = { completed_at: c.completed_at, notes: c.notes }
  }

  const lessonCountMap: Record<string, number> = {}
  for (const l of lessonsRes.data ?? []) {
    lessonCountMap[l.course_id] = (lessonCountMap[l.course_id] ?? 0) + 1
  }

  // Learners only ever see courses assigned to them; managers/admins see the full
  // catalog (each annotated with whether it's assigned to the viewed user).
  const visible = callerElevated
    ? (coursesRes.data ?? [])
    : (coursesRes.data ?? []).filter(course => assignedToTarget.has(course.id))

  const merged = visible.map(course => ({
    ...course,
    completion: completionMap[course.id] ?? null,
    lesson_count: lessonCountMap[course.id] ?? 0,
    assigned_to_target: assignedToTarget.has(course.id),
  }))

  return NextResponse.json(merged)
}

export async function POST(req: NextRequest) {
  const { data: { user } } = await getSupabaseRouteAuth(req).auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = getSupabaseServer()
  const { data: profile } = await supabase.from('users').select('role').eq('id', user.id).single()
  const role = (profile as { role: string } | null)?.role ?? ''
  if (!ELEVATED_ROLES.includes(role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json()
  const { data, error } = await supabase.from('courses').insert({
    title:            body.title?.trim()       ?? '',
    description:      body.description?.trim() ?? '',
    category:         body.category            ?? 'General',
    type:             body.type                ?? 'article',
    url:              body.url?.trim()         ?? '',
    duration_minutes: body.duration_minutes    ?? 0,
    points:           body.points              ?? 50,
    sort_order:       body.sort_order          ?? 0,
    is_published:     body.is_published        ?? true,
    created_by:       user.id,
  }).select().single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}
