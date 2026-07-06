import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getSupabaseServer } from '@/lib/supabase/client'
import { requireUser } from '@/lib/api/auth'

const attemptSchema = z.object({
  rack: z.enum(['parallel-rack', 'protocol-rack-a', 'co2-booster', 'safety-circuit']),
  scenarioId: z.string().min(1).max(64),
  scenarioName: z.string().min(1).max(120),
  difficulty: z.string().max(20).nullish(),
  mode: z.enum(['scenario', 'mystery', 'wiring']).default('scenario'),
  score: z.number().int().min(0).max(100).nullish(),
  correct: z.number().int().min(0).nullish(),
  total: z.number().int().min(0).nullish(),
  falsePositives: z.number().int().min(0).nullish(),
})

// POST /api/simulator/attempts — record a completed scenario / mystery-fault attempt
export async function POST(req: NextRequest) {
  const auth = await requireUser(req)
  if (auth instanceof NextResponse) return auth

  const parsed = attemptSchema.safeParse(await req.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid attempt payload' }, { status: 400 })
  }
  const a = parsed.data

  const supabase = getSupabaseServer()
  const { error } = await supabase.from('simulator_attempts').insert({
    user_id: auth.id,
    rack: a.rack,
    scenario_id: a.scenarioId,
    scenario_name: a.scenarioName,
    difficulty: a.difficulty ?? null,
    mode: a.mode,
    score: a.score ?? null,
    correct: a.correct ?? null,
    total: a.total ?? null,
    false_positives: a.falsePositives ?? null,
  })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}

export interface RackSummary {
  attempts: number
  bestScore: number | null
  avgScore: number | null
  lastAt: string | null
}

// GET /api/simulator/attempts — the caller's recent attempts + per-rack summary
export async function GET(req: NextRequest) {
  const auth = await requireUser(req)
  if (auth instanceof NextResponse) return auth

  const supabase = getSupabaseServer()
  const { data, error } = await supabase
    .from('simulator_attempts')
    .select('rack, scenario_id, scenario_name, difficulty, mode, score, correct, total, false_positives, created_at')
    .eq('user_id', auth.id)
    .order('created_at', { ascending: false })
    .limit(200)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const rows = data ?? []
  const summary: Record<string, RackSummary> = {}
  for (const r of rows) {
    const s = summary[r.rack] ?? { attempts: 0, bestScore: null, avgScore: null, lastAt: null }
    s.attempts += 1
    if (typeof r.score === 'number') {
      s.bestScore = s.bestScore === null ? r.score : Math.max(s.bestScore, r.score)
      // accumulate into avg via running sum; finalize below using a parallel count
    }
    if (!s.lastAt) s.lastAt = r.created_at  // rows are newest-first
    summary[r.rack] = s
  }
  // compute averages in a second pass (scored attempts only)
  for (const rack of Object.keys(summary)) {
    const scored = rows.filter(r => r.rack === rack && typeof r.score === 'number')
    summary[rack].avgScore = scored.length
      ? Math.round(scored.reduce((acc, r) => acc + (r.score as number), 0) / scored.length)
      : null
  }

  return NextResponse.json({ attempts: rows.slice(0, 20), summary })
}
