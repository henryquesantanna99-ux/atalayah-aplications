'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

export async function salvarPerfilMinisterio(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  const id = String(formData.get('id') || '')
  const musicalCulture = {
    estilosAceitos: String(formData.get('estilosAceitos') || ''),
    estilosEvitados: String(formData.get('estilosEvitados') || ''),
    referencias: String(formData.get('referencias') || ''),
    complexidade: String(formData.get('complexidade') || ''),
  }

  const payload = {
    theological_vision: String(formData.get('theologicalVision') || ''),
    current_emphasis: String(formData.get('currentEmphasis') || ''),
    current_season: String(formData.get('currentSeason') || ''),
    musical_culture: musicalCulture,
    pastoral_notes: String(formData.get('pastoralNotes') || ''),
    created_by: user.id,
    updated_at: new Date().toISOString(),
  }

  if (id) {
    const { error } = await supabase.from('ministry_profiles' as never).update(payload as never).eq('id', id)
    if (error) throw new Error(error.message)
  } else {
    const { error } = await supabase.from('ministry_profiles' as never).insert(payload as never)
    if (error) throw new Error(error.message)
  }

  revalidatePath('/seu-ministerio')
}
