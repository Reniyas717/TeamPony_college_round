import * as React from "react";
import { requireWebinarOwner, WebinarTopBar } from "../../owner-page";
import { NewSeriesForm } from "./series-form";

export default function NewSeriesPage() {
  return <React.Suspense fallback={<p className="p-12 text-center text-sm text-muted-foreground">Loading series form...</p>}><SeriesContent /></React.Suspense>;
}

async function SeriesContent() {
  await requireWebinarOwner();
  return <div className="w-full bg-background text-foreground"><main className="mx-auto max-w-5xl px-4 py-8 sm:px-6"><NewSeriesForm /></main></div>;
}
