import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { getSupabaseServer, getSupabaseRouteAuth } from '@/lib/supabase/client'
import { buildSystemPromptParts } from '@/lib/ai/prompts'
import { retrieveChunks, formatToolResult, chunksToCitationsFrom } from '@/lib/ai/rag'
import { buildSnapshot } from '@/lib/sensor'
import type { Equipment, MaintenanceLog, AlarmEvent, ChatMode, ChatDomain, ComponentLink, CitationSource } from '@/types'
import { z } from 'zod'
export const maxDuration = 60

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY ?? '',
})

const HAIKU_MODEL = 'claude-haiku-4-5-20251001'
const SONNET_MODEL = 'claude-sonnet-4-6'
const MAX_TOOL_ROUNDS = 2

const Schema = z.object({
  sessionId:   z.string().nullable().optional(),
  equipmentId: z.string().optional(),
  mode:        z.enum(['EXPERT','MAINTENANCE']),
  domain:      z.enum(['REFRIGERATION','HVAC']).optional(),
  escalate:    z.boolean().optional(),
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

const SEARCH_MANUALS_TOOL: Anthropic.Tool = {
  name: 'search_manuals',
  description: "Search the company's uploaded equipment manuals and documentation library (install/service manuals, wiring diagrams, parts lists, controller programming guides) for specific information. Returns the most relevant excerpts, each labelled [Doc N] for citation.",
  input_schema: {
    type: 'object',
    properties: {
      query: {
        type: 'string',
        description: 'A specific search query — include the manufacturer/model and topic, e.g. "Copeland Discus compressor oil pressure failure" or "Danfoss AK-SM 850 defrost programming".',
      },
    },
    required: ['query'],
  },
}

interface ManualSearchResult {
  text: string
  sources: CitationSource[]
  componentLinks: ComponentLink[]
  compDocMap: Map<string, string>
  count: number
}

async function runManualSearch(query: string, equipmentId: string | undefined, startNum: number): Promise<ManualSearchResult> {
  const supabase = getSupabaseServer()
  const chunks = await retrieveChunks(query, equipmentId, 6, 0.50)
  const text = formatToolResult(chunks, startNum)
  const sources = chunksToCitationsFrom(chunks, startNum).map(s => ({ ...s, signedUrl: `/api/pdf?docId=${s.documentId}` }))

  let componentLinks: ComponentLink[] = []
  const compDocMap = new Map<string, string>()
  if (chunks.length > 0) {
    const docIds = [...new Set(chunks.map(c => c.document_id))]
    const { data: comps } = await supabase
      .from('manual_components')
      .select('id, type, manufacturer, model, manual_title, document_id')
      .in('document_id', docIds)
    componentLinks = (comps ?? []).map(c => {
      compDocMap.set(c.id as string, c.document_id as string)
      return {
        catalogId:    c.id            as string,
        type:         c.type          as string ?? 'Component',
        manufacturer: c.manufacturer  as string ?? '',
        model:        c.model         as string ?? '',
        manualTitle:  c.manual_title  as string ?? '',
      }
    })
  }

  return { text, sources, componentLinks, compDocMap, count: chunks.length }
}

export async function POST(req: NextRequest) {
  const { data: { user } } = await getSupabaseRouteAuth(req).auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json().catch(() => null)
  const parsed = Schema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Invalid request', details: parsed.error.flatten() }, { status: 400 })

  const { equipmentId, mode, domain, escalate, message, history } = parsed.data

  const ctx = equipmentId ? await loadEquipmentContext(equipmentId) : null

  const { staticContent, dynamicContent } = buildSystemPromptParts({
    mode: mode as ChatMode,
    domain: domain as ChatDomain | undefined,
    equipment: ctx?.equipment,
    readings: ctx?.snapshot,
    recentLogs: ctx?.logs,
    activeAlarms: ctx?.alarms,
  })
  const systemBlocks = [
    { type: 'text' as const, text: staticContent, cache_control: { type: 'ephemeral' as const } },
    { type: 'text' as const, text: dynamicContent },
  ]

  const model = escalate ? SONNET_MODEL : HAIKU_MODEL
  const maxTokens = escalate ? 4096 : 2048
  const manualSearchEnabled = !!process.env.JINA_API_KEY

  const encoder = new TextEncoder()
  const stream = new ReadableStream({
    async start(controller) {
      let fullContent = ''
      const allSources: CitationSource[] = []
      const allComponentLinks: ComponentLink[] = []
      const compDocMap = new Map<string, string>()
      let citationCounter = 0

      try {
        const messages: Anthropic.MessageParam[] = [
          ...history.map(m => ({ role: m.role as 'user' | 'assistant', content: m.content })),
          { role: 'user', content: message },
        ]

        for (let round = 0; ; round++) {
          const useTools = manualSearchEnabled && round < MAX_TOOL_ROUNDS

          const claudeStream = anthropic.messages.stream({
            model,
            max_tokens: maxTokens,
            system: systemBlocks,
            messages,
            ...(useTools ? { tools: [SEARCH_MANUALS_TOOL] } : {}),
          })

          for await (const chunk of claudeStream) {
            if (chunk.type === 'content_block_delta' && chunk.delta.type === 'text_delta') {
              const text = chunk.delta.text
              if (text) {
                fullContent += text
                controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'delta', text })}\n\n`))
              }
            }
          }

          const finalMessage = await claudeStream.finalMessage()
          const toolUses = finalMessage.content.filter(b => b.type === 'tool_use')

          if (!useTools || finalMessage.stop_reason !== 'tool_use' || toolUses.length === 0) break

          messages.push({ role: 'assistant', content: finalMessage.content })

          const toolResults: Anthropic.ToolResultBlockParam[] = []
          for (const block of toolUses) {
            if (block.name !== 'search_manuals') {
              toolResults.push({ type: 'tool_result', tool_use_id: block.id, content: 'Unknown tool', is_error: true })
              continue
            }
            const input = block.input as { query?: unknown }
            const query = typeof input?.query === 'string' ? input.query : message

            const result = await runManualSearch(query, equipmentId, citationCounter + 1)
            citationCounter += result.count
            allSources.push(...result.sources)
            allComponentLinks.push(...result.componentLinks)
            for (const [k, v] of result.compDocMap) compDocMap.set(k, v)

            toolResults.push({ type: 'tool_result', tool_use_id: block.id, content: result.text })
          }
          messages.push({ role: 'user', content: toolResults })
        }

        // Extract cited [Doc N] numbers and filter sources + component links to only
        // those actually drawn from in the response.
        const citedNumbers = new Set<number>()
        for (const m of fullContent.matchAll(/\[Doc (\d+)[^\]]*\]/g)) {
          citedNumbers.add(parseInt(m[1], 10))
        }
        if (allSources.length > 0) {
          const citedSources = allSources.filter(s => citedNumbers.has(s.citationNumber))
          if (citedSources.length > 0) {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'sources', sources: citedSources })}\n\n`))
          }
        }
        if (allComponentLinks.length > 0) {
          const citedDocIds = new Set(
            allSources.filter(s => citedNumbers.has(s.citationNumber)).map(s => s.documentId)
          )
          const seen = new Set<string>()
          const citedLinks = allComponentLinks.filter(l => {
            if (!citedDocIds.has(compDocMap.get(l.catalogId) ?? '')) return false
            if (seen.has(l.catalogId)) return false
            seen.add(l.catalogId)
            return true
          })
          if (citedLinks.length > 0) {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'component_links', componentLinks: citedLinks })}\n\n`))
          }
        }
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'done' })}\n\n`))
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
