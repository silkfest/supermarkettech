import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseServer, getSupabaseRouteAuth } from '@/lib/supabase/client'

export async function GET() {
  const supabase = getSupabaseServer()

  const { data: questions, error } = await supabase
    .from('team_questions')
    .select('id, title, body, tags, created_at, users!user_id(name, role)')
    .order('created_at', { ascending: false })
    .limit(100)

  if (error || !questions) return NextResponse.json([])

  const ids = questions.map(q => q.id)
  const { data: answerRows } = ids.length > 0
    ? await supabase.from('team_answers').select('question_id').in('question_id', ids)
    : { data: [] }

  const countMap: Record<string, number> = {}
  for (const a of answerRows ?? []) {
    countMap[a.question_id] = (countMap[a.question_id] ?? 0) + 1
  }

  const result = questions.map(q => ({
    id: q.id,
    title: q.title,
    body: q.body,
    tags: q.tags ?? [],
    created_at: q.created_at,
    author: q.users as { name: string; role: string } | null,
    answer_count: countMap[q.id] ?? 0,
  }))

  return NextResponse.json(result)
}

export async function POST(req: NextRequest) {
  const authClient = getSupabaseRouteAuth(req)
  const { data: { user } } = await authClient.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { title, body, tags } = await req.json()
  if (!title?.trim() || !body?.trim()) {
    return NextResponse.json({ error: 'Title and body are required' }, { status: 400 })
  }

  const supabase = getSupabaseServer()
  const { data, error } = await supabase
    .from('team_questions')
    .insert({
      user_id: user.id,
      title: title.trim(),
      body: body.trim(),
      tags: Array.isArray(tags) ? tags.filter(Boolean) : [],
    })
    .select('id')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}
