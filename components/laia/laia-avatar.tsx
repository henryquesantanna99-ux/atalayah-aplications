import { cn } from '@/lib/utils'

interface LaiaAvatarProps {
  size?: 'sm' | 'md' | 'lg'
  pulse?: boolean
  className?: string
}

const sizes = {
  sm: { outer: 'w-8 h-8', icon: 'w-4 h-4' },
  md: { outer: 'w-10 h-10', icon: 'w-5 h-5' },
  lg: { outer: 'w-20 h-20', icon: 'w-9 h-9' },
}

export function LaiaAvatar({
  size = 'md',
  pulse = true,
  className,
}: LaiaAvatarProps) {
  const { outer, icon } = sizes[size]

  return (
    <div className={cn('relative inline-flex', className)}>
      {pulse && (
        <div
          className={cn(
            'absolute inset-0 rounded-full bg-brand/30 animate-ping',
            outer
          )}
          aria-hidden="true"
        />
      )}
      <div
        className={cn(
          'relative rounded-full bg-gradient-to-br from-[#2563EB] to-[#0A1628]',
          'border border-brand/40 flex items-center justify-center',
          outer
        )}
      >
        {/* Star icon representing "Atalaya" (watchtower/sentinel) */}
        <svg
          viewBox="0 0 24 24"
          className={cn('text-white', icon)}
          fill="currentColor"
          aria-hidden="true"
        >
          <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" />
        </svg>
      </div>
    </div>
  )
}
