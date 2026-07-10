import { PageHeader } from '@/components/layout/page-header'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { createClient } from '@/lib/supabase/server'
import { salvarPerfilMinisterio } from './actions'

type MinistryProfile = {
  id?: string
  theological_vision?: string | null
  current_emphasis?: string | null
  current_season?: string | null
  musical_culture?: Record<string, string> | null
  pastoral_notes?: string | null
}

export default async function SeuMinisterioPage() {
  const supabase = await createClient()
  const { data: profile } = await supabase
    .from('ministry_profiles' as never)
    .select('*')
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  const ministry = profile as MinistryProfile | null
  const musicalCulture = ministry?.musical_culture ?? {}

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <PageHeader
        title="Seu Ministério"
        subtitle="Configure visão teológica, estação pastoral, cultura musical e nível técnico para orientar a análise de indicações e sugestões de repertório."
      />

      <form action={salvarPerfilMinisterio} className="mt-6 grid gap-6 xl:grid-cols-[1.2fr,0.8fr]">
        <input type="hidden" name="id" value={ministry?.id ?? ''} />
        <section className="space-y-5 rounded-2xl border border-white/[0.08] bg-navy-900 p-5">
          <h2 className="text-xl font-bold text-white">Discernimento pastoral</h2>
          <Field label="Visão teológica" name="theologicalVision" defaultValue={ministry?.theological_vision ?? ''} multiline />
          <Field label="Ênfase pastoral atual" name="currentEmphasis" defaultValue={ministry?.current_emphasis ?? ''} />
          <Field label="Estação atual da igreja" name="currentSeason" defaultValue={ministry?.current_season ?? ''} multiline />
          <Field label="Notas pastorais para a IA" name="pastoralNotes" defaultValue={ministry?.pastoral_notes ?? ''} multiline />
        </section>

        <section className="space-y-5 rounded-2xl border border-white/[0.08] bg-navy-900 p-5">
          <h2 className="text-xl font-bold text-white">Cultura musical</h2>
          <Field label="Estilos aceitos" name="estilosAceitos" defaultValue={musicalCulture.estilosAceitos ?? ''} />
          <Field label="Estilos evitados" name="estilosEvitados" defaultValue={musicalCulture.estilosEvitados ?? ''} />
          <Field label="Referências ministeriais" name="referencias" defaultValue={musicalCulture.referencias ?? ''} multiline />
          <Field label="Complexidade aceitável" name="complexidade" defaultValue={musicalCulture.complexidade ?? ''} />
          <div className="rounded-xl border border-brand/20 bg-brand/10 p-4 text-sm text-[#CBD5E1]">
            Próxima etapa: cadastrar nível técnico por integrante para que a análise musical classifique dificuldade vocal, harmônica, rítmica e congregacional.
          </div>
          <Button className="w-full bg-brand hover:bg-brand/90">Salvar perfil ministerial</Button>
        </section>
      </form>
    </div>
  )
}

function Field({ label, name, defaultValue, multiline = false }: { label: string; name: string; defaultValue: string; multiline?: boolean }) {
  return (
    <div>
      <Label htmlFor={name}>{label}</Label>
      {multiline ? (
        <Textarea id={name} name={name} defaultValue={defaultValue} className="mt-2 min-h-28 border-white/10 bg-black/20 text-white" />
      ) : (
        <Input id={name} name={name} defaultValue={defaultValue} className="mt-2 h-11 border-white/10 bg-black/20 text-white" />
      )}
    </div>
  )
}
