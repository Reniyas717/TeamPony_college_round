import * as React from "react";
import { requireWebinarOwner, WebinarTopBar } from "../../owner-page";
import EditWebinarClient from "./edit-webinar-client";

export default function EditWebinarPage({ params }: { params: Promise<{ sessionId: string }> }) {
  return <React.Suspense fallback={<p className="p-12 text-center text-sm text-muted-foreground">Loading webinar editor...</p>}><EditWebinarContent params={params} /></React.Suspense>;
}

async function EditWebinarContent({ params }: { params: Promise<{ sessionId: string }> }) {
  const [user, route] = await Promise.all([requireWebinarOwner(), params]);
  return <div className="min-h-screen bg-background text-foreground"><WebinarTopBar username={user.username} /><EditWebinarClient sessionId={route.sessionId} /></div>;
}
