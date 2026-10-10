"use client";

import * as React from "react";
import { WebinarForm } from "../../webinar-form";
import { getWebinar, WebinarDetail } from "../../webinar-api";

export default function EditWebinarClient({ sessionId }: { sessionId: string }) {
  const [session, setSession] = React.useState<WebinarDetail | null>(null);
  const [error, setError] = React.useState("");
  React.useEffect(() => {
    void getWebinar(sessionId)
      .then(setSession)
      .catch((caught) => setError(caught instanceof Error ? caught.message : "Unable to load this webinar."));
  }, [sessionId]);
  if (error) return <main className="mx-auto max-w-5xl px-4 py-16 text-center text-sm text-status-danger-fg" role="alert">{error}</main>;
  if (!session) return <main className="mx-auto max-w-5xl px-4 py-16 text-center text-sm text-muted-foreground" role="status">Loading webinar...</main>;
  return <main className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6 lg:px-8"><WebinarForm mode="edit" initial={session} /></main>;
}
