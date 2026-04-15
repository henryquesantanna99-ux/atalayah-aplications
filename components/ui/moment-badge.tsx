import { cn } from '@/lib/utils'

const MOMENT_STYLES: Record<string, string> = {
  'Prévia': 'bg-slate-700/60 text-slate-200 border-slate-600/50',
  'Adoração': 'bg-blue-900/60 text-blue-200 border-blue-700/50',
  'Palavra': 'bg-indigo-900/60 text-indigo-200 border-indigo-700/50',
  'Celebração': 'bg-emerald-900/60 text-emerald-200 border-emerald-700/50',
}

interface MomentBadgeProps {
  moment: string | null
  className?: string
}

export function MomentBadge({ moment, className }: MomentBadgeProps) {
  if (!moment) return null

  const style = MOMENT_STYLES[moment] ?? 'bg-white/10 text-white/60 border-white/10'

  return (
    <span
      className={cn(
        'inline-flex items-center text-[10px] font-medium px-2 py-0.5 rounded-full border',
        style,
        className
      )}
    >
      {moment}
    </span>
  )
}
