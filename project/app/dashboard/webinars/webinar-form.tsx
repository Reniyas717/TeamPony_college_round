"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Calendar, Clock, Global, People, VideoPlay } from "iconsax-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { statusLabel, WebinarApiPayload, WebinarSession, WebinarStatus } from "./webinar-api";
import { useWebinarMutations } from "@/hooks/webinars/use-webinar-mutations";
import { useWebinarSeries } from "@/hooks/webinars/use-webinars";
import { isoToLocalTimeInZone, localTimeInZoneToIso } from "./webinar-time";

type FormValues = {
  title: string;
  description: string;
  presenter: string;
  scheduledStart: string;
  registrationClosesAt: string;
  timezone: string;
  durationMinutes: string;
  capacity: string;
  seriesId: string;
  followupEnabled: boolean;
  productUrl: string;
  lifecycleStatus: WebinarStatus;
};

export function WebinarForm({ initial, mode }: { initial?: WebinarSession; mode: "create" | "edit" }) {
  const router = useRouter();
  const mutations = useWebinarMutations();
  const detectedZone = React.useMemo(() => {
    try {
      return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
    } catch {
      return "UTC";
    }
  }, []);

  const [values, setValues] = React.useState<FormValues>({
    title: initial?.title ?? "",
    description: initial?.description ?? "",
    presenter: initial?.presenter ?? "",
    scheduledStart: isoToLocalTimeInZone(initial?.scheduledStart, initial?.timezone ?? detectedZone),
    registrationClosesAt: isoToLocalTimeInZone(initial?.registrationClosesAt, initial?.timezone ?? detectedZone),
    timezone: initial?.timezone ?? detectedZone,
    durationMinutes: String(initial?.durationMinutes ?? 60),
    capacity: initial?.capacity ? String(initial.capacity) : "",
    seriesId: initial?.seriesId ?? "",
    followupEnabled: initial?.followupEnabled ?? false,
    productUrl: initial?.productUrl ?? "",
    lifecycleStatus: initial?.status ?? "draft",
  });

  const [intent, setIntent] = React.useState<"draft" | "schedule">("draft");
  const seriesQuery = useWebinarSeries();
  const series = seriesQuery.data ?? [];
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState("");
  const readOnlyLifecycle = values.lifecycleStatus === "completed" || values.lifecycleStatus === "live" || values.lifecycleStatus === "cancelled";

  const set = <K extends keyof FormValues>(key: K, value: FormValues[K]) => setValues((current) => ({ ...current, [key]: value }));

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const submitter = (event.nativeEvent as SubmitEvent).submitter as HTMLButtonElement | null;
    const submittedIntent = submitter?.value === "schedule" ? "schedule" : "draft";
    setIntent(submittedIntent);
    setError("");

    if (readOnlyLifecycle) {
      setError(`${statusLabel(values.lifecycleStatus)} sessions are read-only.`);
      return;
    }
    if (!values.title.trim() || !values.description.trim() || !values.presenter.trim()) {
      setError("Title, description, and presenter are required.");
      return;
    }
    if (submittedIntent === "schedule" && !values.scheduledStart) {
      setError("Choose a start time before scheduling the session.");
      return;
    }
    if (initial?.status === "scheduled" && !values.scheduledStart) {
      setError("A scheduled webinar must keep a start time. Cancel it if it should no longer run.");
      return;
    }

    setSaving(true);
    try {
      const payload: WebinarApiPayload = {
        ...(initial?.version ? { expected_version: initial.version } : {}),
        title: values.title.trim(),
        description: values.description.trim(),
        presenter: values.presenter.trim(),
        scheduled_start: values.scheduledStart ? localTimeInZoneToIso(values.scheduledStart, values.timezone) : null,
        registration_closes_at: values.registrationClosesAt ? localTimeInZoneToIso(values.registrationClosesAt, values.timezone) : null,
        timezone: values.timezone,
        duration_minutes: Number(values.durationMinutes),
        capacity: values.capacity ? Number(values.capacity) : null,
        series_id: values.seriesId || null,
        followup_enabled: values.followupEnabled,
        product_url: values.productUrl.trim() || null,
        status: initial?.status === "scheduled" ? "scheduled" : "draft",
      };

      if (mode === "edit" && initial?.status === "scheduled" && (payload.scheduled_start !== initial.scheduledStart || payload.timezone !== initial.timezone)) {
        const previewResponse = await fetch(`/api/webinars/${encodeURIComponent(initial.id)}/reschedule-preview`);
        const previewBody = (await previewResponse.json()) as {
          data?: { version: number; recipient_count: number; recipient_snapshot_hash: string; scheduled_start: string };
          error?: { message?: string };
        };
        if (!previewResponse.ok || !previewBody.data) throw new Error(previewBody.error?.message ?? "Could not load reschedule preview.");
        const preview = previewBody.data;
        const oldTime = new Intl.DateTimeFormat("en", { dateStyle: "full", timeStyle: "short", timeZone: initial.timezone || undefined }).format(new Date(preview.scheduled_start));
        const newTime = new Intl.DateTimeFormat("en", { dateStyle: "full", timeStyle: "short", timeZone: values.timezone }).format(new Date(payload.scheduled_start!));
        if (!window.confirm(`Reschedule “${initial.title}” from ${oldTime} to ${newTime}? ${preview.recipient_count} registered attendees will be notified.`)) {
          setSaving(false);
          return;
        }
        const response = await fetch(`/api/webinars/${encodeURIComponent(initial.id)}/reschedule`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...payload,
            action: "reschedule",
            expected_version: preview.version,
            expected_recipient_count: preview.recipient_count,
            expected_recipient_snapshot_hash: preview.recipient_snapshot_hash,
          }),
        });
        const result = (await response.json()) as {
          data?: { webinar: WebinarSession; notifications: { status: string; queued: number; recipients: number } };
          error?: { message?: string };
        };
        if (!response.ok || !result.data) throw new Error(result.error?.message ?? "Could not reschedule webinar.");
        window.alert(
          result.data.notifications.status === "queued"
            ? `${result.data.notifications.queued} of ${result.data.notifications.recipients} reschedule notification(s) queued.`
            : `Webinar rescheduled.`
        );
        router.push(`/dashboard/webinars/${initial.id}`);
        return;
      }

      const saved = mode === "create" ? await mutations.create.mutateAsync(payload) : await mutations.update.mutateAsync({ id: initial!.id, payload });
      if (submittedIntent === "schedule") {
        await mutations.schedule.mutateAsync({ id: saved.id, session: saved });
      }
      router.push(`/dashboard/webinars/${saved.id}`);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to save this webinar.");
      setSaving(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-2 border-b border-border/60 pb-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Link
            href={mode === "create" ? "/dashboard/webinars" : `/dashboard/webinars/${initial?.id}`}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors mb-2"
          >
            <ArrowLeft size="13" /> {mode === "create" ? "Webinars Workspace" : "Back to Webinar"}
          </Link>
          <h1 className="font-display text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            {mode === "create" ? "Create New Webinar" : "Edit Webinar Session"}
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Configure session details, date & duration, Google Meet stream link, and automated follow-ups.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" asChild className="text-xs h-9">
            <Link href={mode === "create" ? "/dashboard/webinars" : `/dashboard/webinars/${initial?.id}`}>Cancel</Link>
          </Button>
          {!readOnlyLifecycle && (
            <Button
              type="submit"
              value="draft"
              variant="outline"
              size="sm"
              disabled={saving}
              className="text-xs h-9 cursor-pointer"
            >
              {saving && intent === "draft" ? "Saving..." : "Save Draft"}
            </Button>
          )}
          {!readOnlyLifecycle && (
            <Button
              type="submit"
              value="schedule"
              variant="brand"
              size="sm"
              disabled={saving || values.lifecycleStatus !== "draft"}
              className="text-xs h-9 cursor-pointer"
            >
              {saving && intent === "schedule" ? "Scheduling..." : "Save & Schedule"}
            </Button>
          )}
        </div>
      </div>

      {error && (
        <p role="alert" className="rounded-sm border border-status-danger-border bg-status-danger-bg px-4 py-2.5 text-xs font-semibold text-status-danger-fg">
          {error}
        </p>
      )}

      {/* 2-Column Responsive Layout: Controls on Left, Live Interactive Preview on Right */}
      <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
        {/* Left Form Column */}
        <div className="space-y-5">
          {/* Section 1: Core Details */}
          <Card className="border-border/70 shadow-xs">
            <CardHeader className="pb-3 border-b border-border/50">
              <CardTitle className="text-sm font-bold uppercase tracking-wider text-foreground">
                Session Identity & Content
              </CardTitle>
              <CardDescription className="text-xs">
                Visible to prospective attendees on registration and calendar invites.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-4 space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground" htmlFor="webinar-title">
                  Webinar Title <span className="text-status-danger-fg">*</span>
                </label>
                <Input
                  id="webinar-title"
                  disabled={readOnlyLifecycle}
                  value={values.title}
                  onChange={(e) => set("title", e.target.value)}
                  placeholder="e.g., AI Transformation Architecture for Enterprises"
                  required
                  className="h-9 text-xs"
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground" htmlFor="webinar-presenter">
                    Presenter / Host <span className="text-status-danger-fg">*</span>
                  </label>
                  <Input
                    id="webinar-presenter"
                    disabled={readOnlyLifecycle}
                    value={values.presenter}
                    onChange={(e) => set("presenter", e.target.value)}
                    placeholder="e.g., Sarah Chen, Head of Engineering"
                    required
                    className="h-9 text-xs"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground" htmlFor="webinar-series">
                    Webinar Series (Optional)
                  </label>
                  <select
                    id="webinar-series"
                    disabled={readOnlyLifecycle}
                    value={values.seriesId}
                    onChange={(e) => set("seriesId", e.target.value)}
                    className="h-9 w-full rounded-sm border border-input bg-card px-2.5 text-xs text-foreground outline-none cursor-pointer"
                  >
                    <option value="">Standalone Session</option>
                    {series.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.title}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground" htmlFor="webinar-desc">
                  Session Description <span className="text-status-danger-fg">*</span>
                </label>
                <textarea
                  id="webinar-desc"
                  disabled={readOnlyLifecycle}
                  value={values.description}
                  onChange={(e) => set("description", e.target.value)}
                  placeholder="Summarize the core takeaways, agenda, and targeted audience..."
                  required
                  rows={4}
                  className="w-full rounded-sm border border-input bg-card px-3 py-2 text-xs text-foreground outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring"
                />
              </div>
            </CardContent>
          </Card>

          {/* Section 2: Scheduling & Capacity */}
          <Card className="border-border/70 shadow-xs">
            <CardHeader className="pb-3 border-b border-border/50">
              <CardTitle className="text-sm font-bold uppercase tracking-wider text-foreground">
                Scheduling, Timezone & Capacity
              </CardTitle>
              <CardDescription className="text-xs">
                Controls calendar sync and registration access limits.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-4 space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground" htmlFor="webinar-start">
                    Start Date & Time
                  </label>
                  <Input
                    id="webinar-start"
                    disabled={readOnlyLifecycle}
                    type="datetime-local"
                    value={values.scheduledStart}
                    onChange={(e) => set("scheduledStart", e.target.value)}
                    className="h-9 text-xs"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground" htmlFor="webinar-tz">
                    Host Timezone (IANA)
                  </label>
                  <Input
                    id="webinar-tz"
                    disabled={readOnlyLifecycle}
                    value={values.timezone}
                    onChange={(e) => set("timezone", e.target.value)}
                    placeholder="e.g. Asia/Kolkata"
                    className="h-9 text-xs font-mono"
                  />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground" htmlFor="webinar-dur">
                    Duration (Minutes)
                  </label>
                  <Input
                    id="webinar-dur"
                    disabled={readOnlyLifecycle}
                    type="number"
                    min="15"
                    max="480"
                    value={values.durationMinutes}
                    onChange={(e) => set("durationMinutes", e.target.value)}
                    className="h-9 text-xs"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground" htmlFor="webinar-cap">
                    Capacity Limit
                  </label>
                  <Input
                    id="webinar-cap"
                    disabled={readOnlyLifecycle}
                    type="number"
                    min="1"
                    value={values.capacity}
                    onChange={(e) => set("capacity", e.target.value)}
                    placeholder="No limit"
                    className="h-9 text-xs"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground" htmlFor="webinar-closes">
                    Registration Closes
                  </label>
                  <Input
                    id="webinar-closes"
                    disabled={readOnlyLifecycle}
                    type="datetime-local"
                    value={values.registrationClosesAt}
                    onChange={(e) => set("registrationClosesAt", e.target.value)}
                    className="h-9 text-xs"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Section 3: Follow-Up & Product Destination */}
          <Card className="border-border/70 shadow-xs">
            <CardHeader className="pb-3 border-b border-border/50">
              <CardTitle className="text-sm font-bold uppercase tracking-wider text-foreground">
                Post-Session Automation
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4 space-y-4">
              <label className="flex items-start gap-3 text-xs font-semibold text-foreground cursor-pointer">
                <input
                  type="checkbox"
                  disabled={readOnlyLifecycle}
                  checked={values.followupEnabled}
                  onChange={(e) => set("followupEnabled", e.target.checked)}
                  className="mt-0.5 h-4 w-4 accent-brand rounded"
                />
                <div>
                  <span>Enable automated attendee follow-up & feedback flow</span>
                  <span className="block text-[11px] font-normal text-muted-foreground mt-0.5">
                    Surveys and attendee follow-ups will be prepared for owner approval when the session concludes.
                  </span>
                </div>
              </label>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground" htmlFor="webinar-product-url">
                  Featured Product or Subscription URL (Optional)
                </label>
                <Input
                  id="webinar-product-url"
                  disabled={readOnlyLifecycle}
                  type="url"
                  value={values.productUrl}
                  onChange={(e) => set("productUrl", e.target.value)}
                  placeholder="https://example.com/pricing"
                  className="h-9 text-xs"
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Sticky Preview Column - Fills Empty Space with Live Feedback */}
        <div className="space-y-4">
          <div className="sticky top-6 space-y-4">
            <div className="rounded-sm border border-brand/40 bg-card p-5 shadow-xs">
              <div className="flex items-center justify-between border-b border-border/60 pb-3">
                <span className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-brand-text">
                  <VideoPlay size="14" variant="Bold" /> Live Attendee Preview
                </span>
                <span className="rounded-full bg-status-info-bg px-2 py-0.5 text-[10px] font-semibold text-status-info-fg">
                  Preview Card
                </span>
              </div>

              <div className="mt-4 space-y-3">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Calendar size="13" />
                  <span>
                    {values.scheduledStart
                      ? new Date(values.scheduledStart).toLocaleDateString("en-US", {
                          weekday: "short",
                          month: "short",
                          day: "numeric",
                        })
                      : "Date to be scheduled"}
                  </span>
                  <span>·</span>
                  <Clock size="13" />
                  <span>{values.durationMinutes || "60"} mins</span>
                </div>

                <h3 className="font-display text-lg font-bold text-foreground line-clamp-2">
                  {values.title || "Your Webinar Title Here"}
                </h3>

                <p className="text-xs text-muted-foreground line-clamp-3 leading-relaxed">
                  {values.description || "The webinar description will appear here on the public registration page."}
                </p>

                <div className="flex items-center gap-2.5 pt-2 border-t border-border/40 text-xs">
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-brand-subtle text-[11px] font-bold text-brand-text">
                    {(values.presenter || "Host").slice(0, 2).toUpperCase()}
                  </span>
                  <div>
                    <p className="font-semibold text-foreground text-xs">{values.presenter || "Presenter Name"}</p>
                    <p className="text-[10px] text-muted-foreground">Lead Speaker</p>
                  </div>
                </div>

                <div className="rounded-sm bg-muted/40 p-3 text-[11px] text-muted-foreground space-y-1">
                  <div className="flex justify-between">
                    <span>Host Zone:</span>
                    <span className="font-mono font-medium text-foreground">{values.timezone}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Max Capacity:</span>
                    <span className="font-medium text-foreground">{values.capacity ? `${values.capacity} Seats` : "Unlimited"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Stream Provider:</span>
                    <span className="font-medium text-foreground">Google Meet (Auto-provisioned)</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Preparation Checklist */}
            <div className="rounded-sm border border-border/70 bg-card/60 p-4 space-y-2 text-xs">
              <span className="font-bold uppercase tracking-wider text-[10px] text-muted-foreground">
                Configuration Checklist
              </span>
              <ul className="space-y-1 text-muted-foreground text-[11px]">
                <li className="flex items-center gap-2">
                  <span className={values.title.trim() ? "text-status-success-fg" : "text-muted-foreground"}>
                    {values.title.trim() ? "✓" : "○"}
                  </span>
                  <span>Session title defined</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className={values.presenter.trim() ? "text-status-success-fg" : "text-muted-foreground"}>
                    {values.presenter.trim() ? "✓" : "○"}
                  </span>
                  <span>Presenter assigned</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className={values.scheduledStart ? "text-status-success-fg" : "text-muted-foreground"}>
                    {values.scheduledStart ? "✓" : "○"}
                  </span>
                  <span>Schedule and timezone selected</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </form>
  );
}
