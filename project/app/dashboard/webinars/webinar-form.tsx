"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Calendar, VideoPlay } from "iconsax-react";
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
  const [values, setValues] = React.useState<FormValues>({
    title: initial?.title ?? "",
    description: initial?.description ?? "",
    presenter: initial?.presenter ?? "",
    scheduledStart: isoToLocalTimeInZone(initial?.scheduledStart, initial?.timezone ?? Intl.DateTimeFormat().resolvedOptions().timeZone ?? "UTC"),
    registrationClosesAt: isoToLocalTimeInZone(initial?.registrationClosesAt, initial?.timezone ?? Intl.DateTimeFormat().resolvedOptions().timeZone ?? "UTC"),
    timezone: initial?.timezone ?? Intl.DateTimeFormat().resolvedOptions().timeZone ?? "UTC",
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
      setError(`${statusLabel(values.lifecycleStatus)} sessions are read-only until the API supports status-preserving edits.`);
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
        const previewBody = await previewResponse.json() as { data?: { version: number; recipient_count: number; recipient_snapshot_hash: string; scheduled_start: string }; error?: { message?: string } };
        if (!previewResponse.ok || !previewBody.data) throw new Error(previewBody.error?.message ?? "Could not load reschedule preview.");
        const preview = previewBody.data;
        const oldTime = new Intl.DateTimeFormat("en", { dateStyle: "full", timeStyle: "short", timeZone: initial.timezone || undefined }).format(new Date(preview.scheduled_start));
        const newTime = new Intl.DateTimeFormat("en", { dateStyle: "full", timeStyle: "short", timeZone: values.timezone }).format(new Date(payload.scheduled_start!));
        if (!window.confirm(`Reschedule “${initial.title}” from ${oldTime} to ${newTime}? ${preview.recipient_count} registered attendees will be notified. The existing Meet link stays the same. Any scheduled follow-up will need a new attendance review.`)) { setSaving(false); return; }
        const response = await fetch(`/api/webinars/${encodeURIComponent(initial.id)}/reschedule`, {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...payload, action: "reschedule", expected_version: preview.version, expected_recipient_count: preview.recipient_count, expected_recipient_snapshot_hash: preview.recipient_snapshot_hash }),
        });
        const result = await response.json() as { data?: { webinar: WebinarSession; notifications: { status: string; queued: number; recipients: number } }; error?: { message?: string } };
        if (!response.ok || !result.data) throw new Error(result.error?.message ?? "Could not reschedule webinar.");
        window.alert(result.data.notifications.status === "queued"
          ? `${result.data.notifications.queued} of ${result.data.notifications.recipients} reschedule notification(s) queued.`
          : `Webinar rescheduled. Notification status: ${result.data.notifications.status}.`);
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
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <Link href={mode === "create" ? "/dashboard/webinars" : `/dashboard/webinars/${initial?.id}`} className="mb-4 inline-flex items-center gap-2 text-xs font-semibold text-muted-foreground hover:text-foreground">
            <ArrowLeft size="14" /> Back to webinars
          </Link>
          <h1 className="font-display text-3xl font-bold tracking-tight">{mode === "create" ? "Create webinar" : "Edit webinar"}</h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">Save a draft while details are in progress, or schedule only when the session has a valid time and the Meet integration can provision its link.</p>
        </div>
        <VideoPlay size="28" className="hidden text-brand-text sm:block" />
      </div>

      {error && <p role="alert" className="rounded-sm border border-status-danger-fg/30 bg-status-danger-bg px-4 py-3 text-sm text-status-danger-fg">{error}</p>}
      {saving && <p role="status" aria-live="polite" className="flex items-center gap-2 text-sm text-muted-foreground"><span aria-hidden="true" className="inline-block size-4 animate-spin rounded-full border-2 border-current border-r-transparent" />{intent === "schedule" ? "Creating and scheduling your webinar…" : "Saving your webinar…"}</p>}
      {mode === "edit" && <p className="rounded-sm bg-muted/30 px-4 py-3 text-xs text-muted-foreground">Lifecycle status: <span className="font-semibold text-foreground">{statusLabel(values.lifecycleStatus)}</span>. Editing preserves this status.</p>}

      <Card>
        <CardHeader><CardTitle className="text-xl">Session details</CardTitle><CardDescription>Use the selected timezone whenever you communicate the event time.</CardDescription></CardHeader>
        <CardContent className="grid gap-5 md:grid-cols-2">
          <Field label="Title" required><Input disabled={readOnlyLifecycle} value={values.title} onChange={(e) => set("title", e.target.value)} placeholder="e.g. Product strategy for growing teams" required /></Field>
          <Field label="Presenter" required><Input disabled={readOnlyLifecycle} value={values.presenter} onChange={(e) => set("presenter", e.target.value)} placeholder="Name or team" required /></Field>
          <Field label="Description" required wide><textarea disabled={readOnlyLifecycle} value={values.description} onChange={(e) => set("description", e.target.value)} placeholder="What will attendees learn?" required rows={5} className="w-full rounded-sm border border-input bg-card px-3 py-2 text-sm text-foreground outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring disabled:cursor-not-allowed disabled:opacity-60" /></Field>
          <Field label="Series" hint="Optional. A series registration can offer session selection."><select disabled={readOnlyLifecycle} value={values.seriesId} onChange={(e) => set("seriesId", e.target.value)} className="h-10 w-full rounded-sm border border-input bg-card px-3 text-sm text-foreground outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring disabled:cursor-not-allowed disabled:opacity-60"><option value="">Standalone session</option>{series.map((item) => <option key={item.id} value={item.id}>{item.title}</option>)}</select></Field>
          <Field label="Product or subscription URL" hint="Optional feedback destination."><Input disabled={readOnlyLifecycle} type="url" value={values.productUrl} onChange={(e) => set("productUrl", e.target.value)} placeholder="https://example.com/plan" /></Field>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-xl">Schedule</CardTitle><CardDescription>A draft may be left unscheduled. Scheduled sessions need a positive duration and a Meet link from the server integration.</CardDescription></CardHeader>
        <CardContent className="grid gap-5 md:grid-cols-2">
          <Field label="Start date and time"><div className="relative"><Calendar size="16" className="pointer-events-none absolute left-3 top-3 text-muted-foreground" /><Input disabled={readOnlyLifecycle} className="pl-9" type="datetime-local" value={values.scheduledStart} onChange={(e) => set("scheduledStart", e.target.value)} /></div></Field>
          <Field label="Timezone" hint="Use an IANA timezone, such as Asia/Kolkata or America/New_York."><Input disabled={readOnlyLifecycle} value={values.timezone} onChange={(e) => set("timezone", e.target.value)} placeholder="Asia/Kolkata" /></Field>
          <Field label="Registration closes"><Input disabled={readOnlyLifecycle} type="datetime-local" value={values.registrationClosesAt} onChange={(e) => set("registrationClosesAt", e.target.value)} /><span className="block text-xs text-muted-foreground">Leave blank to close at session start.</span></Field>
          <Field label="Duration in minutes"><Input disabled={readOnlyLifecycle} type="number" min="5" max="720" value={values.durationMinutes} onChange={(e) => set("durationMinutes", e.target.value)} /></Field>
          <Field label="Capacity" hint="Leave blank for no limit."><Input disabled={readOnlyLifecycle} type="number" min="1" value={values.capacity} onChange={(e) => set("capacity", e.target.value)} placeholder="No limit" /></Field>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-xl">After the webinar</CardTitle><CardDescription>Event notifications remain independent. Optional follow-ups use separate attendee and no-show drafts and require review before sending.</CardDescription></CardHeader>
        <CardContent><label className="flex cursor-pointer items-start gap-3 text-sm"><input disabled={readOnlyLifecycle} type="checkbox" checked={values.followupEnabled} onChange={(e) => set("followupEnabled", e.target.checked)} className="mt-1 h-4 w-4 accent-[var(--brand)]" /><span><span className="font-semibold">Enable optional follow-up service</span><span className="mt-1 block text-xs text-muted-foreground">No follow-up will be sent unless the owner later reviews and schedules it.</span></span></label></CardContent>
      </Card>

      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <Button type="button" variant="outline" asChild><Link href={mode === "create" ? "/dashboard/webinars" : `/dashboard/webinars/${initial?.id}`}>Cancel</Link></Button>
        {!readOnlyLifecycle && <Button type="submit" value="draft" variant="secondary" disabled={saving} aria-busy={saving && intent === "draft"}>{saving && intent === "draft" && <span aria-hidden="true" className="mr-2 inline-block size-4 animate-spin rounded-full border-2 border-current border-r-transparent align-[-3px]" />}{saving && intent === "draft" ? "Saving…" : "Save draft"}</Button>}
        {!readOnlyLifecycle && <Button type="submit" value="schedule" variant="brand" disabled={saving || values.lifecycleStatus !== "draft"} aria-busy={saving && intent === "schedule"}>{saving && intent === "schedule" && <span aria-hidden="true" className="mr-2 inline-block size-4 animate-spin rounded-full border-2 border-current border-r-transparent align-[-3px]" />}{saving && intent === "schedule" ? "Scheduling…" : "Save & schedule"}</Button>}
      </div>
    </form>
  );
}

function Field({ label, hint, required, wide, children }: { label: string; hint?: string; required?: boolean; wide?: boolean; children: React.ReactNode }) {
  return <label className={`block space-y-2 ${wide ? "md:col-span-2" : ""}`}><span className="block text-xs font-semibold">{label}{required && <span aria-hidden="true"> *</span>}</span>{children}{hint && <span className="block text-xs text-muted-foreground">{hint}</span>}</label>;
}
