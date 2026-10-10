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

export default function IntelligencePage() {
  return (
    <React.Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-background text-foreground">
          <p className="text-sm font-semibold text-muted-foreground animate-pulse">
            Loading Customer Journey Studio...
          </p>
        </div>
      }
    >
      <IntelligenceContent />
    </React.Suspense>
  );
}
