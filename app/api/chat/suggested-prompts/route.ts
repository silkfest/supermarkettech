import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseServer, getSupabaseRouteAuth } from '@/lib/supabase/client'

const CURATED_FALLBACKS = [
  'What would cause high suction superheat on a parallel rack?',
  'Walk me through diagnosing a TXV that\'s hunting',
  'What\'s the procedure for checking refrigerant charge on a rack?',
  'My Copeland scroll compressor is tripping on high discharge temperature — what should I check?',
]

export async function GET(req: NextRequest) {
  const { data: { user } } = await getSupabaseRouteAuth(req).auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = getSupabaseServer()
  const prompts: string[] = []

  // Priority 1: questions that got thumbs-up across the org, last 30 days
  const { data: helpful } = await supabase
    .from('helpful_prompts')
    .select('question_text')
    .gte('created_at', new Date(Date.now() - 30 * 86_400_000).toISOString())
    .order('created_at', { ascending: false })
    .limit(20)

  if (helpful?.length) {
    const seen = new Set<string>()
    for (const row of helpful) {
      const text = (row.question_text as string).trim()
      const key  = text.toLowerCase().slice(0, 60)
      if (!seen.has(key)) { seen.add(key); prompts.push(text) }
      if (prompts.length >= 4) break
    }
  }

  // Priority 2: recent org-wide user questions, last 14 days (fills any gap)
  if (prompts.length < 4) {
    const { data: recent } = await supabase
      .from('chat_messages')
      .select('content')
      .eq('role', 'user')
      .gte('created_at', new Date(Date.now() - 14 * 86_400_000).toISOString())
      .order('created_at', { ascending: false })
      .limit(50)

    if (recent?.length) {
      const existingKeys = new Set(prompts.map(p => p.toLowerCase().slice(0, 60)))
      for (const row of recent) {
        const text = (row.content as string).trim()
        if (text.length < 30) continue
        const key = text.toLowerCase().slice(0, 60)
        if (!existingKeys.has(key)) {
          existingKeys.add(key)
          prompts.push(text.slice(0, 200))
        }
        if (prompts.length >= 4) break
      }
    }
  }

  // Priority 3: curated fallbacks
  if (prompts.length < 4) {
    const existingKeys = new Set(prompts.map(p => p.toLowerCase().slice(0, 60)))
    for (const fb of CURATED_FALLBACKS) {
      if (!existingKeys.has(fb.toLowerCase().slice(0, 60))) prompts.push(fb)
      if (prompts.length >= 4) break
    }
  }

  return NextResponse.json({ prompts: prompts.slice(0, 4) })
}
