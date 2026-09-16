import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseServer } from '@/lib/supabase/client'
import { requireRole } from '@/lib/api/auth'
import { LESSONS } from '@/lib/game/lessons'
import type { GameProgress, TeamTrainingRow } from '@/lib/game/progress'

/** GET /api/game/team-progress — every tech's ColdCall training progress.
 *  Managers and admins only: this is the team-wide view, not the player's own save. */
export async function GET(req: NextRequest) {
  const auth = await requireRole(req, ['admin', 'manager'])
  if (auth instanceof NextResponse) return auth

  const { data, error } = await getSupabaseServer()
    .from('game_progress')
    .select('user_id, progress, updated_at')
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const rows: TeamTrainingRow[] = []
  for (const r of (data ?? []) as { user_id: string; progress: GameProgress | null; updated_at: string | null }[]) {
    const p = r.progress
    if (!p || p.version !== 1) continue
    const stationsPassed = LESSONS.filter(l => p.lessons?.[l.id]?.passed).length
    rows.push({
      userId: r.user_id,
      stationsPassed,
      graduated: stationsPassed >= LESSONS.length,
      xp: p.xp ?? 0,
      hours: p.hours ?? 0,
      levels: p.levels ?? {},
      updatedAt: r.updated_at,
    })
  }

  return NextResponse.json({ stationsTotal: LESSONS.length, rows })
}
