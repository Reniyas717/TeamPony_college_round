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
  const user = await requireWebinarOwner();
  return (
    <div className="flex h-[calc(100dvh-4rem)] flex-col overflow-hidden bg-background text-foreground">
      <div className="shrink-0">
        <WebinarTopBar username={user.username} />
      </div>
      <main className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
        <div className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
          <WebinarForm mode="create" />
        </div>
      </main>
    </div>
  );
}
