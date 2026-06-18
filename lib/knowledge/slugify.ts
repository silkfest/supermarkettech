// Mirrors the slugify + emoji-strip logic in components/knowledge/MarkdownContent.tsx and
// app/api/knowledge/search/route.ts so a heading anchor computed here lines up with the one
// rendered on the topic page.
export function slugifySection(title: string): string {
  const cleaned = title.replace(/^[\u{1F300}-\u{1FAF8}\u{2600}-\u{26FF}\u{2700}-\u{27BF}️⃣]+\s*/u, '')
  return (cleaned || title)
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
}
