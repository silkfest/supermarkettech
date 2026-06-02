'use client'

import React from 'react'
import { RackStyle1Diagram } from './diagrams/RackStyle1Diagram'
import { RackStyle2Diagram } from './diagrams/RackStyle2Diagram'

export type OpenPdfFn = (url: string, title: string) => void

const DIAGRAM_REGISTRY: Record<string, (openPdf?: OpenPdfFn) => React.ReactNode> = {
  'rack-style-1': (openPdf) => <RackStyle1Diagram openPdf={openPdf} />,
  'rack-style-2': (openPdf) => <RackStyle2Diagram openPdf={openPdf} />,
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

  return (
    <div key={key} className="overflow-x-auto my-4">
      <table className="w-full text-xs border-collapse">
        <thead>
          <tr className="bg-slate-100 dark:bg-slate-800">
            {headerCells.map((cell, ci) => (
              <th
                key={ci}
                className="border border-slate-200 dark:border-slate-700 px-2 py-1.5 text-left font-semibold text-slate-700 dark:text-slate-300 whitespace-nowrap"
              >
                {parseInline(cell)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {dataRows.map((row, ri) => {
            const cells = parseRow(row)
            return (
              <tr key={ri} className={ri % 2 === 1 ? 'bg-slate-50 dark:bg-slate-900/50' : ''}>
                {cells.map((cell, ci) => (
                  <td key={ci} className="border border-slate-200 dark:border-slate-700 px-2 py-1.5 text-slate-700 dark:text-slate-300 align-top">
                    {parseInline(cell)}
                  </td>
                ))}
              </tr>
            )
          })}
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
  let listBuffer: { type: 'ul' | 'ol'; items: string[] } | null = null
  let tableBuffer: string[] | null = null

  function flushList() {
    if (!listBuffer) return
    const { type, items } = listBuffer
    const key = nodes.length
    if (type === 'ul') {
      nodes.push(
        <ul key={key} className="space-y-1 ml-4 list-disc list-outside text-sm text-slate-700 dark:text-slate-300 my-2">
          {items.map((item, ii) => (
            <li key={ii}>{parseInline(item)}</li>
          ))}
        </ul>
      )
    } else {
      nodes.push(
        <ol key={key} className="space-y-1 ml-4 list-decimal list-outside text-sm text-slate-700 dark:text-slate-300 my-2">
          {items.map((item, ii) => (
            <li key={ii}>{parseInline(item)}</li>
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

  while (i < lines.length) {
    const line = lines[i]
    const trimmed = line.trim()

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
          <h2 key={nodes.length} className="text-lg font-bold text-slate-900 dark:text-slate-100 mt-0 mb-4">
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
        <div key={nodes.length} id={id} className="scroll-mt-20">
          <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100 mt-6 mb-2">
            {parseInline(title)}
          </h3>
        </div>
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

    // ── Regular paragraph ──
    flushList()
    nodes.push(
      <p key={nodes.length} className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed my-2">
        {parseInline(trimmed)}
      </p>
    )
    i++
  }

  // Flush any remaining list or table
  flushList()
  flushTable()

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
