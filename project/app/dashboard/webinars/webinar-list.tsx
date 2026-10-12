"use client";

import * as React from "react";
import Link from "next/link";
import {
  Add,
  ArrowRight,
  Calendar,
  DirectSend,
  Eye,
  People,
  Refresh2,
  SearchNormal1,
  TickCircle,
  Trash,
  VideoPlay,
} from "iconsax-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  formatDate,
  getWebinarSeriesDeletePreview,
  statusClass,
  statusLabel,
  WebinarSession,
} from "./webinar-api";
import { useWebinarList, useWebinarSeries } from "@/hooks/webinars/use-webinars";
import { useWebinarMutations } from "@/hooks/webinars/use-webinar-mutations";
import { useProcessWebinarEmails } from "@/hooks/webinars/use-webinar-work";
import { createClient } from "@/lib/supabase/client";
import { GOOGLE_OAUTH_SCOPES } from "@/lib/google-oauth";

export function WebinarList({
  google,
}: {
  google: { meetConnected: boolean; gmailConnected: boolean; senderEmail: string | null };
}) {
  const googleConnected = google.meetConnected;
  const [filter, setFilter] = React.useState<"all" | WebinarSession["status"]>("all");
  const [searchQuery, setSearchQuery] = React.useState("");
  const query = useWebinarList();
  const seriesQuery = useWebinarSeries();
  const mutations = useWebinarMutations();
  const emailWork = useProcessWebinarEmails();
  const [seriesError, setSeriesError] = React.useState("");
  const [googleConnecting, setGoogleConnecting] = React.useState(false);
  const [googleError, setGoogleError] = React.useState("");

  const sessions = query.data?.sessions ?? [];
  const loading = query.isPending;
  const error = query.error instanceof Error ? query.error.message : query.error ? "Unable to load webinars." : "";

  // Filtered sessions
  const visible = sessions
    .filter((session) => (filter === "all" ? true : session.status === filter))
    .filter((session) => {
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        session.title.toLowerCase().includes(q) ||
        (session.presenter && session.presenter.toLowerCase().includes(q)) ||
        (session.seriesTitle && session.seriesTitle.toLowerCase().includes(q))
      );
    });

  // KPI Calculations
  const totalSessions = sessions.length;
  const upcomingCount = sessions.filter((s) => s.status === "scheduled" || s.status === "live").length;
  const liveCount = sessions.filter((s) => s.status === "live").length;
  const draftsCount = sessions.filter((s) => s.status === "draft").length;
  const totalRegistrations = sessions.reduce((acc, s) => acc + (s.registrationCount ?? 0), 0);

  async function removeSeries(id: string) {
    setSeriesError("");
    try {
      const preview = await getWebinarSeriesDeletePreview(id);
      const counts = preview.counts;
      const confirmed = window.confirm(
        `Permanently delete “${preview.title}” and its ${counts.sessions} sessions, ${counts.registrations} registrations, ${counts.participants} participants, ${counts.join_sessions} join records, ${counts.feedback} feedback responses, and ${counts.campaigns} campaign drafts? Shared CRM contacts, separate marketing consent, and your Google connection are retained.`
      );
      if (!confirmed) return;
      await mutations.removeSeries.mutateAsync({ id, counts });
    } catch (caught) {
      setSeriesError(caught instanceof Error ? caught.message : "Could not delete webinar series.");
    }
  }

  async function connectGoogle() {
    setGoogleConnecting(true);
    setGoogleError("");
    try {
      const redirectTo = `${window.location.origin}/auth/callback?next=${encodeURIComponent("/dashboard/webinars")}`;
      const { error: oauthError } = await createClient().auth.signInWithOAuth({
        provider: "google",
        options: {
          scopes: GOOGLE_OAUTH_SCOPES,
          queryParams: { access_type: "offline", include_granted_scopes: "true", prompt: "consent" },
          redirectTo,
        },
      });
      if (oauthError) throw oauthError;
    } catch {
      setGoogleError("Could not start Google sign-in. Please try again.");
      setGoogleConnecting(false);
    }
  }

  function processQueuedEmails() {
    const confirmed = window.confirm(
      "Process up to 50 due webinar emails for your business now? This sends confirmations and approved follow-ups. Sent emails cannot be recalled."
    );
    if (confirmed) emailWork.mutate();
  }

  return (
    <main className="mx-auto w-full max-w-7xl space-y-6 px-4 py-6 sm:px-6 lg:px-8">
      {/* Top Header Hub */}
      <div className="flex flex-col gap-4 border-b border-border/60 pb-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-subtle px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider text-brand-text">
              <VideoPlay size="12" variant="Bold" /> Event Engine
            </span>
            {liveCount > 0 && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-status-success-bg px-2.5 py-0.5 text-[11px] font-bold text-status-success-fg animate-pulse">
                <span className="h-1.5 w-1.5 rounded-full bg-status-success-fg" /> {liveCount} Live Now
              </span>
            )}
          </div>
          <h1 className="font-display text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            Webinar Operations
          </h1>
          <p className="max-w-2xl text-xs sm:text-sm text-muted-foreground">
            Schedule live interactive events, provision Google Meet streams, monitor registrations, and automate attendee follow-ups.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {googleConnected && (
            <Button
              variant="outline"
              size="sm"
              disabled={emailWork.isPending || !google.gmailConnected}
              onClick={processQueuedEmails}
              className="gap-1.5 text-xs h-9 cursor-pointer"
            >
              <Refresh2 size="14" className={emailWork.isPending ? "animate-spin" : ""} />
              {emailWork.isPending ? "Processing..." : "Process Email Queue"}
            </Button>
          )}
          <Button variant="outline" size="sm" asChild className="text-xs h-9 cursor-pointer">
            <Link href="/dashboard/webinars/series/new">Create Series</Link>
          </Button>
          <Button variant="brand" size="sm" asChild className="gap-1.5 text-xs h-9 cursor-pointer">
            <Link href="/dashboard/webinars/new">
              <Add size="16" /> Create Webinar
            </Link>
          </Button>
        </div>
      </div>

      {/* Google Integration Setup Card */}
      {(!googleConnected || !google.gmailConnected) && (
        <div className="relative overflow-hidden rounded-md border border-brand/35 bg-gradient-to-r from-card via-card to-brand-subtle/30 p-5 shadow-xs">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            {/* Left: Info & Feature Badges */}
            <div className="space-y-3 max-w-2xl">
              <div className="flex items-start sm:items-center gap-3">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-sm bg-brand font-bold text-sm text-brand-foreground shadow-xs">
                  G
                </span>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="font-display text-sm sm:text-base font-bold text-foreground">
                      {!googleConnected ? "Connect Google Workspace for Live Webinars" : "Authorize Gmail Delivery"}
                    </h2>
                    <span className="rounded-full bg-status-warning-bg px-2 py-0.2 text-[10px] font-semibold text-status-warning-fg border border-status-warning-border">
                      Integration Recommended
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {!googleConnected
                      ? "Seamlessly generate Google Meet video streams, sync attendance duration logs, and send automated confirmation emails."
                      : "Google Meet is connected. Grant Gmail permissions so attendee confirmations and follow-ups send from your email."}
                  </p>
                </div>
              </div>

              {/* 3 Feature Pills - Fills Horizontal Space Meaningfully */}
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-3 pt-0.5">
                <div className="flex items-center gap-2 rounded-sm border border-border/50 bg-background/80 px-2.5 py-1.5 text-[11px] text-muted-foreground">
                  <VideoPlay size="14" className="text-brand-text shrink-0" />
                  <span className="font-medium text-foreground">Auto Meet Links</span>
                </div>
                <div className="flex items-center gap-2 rounded-sm border border-border/50 bg-background/80 px-2.5 py-1.5 text-[11px] text-muted-foreground">
                  <People size="14" className="text-status-success-fg shrink-0" />
                  <span className="font-medium text-foreground">Live Turnout Sync</span>
                </div>
                <div className="flex items-center gap-2 rounded-sm border border-border/50 bg-background/80 px-2.5 py-1.5 text-[11px] text-muted-foreground">
                  <DirectSend size="14" className="text-brand-text shrink-0" />
                  <span className="font-medium text-foreground">Auto Follow-ups</span>
                </div>
              </div>

              {google.senderEmail && (
                <p className="text-[11px] text-muted-foreground">
                  Connected Sender Account: <span className="font-mono font-medium text-foreground">{google.senderEmail}</span>
                </p>
              )}
              {googleError && <p role="alert" className="text-xs font-semibold text-status-danger-fg">{googleError}</p>}
            </div>

            {/* Right: Connect Action Box */}
            <div className="flex flex-col sm:flex-row lg:flex-col items-start lg:items-end gap-1.5 shrink-0 border-t lg:border-t-0 lg:border-l border-border/50 pt-3 lg:pt-0 lg:pl-6">
              <Button
                variant="brand"
                size="sm"
                onClick={() => void connectGoogle()}
                disabled={googleConnecting}
                className="h-9 px-4 text-xs font-semibold shadow-xs cursor-pointer gap-2"
              >
                <span className="font-bold">G</span>
                <span>{googleConnecting ? "Connecting..." : googleConnected ? "Authorize Gmail" : "Sign in with Google"}</span>
              </Button>
              <span className="text-[10px] text-muted-foreground">
                Official Google OAuth 2.0
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Email Work Feedback Alerts */}
      {emailWork.isError && (
        <div role="alert" className="rounded-sm border border-status-danger-border bg-status-danger-bg p-3 text-xs text-status-danger-fg">
          {emailWork.error.message}
        </div>
      )}
      {emailWork.data && (
        <div role="status" className="rounded-sm border border-status-info-border bg-status-info-bg p-3 text-xs text-status-info-fg">
          {emailWork.data.claimed === 0
            ? "No due webinar emails were queued for this business."
            : `Processed ${emailWork.data.claimed} emails: Gmail accepted ${emailWork.data.provider_accepted}, retry queued ${emailWork.data.retry_queued}, failed ${emailWork.data.failed}.`}
        </div>
      )}

      {/* High-Density 4-Column KPI Metric Strip */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-sm border border-border/70 bg-card p-4 transition-all hover:border-border">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Total Sessions</span>
            <VideoPlay size="16" className="text-brand-text" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="font-display text-2xl font-bold tabular-nums text-foreground">{totalSessions}</span>
            <span className="text-[11px] text-muted-foreground">in workspace</span>
          </div>
          <div className="mt-2 text-[11px] text-muted-foreground">
            {seriesQuery.data?.length ?? 0} active series
          </div>
        </div>

        <div className="rounded-sm border border-border/70 bg-card p-4 transition-all hover:border-border">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Upcoming & Live</span>
            <Calendar size="16" className="text-status-success-fg" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="font-display text-2xl font-bold tabular-nums text-foreground">{upcomingCount}</span>
            {liveCount > 0 && (
              <span className="rounded-full bg-status-success-bg px-1.5 py-0.2 text-[10px] font-bold text-status-success-fg">
                {liveCount} Live
              </span>
            )}
          </div>
          <div className="mt-2 text-[11px] text-muted-foreground">
            {draftsCount} draft sessions
          </div>
        </div>

        <div className="rounded-sm border border-border/70 bg-card p-4 transition-all hover:border-border">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Registrations</span>
            <People size="16" className="text-brand-text" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="font-display text-2xl font-bold tabular-nums text-foreground">{totalRegistrations}</span>
            <span className="text-[11px] text-muted-foreground">attendees</span>
          </div>
          <div className="mt-2 text-[11px] text-muted-foreground">
            {totalSessions > 0 ? Math.round(totalRegistrations / totalSessions) : 0} avg / session
          </div>
        </div>

        <div className="rounded-sm border border-border/70 bg-card p-4 transition-all hover:border-border">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Meet Sync</span>
            <TickCircle size="16" className={googleConnected ? "text-status-success-fg" : "text-status-warning-fg"} />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className={`font-display text-lg font-bold ${googleConnected ? "text-status-success-fg" : "text-status-warning-fg"}`}>
              {googleConnected ? "Connected" : "Disconnected"}
            </span>
          </div>
          <div className="mt-2 truncate text-[11px] text-muted-foreground">
            {google.senderEmail ? google.senderEmail : "Google Meet Ready"}
          </div>
        </div>
      </div>

      {/* Series Showcase (if any series exist) */}
      {(seriesQuery.data?.length ?? 0) > 0 && (
        <div className="rounded-sm border border-border/70 bg-card p-4 sm:p-5">
          <div className="flex items-center justify-between border-b border-border/60 pb-3">
            <div>
              <h2 className="font-display text-sm font-bold uppercase tracking-wider text-foreground">
                Active Series ({seriesQuery.data?.length})
              </h2>
              <p className="text-[11px] text-muted-foreground">Multi-part masterclasses with single registration pages.</p>
            </div>
            <Link
              href="/dashboard/webinars/series/new"
              className="text-xs font-semibold text-brand-text hover:underline"
            >
              + New Series
            </Link>
          </div>
          {seriesError && <p role="alert" className="mt-3 text-xs text-status-danger-fg">{seriesError}</p>}
          <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {seriesQuery.data?.map((s) => (
              <div
                key={s.id}
                className="flex flex-col justify-between rounded-sm border border-border/60 bg-muted/20 p-3.5 transition-colors hover:border-border hover:bg-muted/30"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-semibold text-xs text-foreground line-clamp-1">{s.title}</h3>
                    <button
                      type="button"
                      onClick={() => void removeSeries(s.id)}
                      disabled={mutations.removeSeries.isPending}
                      className="p-1 text-muted-foreground hover:text-status-danger-fg cursor-pointer rounded transition-colors"
                      title="Delete Series"
                    >
                      <Trash size="13" />
                    </button>
                  </div>
                  {s.description && (
                    <p className="mt-1 text-[11px] text-muted-foreground line-clamp-2">{s.description}</p>
                  )}
                </div>
                <div className="mt-3 flex items-center justify-between border-t border-border/40 pt-2 text-[10px] text-muted-foreground">
                  <span className="font-mono">Series Container</span>
                  <span className="font-semibold text-brand-text">Multi-Session</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Main Sessions Section with Search & Tabs */}
      <div className="rounded-sm border border-border/70 bg-card p-4 sm:p-5 space-y-4">
        {/* Search, Filter, and Controls Toolbar */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-border/60 pb-4">
          <div className="flex flex-wrap items-center gap-1.5">
            {(
              [
                { id: "all", label: "All Sessions", count: sessions.length },
                { id: "scheduled", label: "Scheduled", count: sessions.filter((s) => s.status === "scheduled").length },
                { id: "live", label: "Live", count: sessions.filter((s) => s.status === "live").length },
                { id: "draft", label: "Drafts", count: sessions.filter((s) => s.status === "draft").length },
                { id: "completed", label: "Ended", count: sessions.filter((s) => s.status === "completed").length },
                { id: "cancelled", label: "Cancelled", count: sessions.filter((s) => s.status === "cancelled").length },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setFilter(tab.id as typeof filter)}
                className={`inline-flex items-center gap-1.5 rounded-sm px-2.5 py-1 text-xs font-semibold transition-colors cursor-pointer ${
                  filter === tab.id
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted/40 text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                <span>{tab.label}</span>
                <span
                  className={`rounded-full px-1.5 py-0.2 text-[10px] font-mono ${
                    filter === tab.id ? "bg-primary-foreground/20 text-primary-foreground" : "bg-muted text-muted-foreground"
                  }`}
                >
                  {tab.count}
                </span>
              </button>
            ))}
          </div>

          <div className="relative min-w-[200px] sm:w-64">
            <SearchNormal1 size="14" className="absolute left-2.5 top-2.5 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search sessions or hosts..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-8.5 w-full rounded-sm border border-input bg-card pl-8 pr-3 text-xs text-foreground placeholder:text-muted-foreground outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring"
            />
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="space-y-3 py-2" role="status" aria-label="Loading webinar sessions">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-sm border border-border/50 bg-muted/10 gap-3 animate-pulse">
                <div className="space-y-2 flex-1">
                  <div className="h-4 w-48 bg-muted/60 rounded-xs" />
                  <div className="h-3 w-72 bg-muted/30 rounded-xs" />
                </div>
                <div className="flex items-center gap-3">
                  <div className="h-6 w-20 bg-muted/40 rounded-xs" />
                  <div className="h-8 w-24 bg-muted/50 rounded-sm" />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Error State */}
        {!loading && error && (
          <div className="flex flex-col items-center justify-center gap-3 py-12 text-center">
            <p role="alert" className="text-xs font-semibold text-status-danger-fg">{error}</p>
            <Button variant="outline" size="sm" onClick={() => { void query.refetch(); }} className="text-xs">
              Try again
            </Button>
          </div>
        )}

        {/* Empty State */}
        {!loading && !error && visible.length === 0 && (
          <div className="py-14 text-center">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-muted/60 text-muted-foreground">
              <VideoPlay size="24" />
            </div>
            <h3 className="font-display text-base font-bold text-foreground">
              {sessions.length ? "No matching sessions found" : "No webinars created yet"}
            </h3>
            <p className="mx-auto mt-1 max-w-sm text-xs text-muted-foreground">
              {sessions.length
                ? "Try adjusting your search query or status filter."
                : "Create your first webinar session to generate registration links and connect Google Meet."}
            </p>
            {!sessions.length && (
              <div className="mt-4">
                <Button variant="brand" size="sm" asChild className="gap-1.5 text-xs">
                  <Link href="/dashboard/webinars/new">
                    <Add size="14" /> Create First Webinar
                  </Link>
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Session Items - Elevated Rich Rows */}
        {!loading && !error && visible.length > 0 && (
          <div className="divide-y divide-border/60">
            {visible.map((session) => (
              <SessionItem key={session.id} session={session} />
            ))}
          </div>
        )}
      </div>
    </main>
  );
}

function SessionItem({ session }: { session: WebinarSession }) {
  const isLive = session.status === "live";

  return (
    <div className="group flex flex-col gap-3 py-3.5 transition-colors hover:bg-accent/30 sm:flex-row sm:items-center sm:justify-between sm:px-2 rounded-sm">
      {/* Session Title & Metadata */}
      <div className="flex min-w-0 items-start gap-3">
        <span
          className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-sm transition-colors ${
            isLive ? "bg-status-success-bg text-status-success-fg animate-pulse" : "bg-muted/60 text-foreground group-hover:bg-muted"
          }`}
        >
          <VideoPlay size="18" variant={isLive ? "Bold" : "Linear"} />
        </span>

        <div className="min-w-0 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href={`/dashboard/webinars/${session.id}`}
              className="truncate font-semibold text-sm text-foreground hover:text-brand-text transition-colors"
            >
              {session.title}
            </Link>

            {/* Status Pill */}
            <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] uppercase tracking-wide ${statusClass(session.status)}`}>
              {isLive && <span className="h-1.5 w-1.5 rounded-full bg-status-success-fg animate-ping" />}
              {statusLabel(session.status)}
            </span>

            {/* Series Tag */}
            {session.seriesTitle && (
              <span className="rounded bg-muted/60 px-1.5 py-0.5 text-[10px] font-mono text-muted-foreground">
                Series: {session.seriesTitle}
              </span>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Calendar size="12" />
              {formatDate(session.scheduledStart, session.timezone)}
              {session.timezone ? ` (${session.timezone})` : ""}
            </span>
            {session.presenter && <span>Host: {session.presenter}</span>}
            {session.durationMinutes && <span>{session.durationMinutes}m</span>}
          </div>
        </div>
      </div>

      {/* Metrics, Registrations & Quick Actions */}
      <div className="flex items-center justify-between gap-4 sm:justify-end sm:shrink-0">
        <div className="flex items-center gap-2 text-right">
          <span className="inline-flex items-center gap-1 rounded-sm bg-muted/40 px-2.5 py-1 text-xs font-semibold text-foreground">
            <People size="14" className="text-muted-foreground" />
            <span className="font-mono tabular-nums">{session.registrationCount ?? 0}</span>
            <span className="text-[11px] text-muted-foreground font-normal">
              {session.capacity ? `/ ${session.capacity}` : "registered"}
            </span>
          </span>
        </div>

        <div className="flex items-center gap-1">
          {session.publicSlug && session.status !== "draft" && session.status !== "cancelled" && (
            <Link
              href={`/webinars/${encodeURIComponent(session.publicSlug)}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex h-8 items-center rounded-sm border border-border/80 bg-background px-2 text-[11px] font-medium text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
              title="Open public registration page"
            >
              Public Page ↗
            </Link>
          )}

          <Button variant="outline" size="sm" asChild className="h-8 px-2.5 text-xs gap-1 cursor-pointer">
            <Link href={`/dashboard/webinars/${session.id}`}>
              Manage <ArrowRight size="12" />
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
