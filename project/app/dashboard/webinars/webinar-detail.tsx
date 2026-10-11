"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import {
  ArrowLeft,
  Calendar,
  Chart2,
  Clock,
  Copy,
  DirectSend,
  Edit2,
  Facebook,
  Global,
  People,
  Refresh2,
  SearchNormal1,
  Share,
  Sms,
  TickCircle,
  Trash,
  VideoPlay,
  Whatsapp,
} from "iconsax-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDate, statusClass, statusLabel, WebinarDetail } from "./webinar-api";
import { useWebinarMutations } from "@/hooks/webinars/use-webinar-mutations";
import { useWebinarAttendance, useWebinarAttendanceActions } from "@/hooks/webinars/use-webinar-attendance";
import { useWebinar } from "@/hooks/webinars/use-webinars";

type Tab = "overview" | "registration" | "attendance" | "followup" | "analytics";

export function WebinarDetailView({ sessionId }: { sessionId: string }) {
  const router = useRouter();
  const [tab, setTab] = React.useState<Tab>("overview");
  const query = useWebinar(sessionId);
  const mutations = useWebinarMutations();
  const session = query.data ?? null;
  const loading = query.isPending;
  const [busy, setBusy] = React.useState("");
  const [actionError, setActionError] = React.useState("");
  const [actionNotice, setActionNotice] = React.useState("");
  const error = actionError || (query.error instanceof Error ? query.error.message : query.error ? "Unable to load this webinar." : "");
  const load = async () => {
    setActionError("");
    await query.refetch();
  };

  async function run(action: "schedule" | "cancel" | "delete") {
    if (!session) return;
    setBusy(action);
    setActionError("");
    setActionNotice("");
    try {
      if (action === "delete") {
        const response = await fetch(`/api/webinars/${encodeURIComponent(session.id)}/delete-preview`);
        const body = (await response.json()) as {
          data?: {
            version: number;
            title: string;
            counts: Record<string, number>;
            active_delivery_count: number;
            unknown_delivery_count: number;
            meet_operation_count: number;
          };
          error?: { message?: string };
        };
        if (!response.ok || !body.data) throw new Error(body.error?.message ?? "Could not load deletion preview.");
        const preview = body.data;
        if (preview.active_delivery_count || preview.unknown_delivery_count || preview.meet_operation_count) {
          throw new Error("Meet provisioning or email delivery is active or has an unknown outcome. Reconcile it before deletion.");
        }
        const summary = `${preview.counts.registrations} registrations, ${preview.counts.participants} Meet participants, and ${preview.counts.feedback} feedback responses.`;
        const confirmed = window.confirm(
          `Permanently delete “${preview.title}” and its webinar records (${summary})? Shared CRM contacts and Google connection are retained.`
        );
        if (!confirmed) return;
        await mutations.remove.mutateAsync({ id: session.id, version: preview.version });
        router.push("/dashboard/webinars");
        return;
      }
      if (action === "schedule") {
        await mutations.schedule.mutateAsync({ id: session.id, session });
      } else {
        const previewResponse = await fetch(`/api/webinars/${encodeURIComponent(session.id)}/cancel-preview`);
        const previewPayload = (await previewResponse.json()) as {
          data?: { title: string; version: number; recipient_count: number; scheduled_start: string | null; timezone: string };
          error?: { message?: string };
        };
        if (!previewResponse.ok || !previewPayload.data) throw new Error(previewPayload.error?.message ?? "Could not load cancellation preview.");
        const preview = previewPayload.data;
        const start = preview.scheduled_start ? formatDate(preview.scheduled_start, preview.timezone) : "time not set";
        const confirmed = window.confirm(
          `Cancel “${preview.title}” scheduled for ${start}? ${preview.recipient_count} registrants will be notified.`
        );
        if (!confirmed) return;
        const result = (await mutations.action.mutateAsync({
          id: session.id,
          action,
          payload: { expected_version: preview.version, expected_recipient_count: preview.recipient_count },
        })) as { notifications: { status: string; recipients: number; queued: number } };
        await load();
        setActionNotice(
          result.notifications.status === "queued"
            ? `${result.notifications.queued} cancellation notification(s) queued for delivery.`
            : result.notifications.status === "partially_queued"
            ? `${result.notifications.queued} cancellation notification(s) queued. Some recipients need recovery.`
            : "Webinar cancelled."
        );
        return;
      }
      await load();
    } catch (caught) {
      setActionError(caught instanceof Error ? caught.message : `Unable to ${action} this webinar.`);
    } finally {
      setBusy("");
    }
  }

  if (loading) {
    return (
      <main className="mx-auto w-full max-w-7xl px-4 py-16 text-center text-xs text-muted-foreground" role="status">
        <div className="inline-block size-5 animate-spin rounded-full border-2 border-primary border-r-transparent mb-2" />
        <p>Loading webinar details...</p>
      </main>
    );
  }

  if (error && !session) {
    return (
      <main className="mx-auto w-full max-w-7xl px-4 py-16 text-center">
        <p role="alert" className="text-xs font-semibold text-status-danger-fg">{error}</p>
        <Button variant="outline" size="sm" className="mt-4 text-xs" onClick={() => { void load(); }}>
          Try again
        </Button>
      </main>
    );
  }

  if (!session) return null;

  const isLive = session.status === "live";

  return (
    <main className="mx-auto w-full max-w-7xl space-y-6 px-4 py-6 sm:px-6 lg:px-8">
      {/* Breadcrumb & Header Hub */}
      <div className="flex flex-col gap-4 border-b border-border/60 pb-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <Link
            href="/dashboard/webinars"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft size="13" /> All Webinars
          </Link>
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="font-display text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
              {session.title}
            </h1>
            <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] uppercase tracking-wide ${statusClass(session.status)}`}>
              {isLive && <span className="h-1.5 w-1.5 rounded-full bg-status-success-fg animate-ping" />}
              {statusLabel(session.status)}
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
            <span>{session.seriesTitle ? `Series: ${session.seriesTitle}` : "Standalone session"}</span>
            <span>·</span>
            <span>Version {session.version ?? 1}</span>
            {session.timezone && (
              <>
                <span>·</span>
                <span className="font-mono">{session.timezone}</span>
              </>
            )}
          </div>
        </div>

        {/* Action Button Strip */}
        <div className="flex flex-wrap items-center gap-2">
          {session.meetingUrl && (
            <Button variant="outline" size="sm" asChild className="gap-1.5 text-xs h-8.5 bg-status-success-bg/30 text-status-success-fg border-status-success-border hover:bg-status-success-bg/50">
              <a href={session.meetingUrl} target="_blank" rel="noreferrer">
                <VideoPlay size="14" /> Join Stream
              </a>
            </Button>
          )}

          {session.status !== "cancelled" && session.status !== "completed" && session.status !== "live" && (
            <Button variant="outline" size="sm" asChild className="gap-1.5 text-xs h-8.5">
              <Link href={`/dashboard/webinars/${session.id}/edit`}>
                <Edit2 size="13" /> Edit Details
              </Link>
            </Button>
          )}

          {session.status === "draft" && (
            <Button
              variant="brand"
              size="sm"
              onClick={() => void run("schedule")}
              disabled={Boolean(busy)}
              className="text-xs h-8.5"
            >
              {busy === "schedule" ? "Scheduling..." : "Schedule Event"}
            </Button>
          )}

          {(session.status === "scheduled" || session.status === "live") && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => void run("cancel")}
              disabled={Boolean(busy)}
              className="text-xs h-8.5 text-status-danger-fg hover:bg-status-danger-bg"
            >
              {busy === "cancel" ? "Cancelling..." : "Cancel Event"}
            </Button>
          )}

          <Button
            variant="destructive"
            size="sm"
            onClick={() => void run("delete")}
            disabled={Boolean(busy)}
            className="text-xs h-8.5 gap-1.5"
          >
            <Trash size="13" />
            {busy === "delete" ? "Deleting..." : "Delete"}
          </Button>
        </div>
      </div>

      {/* Notice & Error Banners */}
      {error && (
        <p role="alert" className="rounded-sm border border-status-danger-border bg-status-danger-bg px-4 py-2.5 text-xs font-semibold text-status-danger-fg">
          {error}
        </p>
      )}
      {actionNotice && (
        <p role="status" className="rounded-sm border border-status-warning-border bg-status-warning-bg px-4 py-2.5 text-xs font-semibold text-status-warning-fg">
          {actionNotice}
        </p>
      )}

      {/* Sleek Tab Bar with Icon & Count Badges */}
      <nav aria-label="Webinar sections" className="flex items-center gap-1.5 overflow-x-auto border-b border-border/60 pb-1">
        {(
          [
            { id: "overview", label: "Overview", icon: VideoPlay },
            { id: "registration", label: "Registrations", icon: People, count: session.registrations?.length ?? session.registrationCount },
            { id: "attendance", label: "Attendance", icon: TickCircle, count: session.attendance?.participantCount },
            { id: "followup", label: "Follow-up", icon: DirectSend },
            { id: "analytics", label: "Analytics & Feedback", icon: Chart2, count: session.feedback?.responseCount },
          ] as const
        ).map((item) => {
          const Icon = item.icon;
          const active = tab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setTab(item.id as Tab)}
              className={`inline-flex items-center gap-1.5 rounded-sm px-3 py-2 text-xs font-semibold transition-colors cursor-pointer border-b-2 -mb-[5px] ${
                active
                  ? "border-primary text-foreground bg-muted/30"
                  : "border-transparent text-muted-foreground hover:bg-muted/20 hover:text-foreground"
              }`}
            >
              <Icon size="14" />
              <span>{item.label}</span>
              {"count" in item && item.count != null && (
                <span className={`rounded-full px-1.5 py-0.2 text-[10px] font-mono ${active ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
                  {item.count}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Tab Panels */}
      {tab === "overview" && <Overview session={session} />}
      {tab === "registration" && <Registration session={session} />}
      {tab === "attendance" && <Attendance session={session} />}
      {tab === "followup" && <Followup session={session} onSaved={load} />}
      {tab === "analytics" && <Analytics session={session} />}
    </main>
  );
}

function Overview({ session }: { session: WebinarDetail }) {
  return (
    <div className="space-y-6">
      {/* Hero Banner: Stream & Registration Action Hub */}
      <div className="rounded-sm border border-border/70 bg-card p-5 sm:p-6 shadow-xs">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-2 max-w-3xl">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-subtle px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-brand-text">
                Live Broadcast
              </span>
              <span className="text-xs text-muted-foreground">
                {formatDate(session.scheduledStart, session.timezone)}
              </span>
            </div>
            <h2 className="font-display text-xl font-bold text-foreground">
              {session.title}
            </h2>
            <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
              {session.description || "No session description provided yet."}
            </p>
          </div>

          <div className="flex flex-col sm:flex-row lg:flex-col gap-2.5 shrink-0 min-w-[220px]">
            {session.meetingUrl ? (
              <a
                href={session.meetingUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex h-9 items-center justify-center gap-2 rounded-sm bg-primary px-4 text-xs font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
              >
                <VideoPlay size="15" variant="Bold" /> Join Google Meet
              </a>
            ) : (
              <div className="rounded-sm border border-border bg-muted/40 p-2 text-center text-[11px] text-muted-foreground">
                Meet link provisions when scheduled
              </div>
            )}

            {session.publicSlug && session.status !== "draft" && session.status !== "cancelled" ? (
              <RegistrationLinkActions slug={session.publicSlug} title={session.title} />
            ) : (
              <span className="text-center text-[11px] text-muted-foreground">
                Registration closed or draft
              </span>
            )}
          </div>
        </div>
      </div>

      {/* High-Density 3-Column Logistics & Funnel Grid */}
      <div className="grid gap-4 md:grid-cols-3">
        {/* Card 1: Logistics & Host */}
        <Card className="border-border/70 shadow-xs">
          <CardHeader className="pb-3 border-b border-border/50">
            <CardTitle className="text-sm font-bold uppercase tracking-wider flex items-center gap-2 text-foreground">
              <Calendar size="15" className="text-brand-text" /> Event Logistics
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4 space-y-3">
            <InfoItem label="Lead Presenter" value={session.presenter || "Not specified"} />
            <InfoItem
              label="Start Time"
              value={`${formatDate(session.scheduledStart, session.timezone)}${session.timezone ? ` (${session.timezone})` : ""}`}
            />
            <InfoItem label="Scheduled Duration" value={session.durationMinutes ? `${session.durationMinutes} minutes` : "60 minutes"} />
            <InfoItem
              label="Seat Capacity"
              value={session.capacity ? `${session.capacity} seats` : "Unlimited attendees"}
            />
          </CardContent>
        </Card>

        {/* Card 2: Funnel & Registration */}
        <Card className="border-border/70 shadow-xs">
          <CardHeader className="pb-3 border-b border-border/50">
            <CardTitle className="text-sm font-bold uppercase tracking-wider flex items-center gap-2 text-foreground">
              <People size="15" className="text-status-success-fg" /> Attendance Funnel
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4 space-y-3">
            <InfoItem
              label="Total Registered"
              value={
                <span className="font-mono font-bold text-foreground">
                  {session.registrationCount ?? 0} {session.capacity ? `/ ${session.capacity}` : "confirmed"}
                </span>
              }
            />
            <InfoItem
              label="Meet Sync Status"
              value={
                <span className="capitalize font-semibold text-foreground">
                  {session.attendance?.importStatus || "Awaiting Event"}
                </span>
              }
            />
            <InfoItem
              label="Attended Count"
              value={
                session.attendance?.attendedCount != null
                  ? `${session.attendance.attendedCount} participants`
                  : "Sync available after session"
              }
            />
            <InfoItem
              label="Attendance Rate"
              value={
                session.attendance?.attendedCount && session.registrationCount
                  ? `${Math.round((session.attendance.attendedCount / session.registrationCount) * 100)}% turnout`
                  : "Pending stream conclusion"
              }
            />
          </CardContent>
        </Card>

        {/* Card 3: Post-Event Engagement */}
        <Card className="border-border/70 shadow-xs">
          <CardHeader className="pb-3 border-b border-border/50">
            <CardTitle className="text-sm font-bold uppercase tracking-wider flex items-center gap-2 text-foreground">
              <DirectSend size="15" className="text-brand-text" /> Follow-up & Feedback
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4 space-y-3">
            <InfoItem
              label="Automated Follow-up"
              value={
                <span className="capitalize font-semibold text-foreground">
                  {session.followup?.status || (session.followupEnabled ? "Enabled" : "Disabled")}
                </span>
              }
            />
            <InfoItem
              label="Feedback Received"
              value={
                <span className="font-mono font-bold text-foreground">
                  {session.feedback?.responseCount ?? 0} responses
                </span>
              }
            />
            <InfoItem
              label="Average Session Rating"
              value={
                session.feedback?.averageRating != null
                  ? `${session.feedback.averageRating} / 5.0 ⭐`
                  : "No feedback yet"
              }
            />
            <InfoItem
              label="Product Conversions"
              value={`${session.feedback?.productInterestCount ?? 0} expressed interest`}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Registration({ session }: { session: WebinarDetail }) {
  const registrations = session.registrations ?? [];
  const [search, setSearch] = React.useState("");

  const filtered = registrations.filter((r) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return r.name.toLowerCase().includes(q) || r.email.toLowerCase().includes(q);
  });

  const capacityPct = session.capacity ? Math.min(100, Math.round((registrations.length / session.capacity) * 100)) : null;

  return (
    <Card className="border-border/70 shadow-xs">
      <CardHeader className="border-b border-border/50 pb-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="text-base font-bold text-foreground">
              Attendee Roster ({registrations.length})
            </CardTitle>
            <CardDescription className="text-xs">
              {session.capacity ? `Capacity: ${session.capacity} attendees (${registrations.length} reserved).` : "Unlimited attendee capacity."}
            </CardDescription>
          </div>

          <div className="flex items-center gap-3">
            {session.publicSlug && session.status !== "draft" && session.status !== "cancelled" && (
              <RegistrationLinkActions slug={session.publicSlug} title={session.title} />
            )}
          </div>
        </div>

        {/* Capacity Progress Bar */}
        {capacityPct !== null && (
          <div className="mt-3 space-y-1">
            <div className="flex justify-between text-[11px] text-muted-foreground">
              <span>Capacity Filled</span>
              <span className="font-mono font-semibold">{capacityPct}%</span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
              <div
                className="h-full bg-brand transition-all"
                style={{ width: `${capacityPct}%` }}
              />
            </div>
          </div>
        )}
      </CardHeader>

      <CardContent className="pt-4 space-y-3">
        {/* Search Bar */}
        {registrations.length > 0 && (
          <div className="relative max-w-sm">
            <SearchNormal1 size="13" className="absolute left-2.5 top-2.5 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search by attendee name or email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-8.5 w-full rounded-sm border border-input bg-card pl-8 pr-3 text-xs text-foreground placeholder:text-muted-foreground outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring"
            />
          </div>
        )}

        {!session.registrations && <Pending message="Registration records are loading from the database..." />}
        {session.registrations && registrations.length === 0 && <Empty message="No attendees have registered for this session yet." />}

        {registrations.length > 0 && (
          <div className="overflow-x-auto rounded-sm border border-border/60">
            <table className="w-full min-w-[560px] text-left text-xs">
              <thead>
                <tr className="border-b border-border bg-muted/30 text-[11px] font-semibold text-muted-foreground">
                  <th className="px-3 py-2.5">Attendee</th>
                  <th className="px-3 py-2.5">Email</th>
                  <th className="px-3 py-2.5">Registered Date</th>
                  <th className="px-3 py-2.5">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {filtered.map((r) => (
                  <tr key={r.id} className="hover:bg-accent/30 transition-colors">
                    <td className="px-3 py-2.5">
                      <div className="flex items-center gap-2">
                        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-brand-subtle text-[10px] font-bold text-brand-text">
                          {r.name.slice(0, 2).toUpperCase()}
                        </span>
                        <span className="font-semibold text-foreground">{r.name}</span>
                      </div>
                    </td>
                    <td className="px-3 py-2.5 font-mono text-muted-foreground">{r.email}</td>
                    <td className="px-3 py-2.5 text-muted-foreground">{formatDate(r.registeredAt)}</td>
                    <td className="px-3 py-2.5">
                      <span className="inline-flex rounded-full bg-status-success-bg px-2 py-0.5 text-[10px] font-semibold text-status-success-fg">
                        {r.status || "Registered"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function RegistrationLinkActions({ slug, title }: { slug: string; title: string }) {
  const [open, setOpen] = React.useState(false);
  const [copied, setCopied] = React.useState(false);

  React.useEffect(() => {
    if (!open) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [open]);

  const getUrl = () => new URL(`/webinars/${encodeURIComponent(slug)}`, window.location.origin).toString();
  const shareText = `Register for ${title}`;

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(getUrl());
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  async function shareNative() {
    if (!navigator.share) {
      await copyLink();
      return;
    }
    try {
      await navigator.share({ title, text: shareText, url: getUrl() });
    } catch {
      // User cancelled
    }
  }

  function shareTo(platform: "whatsapp" | "linkedin" | "facebook" | "x" | "email") {
    const url = getUrl();
    const encodedUrl = encodeURIComponent(url);
    const encodedText = encodeURIComponent(shareText);
    const targets = {
      whatsapp: `https://wa.me/?text=${encodedText}%20${encodedUrl}`,
      linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`,
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
      x: `https://twitter.com/intent/tweet?text=${encodedText}&url=${encodedUrl}`,
      email: `mailto:?subject=${encodedText}&body=${encodedUrl}`,
    };
    if (platform === "email") window.location.href = targets[platform];
    else window.open(targets[platform], "_blank", "noopener,noreferrer");
  }

  return (
    <>
      <div className="inline-flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setOpen(true)}
          className="h-8.5 gap-1.5 text-xs cursor-pointer"
        >
          <Share size="13" /> Share Page
        </Button>
        <Button
          variant="brand"
          size="sm"
          onClick={() => void copyLink()}
          className="h-8.5 gap-1.5 text-xs cursor-pointer"
        >
          <Copy size="13" /> {copied ? "Copied!" : "Copy Link"}
        </Button>
      </div>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/35 p-4 backdrop-blur-xs"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setOpen(false);
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="registration-share-title"
            className="w-full max-w-md rounded-lg border border-border bg-popover p-5 text-popover-foreground shadow-lg sm:p-6 space-y-4"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 id="registration-share-title" className="font-display text-base font-bold">
                  Share Registration Link
                </h2>
                <p className="mt-0.5 text-xs text-muted-foreground">Invite attendees to register for {title}</p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="inline-flex size-7 items-center justify-center rounded text-muted-foreground hover:bg-accent hover:text-foreground cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-3 gap-2.5">
              <button
                type="button"
                onClick={() => void shareTo("whatsapp")}
                className="flex flex-col items-center justify-center gap-1.5 rounded-sm border border-border/70 bg-card p-3 text-center hover:bg-accent transition-colors cursor-pointer"
              >
                <Whatsapp size="20" className="text-status-success-fg" />
                <span className="text-[11px] font-medium">WhatsApp</span>
              </button>
              <button
                type="button"
                onClick={() => void shareTo("linkedin")}
                className="flex flex-col items-center justify-center gap-1.5 rounded-sm border border-border/70 bg-card p-3 text-center hover:bg-accent transition-colors cursor-pointer"
              >
                <span className="text-sm font-bold text-foreground">in</span>
                <span className="text-[11px] font-medium">LinkedIn</span>
              </button>
              <button
                type="button"
                onClick={() => void shareTo("facebook")}
                className="flex flex-col items-center justify-center gap-1.5 rounded-sm border border-border/70 bg-card p-3 text-center hover:bg-accent transition-colors cursor-pointer"
              >
                <Facebook size="20" className="text-brand-text" />
                <span className="text-[11px] font-medium">Facebook</span>
              </button>
              <button
                type="button"
                onClick={() => void shareTo("x")}
                className="flex flex-col items-center justify-center gap-1.5 rounded-sm border border-border/70 bg-card p-3 text-center hover:bg-accent transition-colors cursor-pointer"
              >
                <span className="text-sm font-bold text-foreground">𝕏</span>
                <span className="text-[11px] font-medium">X (Twitter)</span>
              </button>
              <button
                type="button"
                onClick={() => void shareTo("email")}
                className="flex flex-col items-center justify-center gap-1.5 rounded-sm border border-border/70 bg-card p-3 text-center hover:bg-accent transition-colors cursor-pointer"
              >
                <Sms size="20" className="text-muted-foreground" />
                <span className="text-[11px] font-medium">Email</span>
              </button>
              <button
                type="button"
                onClick={() => void shareNative()}
                className="flex flex-col items-center justify-center gap-1.5 rounded-sm border border-border/70 bg-card p-3 text-center hover:bg-accent transition-colors cursor-pointer"
              >
                <Share size="20" className="text-muted-foreground" />
                <span className="text-[11px] font-medium">More</span>
              </button>
            </div>

            <div className="flex gap-2 pt-2 border-t border-border">
              <Button
                type="button"
                variant="brand"
                onClick={() => void copyLink()}
                className="flex-1 text-xs gap-1.5 h-9 cursor-pointer"
              >
                <Copy size="14" /> {copied ? "Copied to clipboard!" : "Copy URL"}
              </Button>
              <Button
                type="button"
                variant="outline"
                asChild
                className="text-xs h-9"
              >
                <a href={getUrl()} target="_blank" rel="noreferrer">
                  Open ↗
                </a>
              </Button>
            </div>
          </section>
        </div>
      )}
    </>
  );
}

function Attendance({ session }: { session: WebinarDetail }) {
  const query = useWebinarAttendance(session.id);
  const actions = useWebinarAttendanceActions(session.id);
  const attendance = query.data;
  const error = query.error instanceof Error ? query.error.message : "";

  async function review(participantId: string, value: string) {
    const [disposition, registrationId] = value.startsWith("matched:") ? ["matched", value.slice(8)] : [value, ""];
    try {
      await actions.reviewParticipant.mutateAsync({ participantId, disposition, registration_id: registrationId || null });
    } catch {
      // Handled in component
    }
  }

  return (
    <div className="space-y-6">
      <Card className="border-border/70 shadow-xs">
        <CardHeader className="border-b border-border/50 pb-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle className="text-base font-bold text-foreground">Meet Attendance Sync</CardTitle>
              <CardDescription className="text-xs">
                Sync logs directly from Google Meet and reconcile attendees with CRM contacts.
              </CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              disabled={actions.importAttendance.isPending || !attendance?.integration.connected || !attendance.integration.scope_granted}
              onClick={() => actions.importAttendance.mutate()}
              className="text-xs h-8.5 gap-1.5 cursor-pointer"
            >
              <Refresh2 size="13" className={actions.importAttendance.isPending ? "animate-spin" : ""} />
              {actions.importAttendance.isPending ? "Syncing..." : "Sync Attendance Now"}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="pt-4 space-y-4">
          {query.isLoading && <Pending message="Loading attendance sync data from Google Meet..." />}
          {error && <p role="alert" className="rounded-sm border border-status-danger-border bg-status-danger-bg p-3 text-xs text-status-danger-fg">{error}</p>}

          {attendance && (
            <>
              {!attendance.integration.connected && (
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-sm border border-status-warning-border bg-status-warning-bg p-3 text-xs text-status-warning-fg">
                  <div className="flex items-center gap-2">
                    <span className="font-bold">G</span>
                    <span>Google Meet connection required to sync participant attendance duration logs.</span>
                  </div>
                  <Button variant="outline" size="sm" asChild className="h-7 px-2.5 text-[11px] shrink-0 border-status-warning-border text-foreground hover:bg-background">
                    <Link href="/dashboard/webinars">Connect in Workspace</Link>
                  </Button>
                </div>
              )}

              {/* 4-Card Attendance Metric Strip */}
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <div className="rounded-sm border border-border/60 bg-muted/20 p-3">
                  <p className="text-[10px] uppercase font-semibold text-muted-foreground">Registered</p>
                  <p className="font-display text-xl font-bold text-foreground mt-1">{attendance.registrations.length}</p>
                </div>
                <div className="rounded-sm border border-border/60 bg-muted/20 p-3">
                  <p className="text-[10px] uppercase font-semibold text-muted-foreground">Meet Attendees</p>
                  <p className="font-display text-xl font-bold text-status-success-fg mt-1">{attendance.counts.imported_participants}</p>
                </div>
                <div className="rounded-sm border border-border/60 bg-muted/20 p-3">
                  <p className="text-[10px] uppercase font-semibold text-muted-foreground">Join Sessions</p>
                  <p className="font-display text-xl font-bold text-foreground mt-1">{attendance.counts.imported_join_sessions}</p>
                </div>
                <div className="rounded-sm border border-border/60 bg-muted/20 p-3">
                  <p className="text-[10px] uppercase font-semibold text-muted-foreground">Sync State</p>
                  <p className="font-display text-sm font-bold capitalize text-brand-text mt-1">{attendance.import?.status ?? "Not started"}</p>
                </div>
              </div>

              <div className="flex items-center justify-between text-xs text-muted-foreground border-t border-border/50 pt-3">
                <span>Last Sync: {attendance.import?.last_successful_sync_at ? formatDate(attendance.import.last_successful_sync_at) : "None yet"}</span>
                <span>{attendance.no_show_finalization_ready ? "Attendance review complete" : "Review pending"}</span>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Participants Table */}
      {attendance && attendance.participants.length > 0 && (
        <Card className="border-border/70 shadow-xs">
          <CardHeader className="pb-3 border-b border-border/50">
            <CardTitle className="text-sm font-bold uppercase tracking-wider text-foreground">
              Imported Google Meet Participants ({attendance.participants.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="overflow-x-auto rounded-sm border border-border/60">
              <table className="w-full min-w-[700px] text-left text-xs">
                <thead>
                  <tr className="border-b border-border bg-muted/30 text-[11px] font-semibold text-muted-foreground">
                    <th className="px-3 py-2.5">Participant</th>
                    <th className="px-3 py-2.5">Match & Review</th>
                    <th className="px-3 py-2.5">Connection History</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {attendance.participants.map((participant) => {
                    const joinSessions = attendance.participant_sessions.filter((item) => item.participant_id === participant.id);
                    const disposition = participant.registration_id ? "matched:" + participant.registration_id : participant.review_disposition;
                    return (
                      <tr key={participant.id} className="hover:bg-accent/30 transition-colors">
                        <td className="px-3 py-2.5">
                          <p className="font-semibold text-foreground">{participant.display_name || "Unidentified participant"}</p>
                          <p className="text-[11px] text-muted-foreground">{participant.email || participant.identity_type}</p>
                        </td>
                        <td className="px-3 py-2.5">
                          <select
                            disabled={actions.reviewParticipant.isPending}
                            value={disposition}
                            onChange={(event) => void review(participant.id, event.target.value)}
                            className="h-8 w-full max-w-56 rounded-sm border border-input bg-card px-2 text-xs text-foreground outline-none cursor-pointer"
                          >
                            <option value="unresolved">Needs review</option>
                            <option value="host">Host / Organizer</option>
                            <option value="unregistered">Unregistered guest</option>
                            {attendance.registrations.map((registration) => (
                              <option key={registration.id} value={"matched:" + registration.id}>
                                Match: {registration.full_name}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="px-3 py-2.5 text-muted-foreground font-mono text-[11px]">
                          {joinSessions.length ? (
                            joinSessions.map((item) => (
                              <span key={item.id} className="block">
                                {formatDate(item.joined_at)} → {item.left_at ? formatDate(item.left_at) : "Active"}
                              </span>
                            ))
                          ) : (
                            "No session data"
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function Followup({ session, onSaved }: { session: WebinarDetail; onSaved: () => Promise<void> }) {
  const mutations = useWebinarMutations();
  const current = session.followup;
  const [scheduleAt, setScheduleAt] = React.useState("");
  const [recipientCount, setRecipientCount] = React.useState<number | null>(null);
  const [recipientPreview, setRecipientPreview] = React.useState<Array<{ registration_id: string; name: string; email: string; audience: string }>>([]);
  const [delivery, setDelivery] = React.useState<Record<string, number>>({});

  React.useEffect(() => {
    let active = true;
    void fetch(`/api/webinars/${encodeURIComponent(session.id)}/followup`)
      .then((r) => r.json())
      .then((body) => {
        if (!active || !body.data) return;
        setRecipientCount(body.data.eligible_recipient_count);
        setRecipientPreview(body.data.recipients ?? []);
        setDelivery(body.data.delivery ?? {});
        if (body.data.scheduled_for) {
          const d = new Date(body.data.scheduled_for);
          d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
          setScheduleAt(d.toISOString().slice(0, 16));
        } else {
          const d = new Date(Date.now() + 3600000);
          d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
          setScheduleAt(d.toISOString().slice(0, 16));
        }
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [session.id, session.followup?.status]);

  const [enabled, setEnabled] = React.useState(current?.enabled ?? session.followupEnabled ?? false);
  const [attendeeSubject, setAttendeeSubject] = React.useState(current?.attendeeSubject ?? "Thank you for attending!");
  const [attendeeBody, setAttendeeBody] = React.useState(current?.attendeeBody ?? "Thanks for joining us. We would love to hear whether the session was helpful.");
  const [noShowSubject, setNoShowSubject] = React.useState(current?.noShowSubject ?? "We missed you at the webinar");
  const [noShowBody, setNoShowBody] = React.useState(current?.noShowBody ?? "We noticed you could not join. Here is a link to access the resources and share feedback.");
  const [saving, setSaving] = React.useState(false);
  const [message, setMessage] = React.useState("");

  async function save(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setMessage("");
    try {
      await mutations.action.mutateAsync({
        id: session.id,
        action: "followup",
        payload: {
          expected_version: session.version,
          action: "save_drafts",
          enabled,
          attendee_subject: attendeeSubject,
          attendee_body: attendeeBody,
          no_show_subject: noShowSubject,
          no_show_body: noShowBody,
        },
      });
      await onSaved();
      setMessage("Follow-up drafts saved successfully.");
    } catch (caught) {
      setMessage(caught instanceof Error ? caught.message : "The follow-up action is not available yet.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={save} className="space-y-6">
      <Card className="border-border/70 shadow-xs">
        <CardHeader className="border-b border-border/50 pb-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle className="text-base font-bold text-foreground">Post-Webinar Follow-Up Automation</CardTitle>
              <CardDescription className="text-xs">
                Tailor separate communications for verified attendees versus no-shows with feedback forms.
              </CardDescription>
            </div>
            <label className="flex items-center gap-2 text-xs font-semibold cursor-pointer">
              <input
                type="checkbox"
                checked={enabled}
                onChange={(e) => setEnabled(e.target.checked)}
                className="h-4 w-4 accent-brand rounded"
              />
              <span>Enable Automation</span>
            </label>
          </div>
        </CardHeader>

        <CardContent className="pt-5 space-y-5">
          {/* Side-by-side Message Editors */}
          <div className="grid gap-4 lg:grid-cols-2">
            <MessageDraft
              label="Verified Attendee Message"
              subject={attendeeSubject}
              body={attendeeBody}
              setSubject={setAttendeeSubject}
              setBody={setAttendeeBody}
            />
            <MessageDraft
              label="No-Show Re-engagement Message"
              subject={noShowSubject}
              body={noShowBody}
              setSubject={setNoShowSubject}
              setBody={setNoShowBody}
            />
          </div>

          {/* Delivery & Schedule Bar */}
          <div className="grid gap-4 rounded-sm border border-border/60 bg-muted/20 p-4 sm:grid-cols-2">
            <div>
              <p className="text-xs font-semibold text-foreground">Recipient Audience</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {recipientCount == null ? "Complete attendance review first" : `${recipientCount} verified recipients`}
              </p>
            </div>
            <div>
              <label className="text-xs font-semibold text-foreground block">
                Schedule Delivery After Session
                <input
                  type="datetime-local"
                  value={scheduleAt}
                  onChange={(e) => setScheduleAt(e.target.value)}
                  className="mt-1 block h-9 w-full rounded-sm border border-input bg-card px-2.5 text-xs text-foreground outline-none"
                />
              </label>
            </div>
          </div>

          {/* Delivery Telemetry Stats */}
          <div className="rounded-sm border border-border/60 bg-card p-3 text-xs">
            <span className="font-semibold text-foreground">Delivery Outcomes:</span>{" "}
            <span className="text-muted-foreground">
              Accepted: {delivery.provider_accepted ?? 0} · Pending: {(delivery.queued ?? 0) + (delivery.processing ?? 0)} · Failed: {delivery.failed ?? 0}
            </span>
          </div>

          {message && <p role="status" className="text-xs font-semibold text-brand-text">{message}</p>}
        </CardContent>
      </Card>

      <div className="flex justify-end gap-2">
        <Button type="submit" variant="outline" size="sm" disabled={saving} className="text-xs h-9 cursor-pointer">
          {saving ? "Saving..." : "Save Drafts"}
        </Button>
        <Button
          type="button"
          variant="brand"
          size="sm"
          disabled={saving || !enabled || recipientCount == null || !scheduleAt}
          onClick={async () => {
            setSaving(true);
            setMessage("");
            try {
              await mutations.action.mutateAsync({
                id: session.id,
                action: "followup",
                payload: {
                  action: "save_drafts",
                  expected_version: session.version,
                  enabled,
                  attendee_subject: attendeeSubject,
                  attendee_body: attendeeBody,
                  no_show_subject: noShowSubject,
                  no_show_body: noShowBody,
                },
              });
              const fresh = await fetch(`/api/webinars/${encodeURIComponent(session.id)}/followup`).then((r) => r.json());
              if (!fresh.data) throw new Error(fresh.error?.message || "Could not refresh follow-up review.");
              await mutations.action.mutateAsync({
                id: session.id,
                action: "followup",
                payload: {
                  action: "request_approval",
                  scheduled_for: new Date(scheduleAt).toISOString(),
                  expected_version: fresh.data.version,
                  expected_recipient_count: recipientCount,
                },
              });
              await onSaved();
              setMessage("Follow-up emails scheduled for the reviewed audience.");
            } catch (caught) {
              setMessage(caught instanceof Error ? caught.message : "Follow-up action not available.");
            } finally {
              setSaving(false);
            }
          }}
          className="text-xs h-9 cursor-pointer"
        >
          Review & Schedule Delivery
        </Button>
      </div>
    </form>
  );
}

function MessageDraft({
  label,
  subject,
  body,
  setSubject,
  setBody,
}: {
  label: string;
  subject: string;
  body: string;
  setSubject: (value: string) => void;
  setBody: (value: string) => void;
}) {
  return (
    <div className="space-y-2.5 rounded-sm border border-border/60 bg-muted/20 p-4">
      <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">{label}</h3>
      <Input
        value={subject}
        onChange={(e) => setSubject(e.target.value)}
        aria-label={`${label} subject`}
        placeholder="Subject line"
        className="h-8.5 text-xs bg-card"
      />
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        aria-label={`${label} body`}
        rows={5}
        className="w-full rounded-sm border border-input bg-card px-3 py-2 text-xs text-foreground outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring"
      />
    </div>
  );
}

function Analytics({ session }: { session: WebinarDetail }) {
  const feedback = session.feedback;
  const attendance = session.attendance;

  return (
    <div className="space-y-6">
      {/* 4-Card Analytics Strip */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-sm border border-border/70 bg-card p-4">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Responses</span>
            <Chart2 size="16" className="text-brand-text" />
          </div>
          <p className="mt-2 font-display text-2xl font-bold tabular-nums text-foreground">
            {feedback?.responseCount ?? 0}
          </p>
          <p className="mt-1 text-[11px] text-muted-foreground">submitted surveys</p>
        </div>

        <div className="rounded-sm border border-border/70 bg-card p-4">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Avg Rating</span>
            <TickCircle size="16" className="text-status-success-fg" />
          </div>
          <p className="mt-2 font-display text-2xl font-bold tabular-nums text-status-success-fg">
            {feedback?.averageRating ? `${feedback.averageRating} / 5` : "—"}
          </p>
          <p className="mt-1 text-[11px] text-muted-foreground">overall satisfaction</p>
        </div>

        <div className="rounded-sm border border-border/70 bg-card p-4">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Helpful Rate</span>
            <People size="16" className="text-brand-text" />
          </div>
          <p className="mt-2 font-display text-2xl font-bold tabular-nums text-foreground">
            {feedback?.helpfulCount != null && feedback?.eligibleCount
              ? `${Math.round((feedback.helpfulCount / feedback.eligibleCount) * 100)}%`
              : "—"}
          </p>
          <p className="mt-1 text-[11px] text-muted-foreground">
            {feedback?.helpfulCount ?? 0} found it useful
          </p>
        </div>

        <div className="rounded-sm border border-border/70 bg-card p-4">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Product Leads</span>
            <DirectSend size="16" className="text-brand-text" />
          </div>
          <p className="mt-2 font-display text-2xl font-bold tabular-nums text-foreground">
            {feedback?.productInterestCount ?? 0}
          </p>
          <p className="mt-1 text-[11px] text-muted-foreground">inquiries captured</p>
        </div>
      </div>

      {/* Attendee Feedback Cards */}
      <Card className="border-border/70 shadow-xs">
        <CardHeader className="pb-3 border-b border-border/50">
          <CardTitle className="text-sm font-bold uppercase tracking-wider text-foreground">
            Attendee Reviews & Verbatim Comments
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-4">
          {feedback?.responses?.length ? (
            <div className="divide-y divide-border/60">
              {feedback.responses.map((response) => (
                <div key={response.registrationId} className="py-3.5 first:pt-0 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-xs text-foreground">{response.name}</span>
                    <span className="font-mono text-xs text-brand-text font-bold">
                      {response.rating ? `${response.rating} / 5 ⭐` : "No rating"}
                    </span>
                  </div>
                  {response.comments && (
                    <p className="text-xs text-muted-foreground italic">&ldquo;{response.comments}&rdquo;</p>
                  )}
                  <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
                    <span>{response.wasUseful ? "✓ Marked Helpful" : "Marked Not Helpful"}</span>
                    <span>·</span>
                    <span>Product Interest: {response.productInterest ? "Yes" : "No"}</span>
                    <span>·</span>
                    <span>Marketing Opt-in: {response.marketingOptIn ? "Opted In" : "No Consent"}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <Empty message="No attendee feedback surveys have been recorded yet." />
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function InfoItem({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between border-b border-border/40 pb-2 last:border-0 last:pb-0 text-xs">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium text-foreground text-right">{value}</span>
    </div>
  );
}

function Empty({ message }: { message: string }) {
  return <p className="py-12 text-center text-xs text-muted-foreground">{message}</p>;
}

function Pending({ message }: { message: string }) {
  return <div className="rounded-sm bg-status-warning-bg p-3 text-xs text-status-warning-fg">{message}</div>;
}
