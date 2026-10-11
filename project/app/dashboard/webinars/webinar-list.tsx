"use client";

import * as React from "react";
import Link from "next/link";
import { Add, ArrowRight, Trash, VideoPlay } from "iconsax-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { formatDate, getWebinarSeriesDeletePreview, statusClass, statusLabel, WebinarSession } from "./webinar-api";
import { useWebinarList, useWebinarSeries } from "@/hooks/webinars/use-webinars";
import { useWebinarMutations } from "@/hooks/webinars/use-webinar-mutations";
import { useProcessWebinarEmails } from "@/hooks/webinars/use-webinar-work";
import { createClient } from "@/lib/supabase/client";
import { GOOGLE_OAUTH_SCOPES } from "@/lib/google-oauth";

export function WebinarList({ google }: { google: { meetConnected: boolean; gmailConnected: boolean; senderEmail: string | null } }) {
  const googleConnected = google.meetConnected;
  const [filter, setFilter] = React.useState<"all" | WebinarSession["status"]>("all");
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

  const visible = filter === "all" ? sessions : sessions.filter((session) => session.status === filter);
  const upcoming = sessions.filter((session) => session.status === "scheduled" || session.status === "live").length;
  const drafts = sessions.filter((session) => session.status === "draft").length;

  async function removeSeries(id: string) {
    setSeriesError("");
    try {
      const preview = await getWebinarSeriesDeletePreview(id);
      const counts = preview.counts;
      const confirmed = window.confirm(`Permanently delete “${preview.title}” and its ${counts.sessions} sessions, ${counts.registrations} registrations, ${counts.participants} participants, ${counts.join_sessions} join records, ${counts.feedback} feedback responses, and ${counts.campaigns} campaign drafts? Shared CRM contacts, separate marketing consent, and your Google connection are retained. Sent email and Google Meet history cannot be retracted.`);
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
    const confirmed = window.confirm("Process up to 50 due webinar emails for your business now? This can send registration confirmations, event change notifications, and follow-ups you already approved. Sent emails cannot be recalled.");
    if (confirmed) emailWork.mutate();
  }

  return <main className="mx-auto w-full max-w-7xl space-y-8 px-4 py-8 sm:px-6 lg:px-8">
    <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
      <div><p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-brand-text">Owner workspace</p><h1 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">Webinar management</h1><p className="mt-2 max-w-2xl text-sm text-muted-foreground">Create and schedule webinar sessions or series, collect registrations, import Google Meet attendance, and prepare feedback and follow-up emails.</p></div>
      {googleConnected && <div className="flex flex-wrap gap-2"><Button variant="outline" disabled={emailWork.isPending || !google.gmailConnected} onClick={processQueuedEmails}>{emailWork.isPending ? "Processing…" : "Process queued emails"}</Button><Button variant="outline" asChild><Link href="/dashboard/webinars/series/new">Create series</Link></Button><Button variant="brand" asChild className="gap-2"><Link href="/dashboard/webinars/new"><Add size="16" /> Create webinar</Link></Button></div>}
    </div>

    {(!googleConnected || !google.gmailConnected) && <Card><CardContent className="flex flex-col gap-5 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6"><div className="max-w-3xl"><h2 className="font-display text-lg font-bold">{!googleConnected ? "Connect Google for webinar tools" : "Connect Gmail to send webinar emails"}</h2><p className="mt-1 text-sm text-muted-foreground">{!googleConnected ? "Google Meet lets Nexus create a meeting link when you schedule a webinar and import its attendance afterward. Sign in with Google to authorize these features; you will return here when done." : "Webinar emails will be sent from your connected Google account."}{google.senderEmail && <span className="mt-1 block">Connected sender: {google.senderEmail}</span>}</p>{googleError && <p role="alert" className="mt-2 text-sm text-status-danger-fg">{googleError}</p>}</div><Button variant="brand" onClick={() => void connectGoogle()} disabled={googleConnecting} className="shrink-0">{googleConnecting ? "Connecting…" : googleConnected ? "Reconnect Google" : "Sign in with Google"}</Button></CardContent></Card>}


    <div aria-hidden={!googleConnected} inert={!googleConnected} className={googleConnected ? "space-y-8" : "pointer-events-none select-none space-y-8 blur-[2px] opacity-60"}>
    {emailWork.isError && <p role="alert" className="text-sm text-status-danger-fg">{emailWork.error.message}</p>}
    {googleConnected && !google.gmailConnected && <p role="status" className="text-sm text-status-warning-fg">Email delivery is paused until Google is reconnected with Gmail send permission.</p>}
    {emailWork.data && <p role="status" className="text-sm text-muted-foreground">{emailWork.data.claimed === 0 ? "No due webinar emails were queued for this business." : `Processed ${emailWork.data.claimed} queued emails: Gmail accepted ${emailWork.data.provider_accepted}, retry queued ${emailWork.data.retry_queued}, failed ${emailWork.data.failed}, reconnect Google ${emailWork.data.reconnect_required}, unknown ${emailWork.data.unknown}, blocked ${emailWork.data.blocked}. Provider acceptance is not confirmation of inbox delivery.`}{emailWork.data.claimed === 50 ? " Run again to process another batch." : ""}</p>}

    <div className="grid gap-4 sm:grid-cols-3"><Metric label="All sessions" value={sessions.length} /><Metric label="Upcoming or live" value={upcoming} /><Metric label="Drafts" value={drafts} /></div>

    {(seriesQuery.data?.length ?? 0) > 0 && <Card><CardContent className="p-4 sm:p-6"><div className="border-b border-border pb-4"><h2 className="font-display text-xl font-bold">Your series</h2><p className="mt-1 text-xs text-muted-foreground">Deleting a series permanently deletes every session and its webinar records.</p></div>{seriesError && <p role="alert" className="mt-3 text-sm text-status-danger-fg">{seriesError}</p>}<ul className="divide-y divide-border">{seriesQuery.data?.map((series) => <li key={series.id} className="flex items-center justify-between gap-4 py-4"><div className="min-w-0"><p className="truncate text-sm font-semibold">{series.title}</p><p className="mt-1 text-xs text-muted-foreground">Series registration page · sessions shown below</p></div>{googleConnected && <Button variant="destructive" size="sm" aria-busy={mutations.removeSeries.isPending} disabled={mutations.removeSeries.isPending} onClick={() => void removeSeries(series.id)}>{mutations.removeSeries.isPending ? <><span aria-hidden="true" className="mr-2 inline-block size-4 animate-spin rounded-full border-2 border-current border-r-transparent align-[-3px]" />Deleting…</> : <><Trash size="14" /> Delete series</>}</Button>}</li>)}</ul></CardContent></Card>}

    <Card><CardContent className="p-4 sm:p-6">
      <div className="flex flex-col gap-4 border-b border-border pb-4 sm:flex-row sm:items-center sm:justify-between"><div><h2 className="font-display text-xl font-bold">Your sessions</h2><p className="mt-1 text-xs text-muted-foreground">Cancelled sessions remain visible with their records until you permanently delete them.</p></div><label className="flex items-center gap-2 text-xs font-semibold">Filter<select value={filter} onChange={(e) => setFilter(e.target.value as typeof filter)} className="h-9 rounded-sm border border-input bg-card px-2 text-xs outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring"><option value="all">All statuses</option><option value="draft">Draft</option><option value="scheduled">Scheduled</option><option value="live">Live</option><option value="completed">Ended</option><option value="cancelled">Cancelled</option></select></label></div>
      {loading && <div className="py-16 text-center text-sm text-muted-foreground" role="status">Loading webinar sessions...</div>}
      {!loading && error && <div className="flex flex-col items-start gap-3 py-12 sm:flex-row sm:items-center sm:justify-between"><p role="alert" className="text-sm text-status-danger-fg">{error}</p>{googleConnected && <Button variant="outline" size="sm" onClick={() => { void query.refetch(); }}>Try again</Button>}</div>}
      {!loading && !error && visible.length === 0 && <div className="py-16 text-center"><VideoPlay size="30" className="mx-auto mb-3 text-muted-foreground" /><h3 className="font-display text-xl font-bold">{sessions.length ? "No matching sessions" : "No webinars yet"}</h3><p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">{sessions.length ? "Change the filter to see another status." : "Start with a draft and schedule it once the details are ready."}</p></div>}
      {!loading && !error && visible.length > 0 && <div className="divide-y divide-border">{visible.map((session) => <SessionRow key={session.id} session={session} />)}</div>}
    </CardContent></Card>
    </div>

  </main>;
}

function SessionRow({ session }: { session: WebinarSession }) {
  return <Link href={`/dashboard/webinars/${session.id}`} className="group flex flex-col gap-4 py-5 first:pt-5 hover:bg-accent/30 sm:flex-row sm:items-center sm:justify-between sm:px-3"><div className="flex min-w-0 items-start gap-3"><span className="mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-sm bg-muted/50 text-brand-text"><VideoPlay size="18" /></span><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><h3 className="truncate font-semibold">{session.title}</h3><span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${statusClass(session.status)}`}>{statusLabel(session.status)}</span></div><p className="mt-1 text-xs text-muted-foreground">{formatDate(session.scheduledStart, session.timezone)}{session.timezone ? ` · ${session.timezone}` : ""}</p><p className="mt-1 text-xs text-muted-foreground">{session.seriesTitle ? `Series · ${session.seriesTitle}` : "Standalone session"}</p></div></div><div className="flex items-center justify-between gap-5 sm:justify-end"><span className="text-xs text-muted-foreground">{session.registrationCount == null ? "Registrations pending" : `${session.registrationCount} registered`}</span><ArrowRight size="16" className="text-muted-foreground transition-transform group-hover:translate-x-1" /></div></Link>;
}

function Metric({ label, value }: { label: string; value: number }) { return <div className="rounded-sm bg-card/70 p-5"><p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</p><p className="mt-1 font-display text-3xl font-bold tabular-nums">{value}</p><p className="mt-1 text-xs text-muted-foreground">From owner-scoped webinar records</p></div>; }
