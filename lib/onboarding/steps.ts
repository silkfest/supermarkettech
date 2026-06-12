import type { LucideIcon } from 'lucide-react'
import { MessageSquare, WrenchIcon, Layers, Building, UserCircle, Building2, Database, BookOpen, Users } from 'lucide-react'

export interface OnboardingStep {
  icon: LucideIcon
  title: string
  description: string
  /** Only shown to admins — mirrors the admin-only nav items in the sidebar */
  adminOnly?: boolean
}

export const ONBOARDING_STEPS: OnboardingStep[] = [
  {
    icon: MessageSquare,
    title: 'Welcome to ColdIQ',
    description: 'Your AI-powered assistant for supermarket refrigeration and HVAC. Here’s a quick look at where to find things.',
  },
  {
    icon: MessageSquare,
    title: 'ColdIQ Expert',
    description: 'Ask questions about faults, procedures, or specs and get answers grounded in your equipment and manuals. Attach photos of nameplates or wiring for extra context.',
  },
  {
    icon: WrenchIcon,
    title: 'Maintenance',
    description: 'Log PM checklists and individual service reports, and review the maintenance history for any unit.',
  },
  {
    icon: Layers,
    title: 'Learning',
    description: 'Browse the Knowledge Base, practice on the Rack Simulator, and track Training — all from one tab bar.',
  },
  {
    icon: Building,
    title: 'Company Hub',
    description: 'Find company policies & procedures and the contact directory for your team and sites.',
  },
  {
    icon: UserCircle,
    title: 'My Profile',
    description: 'Track certifications, apprenticeship progress, and feedback from your managers.',
  },
  {
    icon: Building2,
    title: 'Sites',
    description: 'View every store, its equipment, and trending issues across your sites.',
    adminOnly: true,
  },
  {
    icon: Database,
    title: 'Components',
    description: 'Browse the full equipment & components catalog, linked to manufacturer manuals.',
    adminOnly: true,
  },
  {
    icon: BookOpen,
    title: 'Manual Library',
    description: 'Upload and manage manufacturer manuals — these ground ColdIQ Expert’s answers.',
    adminOnly: true,
  },
  {
    icon: Users,
    title: 'Manage Users',
    description: 'Approve new sign-ups and manage roles for your team.',
    adminOnly: true,
  },
]
