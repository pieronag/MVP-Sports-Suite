import { Skeleton, SkeletonKpiGrid, SkeletonChart, SkeletonTable } from "@/components/ui/Skeleton";

export default function DashboardLoading() {
  return (
    <div className="w-full space-y-6 pb-10 text-left animate-pulse">
      {/* Cabecera */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-100 dark:border-white/5 pb-6">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <div className="w-6 h-[2px] bg-emerald-500/50 rounded-md" />
            <Skeleton className="h-3 w-48 rounded-md" />
          </div>
          <Skeleton className="h-7 w-56 rounded-md" />
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="h-10 w-32 rounded-md" />
          <Skeleton className="h-10 w-40 rounded-md" />
          <Skeleton className="h-10 w-10 rounded-md" />
        </div>
      </div>

      <SkeletonKpiGrid />
      <SkeletonChart />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div className="h-[320px] bg-white dark:bg-slate-900/50 rounded-md border border-slate-200 dark:border-white/5 p-6">
          <SkeletonTable rows={4} />
        </div>
        <div className="h-[320px] bg-white dark:bg-slate-900/50 rounded-md border border-slate-200 dark:border-white/5 p-6">
          <SkeletonTable rows={4} />
        </div>
      </div>
    </div>
  );
}
