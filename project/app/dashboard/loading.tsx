import * as React from "react";
import { PageHeaderSkeleton, MetricCardsSkeleton, TableSkeleton } from "@/components/ui/skeleton";

export default function DashboardLoading() {
  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6 w-full animate-in fade-in duration-200">
      <PageHeaderSkeleton hasAction={true} />
      <MetricCardsSkeleton count={4} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <TableSkeleton rows={4} columns={4} showHeader={true} />
        </div>
        <div className="space-y-4">
          <TableSkeleton rows={3} columns={3} showHeader={true} />
        </div>
      </div>
    </div>
  );
}
