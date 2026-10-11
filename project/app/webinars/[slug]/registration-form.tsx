"use client";

import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Calendar,
  Clock,
  Global,
  People,
  TickCircle,
  VideoPlay,
} from "iconsax-react";

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
  data?: RegistrationFormData & { notifications?: { status?: string; deliveryStatus?: string } };
  error?: { message?: string };
};

function formatEventTime(value: string | null, timezone: string, userTimezone?: string): { host: string; user: string } {
  if (!value) return { host: "Time to be announced", user: "Time to be announced" };
  const date = new Date(value);
  if (isNaN(date.getTime())) return { host: "Time to be announced", user: "Time to be announced" };

  try {
    const hostFormatted = new Intl.DateTimeFormat("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
      timeZone: timezone || "UTC",
      timeZoneName: "short",
    }).format(date);

    if (userTimezone && userTimezone !== timezone) {
      const userFormatted = new Intl.DateTimeFormat("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
        timeZone: userTimezone,
        timeZoneName: "short",
      }).format(date);
      return { host: hostFormatted, user: userFormatted };
    }

    return { host: hostFormatted, user: hostFormatted };
  } catch {
    const fallback = date.toLocaleString();
    return { host: fallback, user: fallback };
  }
}

function unavailableReason(session: WebinarSession) {
  if (session.remaining_capacity !== null && session.remaining_capacity <= 0) return "This session is fully booked.";
  const closesAt = session.registration_closes_at ?? session.scheduled_start;
  if (closesAt && Date.now() >= new Date(closesAt).getTime()) return "Registration has closed.";
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

  const [userZone, setUserZone] = useState("UTC");
  useEffect(() => {
    try {
      setUserZone(Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC");
    } catch {
      setUserZone("UTC");
    }
  }, []);

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
    return () => {
      active = false;
    };
  }, [slug]);

  const selectedSessions = useMemo(
    () => formData?.sessions.filter((session) => selected.includes(session.slug)) ?? [],
    [formData, selected]
  );

  function toggleSession(sessionSlug: string) {
    setSelected((current) =>
      current.includes(sessionSlug) ? current.filter((item) => item !== sessionSlug) : [...current, sessionSlug]
    );
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!formData || selected.length === 0) {
      setError("Please choose at least one session to attend.");
      return;
    }
    if (selectedSessions.some((session) => unavailableReason(session))) {
      setError("One or more selected sessions are no longer available. Please update your selection.");
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
      setConfirmationStatus(payload.data?.notifications?.deliveryStatus ?? payload.data?.notifications?.status ?? "not_queued");
      setSuccess(true);
    } catch (requestError: unknown) {
      setError(requestError instanceof Error ? requestError.message : "Could not record your registration.");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="py-24 text-center text-xs text-muted-foreground">
        <div className="inline-block size-6 animate-spin rounded-full border-2 border-primary border-r-transparent mb-3" />
        <p>Loading event registration details...</p>
      </div>
    );
  }

  if (error && !formData) {
    return (
      <div role="alert" className="mx-auto max-w-lg rounded-sm border border-status-danger-border bg-status-danger-bg p-5 text-center text-xs text-status-danger-fg">
        <p className="font-semibold text-sm">Webinar Not Found</p>
        <p className="mt-1">{error}</p>
      </div>
    );
  }

  if (!formData) return null;

  // Confirmation Ticket Screen
  if (success) {
    return (
      <div className="mx-auto max-w-xl py-6 animate-in fade-in duration-300">
        <div className="rounded-lg border border-border/80 bg-card p-6 sm:p-8 shadow-sm space-y-6">
          <div className="text-center space-y-2">
            <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-status-success-bg text-status-success-fg">
              <TickCircle size="28" variant="Bold" />
            </span>
            <h2 className="font-display text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
              You&apos;re Registered!
            </h2>
            <p className="text-xs text-muted-foreground">
              Your place has been reserved for <strong className="text-foreground">{formData.title}</strong>.
            </p>
          </div>

          <div className="rounded-sm border border-border/60 bg-muted/20 p-4 space-y-3">
            <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              Confirmed Session Schedule
            </p>
            {selectedSessions.map((session) => {
              const timing = formatEventTime(session.scheduled_start, session.timezone, userZone);
              return (
                <div key={session.slug} className="border-b border-border/40 pb-2.5 last:border-0 last:pb-0 space-y-1">
                  <p className="font-semibold text-xs text-foreground">{session.title}</p>
                  <p className="text-[11px] text-brand-text font-medium flex items-center gap-1.5">
                    <Calendar size="12" />
                    <span>Your local time: {timing.user}</span>
                  </p>
                  {timing.user !== timing.host && (
                    <p className="text-[10px] text-muted-foreground font-mono">
                      Host time: {timing.host}
                    </p>
                  )}
                </div>
              );
            })}
          </div>

          <div className="rounded-sm bg-brand-subtle p-3.5 text-xs text-brand-text space-y-1">
            <p className="font-semibold">Meeting Stream Details</p>
            <p className="text-[11px] opacity-90 leading-relaxed">
              {confirmationStatus === "provider_accepted"
                ? "A confirmation email with the direct Google Meet link has been dispatched to your inbox."
                : "Your registration is saved. You will receive stream access before the session starts."}
            </p>
          </div>

          <div className="pt-2 text-center text-xs text-muted-foreground">
            Thank you, <span className="font-semibold text-foreground">{name}</span> ({email}). We look forward to seeing you live!
          </div>
        </div>
      </div>
    );
  }

  const primarySession = formData.sessions[0];
  const primaryTiming = primarySession ? formatEventTime(primarySession.scheduled_start, primarySession.timezone, userZone) : null;

  return (
    <div className="grid gap-8 lg:grid-cols-[1.3fr_1fr] items-start">
      {/* Left Column: Event Narrative & Highlights */}
      <div className="space-y-6">
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1 rounded-full bg-status-success-bg px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-status-success-fg">
              <span className="h-1.5 w-1.5 rounded-full bg-status-success-fg animate-ping" /> Live Interactive Masterclass
            </span>
            {formData.kind === "series" && (
              <span className="rounded-full bg-brand-subtle px-2.5 py-0.5 text-[10px] font-bold text-brand-text">
                Multi-Part Series
              </span>
            )}
          </div>

          <h1 className="font-display text-3xl font-bold tracking-tight text-foreground sm:text-4xl lg:text-5xl leading-tight">
            {formData.title}
          </h1>

          <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
            {formData.description || "Join industry experts and enterprise practitioners for this live interactive session."}
          </p>
        </div>

        {/* Timezone Context Badge */}
        {primaryTiming && (
          <div className="rounded-sm border border-border/70 bg-card p-4 space-y-2">
            <div className="flex items-center gap-2 text-xs font-semibold text-foreground">
              <Calendar size="15" className="text-brand-text" />
              <span>Event Schedule & Time</span>
            </div>
            <div className="text-xs text-brand-text font-medium">
              Your detected local time: <strong className="text-foreground">{primaryTiming.user}</strong>
            </div>
            {primaryTiming.user !== primaryTiming.host && (
              <div className="text-[11px] text-muted-foreground font-mono">
                Host schedule: {primaryTiming.host}
              </div>
            )}
          </div>
        )}

        {/* What You'll Learn / Attendee Value Proposition */}
        <div className="rounded-sm border border-border/70 bg-card p-5 space-y-4">
          <h2 className="font-display text-sm font-bold uppercase tracking-wider text-foreground">
            What You Can Expect
          </h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="flex items-start gap-2.5 text-xs text-muted-foreground">
              <VideoPlay size="16" className="text-brand-text shrink-0 mt-0.5" />
              <span>
                <strong className="text-foreground block">Google Meet Live Stream</strong>
                Direct high-definition audio & video with no proprietary app download required.
              </span>
            </div>

            <div className="flex items-start gap-2.5 text-xs text-muted-foreground">
              <People size="16" className="text-status-success-fg shrink-0 mt-0.5" />
              <span>
                <strong className="text-foreground block">Live Interactive Q&A</strong>
                Ask questions directly to the presenter and participate in real-time discussion.
              </span>
            </div>

            <div className="flex items-start gap-2.5 text-xs text-muted-foreground">
              <TickCircle size="16" className="text-brand-text shrink-0 mt-0.5" />
              <span>
                <strong className="text-foreground block">Resources & Replay</strong>
                Receive session notes, technical slide decks, and follow-up templates afterwards.
              </span>
            </div>

            <div className="flex items-start gap-2.5 text-xs text-muted-foreground">
              <Clock size="16" className="text-status-success-fg shrink-0 mt-0.5" />
              <span>
                <strong className="text-foreground block">Concise & Actionable</strong>
                Designed for busy professionals with high-density insights in 60 minutes.
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Right Column: Sticky Elevated Registration Terminal */}
      <div className="sticky top-6">
        <Card className="border-border/80 shadow-md bg-card">
          <CardHeader className="pb-3 border-b border-border/50">
            <CardTitle className="font-display text-lg font-bold text-foreground">
              {formData.kind === "series" ? "Select Sessions & Reserve" : "Reserve Your Seat"}
            </CardTitle>
            <CardDescription className="text-xs">
              Complimentary admission. Fill in your details below to receive your calendar invite.
            </CardDescription>
          </CardHeader>

          <CardContent className="pt-4">
            <form onSubmit={submit} className="space-y-4">
              {/* Session Picker */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-foreground block">
                  {formData.kind === "series" ? "Choose Session(s) to Attend:" : "Selected Session:"}
                </label>
                <div className="space-y-2">
                  {formData.sessions.map((session) => {
                    const checked = selected.includes(session.slug);
                    const unavailable = unavailableReason(session);
                    const timing = formatEventTime(session.scheduled_start, session.timezone, userZone);

                    return (
                      <label
                        key={session.slug}
                        className={`block rounded-sm border p-3 transition-colors cursor-pointer text-xs ${
                          checked
                            ? "border-brand bg-brand-subtle/50 text-foreground"
                            : "border-border/70 bg-card hover:border-border text-muted-foreground"
                        }`}
                      >
                        <span className="flex items-start gap-2.5">
                          {formData.kind === "series" ? (
                            <input
                              type="checkbox"
                              checked={checked}
                              disabled={Boolean(unavailable)}
                              onChange={() => toggleSession(session.slug)}
                              className="mt-0.5 h-3.5 w-3.5 accent-brand rounded"
                            />
                          ) : (
                            <span className="mt-0.5 text-brand-text">●</span>
                          )}
                          <span className="min-w-0 space-y-0.5 flex-1">
                            <span className="block font-semibold text-foreground text-xs">{session.title}</span>
                            <span className="block text-[11px] text-muted-foreground">{timing.user}</span>
                            <span className="block text-[10px] text-muted-foreground">
                              {session.duration_minutes}m duration
                              {session.remaining_capacity !== null && ` · ${session.remaining_capacity} seats left`}
                            </span>
                            {unavailable && (
                              <span className="block text-[10px] font-bold text-status-danger-fg">{unavailable}</span>
                            )}
                          </span>
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Attendee Details */}
              <div className="space-y-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-foreground" htmlFor="webinar-name">
                    Full Name <span className="text-status-danger-fg">*</span>
                  </label>
                  <Input
                    id="webinar-name"
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    autoComplete="name"
                    placeholder="e.g. Alex Rivera"
                    required
                    className="h-9 text-xs"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-foreground" htmlFor="webinar-email">
                    Work or Personal Email <span className="text-status-danger-fg">*</span>
                  </label>
                  <Input
                    id="webinar-email"
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    autoComplete="email"
                    placeholder="e.g. alex@company.com"
                    required
                    className="h-9 text-xs"
                  />
                </div>
              </div>

              {/* Marketing Opt-in */}
              <label className="flex items-start gap-2.5 text-xs text-muted-foreground cursor-pointer pt-1">
                <input
                  type="checkbox"
                  checked={marketingOptIn}
                  onChange={(event) => setMarketingOptIn(event.target.checked)}
                  className="mt-0.5 h-3.5 w-3.5 accent-brand rounded"
                />
                <span className="text-[11px] leading-snug">
                  Keep me updated with future technical sessions, product updates, and workshop materials.
                </span>
              </label>

              {error && (
                <p role="alert" className="rounded-sm border border-status-danger-border bg-status-danger-bg p-2.5 text-xs text-status-danger-fg">
                  {error}
                </p>
              )}

              <Button
                type="submit"
                variant="brand"
                disabled={submitting || selected.length === 0 || selectedSessions.some((session) => unavailableReason(session))}
                className="w-full h-10 text-xs font-bold uppercase tracking-wider cursor-pointer"
              >
                {submitting ? "Confirming Registration..." : "Reserve My Seat Now ↗"}
              </Button>

              <p className="text-center text-[10px] text-muted-foreground">
                🔒 We respect your privacy. No spam. Unsubscribe anytime.
              </p>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
