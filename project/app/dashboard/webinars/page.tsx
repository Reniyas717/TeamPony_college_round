import * as React from "react";
import { requireWebinarOwner } from "./owner-page";
import { WebinarList } from "./webinar-list";
import { getGoogleConnectionStatus } from "@/services/webinar/google-token-vault.service";

import { PageHeaderSkeleton, MetricCardsSkeleton, TableSkeleton } from "@/components/ui/skeleton";

export default function WebinarsPage() {
  return <React.Suspense fallback={<WebinarLoading />}><WebinarsContent /></React.Suspense>;
}

async function WebinarsContent() {
  const { businessId } = await requireWebinarOwner();
  const google = await getGoogleConnectionStatus(businessId);
  return <div className="min-h-screen bg-background text-foreground"><WebinarList google={{
    meetConnected: google.connected && google.scope_granted,
    gmailConnected: google.connected && google.gmail_scope_granted,
    senderEmail: google.sender_email,
  }} /></div>;
}

function WebinarLoading() {
  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6 w-full animate-in fade-in duration-200" role="status" aria-label="Loading webinars">
      <PageHeaderSkeleton hasAction={true} />
      <MetricCardsSkeleton count={4} />
      <TableSkeleton rows={4} columns={6} showHeader={true} />
    </div>
  );
}
