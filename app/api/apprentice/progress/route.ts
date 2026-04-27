import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseServer } from '@/lib/supabase/client'

export async function GET(req: NextRequest) {
  const userId = new URL(req.url).searchParams.get('userId')
  if (!userId) return NextResponse.json({ error: 'Missing userId' }, { status: 400 })

  const supabase = getSupabaseServer()

  // Debug: log which Supabase project we're connecting to
  console.log('[apprentice/progress] SUPABASE_URL:', process.env.NEXT_PUBLIC_SUPABASE_URL)
  console.log('[apprentice/progress] HAS_SERVICE_KEY:', !!process.env.SUPABASE_SERVICE_ROLE_KEY)

  // Fetch tasks and progress separately to avoid PostgREST join issues
  const [tasksResult, progressResult] = await Promise.all([
    supabase.from('training_tasks').select('*').order('category').order('sort_order'),
    supabase.from('apprentice_progress').select('*').eq('user_id', userId),
  ])

  if (tasksResult.error) {
    console.error('[apprentice/progress] tasks error:', tasksResult.error)
    return NextResponse.json({ error: tasksResult.error.message }, { status: 500 })
  }
  if (progressResult.error) {
    console.error('[apprentice/progress] progress error:', progressResult.error)
  }

  const tasks    = tasksResult.data ?? []
  const progress = progressResult.data ?? []

  console.log(`[apprentice/progress] tasks: ${tasks.length}, progress: ${progress.length} for user ${userId}`)

  // Build a map of task_id → progress row
  const progressMap: Record<string, {
    status: string; completed_at: string | null; notes: string; verified_by: string | null
  }> = {}
  for (const p of progress) {
    progressMap[p.task_id] = {
      status:       p.status,
      completed_at: p.completed_at,
      notes:        p.notes ?? '',
      verified_by:  p.verified_by ?? null,
    }
  }

  // Fetch verifier names for any completed tasks that have a verified_by
  const verifierIds = [...new Set(progress.map((p: { verified_by: string | null }) => p.verified_by).filter(Boolean))] as string[]
  let verifierMap: Record<string, string> = {}
  if (verifierIds.length > 0) {
    const { data: verifiers } = await supabase
      .from('users')
      .select('id, name')
      .in('id', verifierIds)
    for (const v of verifiers ?? []) {
      verifierMap[v.id] = v.name
    }
  }

  const merged = tasks.map((t: Record<string, unknown>) => {
    const p = progressMap[t.id as string]
    return {
      ...t,
      progress: p
        ? {
            status:       p.status,
            completed_at: p.completed_at,
            notes:        p.notes,
            verifier:     p.verified_by ? { name: verifierMap[p.verified_by] ?? null } : null,
          }
        : null,
    }
  })

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

  if (error) {
    console.error('[apprentice/progress POST] error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
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
  if (error) {
    console.error('[apprentice/progress DELETE] error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json({ ok: true })
}
