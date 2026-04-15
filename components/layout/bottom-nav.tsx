'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  Music,
  CalendarDays,
  MessageSquare,
  Sparkles,
  Users,
  BookOpen,
} from 'lucide-react'

const NAV_ITEMS = [
  { href: '/dashboard', icon: LayoutDashboard, label: 'Geral' },
  { href: '/musicas', icon: Music, label: 'Músicas' },
  { href: '/agenda', icon: CalendarDays, label: 'Agenda' },
  { href: '/chat', icon: MessageSquare, label: 'Chat' },
  { href: '/laia', icon: Sparkles, label: 'Laia' },
  { href: '/time', icon: Users, label: 'Time' },
  { href: '/comunhao', icon: BookOpen, label: 'Comunhão' },
]

export function BottomNav() {
  const pathname = usePathname()

  return (
    <nav
      aria-label="Navegação mobile"
      className="lg:hidden fixed bottom-0 left-0 right-0 z-30 bg-navy-900/95 backdrop-blur-lg border-t border-white/[0.06]"
    >
      <ul className="flex items-center justify-around h-16 px-2 overflow-x-auto">
        {NAV_ITEMS.map(({ href, icon: Icon, label }) => {
          const active = pathname === href || pathname.startsWith(href + '/')
          return (
            <li key={href} className="flex-shrink-0">
              <Link
                href={href}
                aria-current={active ? 'page' : undefined}
                className={`flex flex-col items-center gap-1 px-2 py-1 rounded-card transition-all duration-200 min-w-[48px] ${
                  active ? 'text-brand' : 'text-[#64748B]'
                }`}
              >
                <Icon className="w-5 h-5" aria-hidden="true" />
                <span className="text-[10px] font-medium">{label}</span>
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
