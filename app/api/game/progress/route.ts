import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getSupabaseServer } from '@/lib/supabase/client'
import { requireUser } from '@/lib/api/auth'

const characterSchema = z.object({
  name: z.string().max(24),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  role: z.enum(['apprentice', 'journeyman']),
})

const levelStatSchema = z.object({
  shifts: z.number().int().min(0),
  bestScore: z.number().int().min(0),
  bestGrade: z.string().max(1).nullable(),
})

const progressSchema = z.object({
  version: z.literal(1),
  lessons: z.record(z.string().max(40), z.object({ passed: z.boolean(), bestScore: z.number().int().min(0).max(100) })),
  levels: z.record(z.string().max(40), levelStatSchema),
  xp: z.number().int().min(0),
  // Optional so saves written before the apprenticeship ladder existed still round-trip.
  hours: z.number().min(0).optional(),
})

const bodySchema = z.object({ character: characterSchema.nullable(), progress: progressSchema })

// GET /api/game/progress — the caller's saved campaign progress (null if none yet)
export async function GET(req: NextRequest) {
  const auth = await requireUser(req)
  if (auth instanceof NextResponse) return auth

  const { data, error } = await getSupabaseServer()
    .from('game_progress')
    .select('character, progress, updated_at')
    .eq('user_id', auth.id)
    .maybeSingle()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data ?? null)
}

// PUT /api/game/progress — upsert the caller's campaign progress
export async function PUT(req: NextRequest) {
  const auth = await requireUser(req)
  if (auth instanceof NextResponse) return auth

  const parsed = bodySchema.safeParse(await req.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: 'Invalid progress payload' }, { status: 400 })

  const { error } = await getSupabaseServer()
    .from('game_progress')
    .upsert({
      user_id: auth.id,
      character: parsed.data.character ?? {},
      progress: parsed.data.progress,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id' })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
