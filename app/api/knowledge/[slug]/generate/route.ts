import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { getSupabaseServer, getSupabaseRouteAuth } from '@/lib/supabase/client'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY ?? '' })

const MAX_SOURCE_CHARS = 60000

export async function POST(_req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { data: { user } } = await getSupabaseRouteAuth(_req).auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = getSupabaseServer()

  const { data: profile } = await supabase.from('users').select('role').eq('id', user.id).single()
  const role = (profile as { role?: string } | null)?.role
  if (role !== 'admin' && role !== 'manager') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { slug } = await params

  const { data: topic } = await supabase
    .from('knowledge_topics')
    .select('id, title, document_id, tags')
    .eq('slug', slug)
    .single()

  if (!topic) return NextResponse.json({ error: 'Topic not found' }, { status: 404 })
  if (!topic.document_id) return NextResponse.json({ error: 'This topic has no linked manual to generate from' }, { status: 400 })

  const { data: chunks } = await supabase
    .from('doc_chunks')
    .select('content, chunk_index')
    .eq('document_id', topic.document_id)
    .order('chunk_index', { ascending: true })

  if (!chunks || chunks.length === 0) {
    return NextResponse.json({ error: 'The linked manual has not finished processing yet — try again shortly' }, { status: 400 })
  }

  let source = chunks.map(c => c.content).join('\n\n')
  if (source.length > MAX_SOURCE_CHARS) source = source.slice(0, MAX_SOURCE_CHARS)

  const prompt = `You are writing a Knowledge Base topic page for "${topic.title}" for refrigeration/HVAC technicians, based on the manual content below.

Follow these formatting rules exactly (the renderer is a custom markdown parser with strict requirements):
- Start with exactly one "## ${topic.title}" heading (the page title) — never use a second "## " heading anywhere.
- Use "### Section Name" headings for each major section (at least 2-3 sections required — these populate a table of contents). Good sections for a manual topic: "### Overview", "### Specifications", "### Installation", "### Operation", "### Troubleshooting", "### Maintenance" — pick whichever apply.
- Use "#### Sub-heading" for sub-sections within a section.
- Do NOT include any "*Sources: ...*" citation lines.
- Do NOT use triple-backtick code fences under any circumstances. For lists use "- " bullets or "1. " numbered lists. For wiring/terminal descriptions use bullet points or plain paragraphs.
- Do not include images or diagram placeholders.
- Write practical, technician-focused content: specs, sequence of operation, common faults and fixes, maintenance steps. Be specific and use real values/part numbers/procedures from the manual content where present.

Manual content:
${source}`

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 8192,
    messages: [{ role: 'user', content: prompt }],
    tools: [{
      name: 'generate_topic',
      description: 'Submit the generated knowledge base topic content',
      input_schema: {
        type: 'object',
        properties: {
          description: { type: 'string', description: 'A 1-2 sentence summary of the topic, shown as a card preview in the Knowledge Base' },
          content: { type: 'string', description: 'The full markdown content for the topic page, following the formatting rules' },
        },
        required: ['description', 'content'],
      },
    }],
    tool_choice: { type: 'tool', name: 'generate_topic' },
  })

  const toolUse = response.content.find(b => b.type === 'tool_use')
  if (!toolUse || toolUse.type !== 'tool_use') {
    return NextResponse.json({ error: 'AI generation failed' }, { status: 502 })
  }

  const { description, content } = toolUse.input as { description: string; content: string }

  const { data: updated, error } = await supabase
    .from('knowledge_topics')
    .update({ description, content })
    .eq('id', topic.id)
    .select('slug, title, description, content, tags')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json(updated)
}
