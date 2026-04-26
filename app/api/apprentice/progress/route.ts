import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseServer } from '@/lib/supabase/client'

export async function GET(req: NextRequest) {
  const userId = new URL(req.url).searchParams.get('userId')
  if (!userId) return NextResponse.json({ error: 'Missing userId' }, { status: 400 })

  const supabase = getSupabaseServer()

  const [{ data: tasks }, { data: progress }] = await Promise.all([
    supabase.from('training_tasks').select('*').order('category').order('sort_order'),
    supabase.from('apprentice_progress').select('*, verifier:verified_by(name)').eq('user_id', userId),
  ])

  const progressMap: Record<string, {
    status: string; completed_at: string | null; notes: string; verifier: { name: string } | null
  }> = {}
  for (const p of progress ?? []) {
    progressMap[p.task_id] = {
      status:       p.status,
      completed_at: p.completed_at,
      notes:        p.notes,
      verifier:     p.verifier ?? null,
    }
  }

  const merged = (tasks ?? []).map(t => ({
    ...t,
    progress: progressMap[t.id] ?? null,
  }))

  return NextResponse.json(merged)
}

export async function POST(req: NextRequest) {
  const supabase = getSupabaseServer()
  const body = await req.json()
  // body: { userId, taskId, status: 'in_progress'|'completed', notes?, verifiedBy? }

  const upsertData: Record<string, unknown> = {
    user_id:  body.userId,
    task_id:  body.taskId,
    status:   body.status,
    notes:    body.notes ?? '',
    verified_by: body.verifiedBy ?? null,
  }
  if (body.status === 'completed') {
    upsertData.completed_at = new Date().toISOString()
  } else {
    upsertData.completed_at = null
  }

  const { data, error } = await supabase
    .from('apprentice_progress')
    .upsert(upsertData, { onConflict: 'user_id,task_id' })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function DELETE(req: NextRequest) {
  const { userId, taskId } = await req.json()
  const supabase = getSupabaseServer()
  const { error } = await supabase
    .from('apprentice_progress')
    .delete()
    .eq('user_id', userId)
    .eq('task_id', taskId)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
