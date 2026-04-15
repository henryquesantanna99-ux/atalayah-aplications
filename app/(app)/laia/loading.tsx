export default function LaiaLoading() {
  return (
    <div className="flex flex-col h-screen animate-pulse">
      <div className="h-16 border-b border-white/[0.04] bg-navy-900" />
      <div className="flex-1 p-6 space-y-4">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className={`h-12 rounded-2xl bg-navy-900 ${i % 2 === 0 ? 'ml-auto w-2/3' : 'w-3/4'}`}
          />
        ))}
      </div>
      <div className="h-20 border-t border-white/[0.04] bg-navy-900" />
    </div>
  )
}
