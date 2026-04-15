export function DashboardSkeleton() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 max-w-5xl animate-pulse">
      {/* Laia message skeleton */}
      <div className="lg:col-span-2 h-20 rounded-modal bg-navy-800 border border-white/[0.04]" />
      {/* Event card skeleton */}
      <div className="h-48 rounded-modal bg-navy-900 border border-white/[0.04]" />
      {/* Members skeleton */}
      <div className="h-48 rounded-modal bg-navy-900 border border-white/[0.04]" />
      {/* Setlist skeleton */}
      <div className="lg:col-span-2 h-64 rounded-modal bg-navy-900 border border-white/[0.04]" />
    </div>
  )
}
