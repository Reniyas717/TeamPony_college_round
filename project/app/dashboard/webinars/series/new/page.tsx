import * as React from "react";
import { requireWebinarOwner, WebinarTopBar } from "../../owner-page";
import { NewSeriesForm } from "./series-form";

export default function NewSeriesPage() {
  return <React.Suspense fallback={<p className="p-12 text-center text-sm text-muted-foreground">Loading series form...</p>}><SeriesContent /></React.Suspense>;
}

async function SeriesContent() {
  const user = await requireWebinarOwner();
  return <div className="min-h-screen bg-background text-foreground"><WebinarTopBar username={user.username} /><main className="mx-auto max-w-3xl px-4 py-8 sm:px-6"><NewSeriesForm /></main></div>;
}
