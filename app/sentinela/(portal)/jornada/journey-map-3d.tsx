'use client'

export default function JourneyMap3D({ milestones }: { milestones: string[] }) {
  return <section className="sentinela-card overflow-hidden rounded-3xl p-6" aria-label="Mapa tridimensional da jornada"><div className="grid min-h-96 place-items-center [perspective:900px]"><ol className="grid w-full max-w-3xl grid-cols-2 gap-8 [transform:rotateX(22deg)_rotateZ(-3deg)] sm:grid-cols-4">{milestones.map((name, index) => <li key={name} className="rounded-2xl border border-amber-300/30 bg-[#111b2b] p-5 shadow-2xl [transform:translateZ(20px)]"><span className="text-xs text-amber-300">{index + 1}</span><p className="mt-2">{name}</p></li>)}</ol></div><p className="text-xs text-slate-500">Representação 3D em CSS, carregada somente quando solicitada. O mapa HTML permanece como fallback.</p></section>
}
