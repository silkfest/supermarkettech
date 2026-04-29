import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { getSupabaseServer } from '@/lib/supabase/client'
import { buildSystemPrompt } from '@/lib/ai/prompts'
import { retrieveChunks, formatContext, chunksToCitations } from '@/lib/ai/rag'
import { buildSnapshot } from '@/lib/sensor'
import type { Equipment, MaintenanceLog, AlarmEvent, ChatMode } from '@/types'
import { z } from 'zod'
export const maxDuration = 60
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const Schema = z.object({
  sessionId:   z.string().nullable().optional(),
  equipmentId: z.string().optional(),
  mode:        z.enum(['EXPERT','MAINTENANCE']),
  message:     z.string().min(1).max(4000),
  history:     z.array(z.object({ role: z.enum(['user','assistant']), content: z.string() })).max(40),
})

async function loadEquipmentContext(equipmentId: string) {
  const supabase = getSupabaseServer()
  const { data: eq } = await supabase.from('equipment').select('*').eq('id', equipmentId).single()
  if (!eq) return null
  const { data: readings } = await supabase.from('sensor_readings').select('*').eq('equipment_id', equipmentId).order('recorded_at', { ascending: false }).limit(20)
  const { data: alarms } = await supabase.from('alarm_events').select('*').eq('equipment_id', equipmentId).is('resolved_at', null).order('triggered_at', { ascending: false })
  const { data: logs } = await supabase.from('maintenance_logs').select('*').eq('equipment_id', equipmentId).order('performed_at', { ascending: false }).limit(5)
  const snapshot = buildSnapshot(readings ?? [])
  return { equipment: eq as Equipment, snapshot, alarms: (alarms ?? []) as AlarmEvent[], logs: (logs ?? []) as MaintenanceLog[] }
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null)
  const parsed = Schema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Invalid request', details: parsed.error.flatten() }, { status: 400 })

  const { sessionId, equipmentId, mode, message, history } = parsed.data
  const supabase = getSupabaseServer()

  const ctx = equipmentId ? await loadEquipmentContext(equipmentId) : null

  let retrievedContext = ''
  let sources: ReturnType<typeof chunksToCitations> = []
  if (process.env.VOYAGE_API_KEY) {
    try {
      const query = [...history.slice(-2).map(m => m.content), message].join(' ').slice(0, 500)
      const chunks = await retrieveChunks(query, equipmentId, 5, 0.65)
      retrievedContext = formatContext(chunks)
      sources = chunksToCitations(chunks)
    } catch (e) { console.error('[RAG error]', e) }
  }

  const systemPrompt = buildSystemPrompt({
    mode: mode as ChatMode,
    equipment: ctx?.equipment,
    readings: ctx?.snapshot,
    recentLogs: ctx?.logs,
    activeAlarms: ctx?.alarms,
    retrievedContext: retrievedContext || undefined,
  })

  const encoder = new TextEncoder()
  const stream = new ReadableStream({
    async start(controller) {
      let fullContent = ''
      try {
        const claudeStream = anthropic.messages.stream({
          model: 'claude-haiku-4-5-20251001',
          max_tokens: 2048,
          system: systemPrompt,
          messages: [
            ...history.map(m => ({ role: m.role as 'user'|'assistant', content: m.content })),
            { role: 'user', content: message },
          ],
        })
        for await (const chunk of claudeStream) {
          if (chunk.type === 'content_block_delta' && chunk.delta.type === 'text_delta') {
            fullContent += chunk.delta.text
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'delta', text: chunk.delta.text })}\n\n`))
          }
        }
        if (sources.length > 0) {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'sources', sources })}\n\n`))
        }
        let activeSessionId = sessionId ?? undefined
        if (!activeSessionId) {
          const { data: sess } = await supabase.from('chat_sessions').insert({ equipment_id: equipmentId ?? null, mode, title: message.slice(0, 80) }).select('id').single()
          activeSessionId = sess?.id
        }
        if (activeSessionId) {
          await supabase.from('chat_messages').insert([
            { session_id: activeSessionId, role: 'user', content: message },
            { session_id: activeSessionId, role: 'assistant', content: fullContent, sources: sources.length > 0 ? sources : null },
          ])
        }
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'done', sessionId: activeSessionId })}\n\n`))
      } catch (err) {
        console.error('[Chat stream error]', err)
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'error', message: 'Stream error' })}\n\n`))
      } finally {
        controller.close()
      }
    },
  })

  return new Response(stream, {
    headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', 'Connection': 'keep-alive' },
  })
}
