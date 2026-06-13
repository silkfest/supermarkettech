import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseServer, getSupabaseRouteAuth } from '@/lib/supabase/client'

const ELEVATED_ROLES = ['admin', 'manager', 'journeyman']

export async function GET(req: NextRequest) {
  const { data: { user } } = await getSupabaseRouteAuth(req).auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = getSupabaseServer()
  const userId = new URL(req.url).searchParams.get('userId') ?? user.id

  const [coursesRes, completionsRes, lessonsRes] = await Promise.all([
    supabase.from('courses').select('*').eq('is_published', true).order('sort_order').order('created_at'),
    supabase.from('course_completions').select('course_id, completed_at, notes').eq('user_id', userId),
    supabase.from('course_lessons').select('course_id'),
  ])

  if (coursesRes.error) return NextResponse.json({ error: coursesRes.error.message }, { status: 500 })

  const completionMap: Record<string, { completed_at: string; notes: string }> = {}
  for (const c of completionsRes.data ?? []) {
    completionMap[c.course_id] = { completed_at: c.completed_at, notes: c.notes }
  }

  const lessonCountMap: Record<string, number> = {}
  for (const l of lessonsRes.data ?? []) {
    lessonCountMap[l.course_id] = (lessonCountMap[l.course_id] ?? 0) + 1
  }

  const merged = (coursesRes.data ?? []).map(course => ({
    ...course,
    completion: completionMap[course.id] ?? null,
    lesson_count: lessonCountMap[course.id] ?? 0,
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
