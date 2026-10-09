import React from "react";

export function Skeleton({ className = "" }: { className?: string }) {
  return (
    <div
      className={`animate-pulse rounded-md bg-slate-200/80 dark:bg-white/5 ${className}`}
    />
  );
}

export function SkeletonCard() {
  return (
    <div className="p-5 rounded-md border border-slate-200 dark:border-white/5 bg-white dark:bg-slate-900/50">
      <div className="flex justify-between items-start mb-3">
        <Skeleton className="h-6 w-6 rounded-md" />
        <Skeleton className="h-4 w-14 rounded-md" />
      </div>
      <Skeleton className="h-7 w-24 rounded-md mb-2.5" />
      <Skeleton className="h-3 w-20 rounded-md" />
    </div>
  );
}

export function SkeletonTable({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-3">
      <div className="flex gap-4 p-4">
        <Skeleton className="h-3 flex-1 rounded-md" />
        <Skeleton className="h-3 flex-1 rounded-md" />
        <Skeleton className="h-3 flex-1 rounded-md" />
        <Skeleton className="h-3 w-20 rounded-md" />
      </div>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex gap-4 p-4 border-t border-slate-100 dark:border-white/5">
          <Skeleton className="h-4 flex-1 rounded-md" />
          <Skeleton className="h-4 flex-1 rounded-md" />
          <Skeleton className="h-4 flex-1 rounded-md" />
          <Skeleton className="h-4 w-16 rounded-md" />
        </div>
      ))}
    </div>
  );
}

export function SkeletonChart() {
  return (
    <div className="p-5 rounded-md border border-slate-200 dark:border-white/5 bg-white dark:bg-slate-900/50">
      <div className="flex justify-between mb-6">
        <div>
          <Skeleton className="h-4 w-48 rounded-md mb-2" />
          <Skeleton className="h-3 w-32 rounded-md" />
        </div>
        <Skeleton className="h-8 w-24 rounded-md" />
      </div>
      <Skeleton className="h-48 w-full rounded-md" />
    </div>
  );
}

export function SkeletonKpiGrid({ count = 5 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
  );
}
