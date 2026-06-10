import { getSupabaseServer } from '@/lib/supabase/client'

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60)
}

interface ComponentInfo {
  manufacturer?: string | null
  model?: string | null
  type?: string | null
}

/** Creates a lightweight Knowledge Base stub for a manual the first time it's linked
 *  to a component, so the chatbot's RAG context and the Knowledge Base stay in sync
 *  with the Components Directory. No-op if a topic for this document already exists. */
export async function ensureKnowledgeTopicForDocument(
  supabase: ReturnType<typeof getSupabaseServer>,
  documentId: string,
  component: ComponentInfo,
): Promise<void> {
  const { data: existing } = await supabase
    .from('knowledge_topics')
    .select('id')
    .eq('document_id', documentId)
    .maybeSingle()
  if (existing) return

  const { data: doc } = await supabase
    .from('documents')
    .select('title')
    .eq('id', documentId)
    .single()
  if (!doc?.title) return

  const title = doc.title
  const label = [component.manufacturer, component.model].filter(Boolean).join(' ')
  const shortTitle = (label || title).slice(0, 60)
  const slug = `${slugify(title) || 'manual'}-${documentId.slice(0, 8)}`
  const tags = [component.manufacturer, component.type].filter((v): v is string => !!v)

  const description = label
    ? `Reference manual for the ${label}, covering installation, operation, and service information.`
    : `Reference manual: ${title}.`

  const linkedNote = label ? `, linked to the ${label} in the Components Directory` : ''
  const content = `## ${title}\n\n### Overview\n\nThis topic was automatically generated from the manual "${title}"${linkedNote}. An admin can use the "Generate full topic with AI" button to expand this into a complete reference guide based on the manual's content.\n`

  await supabase.from('knowledge_topics').insert({
    document_id: documentId,
    slug,
    title,
    short_title: shortTitle,
    description,
    content,
    tags,
    icon_name: 'BookOpen',
    color_class: 'slate',
    source: 'manual',
  })
}
