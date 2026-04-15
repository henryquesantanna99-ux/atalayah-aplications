import Link from 'next/link'
import { LaiaAvatar } from '@/components/laia/laia-avatar'

interface LaiaDailyMessageProps {
  message: string | null
}

const DEFAULT_MESSAGE =
  'Olá! Estou aqui para ajudar o ministério. Pergunte-me sobre escalas, músicas, estudos bíblicos ou qualquer dúvida sobre o app.'

export function LaiaDailyMessage({ message }: LaiaDailyMessageProps) {
  return (
    <div className="bg-navy-800 border border-brand/20 rounded-modal p-5 flex items-start gap-4">
      <LaiaAvatar size="md" pulse />
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium text-brand mb-1">Laia — Assistente AtalaYah</p>
        <p className="text-sm text-[#94A3B8] leading-relaxed line-clamp-2">
          {message ?? DEFAULT_MESSAGE}
        </p>
      </div>
      <Link
        href="/laia"
        aria-label="Conversar com Laia"
        className="flex-shrink-0 text-xs text-brand border border-brand/30 rounded-full px-3 py-1.5 hover:bg-brand/10 transition-colors"
      >
        Conversar
      </Link>
    </div>
  )
}
