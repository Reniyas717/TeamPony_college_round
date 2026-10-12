import * as React from "react";
import { connection } from "next/server";
import { redirect } from "next/navigation";
import { AuthService } from "@/services/auth.service";
import { MarketingService } from "@/services/marketing.service";
import MarketingClient from "./marketing-client";

import { PageHeaderSkeleton, MetricCardsSkeleton, TableSkeleton } from "@/components/ui/skeleton";

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
        <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6 w-full animate-in fade-in duration-200">
          <PageHeaderSkeleton hasAction={true} />
          <MetricCardsSkeleton count={5} />
          <TableSkeleton rows={5} columns={8} showHeader={true} />
        </div>
      }
    >
      <MarketingContent />
    </React.Suspense>
  );
}
