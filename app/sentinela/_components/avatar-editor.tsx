'use client'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { SentinelaAvatar } from './sentinela-avatar'
import { avatarManifest, defaultAvatar, type AvatarManifest, type AvatarSelection } from '../_lib/avatar-manifest'
import { saveAvatar } from '../actions'

export function AvatarEditor({ manifest = avatarManifest, value = defaultAvatar, onChange, persist = false }: { manifest?: AvatarManifest; value?: AvatarSelection; onChange?: (value: AvatarSelection) => void; persist?: boolean }) {
  const [selection, setSelection] = useState(value)
  const update = (key: keyof AvatarSelection, id: string) => { const next = { ...selection, [key]: id }; setSelection(next); onChange?.(next) }
  return <div className="grid gap-7 md:grid-cols-[220px_1fr]">
    <SentinelaAvatar selection={selection} manifest={manifest} className="mx-auto h-52 w-52" />
    <div className="space-y-5">{(Object.keys(manifest) as (keyof AvatarManifest)[]).map((key) => <fieldset key={key}>
      <Label asChild><legend className="mb-2 capitalize text-[var(--sentinela-muted)]">{key === 'garment' ? 'manto' : key === 'emblem' ? 'símbolo' : key === 'skin' ? 'pele' : 'cabelo'}</legend></Label>
      <div className="flex flex-wrap gap-2">{manifest[key].map((option) => <Button key={option.id} type="button" variant="outline" aria-pressed={selection[key] === option.id} onClick={() => update(key, option.id)} className="sentinela-focus border-white/10 bg-white/5 aria-pressed:border-amber-300 aria-pressed:bg-amber-300/10">{option.label}</Button>)}</div>
    </fieldset>)}{persist && <Button type="button" onClick={() => saveAvatar(selection)} className="bg-amber-300 text-slate-950">Salvar avatar</Button>}</div>
  </div>
}
