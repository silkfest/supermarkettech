'use client'

import React, { useState } from 'react'
import { Info, Lightbulb, AlertTriangle, ShieldAlert, FlaskConical, Link2, Check } from 'lucide-react'
import { RackStyle1Diagram } from './diagrams/RackStyle1Diagram'
import { RackStyle2Diagram } from './diagrams/RackStyle2Diagram'
import { ParagonTimerDiagram } from './diagrams/ParagonTimerDiagram'
import { CompressorTerminalDiagram } from './diagrams/CompressorTerminalDiagram'
import { IceHarvestCycleDiagram } from './diagrams/IceHarvestCycleDiagram'
import { BasicRefrigerationCycleDiagram } from './diagrams/BasicRefrigerationCycleDiagram'

export type OpenPdfFn = (url: string, title: string) => void

const DIAGRAM_REGISTRY: Record<string, (openPdf?: OpenPdfFn) => React.ReactNode> = {
  'rack-style-1': (openPdf) => <RackStyle1Diagram openPdf={openPdf} />,
  'rack-style-2': (openPdf) => <RackStyle2Diagram openPdf={openPdf} />,
  'paragon-timer': () => <ParagonTimerDiagram />,
  'compressor-terminals': () => <CompressorTerminalDiagram />,
  'ice-harvest-cycle': () => <IceHarvestCycleDiagram />,
  'basic-refrigeration-cycle': () => <BasicRefrigerationCycleDiagram />,
}

// ── Inline formatter ──────────────────────────────────────────────────────────
// Handles **bold** and `backtick` spans within a line of text.
function parseInline(text: string): React.ReactNode {
  const parts: React.ReactNode[] = []
  // Pattern: either **...** or `...`
  const regex = /(\*\*(.+?)\*\*|`([^`]+)`)/g
  let lastIndex = 0
  let match: RegExpExecArray | null

  while ((match = regex.exec(text)) !== null) {
    // Push plain text before this match
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index))
    }

    if (match[0].startsWith('**')) {
      parts.push(
        <strong key={match.index} className="font-semibold text-slate-900 dark:text-slate-100">
          {match[2]}
        </strong>
      )
    } else {
      // backtick
      parts.push(
        <code key={match.index} className="font-mono text-xs bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 px-1 py-0.5 rounded">
          {match[3]}
        </code>
      )
    }

    lastIndex = match.index + match[0].length
  }

  // Remaining text
  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex))
  }

  return parts.length === 1 ? parts[0] : <>{parts}</>
}

// ── Slug helper ───────────────────────────────────────────────────────────────
function slugify(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
}

// ── Section heading with hover-to-copy deep-link anchor ────────────────────────
function SectionHeading({ id, children }: { id: string; children: React.ReactNode }) {
  const [copied, setCopied] = useState(false)

  function copyLink() {
    const url = `${window.location.origin}${window.location.pathname}#${id}`
    history.replaceState(null, '', `#${id}`)
    const done = () => { setCopied(true); setTimeout(() => setCopied(false), 1500) }
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(url).then(done).catch(done)
    } else {
      done()
    }
  }

  return (
    <div id={id} className="group scroll-mt-24 mt-8 mb-3 pt-1 border-t border-slate-100 dark:border-slate-800 first:border-t-0 first:mt-0 first:pt-0">
      <h3 className="text-[17px] font-semibold text-slate-900 dark:text-slate-100 mt-4 first:mt-3 flex items-center gap-2">
        <span className="inline-block w-1 h-4 rounded-full bg-blue-500 dark:bg-blue-400 flex-shrink-0" />
        <span>{children}</span>
        <button
          onClick={copyLink}
          aria-label={copied ? 'Link copied' : 'Copy link to section'}
          title={copied ? 'Link copied' : 'Copy link to this section'}
          className="flex-shrink-0 p-1 rounded text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/50 opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity"
        >
          {copied ? <Check size={13} className="text-emerald-600 dark:text-emerald-400" /> : <Link2 size={13} />}
        </button>
      </h3>
    </div>
  )
}

// ── Callout (admonition) config ───────────────────────────────────────────────
// Styled boxes driven by `> [!TYPE]` blockquote syntax. Colors follow the
// light/dark conventions in CLAUDE.md so text stays readable on both backgrounds.
type CalloutType = 'NOTE' | 'TIP' | 'WARNING' | 'SAFETY' | 'EXAMPLE'

const CALLOUT_CONFIG: Record<CalloutType, {
  icon: React.ReactNode
  label: string
  box: string
  title: string
}> = {
  NOTE: {
    icon: <Info size={15} />,
    label: 'Note',
    box: 'bg-blue-50 border-blue-200 dark:bg-blue-500/10 dark:border-blue-500/30',
    title: 'text-blue-700 dark:text-blue-400',
  },
  TIP: {
    icon: <Lightbulb size={15} />,
    label: 'Tip',
    box: 'bg-emerald-50 border-emerald-200 dark:bg-emerald-500/10 dark:border-emerald-500/30',
    title: 'text-emerald-700 dark:text-emerald-400',
  },
  WARNING: {
    icon: <AlertTriangle size={15} />,
    label: 'Warning',
    box: 'bg-amber-50 border-amber-200 dark:bg-amber-500/10 dark:border-amber-500/30',
    title: 'text-amber-700 dark:text-amber-400',
  },
  SAFETY: {
    icon: <ShieldAlert size={15} />,
    label: 'Safety',
    box: 'bg-red-50 border-red-200 dark:bg-red-500/10 dark:border-red-500/30',
    title: 'text-red-600 dark:text-red-400',
  },
  EXAMPLE: {
    icon: <FlaskConical size={15} />,
    label: 'Worked Example',
    box: 'bg-violet-50 border-violet-200 dark:bg-violet-500/10 dark:border-violet-500/30',
    title: 'text-violet-700 dark:text-violet-400',
  },
}

// Render the body of a callout — supports paragraphs and `- ` bullet lists.
function renderCalloutBody(lines: string[]): React.ReactNode[] {
  const out: React.ReactNode[] = []
  let bullets: string[] | null = null
  const flush = () => {
    if (bullets) {
      out.push(
        <ul key={out.length} className="space-y-1 ml-4 list-disc list-outside my-1.5">
          {bullets.map((b, bi) => <li key={bi}>{parseInline(b)}</li>)}
        </ul>
      )
      bullets = null
    }
  }
  for (const raw of lines) {
    const t = raw.trim()
    if (t === '') { flush(); continue }
    if (t.startsWith('- ')) {
      if (!bullets) bullets = []
      bullets.push(t.slice(2))
      continue
    }
    flush()
    out.push(<p key={out.length} className="my-1.5 first:mt-0 last:mb-0">{parseInline(t)}</p>)
  }
  flush()
  return out
}

function renderCallout(type: CalloutType, title: string | null, body: string[], key: number): React.ReactNode {
  const cfg = CALLOUT_CONFIG[type]
  return (
    <div key={key} className={`my-4 rounded-lg border px-4 py-3 ${cfg.box}`}>
      <div className={`flex items-center gap-2 text-xs font-semibold uppercase tracking-wide mb-1.5 ${cfg.title}`}>
        {cfg.icon}
        <span>{title || cfg.label}</span>
      </div>
      <div className="text-[15px] text-slate-700 dark:text-slate-300 leading-7">
        {renderCalloutBody(body)}
      </div>
    </div>
  )
}

// ── Table renderer ────────────────────────────────────────────────────────────
function renderTable(rows: string[], key: number): React.ReactNode {
  // rows[0] = header row, rows[1] = separator row (|---|---|...), rows[2+] = data
  const parseRow = (row: string): string[] =>
    row
      .split('|')
      .map(cell => cell.trim())
      .filter((_, i, arr) => i > 0 && i < arr.length - 1) // drop leading/trailing empty from | ... |

  const headerCells = parseRow(rows[0])
  const dataRows = rows.slice(2) // skip separator
  const parsedData = dataRows.map(parseRow)

  // A column is "numeric" when every non-empty data cell reads as a number
  // (allowing ~, ±, °, %, leading sign, ranges like "4–5", and units). These
  // get right-aligned + tabular figures so PT charts and spec tables line up.
  const NUMERIC_RE = /^[~±<>]?\s*[-+]?\d[\d,.\s]*(?:[–-]\d[\d,.]*)?\s*(?:°?[fcFC%])?\.?$/
  const isNumericCol = (ci: number) => {
    const cells = parsedData.map(r => r[ci]).filter(c => c && c !== '—' && c !== '-')
    return cells.length > 0 && cells.every(c => NUMERIC_RE.test(c))
  }
  const numericCols = headerCells.map((_, ci) => isNumericCol(ci))
  const cellAlign = (ci: number) => numericCols[ci] ? 'text-right tabular-nums' : 'text-left'

  // Tall tables get a scroll container with a sticky header so column labels
  // stay visible while scrolling a long chart.
  const isTall = parsedData.length > 14

  return (
    <div key={key} className={`overflow-auto my-4 rounded-lg border border-slate-200 dark:border-slate-700 ${isTall ? 'max-h-[28rem]' : ''}`}>
      <table className="w-full text-xs border-collapse">
        <thead className={isTall ? 'sticky top-0 z-10' : ''}>
          <tr className="bg-slate-100 dark:bg-slate-800">
            {headerCells.map((cell, ci) => (
              <th
                key={ci}
                className={`border-b border-slate-200 dark:border-slate-700 px-2.5 py-2 font-semibold text-slate-700 dark:text-slate-300 whitespace-nowrap ${cellAlign(ci)} ${isTall ? 'bg-slate-100 dark:bg-slate-800' : ''}`}
              >
                {parseInline(cell)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {parsedData.map((cells, ri) => (
            <tr key={ri} className={ri % 2 === 1 ? 'bg-slate-50 dark:bg-slate-900/50' : 'bg-white dark:bg-slate-900'}>
              {cells.map((cell, ci) => (
                <td key={ci} className={`border-b border-slate-100 dark:border-slate-800 px-2.5 py-1.5 text-slate-700 dark:text-slate-300 align-top ${cellAlign(ci)}`}>
                  {parseInline(cell)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ── Main markdown renderer ────────────────────────────────────────────────────
export function renderMarkdown(content: string, onOpenPdf?: OpenPdfFn): React.ReactNode[] {
  const lines = content.split('\n')
  const nodes: React.ReactNode[] = []
  let i = 0
  let isFirstH2 = true
  let isFirstParagraph = true
  let listBuffer: { type: 'ul' | 'ol'; items: string[] } | null = null
  let tableBuffer: string[] | null = null
  let calloutBuffer: string[] | null = null

  function flushList() {
    if (!listBuffer) return
    const { type, items } = listBuffer
    const key = nodes.length
    if (type === 'ul') {
      nodes.push(
        <ul key={key} className="space-y-1.5 ml-5 list-disc list-outside text-[15px] text-slate-700 dark:text-slate-300 leading-7 my-3 marker:text-slate-400 dark:marker:text-slate-500">
          {items.map((item, ii) => (
            <li key={ii} className="pl-1">{parseInline(item)}</li>
          ))}
        </ul>
      )
    } else {
      nodes.push(
        <ol key={key} className="space-y-1.5 ml-5 list-decimal list-outside text-[15px] text-slate-700 dark:text-slate-300 leading-7 my-3 marker:text-slate-400 dark:marker:text-slate-500">
          {items.map((item, ii) => (
            <li key={ii} className="pl-1">{parseInline(item)}</li>
          ))}
        </ol>
      )
    }
    listBuffer = null
  }

  function flushTable() {
    if (!tableBuffer || tableBuffer.length < 2) {
      tableBuffer = null
      return
    }
    nodes.push(renderTable(tableBuffer, nodes.length))
    tableBuffer = null
  }

  function flushCallout() {
    if (!calloutBuffer || calloutBuffer.length === 0) {
      calloutBuffer = null
      return
    }
    let type: CalloutType = 'NOTE'
    let title: string | null = null
    let body = calloutBuffer
    const head = calloutBuffer[0].trim().match(/^\[!(NOTE|TIP|WARNING|SAFETY|EXAMPLE)\]\s*(.*)$/i)
    if (head) {
      type = head[1].toUpperCase() as CalloutType
      title = head[2].trim() || null
      body = calloutBuffer.slice(1)
    }
    nodes.push(renderCallout(type, title, body, nodes.length))
    calloutBuffer = null
  }

  while (i < lines.length) {
    const line = lines[i]
    const trimmed = line.trim()

    // ── Callout / blockquote block ── (must run before other blocks so any
    // non-blockquote line flushes an open callout)
    if (trimmed.startsWith('>')) {
      flushList()
      flushTable()
      if (!calloutBuffer) calloutBuffer = []
      calloutBuffer.push(trimmed.replace(/^>\s?/, ''))
      i++
      continue
    } else {
      flushCallout()
    }

    // ── Table row ──
    if (trimmed.startsWith('|')) {
      flushList()
      if (!tableBuffer) tableBuffer = []
      tableBuffer.push(trimmed)
      i++
      continue
    } else {
      flushTable()
    }

    // ── Diagram block ──
    const diagramMatch = trimmed.match(/^\[diagram:([a-z0-9-]+)\]$/)
    if (diagramMatch) {
      flushList()
      const factory = DIAGRAM_REGISTRY[diagramMatch[1]]
      if (factory) nodes.push(<React.Fragment key={nodes.length}>{factory(onOpenPdf)}</React.Fragment>)
      i++
      continue
    }

    // ── Blank line ──
    if (trimmed === '') {
      flushList()
      i++
      continue
    }

    // ── Horizontal rule ──
    if (trimmed === '---') {
      flushList()
      nodes.push(<div key={nodes.length} className="border-t border-slate-200 dark:border-slate-700 my-6" />)
      i++
      continue
    }

    // ── H2 ──
    if (trimmed.startsWith('## ')) {
      flushList()
      const title = trimmed.slice(3).trim()
      if (isFirstH2) {
        nodes.push(
          <h2 key={nodes.length} className="text-xl font-bold text-slate-900 dark:text-slate-100 mt-0 mb-4 tracking-tight">
            {parseInline(title)}
          </h2>
        )
        isFirstH2 = false
      }
      // Skip subsequent ## headings (they're just section repetitions)
      i++
      continue
    }

    // ── H3 ──
    if (trimmed.startsWith('### ')) {
      flushList()
      const title = trimmed.slice(4).trim()
      const id = slugify(title)
      nodes.push(
        <SectionHeading key={nodes.length} id={id}>{parseInline(title)}</SectionHeading>
      )
      i++
      continue
    }

    // ── H4 ──
    if (trimmed.startsWith('#### ')) {
      flushList()
      const title = trimmed.slice(5).trim()
      nodes.push(
        <h4 key={nodes.length} className="text-sm font-semibold text-slate-700 dark:text-slate-300 mt-4 mb-1">
          {parseInline(title)}
        </h4>
      )
      i++
      continue
    }

    // ── Bullet list item ──
    if (trimmed.startsWith('- ')) {
      const itemText = trimmed.slice(2)
      if (listBuffer && listBuffer.type === 'ul') {
        listBuffer.items.push(itemText)
      } else {
        flushList()
        listBuffer = { type: 'ul', items: [itemText] }
      }
      i++
      continue
    }

    // ── Numbered list item (e.g. "1. " or "2. ") ──
    if (/^\d+\.\s/.test(trimmed)) {
      const itemText = trimmed.replace(/^\d+\.\s/, '')
      if (listBuffer && listBuffer.type === 'ol') {
        listBuffer.items.push(itemText)
      } else {
        flushList()
        listBuffer = { type: 'ol', items: [itemText] }
      }
      i++
      continue
    }

    // ── Image ──  ![alt](url)  or  ![alt](url "caption")
    const imgMatch = trimmed.match(/^!\[([^\]]*)\]\(([^)\s"]+)(?:\s+"([^"]*)")?\)$/)
    if (imgMatch) {
      flushList()
      const [, alt, src, caption] = imgMatch
      nodes.push(
        <figure key={nodes.length} className="my-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={src}
            alt={alt}
            className="rounded-lg border border-slate-200 dark:border-slate-700 max-w-full"
            loading="lazy"
          />
          {(caption || alt) && (
            <figcaption className="text-xs text-slate-500 dark:text-slate-400 mt-1.5 text-center italic">
              {caption || alt}
            </figcaption>
          )}
        </figure>
      )
      i++
      continue
    }

    // ── Regular paragraph ──
    flushList()
    if (isFirstParagraph) {
      isFirstParagraph = false
      nodes.push(
        <p key={nodes.length} className="text-[16px] text-slate-600 dark:text-slate-400 leading-8 my-3 font-normal tracking-[0.01em]">
          {parseInline(trimmed)}
        </p>
      )
    } else {
      nodes.push(
        <p key={nodes.length} className="text-[15px] text-slate-700 dark:text-slate-300 leading-7 my-3">
          {parseInline(trimmed)}
        </p>
      )
    }
    i++
  }

  // Flush any remaining list, table, or callout
  flushList()
  flushTable()
  flushCallout()

  return nodes
}

// ── TOC extractor ─────────────────────────────────────────────────────────────
export function extractSections(content: string): { id: string; title: string }[] {
  return content
    .split('\n')
    .filter(line => line.trim().startsWith('### '))
    .map(line => {
      const title = line.trim().slice(4).trim()
      // Strip emoji from the beginning (e.g. "1️⃣ Airflow")
      const cleanTitle = title.replace(/^[\u{1F300}-\u{1FAF8}\u{2600}-\u{26FF}\u{2700}-\u{27BF}️⃣]+\s*/u, '')
      return { id: slugify(cleanTitle || title), title: cleanTitle || title }
    })
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function MarkdownContent({ content, onOpenPdf }: { content: string; onOpenPdf?: OpenPdfFn }) {
  const nodes = renderMarkdown(content, onOpenPdf)
  return <div className="prose-knowledge">{nodes}</div>
}
