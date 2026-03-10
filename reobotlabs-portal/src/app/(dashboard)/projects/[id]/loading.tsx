import { Skeleton } from '@/components/ui/skeleton'

export default function ProjectLoading() {
  return (
    <div>
      {/* PageHeader */}
      <div className="flex items-center justify-between mb-4">
        <div className="space-y-1.5">
          <Skeleton className="h-3 w-40" />
          <Skeleton className="h-7 w-56" />
        </div>
        <Skeleton className="h-8 w-20" />
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-border mb-6">
        {[...Array(6)].map((_, i) => (
          <Skeleton key={i} className="h-9 w-20" />
        ))}
      </div>

      {/* Content */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="md:col-span-2 space-y-4">
          <div className="bg-card border border-border rounded-lg p-5 space-y-3">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-3/4" />
          </div>
          <div className="bg-card border border-border rounded-lg p-5 space-y-3">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-2/3" />
          </div>
        </div>
        <div className="space-y-4">
          <div className="bg-card border border-border rounded-lg p-5 space-y-3">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-2 w-full rounded-full" />
            <Skeleton className="h-3 w-12" />
          </div>
        </div>
      </div>
    </div>
  )
}
