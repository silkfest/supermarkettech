import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseServer, getSupabaseRouteAuth } from '@/lib/supabase/client'

async function requireAdminOrManager(req: NextRequest) {
  const supabase = getSupabaseServer()
  const { data: { user } } = await getSupabaseRouteAuth(req).auth.getUser()
  if (!user) return null
  const { data: profile } = await supabase.from('users').select('role').eq('id', user.id).single()
  const role = (profile as { role?: string } | null)?.role
  return role === 'admin' || role === 'manager' ? user : null
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = getSupabaseServer()

  const [{ data: question }, { data: answers }] = await Promise.all([
    supabase
      .from('team_questions')
      .select('id, title, body, tags, created_at, is_pinned, users!user_id(name, role)')
      .eq('id', id)
      .single(),
    supabase
      .from('team_answers')
      .select('id, body, is_accepted, created_at, users!user_id(name, role)')
      .eq('question_id', id)
      .order('created_at', { ascending: true }),
  ])

  if (!question) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  return NextResponse.json({
    question: {
      id: question.id,
      title: question.title,
      body: question.body,
      tags: question.tags ?? [],
      created_at: question.created_at,
      is_pinned: question.is_pinned ?? false,
      author: question.users as unknown as { name: string; role: string } | null,
    },
    answers: (answers ?? []).map(a => ({
      id: a.id,
      body: a.body,
      is_accepted: a.is_accepted,
      created_at: a.created_at,
      author: a.users as unknown as { name: string; role: string } | null,
    })),
  })
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const user = await requireAdminOrManager(req)
  if (!user) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json()
  const supabase = getSupabaseServer()
  const { error } = await supabase.from('team_questions').update({ is_pinned: body.is_pinned }).eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const user = await requireAdminOrManager(req)
  if (!user) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const supabase = getSupabaseServer()
  await supabase.from('team_answers').delete().eq('question_id', id)
  const { error } = await supabase.from('team_questions').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
