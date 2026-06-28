export function PairSkeleton() {
  return (
    <div className="animate-pulse divide-y divide-slate-200">
      {[1, 2, 3].map((i) => (
        <div
          key={i}
          className="flex items-center justify-between px-4 py-3"
          aria-hidden="true"
        >
          <div className="h-4 bg-slate-200 rounded-md w-3/5" />
          <div className="w-10 h-10 bg-slate-200 rounded-full" />
        </div>
      ))}
    </div>
  );
}
