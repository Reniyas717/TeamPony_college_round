import * as React from "react";

export default function DashboardLoading() {
  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-6 animate-pulse">
      {/* Header Skeleton */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border/40">
        <div className="space-y-2">
          <div className="h-7 w-48 bg-muted/40 rounded-md" />
          <div className="h-4 w-72 bg-muted/20 rounded-md" />
        </div>
        <div className="h-8 w-28 bg-muted/30 rounded-lg" />
      </div>

      {/* KPI Cards Skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="h-28 rounded-xl bg-card border border-border/40 p-4 space-y-3"
          >
            <div className="h-3.5 w-24 bg-muted/30 rounded" />
            <div className="h-6 w-32 bg-muted/50 rounded" />
            <div className="h-3 w-20 bg-muted/20 rounded" />
          </div>
        ))}
      </div>

      {/* Main Content Grid Skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="h-72 rounded-xl bg-card border border-border/40 p-4 space-y-3">
          <div className="h-4 w-36 bg-muted/30 rounded" />
          <div className="h-56 bg-muted/15 rounded-lg" />
        </div>
        <div className="h-72 rounded-xl bg-card border border-border/40 p-4 space-y-3">
          <div className="h-4 w-36 bg-muted/30 rounded" />
          <div className="h-56 bg-muted/15 rounded-lg" />
        </div>
      </div>
    </div>
  );
}
