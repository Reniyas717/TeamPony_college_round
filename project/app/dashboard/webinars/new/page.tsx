import * as React from "react";
import { requireWebinarOwner, WebinarTopBar } from "../owner-page";
import { WebinarForm } from "../webinar-form";

export default function NewWebinarPage() {
  return (
    <React.Suspense fallback={<p className="p-12 text-center text-sm text-muted-foreground">Loading webinar form...</p>}>
      <NewWebinarContent />
    </React.Suspense>
  );
}

async function NewWebinarContent() {
  await requireWebinarOwner();
  return (
    <div className="w-full bg-background text-foreground">
      <main className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        <WebinarForm mode="create" />
      </main>
    </div>
  );
}
