export default function ChatLoading() {
  return (
    <div className="flex flex-col h-[calc(100vh-5rem)] p-4 space-y-3 animate-pulse">
      {[1, 2, 3, 4, 5].map((i) => (
        <div
          key={i}
          className={`h-12 rounded-xl bg-navy-900 ${i % 2 === 0 ? 'ml-auto w-2/3' : 'w-3/4'}`}
        />
      ))}
    </div>
  )
}
