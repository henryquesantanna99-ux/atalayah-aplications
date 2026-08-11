'use client'

import dynamic from 'next/dynamic'

const JourneyMap3D = dynamic(() => import('./journey-map-3d'), { ssr: false, loading: () => <p className="p-6 text-sm text-slate-400">Carregando mapa 3D opcional…</p> })
export function JourneyMapLoader(props: { milestones: string[] }) { return <JourneyMap3D {...props}/> }
