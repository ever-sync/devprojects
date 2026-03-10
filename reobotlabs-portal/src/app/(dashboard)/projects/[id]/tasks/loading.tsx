import { Skeleton } from '@/components/ui/skeleton'

export default function TasksLoading() {
  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <Skeleton className="h-7 w-40" />
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-border mb-6">
        {[...Array(6)].map((_, i) => (
          <Skeleton key={i} className="h-9 w-20" />
        ))}
      </div>

      {/* Filter bar */}
      <div className="flex gap-2 mb-4">
        {[...Array(4)].map((_, i) => (
          <Skeleton key={i} className="h-6 w-16 rounded-full" />
        ))}
      </div>

      {/* Swimlane */}
      {[...Array(2)].map((_, swimlane) => (
        <div key={swimlane} className="mb-8">
          <Skeleton className="h-5 w-36 mb-3" />
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
            {[...Array(5)].map((_, col) => (
              <div key={col} className="bg-card border border-border rounded-lg p-3 space-y-2">
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-3 w-2/3" />
                <div className="flex gap-1 pt-1">
                  <Skeleton className="h-4 w-12 rounded" />
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
