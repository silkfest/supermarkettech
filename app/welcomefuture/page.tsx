'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  MessageSquare, Bell, ClipboardList, BookOpen, FileText, Cpu,
  History, Building2, Wrench, GraduationCap, Users, ShieldCheck,
  BarChart3, ArrowRight, Thermometer, Zap, CheckCircle2,
  ChevronRight, HardHat, Briefcase, Star,
} from 'lucide-react'

type Role = 'technician' | 'manager'

interface Feature {
  icon: React.ReactNode
  title: string
  description: string
  href?: string
  badge?: string
}

const TECHNICIAN_FEATURES: Feature[] = [
  {
    icon: <MessageSquare size={20} />,
    title: 'AI Expert Chat',
    description: 'Ask anything about a fault, alarm code, or system behaviour. The AI knows every manufacturer in your fleet — Copeland, Hussmann, Danfoss, Bitzer, and more. Get ranked causes, confirmation tests, and fix steps instantly.',
    href: '/dashboard',
    badge: 'Most used',
  },
  {
    icon: <Bell size={20} />,
    title: 'Live Equipment Alarms',
    description: 'Real-time ALARM and WARNING alerts streamed directly to your dashboard. See which unit is faulting, what sensor triggered it, and current readings — before you even walk the floor.',
    href: '/dashboard',
  },
  {
    icon: <ClipboardList size={20} />,
    title: 'Maintenance Reports',
    description: 'Document every service call digitally in minutes. Record findings, parts used, labour time, and photos. Reports are stored permanently and searchable by equipment, date, or fault type.',
    href: '/maintenance',
  },
  {
    icon: <BookOpen size={20} />,
    title: 'Knowledge Base',
    description: '22 in-depth technical topics — valve theory, refrigerant retrofit guides, VFD fault codes, CO₂ transcritical systems, defrost wiring, walk-in troubleshooting — all searchable and linked to manufacturer manuals.',
    href: '/knowledge',
  },
  {
    icon: <FileText size={20} />,
    title: 'Manual Library',
    description: "Upload manufacturer PDFs and the system processes them automatically. The AI reads your manuals and cites them directly in chat answers. Your fleet's exact documentation, always at hand.",
    href: '/library',
  },
  {
    icon: <Cpu size={20} />,
    title: 'Rack Simulator',
    description: 'Practice diagnosing faults on a simulated rack system without touching live equipment. Build fault-finding skills and run through scenarios before going on-site.',
    href: '/simulation',
    badge: 'Training',
  },
  {
    icon: <History size={20} />,
    title: 'Chat History',
    description: 'Every AI conversation is saved. Look back at how a fault was diagnosed last time, share a thread with a colleague, or review a difficult job for training purposes.',
    href: '/chat-history',
  },
  {
    icon: <Thermometer size={20} />,
    title: 'Equipment Status',
    description: 'See the live state of every unit — temperature, pressure, run status, and recent alarms — all in one view. Select a unit before chatting and the AI receives its current readings automatically.',
    href: '/dashboard',
  },
]

const MANAGER_FEATURES: Feature[] = [
  {
    icon: <Building2 size={20} />,
    title: 'Multi-Site Management',
    description: 'Manage all your store locations from a single account. Each site has its own equipment registry, alarm feed, and maintenance history. Roll up across all sites or drill into a single store.',
    href: '/stores',
    badge: 'Operations',
  },
  {
    icon: <BarChart3 size={20} />,
    title: 'Equipment Registry',
    description: 'Every piece of refrigeration and HVAC equipment tracked in one place. Model, serial number, refrigerant type, installation date, service history — a complete asset register for every site.',
    href: '/maintenance/components',
  },
  {
    icon: <Wrench size={20} />,
    title: 'Preventive Maintenance',
    description: 'Structured PM checklists for refrigeration and HVAC. Technicians complete them on their phone, sign off digitally, and the completed reports are stored automatically. Never miss a scheduled PM.',
    href: '/maintenance',
  },
  {
    icon: <ClipboardList size={20} />,
    title: 'Reports & Audit Trail',
    description: 'Every service call, PM, and inspection generates a permanent digital record. Filter by site, equipment, technician, or date range. Export for warranty claims, insurance, or compliance audits.',
    href: '/maintenance',
  },
  {
    icon: <GraduationCap size={20} />,
    title: 'Apprentice Training',
    description: 'Assign structured training modules to new technicians. Track completion, quiz scores, and progress in real time. Apprentices work through refrigeration fundamentals, electrical, and system-specific courses.',
    href: '/admin/apprentices',
    badge: 'New',
  },
  {
    icon: <Users size={20} />,
    title: 'Team Management',
    description: 'Add technicians, assign roles (journeyman, apprentice, manager), approve new accounts, and deactivate leavers. Control who can access which sites and which features.',
    href: '/admin/users',
  },
  {
    icon: <ShieldCheck size={20} />,
    title: 'Policies & Procedures',
    description: "Store your company's operational procedures, safety protocols, and compliance documents in one place. Technicians can access them in the field; managers can update them instantly.",
    href: '/policies',
  },
  {
    icon: <FileText size={20} />,
    title: 'Manual Library',
    description: 'Centrally manage all manufacturer documentation. Upload PDFs and they become searchable by every technician across every site. The AI references your manuals when answering questions.',
    href: '/library',
  },
]

const HIGHLIGHTS = [
  { icon: <Zap size={16} />, text: 'Answers in seconds, not phone calls' },
  { icon: <CheckCircle2 size={16} />, text: 'Every job documented automatically' },
  { icon: <Star size={16} />, text: 'Built specifically for supermarket refrigeration' },
]

function FeatureCard({ feature }: { feature: Feature }) {
  const router = useRouter()
  return (
    <div
      onClick={() => feature.href && router.push(feature.href)}
      className={`bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 p-5 hover:shadow-md hover:border-blue-200 dark:hover:border-blue-700 transition-all group ${feature.href ? 'cursor-pointer' : ''}`}
    >
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 w-9 h-9 rounded-lg bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 flex items-center justify-center group-hover:bg-blue-100 dark:group-hover:bg-blue-900/50 transition-colors">
          {feature.icon}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-semibold text-slate-900 dark:text-slate-100 text-sm">{feature.title}</h3>
            {feature.badge && (
              <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-400">
                {feature.badge}
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">{feature.description}</p>
        </div>
        {feature.href && (
          <ChevronRight size={14} className="flex-shrink-0 text-slate-300 dark:text-slate-600 group-hover:text-blue-400 mt-0.5 transition-colors" />
        )}
      </div>
    </div>
  )
}

export default function WelcomePage() {
  const router = useRouter()
  const [activeRole, setActiveRole] = useState<Role>('technician')

  const features = activeRole === 'technician' ? TECHNICIAN_FEATURES : MANAGER_FEATURES

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">

      {/* Hero */}
      <div className="bg-gradient-to-br from-blue-700 via-blue-600 to-indigo-700 text-white">
        <div className="max-w-5xl mx-auto px-6 py-14 md:py-20">
          <div className="flex items-center gap-2 mb-6">
            <Thermometer size={20} className="opacity-80" />
            <span className="text-sm font-medium opacity-80 tracking-wide uppercase">ColdIQ</span>
          </div>
          <h1 className="text-3xl md:text-5xl font-bold leading-tight mb-4">
            Your AI-powered refrigeration<br className="hidden md:block" /> expert system
          </h1>
          <p className="text-blue-100 text-base md:text-lg max-w-2xl leading-relaxed mb-8">
            ColdIQ gives your team instant access to expert troubleshooting, live equipment monitoring, digital maintenance records, and structured training — built specifically for supermarket refrigeration.
          </p>

          {/* Highlights */}
          <div className="flex flex-wrap gap-3 mb-10">
            {HIGHLIGHTS.map((h, i) => (
              <div key={i} className="flex items-center gap-1.5 bg-white/10 backdrop-blur-sm rounded-full px-3 py-1.5 text-sm text-white">
                <span className="opacity-80">{h.icon}</span>
                {h.text}
              </div>
            ))}
          </div>

          <button
            onClick={() => router.push('/dashboard')}
            className="inline-flex items-center gap-2 bg-white text-blue-700 font-semibold px-6 py-3 rounded-lg hover:bg-blue-50 transition-colors shadow-sm"
          >
            Go to Dashboard
            <ArrowRight size={16} />
          </button>
        </div>
      </div>

      {/* Role toggle */}
      <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-6">
          <div className="flex gap-0">
            <button
              onClick={() => setActiveRole('technician')}
              className={`flex items-center gap-2 px-6 py-4 text-sm font-semibold border-b-2 transition-colors ${
                activeRole === 'technician'
                  ? 'border-blue-600 text-blue-700'
                  : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              <HardHat size={16} />
              For Technicians
            </button>
            <button
              onClick={() => setActiveRole('manager')}
              className={`flex items-center gap-2 px-6 py-4 text-sm font-semibold border-b-2 transition-colors ${
                activeRole === 'manager'
                  ? 'border-blue-600 text-blue-700'
                  : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              <Briefcase size={16} />
              For Managers
            </button>
          </div>
        </div>
      </div>

      {/* Feature content */}
      <div className="max-w-5xl mx-auto px-6 py-8 md:py-12">

        {activeRole === 'technician' ? (
          <div className="mb-8">
            <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-1">Tools that keep you moving on the floor</h2>
            <p className="text-slate-500 dark:text-slate-400 text-sm">Every tool a refrigeration technician needs — from the first alarm to the signed-off report.</p>
          </div>
        ) : (
          <div className="mb-8">
            <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-1">Full visibility across your team and equipment</h2>
            <p className="text-slate-500 dark:text-slate-400 text-sm">Oversight tools for managers who need to know what&apos;s happening across every site, every shift.</p>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {features.map((feature, i) => (
            <FeatureCard key={i} feature={feature} />
          ))}
        </div>

        {/* How it works section */}
        {activeRole === 'technician' && (
          <div className="mt-12 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 p-6 md:p-8">
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 mb-6">How a typical service call works</h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {[
                { step: '01', title: 'Alarm fires', body: 'You see the alert in ColdIQ with the unit name, sensor, and current reading.' },
                { step: '02', title: 'Select the unit', body: 'Tap the equipment — the AI receives live readings and equipment history automatically.' },
                { step: '03', title: 'Ask the AI', body: 'Describe what you see. Get ranked likely causes, tests to confirm, and fix steps — citing your manuals.' },
                { step: '04', title: 'File the report', body: 'Log findings, parts used, and time. Report is stored permanently under that unit.' },
              ].map(({ step, title, body }) => (
                <div key={step} className="relative">
                  <div className="text-3xl font-bold text-slate-100 dark:text-slate-700 mb-2 leading-none">{step}</div>
                  <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-200 mb-1">{title}</h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">{body}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeRole === 'manager' && (
          <div className="mt-12 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 p-6 md:p-8">
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 mb-6">What managers see at a glance</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[
                {
                  title: 'Equipment health',
                  body: "Every unit's current status across all sites. Active alarms bubble to the top. Filter by store, equipment type, or alarm severity.",
                },
                {
                  title: 'Team activity',
                  body: 'See which technicians are active, what reports have been filed today, and which PMs are overdue — without making a single phone call.',
                },
                {
                  title: 'Training progress',
                  body: "Track each apprentice's module completions and quiz scores. Know who is ready to work independently and who needs more time.",
                },
              ].map(({ title, body }) => (
                <div key={title}>
                  <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-200 mb-2">{title}</h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">{body}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* CTA */}
        <div className="mt-10 text-center py-10 border-t border-slate-200 dark:border-slate-700">
          <p className="text-slate-500 dark:text-slate-400 text-sm mb-4">Ready to explore ColdIQ?</p>
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
              className="inline-flex items-center gap-2 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-semibold px-6 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-500 transition-colors text-sm"
            >
              Browse Knowledge Base
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
