import * as React from "react";
import { connection } from "next/server";
import { redirect } from "next/navigation";
import { AuthService } from "@/services/auth.service";
import { JourneyMapService } from "@/services/journey-map.service";
import IntelligenceClient from "./intelligence-client";

async function IntelligenceContent() {
  await connection();
  const user = await AuthService.getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  const [journeyMaps, telemetry] = await Promise.all([
    JourneyMapService.getJourneyMaps(),
    JourneyMapService.getTelemetry(),
  ]);

  return (
    <IntelligenceClient
      initialJourneyMaps={journeyMaps}
      initialTelemetry={telemetry}
      user={user}
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
