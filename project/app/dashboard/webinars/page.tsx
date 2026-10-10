import * as React from "react";
import { requireWebinarOwner, WebinarTopBar } from "./owner-page";
import { WebinarList } from "./webinar-list";
import { getGoogleConnectionStatus } from "@/services/webinar/google-token-vault.service";

export default function WebinarsPage() {
  return <React.Suspense fallback={<WebinarLoading />}><WebinarsContent /></React.Suspense>;
}

async function WebinarsContent() {
  const user = await requireWebinarOwner();
  const google = await getGoogleConnectionStatus(user.businessId);
  return <div className="min-h-screen bg-background text-foreground"><WebinarTopBar username={user.username} /><WebinarList googleConnected={google.connected && google.scope_granted} /></div>;
}

function WebinarLoading() {
  return <main className="min-h-screen bg-background px-4 py-16 text-center text-sm text-muted-foreground" role="status">Loading webinar workspace...</main>;
}
