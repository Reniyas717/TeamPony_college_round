import * as React from "react";
import { connection } from "next/server";
import { requireOwnerContext } from "@/lib/supabase/owner-context";
import { JourneyMapService } from "@/services/journey-map.service";
import IntelligenceClient from "./intelligence-client";

async function IntelligenceContent() {
  await connection();
  const context = await requireOwnerContext();

  const [journeyMaps, telemetry] = await Promise.all([
    JourneyMapService.getJourneyMaps(context),
    JourneyMapService.getTelemetry(context),
  ]);

  return (
    <IntelligenceClient
      initialJourneyMaps={journeyMaps}
      initialTelemetry={telemetry}
      user={{
        username: context.user.user_metadata?.full_name || context.user.email || "Owner",
        email: context.user.email,
      }}
    />
  );
}

import { PageHeaderSkeleton, MetricCardsSkeleton, Skeleton } from "@/components/ui/skeleton";

export default function IntelligencePage() {
  return (
    <React.Suspense
      fallback={
        <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6 w-full animate-in fade-in duration-200">
          <PageHeaderSkeleton hasAction={true} />
          <MetricCardsSkeleton count={4} />
          <div className="rounded-sm border border-border/60 bg-card p-6 space-y-4">
            <Skeleton className="h-5 w-44" />
            <Skeleton className="h-64 w-full rounded-sm" />
          </div>
        </div>
      }
    >
      <IntelligenceContent />
    </React.Suspense>
  );
}
