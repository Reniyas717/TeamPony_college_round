import * as React from "react";
import { connection } from "next/server";
import { redirect } from "next/navigation";
import { AuthService } from "@/services/auth.service";
import { MarketingService } from "@/services/marketing.service";
import MarketingClient from "./marketing-client";

async function MarketingContent() {
  await connection();
  const user = await AuthService.getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  const [campaigns, overview, suppressed] = await Promise.all([
    MarketingService.listCampaigns(),
    MarketingService.getAnalyticsOverview(),
    MarketingService.listSuppressed("all"),
  ]);

  return (
    <MarketingClient
      initialCampaigns={campaigns}
      initialOverview={overview}
      initialSuppressed={suppressed}
    />
  );
}

export default function MarketingPage() {
  return (
    <React.Suspense
      fallback={
        <div className="p-8 max-w-7xl mx-auto space-y-6 animate-pulse">
          <div className="h-8 bg-muted/40 rounded-sm w-1/3 mb-2" />
          <div className="h-4 bg-muted/30 rounded-sm w-1/2 mb-6" />
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3.5 mb-6">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-20 bg-muted/30 rounded-sm" />
            ))}
          </div>
          <div className="h-64 bg-muted/20 rounded-sm" />
        </div>
      }
    >
      <MarketingContent />
    </React.Suspense>
  );
}
