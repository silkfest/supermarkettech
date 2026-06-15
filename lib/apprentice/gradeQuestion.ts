export interface GradableQuestion {
  question_type: string
  correct_index?: number | null
  correct_indices?: number[] | null
  correct_text?: string[] | null
  hotspot_points?: { id: string; label: string }[] | null
}

/** Grades a submitted answer against a question, based on its question_type. */
export function gradeQuestion(q: GradableQuestion, submitted: unknown): boolean {
  switch (q.question_type) {
    case 'multiple': {
      const correct = new Set(q.correct_indices ?? [])
      const given = Array.isArray(submitted) ? submitted.map(Number) : []
      return given.length === correct.size && given.every(i => correct.has(i))
    }
    case 'fill_blank': {
      const accepted = (q.correct_text ?? []).map(s => s.trim().toLowerCase())
      const given = typeof submitted === 'string' ? submitted.trim().toLowerCase() : ''
      return given.length > 0 && accepted.includes(given)
    }
    case 'hotspot': {
      const points = q.hotspot_points ?? []
      const given = (submitted && typeof submitted === 'object') ? submitted as Record<string, string> : {}
      return points.length > 0 && points.every(p => given[p.id] === p.label)
    }
    case 'single':
    case 'true_false':
    default:
      return submitted === q.correct_index
  }
}
