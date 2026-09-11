import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { PageHeader } from '@/components/layout/page-header'
import { StudyWizard } from './study-wizard'

export default async function EstudoMusicaEspecificaPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: teamMember } = await supabase
    .from('team_members')
    .select('instruments')
    .eq('profile_id', user.id)
    .maybeSingle()

  const defaultInstrument = teamMember?.instruments?.[0] ?? null

  return (
    <>
      <PageHeader
        title="Uma música específica"
        subtitle="Envie o áudio e comece um estudo guiado por Registrar, Estruturar e Guardar"
      />
      <StudyWizard defaultInstrument={defaultInstrument} />
    </>
  )
}
