import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import { getSupabaseServer, getSupabaseRouteAuth } from '@/lib/supabase/client'
import { buildSystemPrompt } from '@/lib/ai/prompts'
import { retrieveChunks, formatContext, chunksToCitations } from '@/lib/ai/rag'
import { buildSnapshot } from '@/lib/sensor'
import type { Equipment, MaintenanceLog, AlarmEvent, ChatMode, ComponentLink } from '@/types'
import { z } from 'zod'
export const maxDuration = 60

const groq = new OpenAI({
  apiKey: process.env.GROQ_API_KEY ?? '',
  baseURL: 'https://api.groq.com/openai/v1',
})

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
  const { data: { user } } = await getSupabaseRouteAuth(req).auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json().catch(() => null)
  const parsed = Schema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Invalid request', details: parsed.error.flatten() }, { status: 400 })

  const { sessionId, equipmentId, mode, message, history } = parsed.data
  const supabase = getSupabaseServer()

  const ctx = equipmentId ? await loadEquipmentContext(equipmentId) : null

  let retrievedContext = ''
  let sources: ReturnType<typeof chunksToCitations> = []
  let componentLinks: ComponentLink[] = []
  const jinaKey = process.env.JINA_API_KEY
  if (jinaKey) {
    try {
      // Build RAG query from user messages only (excluding AI responses which dilute the search)
      const recentUserMessages = history
        .filter(m => m.role === 'user')
        .slice(-2)
        .map(m => m.content)
      const query = [...recentUserMessages, message].join(' ').slice(0, 600)

      // Threshold 0.45 — permissive while diagnosing; raise once confirmed working
      const chunks = await retrieveChunks(query, equipmentId, 5, 0.45)

      // Put chunks first so it's visible even if log is truncated
      console.log(JSON.stringify({
        chunks: chunks.length,
        topScore: chunks[0]?.score ?? null,
        rag: true,
        keyLen: jinaKey.length,
        querySample: query.slice(0, 60),
      }))

      retrievedContext = formatContext(chunks)
      sources = chunksToCitations(chunks)

      if (chunks.length > 0) {
        // Look up any manual_components entries linked to the retrieved documents
        const docIds = [...new Set(chunks.map(c => c.document_id))]
        const { data: comps } = await supabase
          .from('manual_components')
          .select('id, type, manufacturer, model, manual_title')
          .in('document_id', docIds)
        componentLinks = (comps ?? []).map(c => ({
          catalogId:   c.id            as string,
          type:        c.type          as string ?? 'Component',
          manufacturer: c.manufacturer as string ?? '',
          model:       c.model         as string ?? '',
          manualTitle: c.manual_title  as string ?? '',
        }))
      }
    } catch (e) {
      console.error(JSON.stringify({ ragError: true, msg: e instanceof Error ? e.message : String(e) }))
    }
  } else {
    console.log(JSON.stringify({ rag: false, reason: 'JINA_API_KEY not set' }))
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
        const groqStream = await groq.chat.completions.create({
          model: 'llama-3.3-70b-versatile',
          max_tokens: 2048,
          stream: true,
          messages: [
            { role: 'system', content: systemPrompt },
            ...history.map(m => ({ role: m.role as 'user' | 'assistant', content: m.content })),
            { role: 'user', content: message },
          ],
        })

        for await (const chunk of groqStream) {
          const text = chunk.choices[0]?.delta?.content ?? ''
          if (text) {
            fullContent += text
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'delta', text })}\n\n`))
          }
        }

        if (sources.length > 0) {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'sources', sources })}\n\n`))
        }
        if (componentLinks.length > 0) {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'component_links', componentLinks })}\n\n`))
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
        const detail = err instanceof Error ? err.message : String(err)
        console.error('[Chat stream error]', detail, err)
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'error', message: detail })}\n\n`))
      } finally {
        controller.close()
      }
    },
  })

  return new Response(stream, {
    headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', 'Connection': 'keep-alive' },
  })
}
