import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseServer } from '@/lib/supabase/client'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = getSupabaseServer()

  const [{ data: question }, { data: answers }] = await Promise.all([
    supabase
      .from('team_questions')
      .select('id, title, body, tags, created_at, users!user_id(name, role)')
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
      author: question.users as { name: string; role: string } | null,
    },
    answers: (answers ?? []).map(a => ({
      id: a.id,
      body: a.body,
      is_accepted: a.is_accepted,
      created_at: a.created_at,
      author: a.users as { name: string; role: string } | null,
    })),
  })
}
