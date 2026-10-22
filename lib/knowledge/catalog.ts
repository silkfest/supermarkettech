import { TOPICS } from './topics'
import { getTopicEvidence } from './evidence'
import { topicSections, type SearchResource } from './search'
import { PRACTICE_RESOURCES, LEARNING_PATHS } from '@/lib/learning/resources'

export function knowledgeResources(): SearchResource[] {
  return TOPICS.flatMap(topic => {
    const evidence = getTopicEvidence(topic.slug)
    const sections = topicSections(topic).map(r => ({ ...r, status: evidence.status, applicability: evidence.scope }))
    const procedures: SearchResource[] = (evidence.procedures ?? []).map(p => ({
      id: `${topic.slug}:procedure:${p.id}`, kind: 'procedure', title: `${topic.shortTitle} · ${p.title}`,
      description: p.steps.join(' '), content: `${p.steps.join('\n')}\n${p.expected}\nSource: ${p.source.title}, ${p.source.location} ${p.source.url}`,
      href: `/knowledge/${topic.slug}#${p.id}`, topicSlug: topic.slug, sectionTitle: 'Force a Defrost',
      applicability: p.appliesTo, status: evidence.status,
    }))
    return [...procedures, ...sections]
  })
}
export function staticResources(): SearchResource[] {
  return [...knowledgeResources(),
    ...PRACTICE_RESOURCES.map(r => ({ ...r, id: r.slug, kind: 'practice' as const, status: 'Training example' })),
    ...LEARNING_PATHS.map(r => ({ ...r, id: r.slug, kind: 'path' as const, status: 'Learning path' })),
  ]
}
