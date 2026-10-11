import * as React from "react";
import { requireWebinarOwner, WebinarTopBar } from "../owner-page";
import { WebinarDetailView } from "../webinar-detail";

export default function WebinarDetailPage({ params }: { params: Promise<{ sessionId: string }> }) {
  return <React.Suspense fallback={<p className="p-12 text-center text-sm text-muted-foreground">Loading webinar...</p>}><WebinarDetailContent params={params} /></React.Suspense>;
}

async function WebinarDetailContent({ params }: { params: Promise<{ sessionId: string }> }) {
  const [, route] = await Promise.all([requireWebinarOwner(), params]);
  return <div className="w-full bg-background text-foreground"><WebinarDetailView sessionId={route.sessionId} /></div>;
}
