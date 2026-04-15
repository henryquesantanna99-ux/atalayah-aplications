'use client'

import Link from 'next/link'
import { LaiaAvatar } from './laia-avatar'

interface LaiaFloatingBadgeProps {
  tip?: string
}

export function LaiaFloatingBadge({ tip }: LaiaFloatingBadgeProps) {
  return (
    <Link
      href="/laia"
      aria-label="Conversar com Laia"
      className="fixed bottom-24 right-4 lg:bottom-6 lg:right-6 z-40 flex items-center gap-2 bg-navy-800 border border-brand/30 rounded-full px-3 py-2 shadow-lg shadow-brand/10 hover:border-brand/60 transition-all duration-200 max-w-[200px]"
    >
      <LaiaAvatar size="sm" pulse />
      {tip && (
        <span className="text-xs text-[#94A3B8] line-clamp-1 hidden sm:block">
          {tip}
        </span>
      )}
    </Link>
  )
}
