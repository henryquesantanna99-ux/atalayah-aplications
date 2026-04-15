import { cn } from '@/lib/utils'

const TEAM_STYLES: Record<string, string> = {
  'Instrumental': 'bg-blue-900/50 text-blue-300 border-blue-700/40',
  'Vocal': 'bg-purple-900/50 text-purple-300 border-purple-700/40',
  'Som': 'bg-orange-900/50 text-orange-300 border-orange-700/40',
  'Mídia': 'bg-pink-900/50 text-pink-300 border-pink-700/40',
  'Adm': 'bg-yellow-900/50 text-yellow-300 border-yellow-700/40',
  'Liderança': 'bg-emerald-900/50 text-emerald-300 border-emerald-700/40',
}

interface TeamBadgeProps {
  team: string
  className?: string
}

export function TeamBadge({ team, className }: TeamBadgeProps) {
  const style = TEAM_STYLES[team] ?? 'bg-white/10 text-white/60 border-white/10'
  return (
    <span
      className={cn(
        'inline-flex items-center text-[10px] font-medium px-2 py-0.5 rounded-full border',
        style,
        className
      )}
    >
      {team}
    </span>
  )
}
