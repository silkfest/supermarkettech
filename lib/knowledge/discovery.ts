import { getSupabaseServer } from '@/lib/supabase/client'
import { staticResources } from './catalog'
import { topicSections, type SearchResource } from './search'

/** Uses existing catalogue permissions; private assignments are never returned to other learners. */
export async function discoveryResources(userId: string, includeCourses = true) {
  const db = getSupabaseServer()
  const resources: SearchResource[] = staticResources()
  const unavailable: string[] = []
  const [topics, docs] = await Promise.all([
    db.from('knowledge_topics').select('slug, title, description, content, tags').limit(1000),
    db.from('documents').select('id, title').eq('status', 'READY').limit(1000),
  ])
  if (topics.error) unavailable.push('additional articles')
  else {
    if (topics.data?.length === 1000) unavailable.push('some additional articles')
    for (const t of topics.data ?? []) resources.push(...topicSections({ ...t, content: t.content ?? '' }).map(r => ({ ...r, status: 'review-pending' })))
  }
  if (docs.error) unavailable.push('manual titles')
  else {
    if (docs.data?.length === 1000) unavailable.push('some manual titles')
    for (const d of docs.data ?? []) resources.push({ id: `manual:${d.id}`, kind: 'manual', title: d.title, description: 'Open the original document and confirm model and revision.', href: `/api/pdf?docId=${encodeURIComponent(d.id)}`, status: 'Original document' })
  }
  if (includeCourses) {
    const { data: profile, error: profileError } = await db.from('users').select('role').eq('id', userId).single()
    if (profileError) unavailable.push('courses')
    else {
      const [courses, assignments] = await Promise.all([
        db.from('courses').select('id, title, description, category').eq('is_published', true),
        db.from('course_assignments').select('course_id').or(`user_id.eq.${userId},role.eq.${profile?.role ?? ''}`),
      ])
      if (courses.error || assignments.error) unavailable.push('courses')
      else {
        const assigned = new Set((assignments.data ?? []).map(a => a.course_id))
        for (const c of courses.data ?? []) {
          if (!['admin','manager'].includes(profile?.role ?? '') && !assigned.has(c.id)) continue
          resources.push({ id: `course:${c.id}`, kind: 'course', title: c.title, description: c.description ?? '', keywords: c.category ?? '', href: `/apprentice/training/courses/${c.id}` })
        }
      }
    }
  }
  return { resources, unavailable }
}
