import { slugifySection } from './slugify'

export type ResourceKind = 'procedure' | 'knowledge' | 'manual' | 'practice' | 'path' | 'course'
export interface SearchResource {
  id: string; kind: ResourceKind; title: string; description: string; href: string
  content?: string; keywords?: string; topicSlug?: string; sectionTitle?: string
  applicability?: string; status?: string; excludedQueries?: string[]
}
export interface SearchResult extends SearchResource { score: number; excerpt: string }
export interface ContentMatch { topicSlug: string; topicTitle: string; sectionTitle: string; sectionId: string; excerpt: string }

export function normalizeSearch(text: string): string {
  return text.toLowerCase().replace(/₂/g, '2').replace(/[^a-z0-9]+/g, ' ').trim()
}
const ALIASES: Record<string, string[]> = {
  mt: ['micro thermo', 'microthermo'], cpc: ['e2', 'emerson'], e2: ['cpc'],
  iced: ['ice', 'frozen', 'icing'], frozen: ['iced', 'ice'], evaporator: ['evap', 'coil'],
  evap: ['evaporator', 'coil'], force: ['manual', 'initiate', 'start'], manual: ['force', 'initiate'],
  sla: ['safety loop'], co2: ['r744', 'r 744'],
}
const STOP = new Set(['a','an','the','how','do','does','i','to','on','of','for','my','is','it','in','with','can','and','what','you','please','tell','me','would','could','should','a','an'])
export function queryGroups(query: string): string[][] {
  return normalizeSearch(query).split(' ').filter(w => w && !STOP.has(w)).map(w => [w, ...(ALIASES[w] ?? [])])
}
export function searchResources(resources: SearchResource[], query: string, limit = 40): SearchResult[] {
  const groups = queryGroups(query)
  if (!groups.length) return []
  const normalized = normalizeSearch(query)
  const results: SearchResult[] = []
  for (const r of resources) {
    if (r.excludedQueries?.some(term => (` ${normalized} `).includes(` ${normalizeSearch(term)} `))) continue
    const title = normalizeSearch(r.title)
    const meta = normalizeSearch([r.title, r.description, r.keywords, r.applicability].join(' '))
    const body = normalizeSearch(r.content ?? '')
    const all = `${meta} ${body}`
    const includes = (haystack: string, term: string) => (` ${haystack} `).includes(` ${term} `)
    if (!groups.every(g => g.some(w => includes(all, w)))) continue
    const score = groups.reduce((n, g) => n + (g.some(w => includes(title, w)) ? 12 : g.some(w => includes(meta, w)) ? 5 : 1), 0)
      + (normalized && title.includes(normalized) ? 20 : 0) + (r.kind === 'procedure' ? 6 : 0)
    const lines = (r.content || r.description).split('\n').filter(l => l.trim())
    const best = lines.map((line, index) => ({ index, hits: groups.filter(g => g.some(w => includes(normalizeSearch(line), w))).length }))
      .sort((a,b) => b.hits - a.hits)[0]?.index ?? 0
    const excerpt = lines.slice(best, best + 2).join(' ').replace(/\[([^\]]+)\]\([^)]+\)/g, '$1').replace(/[*#>|]/g, '').slice(0, 260)
    results.push({ ...r, score, excerpt })
  }
  return results.sort((a,b) => b.score - a.score || a.title.localeCompare(b.title)).slice(0, limit)
}

export function topicSections(topic: { slug: string; title: string; description: string; content: string; tags?: string[] }): SearchResource[] {
  const chunks = topic.content.split(/(?=^### )/m)
  return chunks.map((content, index) => {
    const heading = /^### (.+)/m.exec(content)?.[1] ?? 'Overview'
    const anchor = heading === 'Overview' ? '' : slugifySection(heading)
    return { id: `${topic.slug}:${index}`, kind: 'knowledge', title: `${topic.title} · ${heading}`, description: topic.description,
      content, keywords: topic.tags?.join(' '), href: `/knowledge/${topic.slug}${anchor ? '#' + anchor : ''}`, topicSlug: topic.slug, sectionTitle: heading }
  })
}

export const SEARCH_FILTERS = {
  all: [], answers: ['procedure', 'knowledge'], manuals: ['manual'], learn: ['practice', 'path', 'course'],
} satisfies Record<string, ResourceKind[]>
export type SearchFilter = keyof typeof SEARCH_FILTERS
export function searchResourcePage(resources: SearchResource[], query: string, filter: SearchFilter = 'all', limit = 40) {
  const kinds: ResourceKind[] = SEARCH_FILTERS[filter]
  const eligible = kinds.length ? resources.filter(r => kinds.includes(r.kind)) : resources
  // Filter the full catalogue before applying the display limit, so high-scoring
  // article passages cannot hide all manuals or training resources.
  const matches = searchResources(eligible, query, eligible.length)
  return { results: matches.slice(0, limit), total: matches.length }
}
