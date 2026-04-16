'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  LayoutDashboard,
  Music,
  Users,
  CalendarDays,
  BookOpen,
  MessageSquare,
  Sparkles,
  LogOut,
} from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { createClient } from '@/lib/supabase/client'
import { useProfile } from './profile-context'

const NAV_ITEMS = [
  { href: '/dashboard', icon: LayoutDashboard, label: 'Visão Geral' },
  { href: '/musicas', icon: Music, label: 'Músicas' },
  { href: '/time', icon: Users, label: 'Time' },
  { href: '/agenda', icon: CalendarDays, label: 'Agenda' },
  { href: '/comunhao', icon: BookOpen, label: 'Comunhão' },
  { href: '/chat', icon: MessageSquare, label: 'Chat do Grupo' },
  { href: '/laia', icon: Sparkles, label: 'Chat Laia' },
]

export function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const profile = useProfile()
  const supabase = createClient()

  async function handleSignOut() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  const initials = profile.full_name
    ? profile.full_name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()
    : '??'

  return (
    <aside className="hidden lg:flex flex-col w-[240px] min-h-screen bg-navy-900 border-r border-white/[0.06] fixed left-0 top-0 z-30">
      {/* Logo */}
      <div className="flex items-center gap-3 px-5 h-16 border-b border-white/[0.06]">
        <div className="w-8 h-8 rounded-full bg-brand/20 border border-brand/30 flex items-center justify-center">
          <svg viewBox="0 0 24 24" className="w-4 h-4 text-brand" fill="currentColor">
            <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" />
          </svg>
        </div>
        <span className="text-white font-bold text-base tracking-tight">AtalaYah</span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4" aria-label="Navegação principal">
        <ul className="space-y-0.5">
          {NAV_ITEMS.map(({ href, icon: Icon, label }) => {
            const active = pathname === href || pathname.startsWith(href + '/')
            return (
              <li key={href}>
                <Link
                  href={href}
                  aria-current={active ? 'page' : undefined}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-card text-sm font-medium transition-all duration-200 ${
                    active
                      ? 'bg-navy-700 text-white border-l-2 border-brand pl-[10px]'
                      : 'text-[#94A3B8] hover:bg-white/[0.04] hover:text-white'
                  }`}
                >
                  <Icon className="w-4 h-4 flex-shrink-0" aria-hidden="true" />
                  {label}
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>

      {/* User section */}
      <div className="px-3 pb-4 border-t border-white/[0.06] pt-4">
        <div className="flex items-center gap-3 px-2 mb-3">
          <Avatar className="w-8 h-8">
            <AvatarImage src={profile.avatar_url ?? undefined} alt={profile.full_name ?? 'Usuário'} />
            <AvatarFallback className="bg-navy-700 text-white text-xs font-bold">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white truncate">
              {profile.full_name ?? 'Usuário'}
            </p>
            <p className={`text-xs ${profile.role === 'admin' ? 'text-brand' : 'text-[#64748B]'}`}>
              {profile.role === 'admin' ? 'Administrador' : 'Integrante'}
            </p>
          </div>
        </div>
        <button
          onClick={handleSignOut}
          aria-label="Sair da conta"
          className="w-full flex items-center gap-3 px-3 py-2 rounded-card text-sm text-[#64748B] hover:text-[#94A3B8] hover:bg-white/[0.04] transition-all duration-200"
        >
          <LogOut className="w-4 h-4" aria-hidden="true" />
          Sair
        </button>
      </div>
    </aside>
  )
}
