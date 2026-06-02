'use client'
export const dynamic = 'force-dynamic'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import {
  ArrowLeft,
  FileText,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  BookOpen,
  Globe,
  X,
  MessageSquare,
} from 'lucide-react'
import { getTopicBySlug } from '@/lib/knowledge/topics'
import MarkdownContent, { extractSections } from '@/components/knowledge/MarkdownContent'
import PageShell from '@/components/layout/PageShell'
import LearningTabBar from '@/components/layout/LearningTabBar'

interface RelatedManual {
  id: string
  title: string
  created_at: string
  source_type: string
  source_url: string | null
}

export default function KnowledgeTopicPage() {
  const router = useRouter()
  const params = useParams()
  const slug = typeof params.slug === 'string' ? params.slug : ''
  const topic = getTopicBySlug(slug)

  const [manuals, setManuals] = useState<RelatedManual[]>([])
  const [manualsLoading, setManualsLoading] = useState(true)
  const [tocOpen, setTocOpen] = useState(false)
  const [pdfViewer, setPdfViewer] = useState<{ url: string; title: string } | null>(null)

  useEffect(() => {
    if (!topic) return
    fetch(`/api/knowledge/${slug}/manuals`)
      .then(r => r.ok ? r.json() : [])
      .then((data: RelatedManual[]) => {
        setManuals(Array.isArray(data) ? data : [])
        setManualsLoading(false)
      })
      .catch(() => setManualsLoading(false))
  }, [slug, topic])

  if (!topic) {
    return (
      <div className="bg-slate-50 dark:bg-slate-950 min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-slate-500 dark:text-slate-400 text-sm mb-3">Topic not found</p>
          <button
            onClick={() => router.push('/knowledge')}
            className="text-xs text-blue-600 hover:text-blue-800"
          >
            Back to Knowledge Base
          </button>
        </div>
      </div>
    )
  }

  const sections = extractSections(topic.content)

  function scrollToSection(id: string) {
    const el = document.getElementById(id)
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' })
      setTocOpen(false)
    }
  }

  return (
    <PageShell>
    <div className="bg-slate-50 dark:bg-slate-950 min-h-screen">
      {/* Header */}
      <div className="safe-top bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 px-4 py-4 md:px-8 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center gap-3 flex-wrap">
            <button
              onClick={() => router.push('/knowledge')}
              className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 transition-colors flex-shrink-0"
            >
              <ArrowLeft size={13} />
              Knowledge Base
            </button>
            <span className="text-slate-300 dark:text-slate-600 text-xs">/</span>
            <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">{topic.title}</span>
            <div className="flex items-center gap-1.5 ml-auto flex-wrap">
              {topic.tags.map(tag => (
                <span
                  key={tag}
                  className="text-[10px] font-medium px-1.5 py-0.5 rounded border bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700"
                >
                  {tag}
                </span>
              ))}
              <button
                onClick={() => {
                  const prefill = `I was just reading the "${topic.title}" topic in the Knowledge Hub.\n\nTopic summary: ${topic.description}\n\nMy question: `
                  router.push(`/dashboard?q=${encodeURIComponent(prefill)}`)
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium rounded-lg transition-colors ml-1"
                title="Open this topic in ColdIQ Expert chat"
              >
                <MessageSquare size={12}/> Ask ColdIQ
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Learning tab bar */}
      <LearningTabBar />

      {/* Mobile TOC toggle */}
      <div className="md:hidden bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 px-4">
        <button
          onClick={() => setTocOpen(!tocOpen)}
          className="w-full flex items-center justify-between py-3 text-xs text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
        >
          <span className="font-medium">
            Contents
            <span className="text-slate-400 dark:text-slate-500 font-normal ml-1">
              · {sections.length} sections{!manualsLoading && manuals.length > 0 ? ` · ${manuals.length} manual${manuals.length === 1 ? '' : 's'}` : ''}
            </span>
          </span>
          {tocOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>
        {tocOpen && (
          <div className="pb-3">
            <div className="space-y-0.5 mb-2">
              {sections.map(section => (
                <button
                  key={section.id}
                  onClick={() => scrollToSection(section.id)}
                  className="block w-full text-left text-xs text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 py-1 px-2 rounded hover:bg-blue-50 dark:hover:bg-blue-950/50 transition-colors"
                >
                  {section.title}
                </button>
              ))}
            </div>
            {manuals.length > 0 && (
              <div className="border-t border-slate-100 dark:border-slate-800 pt-2 mt-1">
                <p className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-widest px-2 mb-1">
                  Related Manuals
                </p>
                <div className="space-y-0.5">
                  {manuals.map(manual => {
                    const isWeb = manual.source_type === 'WEB' && manual.source_url
                    const href = isWeb ? manual.source_url! : `/api/pdf?docId=${manual.id}`
                    return (
                      <button
                        key={manual.id}
                        onClick={() => { setPdfViewer({ url: href, title: manual.title }); setTocOpen(false) }}
                        className="flex items-center gap-1.5 w-full text-left text-xs text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 py-1 px-2 rounded hover:bg-blue-50 dark:hover:bg-blue-950/50 transition-colors"
                      >
                        {isWeb
                          ? <Globe size={10} className="flex-shrink-0 opacity-60" />
                          : <FileText size={10} className="flex-shrink-0 opacity-60" />
                        }
                        <span className="truncate">{manual.title}</span>
                      </button>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Layout: TOC sidebar + content */}
      <div className="max-w-6xl mx-auto px-4 py-6 md:px-8 flex gap-6">

        {/* Sticky TOC — desktop only */}
        <aside className="hidden md:block w-56 flex-shrink-0">
          <div className="sticky top-20 space-y-1">
            <p className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2 px-2">
              Contents
            </p>
            {sections.map(section => (
              <button
                key={section.id}
                onClick={() => scrollToSection(section.id)}
                className="block w-full text-left text-xs text-slate-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/50 py-1.5 px-2 rounded transition-colors leading-snug"
              >
                {section.title}
              </button>
            ))}

            {/* Related manuals in TOC panel */}
            {(manualsLoading || manuals.length > 0) && (
              <div className="mt-6 pt-4 border-t border-slate-200 dark:border-slate-700">
                <p className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2 px-2">
                  Related Manuals
                </p>
                {manualsLoading ? (
                  <p className="text-xs text-slate-400 px-2">Loading...</p>
                ) : (
                  <div className="space-y-1">
                    {manuals.map(manual => {
                      const isWeb = manual.source_type === 'WEB' && manual.source_url
                      const href = isWeb ? manual.source_url! : `/api/pdf?docId=${manual.id}`
                      return (
                        <button
                          key={manual.id}
                          onClick={() => setPdfViewer({ url: href, title: manual.title })}
                          className="flex items-start gap-1.5 text-xs text-slate-600 hover:text-blue-600 py-1 px-2 rounded hover:bg-blue-50 transition-colors group w-full text-left"
                        >
                          {isWeb
                            ? <Globe size={11} className="flex-shrink-0 mt-0.5 opacity-50 group-hover:opacity-100" />
                            : <FileText size={11} className="flex-shrink-0 mt-0.5 opacity-50 group-hover:opacity-100" />
                          }
                          <span className="leading-snug line-clamp-2">{manual.title}</span>
                        </button>
                      )
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        </aside>

        {/* Main content */}
        <main className="flex-1 min-w-0">
          <div className="bg-white rounded-lg border border-slate-200 p-5 md:p-8">
            <MarkdownContent
              content={topic.content}
              onOpenPdf={(url, title) => setPdfViewer({ url, title })}
            />
          </div>

          {/* Related manuals — mobile (shown below content) */}
          {manuals.length > 0 && (
            <div className="md:hidden mt-4 bg-white rounded-lg border border-slate-200 p-4">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-3">
                Related Manuals
              </p>
              <div className="space-y-2">
                {manuals.map(manual => {
                  const isWeb = manual.source_type === 'WEB' && manual.source_url
                  const href = isWeb ? manual.source_url! : `/api/pdf?docId=${manual.id}`
                  return (
                    <button
                      key={manual.id}
                      onClick={() => setPdfViewer({ url: href, title: manual.title })}
                      className="flex items-center justify-between gap-2 p-2.5 rounded-lg border border-slate-200 hover:border-blue-300 hover:bg-blue-50 transition-all group w-full text-left"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        {isWeb
                          ? <Globe size={14} className="text-slate-400 flex-shrink-0" />
                          : <BookOpen size={14} className="text-slate-400 flex-shrink-0" />
                        }
                        <span className="text-xs text-slate-700 truncate">{manual.title}</span>
                      </div>
                      <FileText size={12} className="text-slate-400 flex-shrink-0 group-hover:text-blue-500" />
                    </button>
                  )
                })}
              </div>
            </div>
          )}
        </main>
      </div>
    </div>

    {/* In-app PDF overlay — prevents mobile "stuck in browser" problem */}
    {pdfViewer && (
      <div className="fixed inset-0 z-50 flex flex-col bg-slate-900">
        <div className="flex items-center gap-3 px-4 py-3 bg-slate-800 border-b border-slate-700 flex-shrink-0">
          <button
            onClick={() => setPdfViewer(null)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700 transition-colors flex-shrink-0"
            title="Back to topic"
          >
            <ArrowLeft size={18} />
          </button>
          <p className="text-sm text-slate-200 font-medium truncate flex-1">{pdfViewer.title}</p>
          <button
            onClick={() => setPdfViewer(null)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700 transition-colors flex-shrink-0"
            title="Close"
          >
            <X size={16} />
          </button>
        </div>
        <iframe
          src={pdfViewer.url}
          className="flex-1 w-full border-0"
          title={pdfViewer.title}
        />
      </div>
    )}
    </PageShell>
  )
}
