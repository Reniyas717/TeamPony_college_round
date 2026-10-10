"use client";

import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

type WebinarSession = {
  slug: string;
  title: string;
  description: string | null;
  scheduled_start: string | null;
  duration_minutes: number;
  timezone: string;
  capacity: number | null;
  remaining_capacity: number | null;
  registration_closes_at: string | null;
};

type RegistrationFormData = {
  kind: "session" | "series";
  slug: string;
  title: string;
  description: string | null;
  sessions: WebinarSession[];
};

type ApiResponse = {
  data?: RegistrationFormData & { notifications?: { status?: string } };
  error?: { message?: string };
};

function formatDate(value: string | null, timezone: string) {
  if (!value) return "Time to be announced";
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "full",
    timeStyle: "short",
    timeZone: timezone,
  }).format(new Date(value));
}

function unavailableReason(session: WebinarSession) {
  if (session.remaining_capacity !== null && session.remaining_capacity <= 0) return "This session is full.";
  const closesAt = session.registration_closes_at ?? session.scheduled_start;
  if (closesAt && Date.now() >= new Date(closesAt).getTime()) return "Registration is closed.";
  return null;
}

export function RegistrationForm({ slug }: { slug: string }) {
  const [formData, setFormData] = useState<RegistrationFormData | null>(null);
  const [selected, setSelected] = useState<string[]>([]);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [marketingOptIn, setMarketingOptIn] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [confirmationStatus, setConfirmationStatus] = useState("not_configured");

  useEffect(() => {
    let active = true;
    fetch(`/api/public/webinars/${encodeURIComponent(slug)}`)
      .then(async (response) => {
        const payload = (await response.json()) as ApiResponse;
        if (!response.ok || !payload.data) throw new Error(payload.error?.message ?? "Could not load this webinar.");
        if (active) {
          setFormData(payload.data);
          const firstSessionSlug = payload.data.sessions[0]?.slug;
          if (payload.data.kind === "session" && firstSessionSlug) setSelected([firstSessionSlug]);
        }
      })
      .catch((requestError: unknown) => {
        if (active) setError(requestError instanceof Error ? requestError.message : "Could not load this webinar.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, [slug]);

  const selectedSessions = useMemo(
    () => formData?.sessions.filter((session) => selected.includes(session.slug)) ?? [],
    [formData, selected]
  );

  function toggleSession(sessionSlug: string) {
    setSelected((current) => current.includes(sessionSlug)
      ? current.filter((item) => item !== sessionSlug)
      : [...current, sessionSlug]);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!formData || selected.length === 0) {
      setError("Choose at least one session.");
      return;
    }
    if (selectedSessions.some((session) => unavailableReason(session))) {
      setError("One or more selected sessions are no longer available. Update your selection.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const response = await fetch(`/api/public/webinars/${encodeURIComponent(slug)}/registrations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          email,
          selected_session_slugs: selected,
          marketing_opt_in: marketingOptIn,
        }),
      });
      const payload = (await response.json()) as ApiResponse;
      if (!response.ok) throw new Error(payload.error?.message ?? "Could not record your registration.");
      setConfirmationStatus(payload.data?.notifications?.status ?? "not_queued");
      setSuccess(true);
    } catch (requestError: unknown) {
      setError(requestError instanceof Error ? requestError.message : "Could not record your registration.");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return <p className="text-sm text-muted-foreground">Loading registration details…</p>;
  if (error && !formData) return <p role="alert" className="rounded-sm border border-status-danger-border bg-status-danger-bg p-4 text-sm text-status-danger-fg">{error}</p>;
  if (!formData) return null;
  if (success) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Registration recorded</CardTitle>
          <CardDescription>Your place for {formData.title} has been saved.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <p>
            {confirmationStatus === "queued"
              ? "A confirmation email has been queued for delivery."
              : "Your registration is saved, but a confirmation email could not be queued. Contact the organizer if you need the meeting details."}
          </p>
          {selectedSessions.map((session) => <p key={session.slug} className="text-foreground">{session.title} · {formatDate(session.scheduled_start, session.timezone)}</p>)}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{formData.kind === "series" ? "Choose your sessions" : "Reserve your place"}</CardTitle>
        <CardDescription>{formData.description ?? "Share your details to register for this webinar."}</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={submit} className="space-y-6">
          <div className="space-y-3">
            {formData.sessions.map((session) => {
              const checked = selected.includes(session.slug);
              const unavailable = unavailableReason(session);
              return (
                <label key={session.slug} className={`block rounded-sm border p-4 transition-colors ${checked ? "border-brand bg-brand-subtle" : "border-border bg-background"}`}>
                  <span className="flex items-start gap-3">
                    {formData.kind === "series" && <input type="checkbox" checked={checked} disabled={Boolean(unavailable)} onChange={() => toggleSession(session.slug)} className="mt-1 h-4 w-4 accent-brand" />}
                    <span className="min-w-0 space-y-1">
                      <span className="block font-semibold">{session.title}</span>
                      <span className="block text-sm text-muted-foreground">{formatDate(session.scheduled_start, session.timezone)} · {session.duration_minutes} minutes</span>
                      {session.remaining_capacity !== null && <span className="block text-xs text-muted-foreground">{session.remaining_capacity} places remaining</span>}
                      {unavailable && <span className="block text-xs font-semibold text-status-danger-fg">{unavailable}</span>}
                    </span>
                  </span>
                </label>
              );
            })}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="space-y-2 text-sm font-semibold" htmlFor="webinar-name">
              Full name
              <Input id="webinar-name" value={name} onChange={(event) => setName(event.target.value)} autoComplete="name" required />
            </label>
            <label className="space-y-2 text-sm font-semibold" htmlFor="webinar-email">
              Email address
              <Input id="webinar-email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" required />
            </label>
          </div>

          <label className="flex items-start gap-3 text-sm text-muted-foreground">
            <input type="checkbox" checked={marketingOptIn} onChange={(event) => setMarketingOptIn(event.target.checked)} className="mt-1 h-4 w-4 accent-brand" />
            <span>I would like to receive future marketing emails from this business.</span>
          </label>

          {error && <p role="alert" className="rounded-sm border border-status-danger-border bg-status-danger-bg p-3 text-sm text-status-danger-fg">{error}</p>}
          <Button type="submit" variant="brand" disabled={submitting || selected.length === 0 || selectedSessions.some((session) => unavailableReason(session))}>
            {submitting ? "Saving registration…" : "Register for webinar"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
