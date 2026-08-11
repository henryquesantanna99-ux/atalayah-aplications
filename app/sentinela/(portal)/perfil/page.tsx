import { ModuleHeader } from '../../_components/module-shell'
import { AvatarEditor } from '../../_components/avatar-editor'
import { defaultAvatar, type AvatarSelection } from '../../_lib/avatar-manifest'
import { getSentinelaContext } from '../../_lib/data'
export default async function Page() { const { supabase, membership } = await getSentinelaContext(); const { data } = await supabase.from('sentinela_avatars').select('configuration').eq('membership_id', membership.id).maybeSingle(); const saved = data?.configuration && typeof data.configuration === 'object' && !Array.isArray(data.configuration) ? data.configuration : {}; const value = { ...defaultAvatar, ...saved } as AvatarSelection; return <><ModuleHeader eyebrow="Identidade da temporada" title="Seu Perfil" description="Personalize e salve como você aparece nesta jornada."/><section className="sentinela-card rounded-3xl p-6"><AvatarEditor value={value} persist/></section></> }
