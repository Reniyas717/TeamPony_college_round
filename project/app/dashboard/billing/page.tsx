import * as React from "react";
import { BillingClient } from "./billing-client";

export default function BillingPage() {
  return (
    <React.Suspense
      fallback={
        <div className="p-8 max-w-7xl mx-auto space-y-4">
          <div className="h-12 w-64 bg-muted/40 animate-pulse rounded-sm" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="h-48 bg-muted/30 animate-pulse rounded-sm" />
            <div className="h-48 bg-muted/30 animate-pulse rounded-sm" />
            <div className="h-48 bg-muted/30 animate-pulse rounded-sm" />
          </div>
        </div>
      }
    >
      <BillingClient />
    </React.Suspense>
  );
}
