import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { PageHeader } from '@/components/layout/page-header'

interface Props {
  params: { versionId: string }
}

const STAGE_LABELS: Record<string, string> = {
  uploaded: 'Enviado',
  identifying: 'Identificando a música',
  needs_manual_lyrics: 'Aguardando a letra',
  processing: 'Analisando a música',
  ready: 'Pronto',
  failed: 'Erro no processamento',
}

export default async function SongStudyVersionPage({ params }: Props) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) notFound()

  const { data: version } = await supabase
    .from('song_audio_versions')
    .select('id, status, error_message, song_id, songs(title, artist)')
    .eq('id', params.versionId)
    .single()

  if (!version) notFound()

  const { data: session } = await supabase
    .from('song_study_sessions')
    .select('id, level, instrument, stage')
    .eq('version_id', params.versionId)
    .eq('user_id', user.id)
    .maybeSingle()

  const song = version.songs as { title: string | null; artist: string | null } | null

  return (
    <main className="mx-auto max-w-2xl space-y-6 p-6">
      <Link href="/estudo/musica" className="inline-flex items-center gap-1.5 text-sm text-[#94A3B8] hover:text-white transition-colors">
        <ChevronLeft className="h-4 w-4" /> Voltar
      </Link>

      <PageHeader
        title={song?.title ?? 'Sua música'}
        subtitle={song?.artist ?? 'Estudo guiado'}
      />

      <div className="rounded-modal border border-white/[0.08] bg-navy-900 p-6 space-y-3">
        <p className="text-sm text-[#94A3B8]">Status do processamento</p>
        <p className="text-lg font-semibold text-white">{STAGE_LABELS[version.status] ?? version.status}</p>
        {version.error_message && <p className="text-sm text-red-400">{version.error_message}</p>}
        {session && (
          <p className="text-xs text-[#64748B]">
            Nível: {session.level} · Instrumento: {session.instrument}
          </p>
        )}
        <p className="text-xs text-[#64748B]">
          A identificação da música, a análise de acordes/estrutura e o estudo guiado (Registrar/Estruturar/Guardar)
          entram nas próximas fases desta implementação.
        </p>
      </div>
    </main>
  )
}
