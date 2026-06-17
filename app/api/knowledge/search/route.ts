import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseServer } from '@/lib/supabase/client'
import { requireUser } from '@/lib/api/auth'
import { TOPICS } from '@/lib/knowledge/topics'

// Full-text content for every curated topic, derived from TOPICS so newly
// registered topics are automatically searchable (a hand-maintained map here
// had drifted and silently excluded newer topics from content search).
const KNOWLEDGE_MAP: Record<string, string> = Object.fromEntries(
  TOPICS.map(t => [t.slug, t.content])
)

export interface ContentMatch {
  topicSlug: string
  topicTitle: string
  sectionTitle: string
  sectionId: string
  excerpt: string
}

// Mirrors the slugify + emoji-strip logic in components/knowledge/MarkdownContent.tsx
// so a content match's sectionId lines up with the heading anchor rendered on the page.
function slugifySection(title: string): string {
  const cleaned = title.replace(/^[\u{1F300}-\u{1FAF8}\u{2600}-\u{26FF}\u{2700}-\u{27BF}️⃣]+\s*/u, '')
  return (cleaned || title)
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
}

function extractMatches(slug: string, title: string, content: string, query: string): ContentMatch[] {
  // Require every query word to appear somewhere in the line (in any order) rather than
  // an exact phrase match, so multi-word queries like "txv superheat" find relevant lines
  // even when the words aren't adjacent in the source text.
  const words = query.toLowerCase().split(/\s+/).filter(Boolean)
  const lines = content.split('\n')
  const results: ContentMatch[] = []
  const seenSections = new Set<string>()
  let currentSection = 'Overview'
  let currentSectionId = ''

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const trimmed = line.trim()

    if (/^#{1,3}\s/.test(trimmed)) {
      currentSection = trimmed.replace(/^#+\s+/, '')
      currentSectionId = slugifySection(currentSection)
      continue
    }

    if (!trimmed) continue
    const lowerLine = trimmed.toLowerCase()
    if (!words.every(w => lowerLine.includes(w))) continue
    if (seenSections.has(currentSection)) continue

    // Build a clean excerpt: merge up to 4 surrounding lines, strip markdown symbols
    const start = Math.max(0, i - 1)
    const end = Math.min(lines.length, i + 4)
    const raw = lines.slice(start, end)
      .map(l => l.replace(/^[-*•]\s+/, '').replace(/\*\*/g, '').trim())
      .filter(Boolean)
      .join(' ')

    // Truncate at word boundary near 200 chars
    const truncated = raw.length > 220
      ? raw.slice(0, raw.lastIndexOf(' ', 220)) + '…'
      : raw

    results.push({ topicSlug: slug, topicTitle: title, sectionTitle: currentSection, sectionId: currentSectionId, excerpt: truncated })
    seenSections.add(currentSection)

    if (results.length >= 6) break
  }

  return results
}

export async function GET(req: NextRequest) {
  const auth = await requireUser(req)
  if (auth instanceof NextResponse) return auth

  const q = req.nextUrl.searchParams.get('q')?.trim()
  if (!q || q.length < 2) return NextResponse.json({ docSlugs: [], contentMatches: [] })

  // Document title search
  const supabase = getSupabaseServer()
  const { data: docs } = await supabase
    .from('documents')
    .select('title')
    .ilike('title', `%${q}%`)
    .eq('status', 'READY')
    .limit(100)

  const docSlugs: string[] = []
  if (docs?.length) {
    const matched = new Set<string>()
    for (const doc of docs) {
      const lower = doc.title.toLowerCase()
      for (const topic of TOPICS) {
        if (topic.manualKeywords.some(kw => lower.includes(kw.toLowerCase()))) {
          matched.add(topic.slug)
        }
      }
    }
    docSlugs.push(...matched)
  }

  // Knowledge content search
  const contentMatches: ContentMatch[] = []
  for (const topic of TOPICS) {
    const content = KNOWLEDGE_MAP[topic.slug]
    if (!content) continue
    const matches = extractMatches(topic.slug, topic.title, content, q)
    contentMatches.push(...matches)
  }

  return NextResponse.json({ docSlugs, contentMatches })
}
