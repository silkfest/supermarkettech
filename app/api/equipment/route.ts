import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseServer } from '@/lib/supabase/client'
import { z } from 'zod'

const DEFAULT_STORE = '00000000-0000-0000-0000-000000000001'

const CreateSchema = z.object({
  name:          z.string().min(1),
  manufacturer:  z.string().min(1),
  model:         z.string().min(1),
  serial_number: z.string().optional(),
  refrigerant:   z.string().optional(),
  installed_at:  z.string().optional(),
  location:      z.string().optional(),
  notes:         z.string().optional(),
})

export async function GET() {
  const supabase = getSupabaseServer()

  const { data: equipment, error } = await supabase
    .from('equipment')
    .select(`
      *,
      active_alarms:alarm_events(id, code, severity, triggered_at, description),
      latest_readings:sensor_readings(reading_type, value, unit, recorded_at)
    `)
    .is('alarm_events.resolved_at', null)
    .order('name')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Sort readings by recorded_at desc
  const enriched = (equipment ?? []).map((e: any) => ({
    ...e,
    latest_readings: (e.latest_readings ?? []).sort(
      (a: any, b: any) => new Date(b.recorded_at).getTime() - new Date(a.recorded_at).getTime()
    ),
  }))

  return NextResponse.json(enriched)
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null)
  const parsed = CreateSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Validation failed', details: parsed.error.flatten() }, { status: 400 })

  const supabase = getSupabaseServer()
  const { data, error } = await supabase
    .from('equipment')
    .insert({ ...parsed.data, store_id: DEFAULT_STORE, status: 'UNKNOWN' })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}
