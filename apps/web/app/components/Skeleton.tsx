export function Skeleton({ className = "" }: { className?: string }) {
  return (
    <div
      className={`animate-pulse rounded-[var(--radius-card)] bg-[var(--surface-2)] ${className}`}
      aria-hidden="true"
    />
  );
}

export function EventCardSkeleton({ variant = "grid" }: { variant?: "grid" | "rail" }) {
  return (
    <div className={variant === "rail" ? "w-56 shrink-0 sm:w-64" : ""}>
      <Skeleton className="aspect-[4/5] w-full" />
      <div className="space-y-2 p-3">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-3 w-1/2" />
        <Skeleton className="h-3 w-2/3" />
      </div>
    </div>
  );
}

export function RailSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="flex gap-4 overflow-hidden">
      {Array.from({ length: count }, (_, i) => (
        <EventCardSkeleton key={i} variant="rail" />
      ))}
    </div>
  );
}

export function ListingPageSkeleton() {
  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-6">
      <Skeleton className="h-8 w-48" />
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {Array.from({ length: 8 }, (_, i) => (
          <EventCardSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}
