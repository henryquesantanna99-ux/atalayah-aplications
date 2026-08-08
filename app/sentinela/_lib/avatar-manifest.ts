export type AvatarOption = { id: string; label: string; value: string }
export type AvatarManifest = { skin: AvatarOption[]; hair: AvatarOption[]; garment: AvatarOption[]; emblem: AvatarOption[] }
export type AvatarSelection = { skin: string; hair: string; garment: string; emblem: string }

export const avatarManifest: AvatarManifest = {
  skin: [{ id: 'ambar', label: 'Âmbar', value: '#9a6548' }, { id: 'bronze', label: 'Bronze', value: '#6f422f' }, { id: 'luz', label: 'Luz', value: '#d49a72' }],
  hair: [{ id: 'noite', label: 'Noite', value: '#17151a' }, { id: 'terra', label: 'Terra', value: '#51372d' }, { id: 'neve', label: 'Neve', value: '#c4c2bd' }],
  garment: [{ id: 'azul', label: 'Azul profundo', value: '#244b78' }, { id: 'vinho', label: 'Vinho', value: '#713842' }, { id: 'verde', label: 'Verde mata', value: '#315b4a' }],
  emblem: [{ id: 'estrela', label: 'Estrela', value: '✦' }, { id: 'chama', label: 'Chama', value: '◆' }, { id: 'caminho', label: 'Caminho', value: '▲' }],
}
export const defaultAvatar: AvatarSelection = { skin: 'ambar', hair: 'noite', garment: 'azul', emblem: 'estrela' }
