import { avatarManifest, defaultAvatar, type AvatarManifest, type AvatarSelection } from '../_lib/avatar-manifest'
import { cn } from '@/lib/utils'

export function SentinelaAvatar({ selection = defaultAvatar, manifest = avatarManifest, className, label = 'Avatar do Sentinela' }: { selection?: AvatarSelection; manifest?: AvatarManifest; className?: string; label?: string }) {
  const get = (key: keyof AvatarManifest, id: string) => manifest[key].find((item) => item.id === id)?.value ?? manifest[key][0].value
  return <svg viewBox="0 0 160 160" role="img" aria-label={label} className={cn('rounded-full bg-[#0c1421]', className)}>
    <circle cx="80" cy="80" r="76" fill="#111d2d" stroke="rgba(230,184,92,.45)" strokeWidth="2" />
    <path d="M25 151c6-39 25-55 55-55s49 16 55 55" fill={get('garment', selection.garment)} />
    <circle cx="80" cy="69" r="36" fill={get('skin', selection.skin)} />
    <path d="M45 67c0-30 14-45 36-45 25 0 38 17 35 50-9-7-15-18-18-30-13 13-31 19-53 20" fill={get('hair', selection.hair)} />
    <circle cx="67" cy="70" r="2.5" fill="#111" /><circle cx="93" cy="70" r="2.5" fill="#111" />
    <path d="M69 83c7 6 15 6 22 0" fill="none" stroke="#58372d" strokeLinecap="round" strokeWidth="2" />
    <text x="80" y="130" textAnchor="middle" fill="#f7d98f" fontSize="22">{get('emblem', selection.emblem)}</text>
  </svg>
}
