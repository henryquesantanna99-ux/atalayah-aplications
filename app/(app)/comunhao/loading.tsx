export default function ComunhaoLoading() {
  return (
    <div className="p-6 max-w-3xl space-y-4 animate-pulse">
      {[1, 2, 3].map((i) => (
        <div key={i} className="h-40 rounded-modal bg-navy-900 border border-white/[0.04]" />
      ))}
    </div>
  )
}
