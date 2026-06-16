import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseServer, getSupabaseRouteAuth } from '@/lib/supabase/client'

const ELEVATED_ROLES = ['admin', 'manager', 'journeyman']

export async function GET(req: NextRequest) {
  const userId = new URL(req.url).searchParams.get('userId')
  if (!userId) return NextResponse.json({ error: 'Missing userId' }, { status: 400 })

  const { data: { user } } = await getSupabaseRouteAuth(req).auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  if (user.id !== userId) {
    const supabase = getSupabaseServer()
    const { data: profile } = await supabase.from('users').select('role').eq('id', user.id).single()
    const role = (profile as { role: string } | null)?.role ?? null
    if (!role || !ELEVATED_ROLES.includes(role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
  }

  const supabase = getSupabaseServer()
  const { data } = await supabase
    .from('lesson_completions')
    .select('completed_at')
    .eq('user_id', userId)

  if (!data?.length) return NextResponse.json({ streak: 0, lastDate: null })

  // Unique UTC dates, newest first
  const dates = [...new Set(
    data.map(r => new Date(r.completed_at).toISOString().slice(0, 10))
  )].sort((a, b) => b.localeCompare(a))

  const now = new Date()
  const today = now.toISOString().slice(0, 10)
  const yesterday = new Date(now.getTime() - 86_400_000).toISOString().slice(0, 10)

  // Streak is live only if the most recent completion was today or yesterday
  if (dates[0] !== today && dates[0] !== yesterday) {
    return NextResponse.json({ streak: 0, lastDate: dates[0] })
  }

  const dateSet = new Set(dates)
  let streak = 0
  let cursor = new Date(dates[0])
  while (dateSet.has(cursor.toISOString().slice(0, 10))) {
    streak++
    cursor = new Date(cursor.getTime() - 86_400_000)
  }

  return NextResponse.json({ streak, lastDate: dates[0] })
}
