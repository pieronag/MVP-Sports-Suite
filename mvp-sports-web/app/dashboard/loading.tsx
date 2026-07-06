import { SkeletonKpiGrid, SkeletonChart, SkeletonTable } from "@/components/ui/Skeleton";

export default function DashboardLoading() {
  return (
    <div className="w-full space-y-5 p-6 animate-pulse">
      <div className="flex items-center gap-2 mb-2">
        <div className="w-6 h-[2px] bg-emerald-500/50 rounded-full" />
        <div className="h-3 w-48 bg-slate-200 dark:bg-white/5 rounded" />
      </div>
      <div className="h-8 w-64 bg-slate-200 dark:bg-white/5 rounded mb-6" />

      <SkeletonKpiGrid />
      <SkeletonChart />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div className="h-[300px] bg-white dark:bg-[#0B0F19] rounded-[14px] border border-slate-200 dark:border-white/5 p-6">
          <SkeletonTable rows={4} />
        </div>
        <div className="h-[300px] bg-white dark:bg-[#0B0F19] rounded-[14px] border border-slate-200 dark:border-white/5 p-6">
          <SkeletonTable rows={4} />
        </div>
      </div>
    </div>
  );
}
