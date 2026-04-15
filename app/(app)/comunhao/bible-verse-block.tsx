'use client'

import { useState, useEffect } from 'react'
import { BookOpen } from 'lucide-react'

interface BibleVerseBlockProps {
  reference: string
}

export function BibleVerseBlock({ reference }: BibleVerseBlockProps) {
  const [verse, setVerse] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(false)

  useEffect(() => {
    if (!reference) return

    setLoading(true)
    setError(false)

    fetch(`https://bible-api.com/${encodeURIComponent(reference)}?translation=almeida`)
      .then((r) => r.json())
      .then((data) => {
        if (data.text) {
          setVerse(data.text.trim())
        } else {
          setError(true)
        }
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false))
  }, [reference])

  if (loading) {
    return (
      <div className="animate-pulse">
        <div className="h-3 bg-white/[0.06] rounded w-3/4 mb-2" />
        <div className="h-3 bg-white/[0.06] rounded w-1/2" />
      </div>
    )
  }

  if (error || !verse) {
    return null
  }

  return (
    <blockquote className="border-l-2 border-brand/40 pl-3 my-2">
      <p className="text-xs text-[#94A3B8] italic leading-relaxed line-clamp-3">
        &ldquo;{verse}&rdquo;
      </p>
      <cite className="flex items-center gap-1 mt-1 text-[10px] text-brand not-italic">
        <BookOpen className="w-3 h-3" aria-hidden="true" />
        {reference}
      </cite>
    </blockquote>
  )
}
