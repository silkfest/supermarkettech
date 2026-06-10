'use client'

import { useRouter } from 'next/navigation'
import {
  MessageSquare, ClipboardList, ShieldCheck,
  GraduationCap, ChevronRight, ArrowRight, Thermometer, CheckCircle2,
  Brain, Wrench, Users, Zap, Lock, MessageSquareWarning,
} from 'lucide-react'

// ── Section data ──────────────────────────────────────────────────────────────

interface SubFeature {
  title: string
  description: string
  href: string
  beta?: boolean
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
    body: 'Technicians can build fault-finding skills on a simulated rack before touching live equipment. The rack simulator presents realistic fault scenarios — high suction, head pressure issues, compressor faults — and walks through diagnosis interactively. Managers can create and assign training courses, track completion, and use the knowledge base as a structured reference library for apprentices working through refrigeration fundamentals and system-specific topics.',
    features: [
      { title: 'Rack Simulator', description: 'Practice diagnosing faults on a simulated system. No live equipment, no risk.', href: '/simulation', beta: true },
      { title: 'Knowledge Base', description: 'Structured technical reference covering refrigeration fundamentals, manufacturer specs, and field procedures.', href: '/knowledge' },
      { title: 'Courses', description: 'Create and assign training courses, track completion, and build a structured learning path for your team.', href: '/apprentice/training' },
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
      { title: 'Sites', description: 'Per-store view of equipment, trending issues, and PM history. Currently available to admins.', href: '/stores', beta: true },
    ],
  },
  {
    id: 'policies',
    icon: <ShieldCheck size={22} />,
    color: 'amber',
    title: 'Policies & Procedures',
    tagline: 'Company documents, always current, always accessible',
    body: "No more digging through emails — store all your company procedures, safety protocols, and compliance documents in one place. Includes store procedures (with seasonal ones pinnable to the top), an on-call schedule where trades can be requested and accepted by technicians, and a truck stock list so everyone knows what should be on each van. Company-wide announcements and the contact directory live here too, so managers can update anything instantly and everyone sees the latest version.",
    features: [
      { title: 'Store Procedures', description: 'SOPs and safety protocols — pin seasonal procedures to the top so the right info is always front and centre.', href: '/policies' },
      { title: 'On-Call Schedule', description: 'Post the on-call roster and let technicians request or accept trades directly in the app.', href: '/policies' },
      { title: 'Truck Stock List', description: 'Keep a standard parts list for each van so every technician knows exactly what they should be carrying.', href: '/policies' },
      { title: 'Announcements', description: 'Managers post company-wide updates that show right on the dashboard — pin important ones and require a read acknowledgement.', href: '/company-hub?tab=announcements' },
      { title: 'Contact Directory', description: 'Find phone numbers and emails for managers, vendors, and emergency contacts in one place.', href: '/company-hub?tab=contacts' },
    ],
  },
  {
    id: 'apprentices',
    icon: <Users size={22} />,
    color: 'rose',
    title: 'Apprentice & Journeyman Tracking',
    tagline: 'Structured development from day one',
    body: 'Managers get full visibility into where each technician is in their development. Track hours logged, certificates earned, and apprenticeship year. Managers can leave structured reviews with star ratings across technical skill, safety, and teamwork — with dedicated sections for strengths and areas to improve. Technicians see their own feedback, progress, and assigned courses directly in their profile.',
    features: [
      { title: 'Apprentice Profiles', description: 'Per-technician view of hours, apprenticeship year, and certificates — all in one place.', href: '/admin/apprentices' },
      { title: 'Reviews & Feedback', description: 'Managers write structured reviews with ratings for technical skill, safety, and teamwork. Techs view their feedback in their profile.', href: '/profile' },
      { title: 'Courses', description: 'Assign training courses and track completion — build a structured learning path from apprentice to journeyman.', href: '/apprentice/training' },
      { title: 'Team Management', description: 'Add technicians, assign roles (apprentice, journeyman, manager), and control access.', href: '/admin/users' },
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
      className="w-full text-left bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700 p-4 hover:shadow-md hover:border-slate-300 dark:hover:border-slate-600 transition-all group"
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="flex items-center gap-1.5 mb-1">
            <p className={`text-sm font-semibold text-slate-900 dark:text-slate-100 group-hover:${c.text} transition-colors`}>{feature.title}</p>
            {feature.beta && (
              <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full bg-violet-100 text-violet-700 dark:bg-violet-500/10 dark:text-violet-400 border border-violet-200 dark:border-violet-500/30 uppercase tracking-wide">
                Beta
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">{feature.description}</p>
        </div>
        <ChevronRight size={14} className="flex-shrink-0 text-slate-300 dark:text-slate-600 group-hover:text-slate-500 dark:group-hover:text-slate-400 mt-0.5 transition-colors" />
      </div>
    </button>
  )
}

// ── Section block ─────────────────────────────────────────────────────────────

function SectionBlock({ section, index }: { section: Section; index: number }) {
  const c = COLOR_STYLES[section.color]

  return (
    <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
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
        <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed mb-5">{section.body}</p>

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
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">

      {/* Hero */}
      <div className="safe-top bg-gradient-to-br from-slate-800 via-slate-700 to-slate-800 text-white">
        <div className="max-w-4xl mx-auto px-6 py-12 md:py-16">
          <div className="flex items-center gap-2 mb-5">
            <Thermometer size={18} className="opacity-60" />
            <span className="text-xs font-semibold opacity-60 tracking-widest uppercase">ColdIQ</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-bold leading-tight mb-3">
            Your refrigeration team&apos;s<br className="hidden md:block" /> digital toolkit
          </h1>
          <p className="text-slate-300 text-base md:text-lg max-w-2xl leading-relaxed mb-8">
            ColdIQ brings together the tools your team uses every day — AI-assisted fault finding, training, digital maintenance records, and company procedures — in one place built specifically for supermarket refrigeration.
          </p>
          <div className="flex flex-wrap gap-3 mb-8">
            {[
              { icon: <Brain size={14} />, text: 'AI that knows your manuals' },
              { icon: <CheckCircle2 size={14} />, text: 'Every job documented automatically' },
              { icon: <Zap size={14} />, text: 'Works on any device, on any site' },
              { icon: <Lock size={14} />, text: 'Company email required · encrypted' },
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

        {/* Security & Privacy trust block */}
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-emerald-200 dark:border-emerald-900/50 overflow-hidden">
          {/* Header */}
          <div className="bg-emerald-600 px-6 py-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-white/20 flex items-center justify-center text-white">
                <Lock size={20} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-semibold text-white/60 uppercase tracking-widest">06</span>
                </div>
                <h2 className="text-base font-bold text-white leading-tight">Security & Privacy</h2>
              </div>
            </div>
            <p className="text-sm text-white/80 mt-2 leading-relaxed">Built for companies — not public sign-ups</p>
          </div>
          {/* Body */}
          <div className="px-6 py-5">
            <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed mb-5">
              ColdIQ handles sensitive company documents, service records, and proprietary procedures. Access is tightly controlled and every piece of data is encrypted — because your trade secrets shouldn&apos;t be anyone else&apos;s business.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {[
                {
                  icon: <ShieldCheck size={15} className="text-emerald-600" />,
                  title: 'Encrypted in transit & at rest',
                  body: 'All data travels over HTTPS/TLS and is stored with AES-256 encryption. Your manuals, records, and chat history never travel unprotected.',
                },
                {
                  icon: <Lock size={15} className="text-emerald-600" />,
                  title: 'Company email required',
                  body: 'No public sign-up. Every new account must use a company email address and be explicitly approved by your admin before access is granted.',
                },
                {
                  icon: <Users size={15} className="text-emerald-600" />,
                  title: 'Your data, fully isolated',
                  body: "Each company's equipment, documents, maintenance records, and chat history are completely isolated. No other organisation can see your data.",
                },
                {
                  icon: <CheckCircle2 size={15} className="text-emerald-600" />,
                  title: 'Role-based access control',
                  body: 'Admins, managers, journeymen, and apprentices each get the level of access appropriate to their role — nothing more.',
                },
              ].map(item => (
                <div key={item.title} className="bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-4">
                  <div className="flex items-center gap-2 mb-1.5">
                    {item.icon}
                    <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">{item.title}</p>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">{item.body}</p>
                </div>
              ))}
            </div>
            {/* SOC 2 certification badge */}
            <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center gap-2">
              <ShieldCheck size={14} className="text-emerald-500 flex-shrink-0" />
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Hosted on <span className="font-semibold text-slate-700 dark:text-slate-300">Supabase</span> infrastructure —
                {' '}<span className="font-semibold text-emerald-600">SOC 2 Type II certified</span>.
                Your data is stored and managed to the same standard required by enterprise and regulated industries.
              </p>
            </div>
          </div>
        </div>

        {/* Simpro integration callout */}
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 p-6">
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 flex items-center justify-center">
              <Wrench size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">Simpro Integration (Future)</h3>
                <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400">
                  Possible
                </span>
              </div>
              <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed max-w-2xl">
                ColdIQ is designed to connect to Simpro, the job management platform many refrigeration companies already use. A future integration would let maintenance reports created in ColdIQ flow directly into Simpro job cards — eliminating double entry — and pull asset data and scheduled work orders back into ColdIQ. This is a planned capability as the platform grows.
              </p>
            </div>
          </div>
        </div>

        {/* Feedback callout */}
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 p-6">
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <MessageSquareWarning size={20} />
            </div>
            <div className="flex-1">
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 mb-1">Got an idea or found a bug?</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed max-w-2xl mb-3">
                ColdIQ is actively evolving — if there&apos;s a feature that would make your day easier, or something isn&apos;t working right, let us know directly.
              </p>
              <button
                onClick={() => router.push('/feedback')}
                className="inline-flex items-center gap-2 bg-blue-600 text-white font-semibold px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors text-sm"
              >
                Send Feedback
                <ArrowRight size={14} />
              </button>
            </div>
          </div>
        </div>

        {/* CTA */}
        <div className="text-center py-8 border-t border-slate-200 dark:border-slate-700">
          <p className="text-slate-500 dark:text-slate-400 text-sm mb-4">Ready to start?</p>
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
              className="inline-flex items-center gap-2 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 font-semibold px-6 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 transition-colors text-sm"
            >
              Browse Knowledge Base
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
