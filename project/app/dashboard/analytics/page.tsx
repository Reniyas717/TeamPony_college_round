import * as React from "react";
import { AnalyticsClient } from "./analytics-client";

export const metadata = {
  title: "Analytics & Intelligence | Nexus",
  description: "Live measured business metrics, linear regression modeling, and Remotion video briefing.",
};

export default function AnalyticsPage() {
  return (
    <React.Suspense
      fallback={
        <div className="p-8 max-w-7xl mx-auto space-y-6">
          <div className="space-y-2">
            <div className="h-8 w-64 bg-muted/40 animate-pulse rounded-md" />
            <div className="h-4 w-96 bg-muted/30 animate-pulse rounded-md" />
          </div>
          <div className="h-64 w-full bg-muted/20 animate-pulse rounded-2xl" />
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-28 bg-muted/30 animate-pulse rounded-xl" />
            ))}
          </div>
        </div>
      }
    >
      <AnalyticsClient />
    </React.Suspense>
  );
}
