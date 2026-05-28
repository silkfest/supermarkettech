'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  MessageSquare, BookOpen, FileText, Cpu, ClipboardList, ShieldCheck,
  GraduationCap, ChevronRight, ArrowRight, Thermometer, CheckCircle2,
  Library, Brain, Wrench, Users, Zap,
} from 'lucide-react'

// ── Section data ──────────────────────────────────────────────────────────────

interface SubFeature {
  title: string
  description: string
  href: string
}

interface Section {
  id: string
  icon: React.ReactNode
  color: string          // tailwind color token, e.g. 'blue'
  title: string
  tagline: string
  body: string
  features: SubFeature[]
}

const SECTIONS: Section[] = [
  {
    id: 'diagnostic',
    icon: <MessageSquare size={22} />,
    color: 'blue',
    title: 'Diagnostic Help',
    tagline: 'AI-powered fault finding with your own manuals',
    body: 'The AI assistant draws on a structured knowledge base covering every major manufacturer — Copeland, Hussmann, Danfoss, Sporlan, Bitzer, Arneg, and more. Upload your own manufacturer PDFs and the system reads them automatically; when you ask a question it cites the exact manual and section. Chat history is saved so you can revisit how a fault was diagnosed or share a thread with a colleague.',
    features: [
      { title: 'AI Expert Chat', description: 'Describe the fault — get ranked causes, confirmation tests, and step-by-step fixes.', href: '/dashboard' },
      { title: 'Knowledge Base', description: '22 in-depth topics: valve theory, VFD fault codes, CO₂ transcritical, refrigerant retrofit, defrost wiring, and more.', href: '/knowledge' },
      { title: 'Manual Library', description: 'Upload manufacturer PDFs. The AI reads them and cites them directly in answers.', href: '/library' },
      { title: 'Chat History', description: 'Every conversation saved — search by date, equipment, or topic.', href: '/chat-history' },
    ],
  },
  {
    id: 'training',
    icon: <GraduationCap size={22} />,
    color: 'violet',
    title: 'Training',
    tagline: 'Hands-on practice and structured learning',
    body: 'Technicians can build fault-finding skills on a simulated rack before touching live equipment. The rack simulator presents realistic fault scenarios — high suction, head pressure issues, compressor faults — and walks through diagnosis interactively. The knowledge base doubles as a structured reference library for apprentices working through refrigeration fundamentals, electrical, and system-specific topics.',
    features: [
      { title: 'Rack Simulator', description: 'Practice diagnosing faults on a simulated system. No live equipment, no risk.', href: '/simulation' },
      { title: 'Knowledge Base', description: 'Structured technical content across 22 topics — usable as training modules for apprentices.', href: '/knowledge' },
    ],
  },
  {
    id: 'maintenance',
    icon: <ClipboardList size={22} />,
    color: 'emerald',
    title: 'Maintenance Forms',
    tagline: 'Digital service records, always searchable',
    body: 'Every service call and preventive maintenance visit is documented digitally. Technicians record findings, parts used, labour time, and photos on their phone. Reports are stored permanently and searchable by equipment, date, or fault type. Managers get a complete audit trail for warranty claims, insurance, and compliance — without chasing paper forms.',
    features: [
      { title: 'Service Reports', description: 'Log findings, parts, and time. Reports stored permanently under each piece of equipment.', href: '/maintenance' },
      { title: 'PM Checklists', description: 'Structured preventive maintenance checklists — completed on phone, signed off digitally.', href: '/maintenance' },
      { title: 'Equipment Registry', description: 'Every unit tracked: model, serial, refrigerant type, installation date, full service history.', href: '/maintenance' },
    ],
  },
  {
    id: 'policies',
    icon: <ShieldCheck size={22} />,
    color: 'amber',
    title: 'Policies & Procedures',
    tagline: 'Company documents, always current, always accessible',
    body: "Store your company's operational procedures, safety protocols, and compliance documents in one place. Includes store procedures (with seasonal ones pinnable to the top), an on-call schedule where trades can be requested and accepted by technicians, and a truck stock list so everyone knows what should be on each van. Managers can update documents instantly — no more outdated printouts in binders.",
    features: [
      { title: 'Store Procedures', description: 'SOPs and safety protocols — pin seasonal procedures to the top so the right info is always front and centre.', href: '/policies' },
      { title: 'On-Call Schedule', description: 'Post the on-call roster and let technicians request or accept trades directly in the app.', href: '/policies' },
      { title: 'Truck Stock List', description: 'Keep a standard parts list for each van so every technician knows exactly what they should be carrying.', href: '/policies' },
    ],
  },
  {
    id: 'apprentices',
    icon: <Users size={22} />,
    color: 'rose',
    title: 'Apprentice & Journeyman Tracking',
    tagline: 'Structured development from day one',
    body: 'The apprentice section gives managers visibility into where each technician is in their development. Track hours logged, skill assessments, certificates earned, and leave space for structured manager feedback. Apprentices can see their own progress and know exactly what they need to work toward to reach journeyman level. This section is actively being developed — the foundation is in place and capabilities are expanding.',
    features: [
      { title: 'Apprentice Profiles', description: 'Per-technician view of hours, skills, and certificates — all in one place.', href: '/admin/apprentices' },
      { title: 'Team Management', description: 'Add technicians, assign roles (apprentice, journeyman, manager), and control access.', href: '/admin/users' },
      { title: 'Technician Records', description: 'Individual technician profiles with service history and notes.', href: '/admin/technicians' },
    ],
  },
]

const COLOR_STYLES: Record<string, { bg: string; text: string; lightBg: string; border: string; pill: string }> = {
  blue:   { bg: 'bg-blue-600',   text: 'text-blue-600',   lightBg: 'bg-blue-50',   border: 'border-blue-200',   pill: 'bg-blue-100 text-blue-700' },
  violet: { bg: 'bg-violet-600', text: 'text-violet-600', lightBg: 'bg-violet-50', border: 'border-violet-200', pill: 'bg-violet-100 text-violet-700' },
  emerald:{ bg: 'bg-emerald-600',text: 'text-emerald-600',lightBg: 'bg-emerald-50',border: 'border-emerald-200',pill: 'bg-emerald-100 text-emerald-700' },
  amber:  { bg: 'bg-amber-500',  text: 'text-amber-600',  lightBg: 'bg-amber-50',  border: 'border-amber-200',  pill: 'bg-amber-100 text-amber-700' },
  rose:   { bg: 'bg-rose-600',   text: 'text-rose-600',   lightBg: 'bg-rose-50',   border: 'border-rose-200',   pill: 'bg-rose-100 text-rose-700' },
}

// ── Sub-feature card ──────────────────────────────────────────────────────────

function FeatureCard({ feature, color }: { feature: SubFeature; color: string }) {
  const router = useRouter()
  const c = COLOR_STYLES[color]
  return (
    <button
      onClick={() => router.push(feature.href)}
      className="w-full text-left bg-white rounded-lg border border-slate-200 p-4 hover:shadow-md hover:border-slate-300 transition-all group"
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className={`text-sm font-semibold text-slate-900 group-hover:${c.text} transition-colors mb-1`}>{feature.title}</p>
          <p className="text-xs text-slate-500 leading-relaxed">{feature.description}</p>
        </div>
        <ChevronRight size={14} className="flex-shrink-0 text-slate-300 group-hover:text-slate-500 mt-0.5 transition-colors" />
      </div>
    </button>
  )
}

// ── Section block ─────────────────────────────────────────────────────────────

function SectionBlock({ section, index }: { section: Section; index: number }) {
  const router = useRouter()
  const c = COLOR_STYLES[section.color]

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
      {/* Header bar */}
      <div className={`${c.bg} px-6 py-4`}>
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-white/20 flex items-center justify-center text-white">
            {section.icon}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-semibold text-white/60 uppercase tracking-widest">0{index + 1}</span>
            </div>
            <h2 className="text-base font-bold text-white leading-tight">{section.title}</h2>
          </div>
        </div>
        <p className="text-sm text-white/80 mt-2 leading-relaxed">{section.tagline}</p>
      </div>

      {/* Body */}
      <div className="px-6 py-5">
        <p className="text-sm text-slate-600 leading-relaxed mb-5">{section.body}</p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {section.features.map(f => (
            <FeatureCard key={f.title} feature={f} color={section.color} />
          ))}
        </div>
      </div>
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function WelcomePage() {
  const router = useRouter()

  return (
    <div className="min-h-screen bg-slate-50">

      {/* Hero */}
      <div className="bg-gradient-to-br from-slate-800 via-slate-700 to-slate-800 text-white">
        <div className="max-w-4xl mx-auto px-6 py-12 md:py-16">
          <div className="flex items-center gap-2 mb-5">
            <Thermometer size={18} className="opacity-60" />
            <span className="text-xs font-semibold opacity-60 tracking-widest uppercase">ColdIQ</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-bold leading-tight mb-3">
            Your refrigeration team's<br className="hidden md:block" /> digital toolkit
          </h1>
          <p className="text-slate-300 text-base md:text-lg max-w-2xl leading-relaxed mb-8">
            ColdIQ brings together the tools your team uses every day — AI-assisted fault finding, training, digital maintenance records, and company procedures — in one place built specifically for supermarket refrigeration.
          </p>
          <div className="flex flex-wrap gap-3 mb-8">
            {[
              { icon: <Brain size={14} />, text: 'AI that knows your manuals' },
              { icon: <CheckCircle2 size={14} />, text: 'Every job documented automatically' },
              { icon: <Zap size={14} />, text: 'Works on any device, on any site' },
            ].map((h, i) => (
              <div key={i} className="flex items-center gap-1.5 bg-white/10 rounded-full px-3 py-1.5 text-sm text-white">
                <span className="opacity-70">{h.icon}</span>
                {h.text}
              </div>
            ))}
          </div>
          <button
            onClick={() => router.push('/dashboard')}
            className="inline-flex items-center gap-2 bg-white text-slate-800 font-semibold px-5 py-2.5 rounded-lg hover:bg-slate-100 transition-colors text-sm shadow-sm"
          >
            Open Dashboard
            <ArrowRight size={15} />
          </button>
        </div>
      </div>

      {/* Sections */}
      <div className="max-w-4xl mx-auto px-6 py-10 space-y-6">
        {SECTIONS.map((section, i) => (
          <SectionBlock key={section.id} section={section} index={i} />
        ))}

        {/* Simpro integration callout */}
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-slate-100 text-slate-500 flex items-center justify-center">
              <Wrench size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h3 className="text-sm font-bold text-slate-900">Simpro Integration (Future)</h3>
                <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-500">
                  Possible
                </span>
              </div>
              <p className="text-sm text-slate-500 leading-relaxed max-w-2xl">
                ColdIQ is designed to connect to Simpro, the job management platform many refrigeration companies already use. A future integration would let maintenance reports created in ColdIQ flow directly into Simpro job cards — eliminating double entry — and pull asset data and scheduled work orders back into ColdIQ. This is a planned capability as the platform grows.
              </p>
            </div>
          </div>
        </div>

        {/* CTA */}
        <div className="text-center py-8 border-t border-slate-200">
          <p className="text-slate-500 text-sm mb-4">Ready to start?</p>
          <div className="flex items-center justify-center gap-3 flex-wrap">
            <button
              onClick={() => router.push('/dashboard')}
              className="inline-flex items-center gap-2 bg-blue-600 text-white font-semibold px-6 py-2.5 rounded-lg hover:bg-blue-700 transition-colors text-sm"
            >
              Open Dashboard
              <ArrowRight size={15} />
            </button>
            <button
              onClick={() => router.push('/knowledge')}
              className="inline-flex items-center gap-2 bg-white text-slate-700 font-semibold px-6 py-2.5 rounded-lg border border-slate-200 hover:border-slate-300 transition-colors text-sm"
            >
              Browse Knowledge Base
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
