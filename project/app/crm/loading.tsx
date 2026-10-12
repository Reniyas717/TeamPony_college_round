import * as React from "react";
import { PageHeaderSkeleton, MetricCardsSkeleton, TableSkeleton } from "@/components/ui/skeleton";

export default function CrmLoading() {
  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6 w-full animate-in fade-in duration-200">
      <PageHeaderSkeleton hasAction={true} />
      <MetricCardsSkeleton count={5} />
      <TableSkeleton rows={6} columns={7} showHeader={true} />
    </div>
  );
}
