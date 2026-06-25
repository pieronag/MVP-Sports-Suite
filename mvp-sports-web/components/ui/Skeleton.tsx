import React from "react";

export function Skeleton({ className = "" }: { className?: string }) {
  return (
    <div
      className={`animate-pulse rounded-lg bg-slate-200 dark:bg-white/5 ${className}`}
    />
  );
}

export function SkeletonCard() {
  return (
    <div className="p-4 rounded-xl border border-slate-200 dark:border-white/5 bg-white dark:bg-[#0B0F19]">
      <div className="flex justify-between items-start mb-3">
        <Skeleton className="h-8 w-8 rounded-lg" />
        <Skeleton className="h-4 w-16 rounded" />
      </div>
      <Skeleton className="h-6 w-24 rounded mb-2" />
      <Skeleton className="h-3 w-20 rounded" />
    </div>
  );
}

export function SkeletonTable({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-3">
      <div className="flex gap-4 p-4">
        <Skeleton className="h-3 flex-1 rounded" />
        <Skeleton className="h-3 flex-1 rounded" />
        <Skeleton className="h-3 flex-1 rounded" />
        <Skeleton className="h-3 w-20 rounded" />
      </div>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex gap-4 p-4 border-t border-slate-100 dark:border-white/5">
          <Skeleton className="h-4 flex-1 rounded" />
          <Skeleton className="h-4 flex-1 rounded" />
          <Skeleton className="h-4 flex-1 rounded" />
          <Skeleton className="h-4 w-16 rounded" />
        </div>
      ))}
    </div>
  );
}

export function SkeletonChart() {
  return (
    <div className="p-6 rounded-xl border border-slate-200 dark:border-white/5 bg-white dark:bg-[#0B0F19]">
      <div className="flex justify-between mb-6">
        <div>
          <Skeleton className="h-4 w-48 rounded mb-2" />
          <Skeleton className="h-3 w-32 rounded" />
        </div>
        <Skeleton className="h-8 w-24 rounded" />
      </div>
      <Skeleton className="h-48 w-full rounded-lg" />
    </div>
  );
}

export function SkeletonKpiGrid({ count = 5 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
  );
}
