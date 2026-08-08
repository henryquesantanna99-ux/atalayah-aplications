import { ModuleHeader } from '../../_components/module-shell'
import { SentinelaAvatar } from '../../_components/sentinela-avatar'
import { squad } from '../../_lib/season'
export default function Page() { return <><ModuleHeader eyebrow="Comunidade" title="Squad Horizonte" description="Caminhe junto. Celebre avanços, compartilhe pedidos e sustente quem está ao seu lado."/><div className="grid gap-4 md:grid-cols-2">{squad.map((member) => <article key={member.name} className="sentinela-card flex items-center gap-4 rounded-2xl p-5"><SentinelaAvatar className="h-16 w-16" label={`Avatar de ${member.name}`}/><div><h2 className="font-medium">{member.name}</h2><p className="text-sm text-slate-500">{member.online ? 'Disponível agora' : 'Visto recentemente'}</p></div></article>)}</div></> }
