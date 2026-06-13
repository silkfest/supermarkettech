'use client'

function toEmbedUrl(url: string): string | null {
  try {
    const u = new URL(url)
    const listId = u.searchParams.get('list')
    let videoId: string | null = null

    if (u.hostname.includes('youtu.be')) {
      videoId = u.pathname.slice(1)
    } else if (u.pathname === '/watch') {
      videoId = u.searchParams.get('v')
    } else if (u.pathname.startsWith('/embed/')) {
      videoId = u.pathname.replace('/embed/', '')
    }

    if (videoId) {
      return listId ? `https://www.youtube.com/embed/${videoId}?list=${listId}` : `https://www.youtube.com/embed/${videoId}`
    }
    if (listId) {
      return `https://www.youtube.com/embed/videoseries?list=${listId}`
    }
    return null
  } catch {
    return null
  }
}

export default function YouTubeEmbed({ url, title }: { url: string; title: string }) {
  const embedUrl = toEmbedUrl(url)

  if (!embedUrl) {
    return (
      <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-4 text-sm text-slate-500 dark:text-slate-400">
        Couldn&apos;t load video. <a href={url} target="_blank" rel="noopener noreferrer" className="text-blue-600 dark:text-blue-400 underline">Open on YouTube</a>
      </div>
    )
  }

  return (
    <div className="relative w-full overflow-hidden rounded-lg border border-slate-200 dark:border-slate-700 bg-black" style={{ paddingTop: '56.25%' }}>
      <iframe
        src={embedUrl}
        title={title}
        className="absolute inset-0 h-full w-full"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
      />
    </div>
  )
}
