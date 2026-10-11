export type WebinarStatus = "draft" | "scheduled" | "live" | "completed" | "cancelled";

export interface WebinarSession {
  id: string;
  title: string;
  description?: string | null;
  presenter?: string | null;
  status: WebinarStatus;
  scheduledStart?: string | null;
  registrationClosesAt?: string | null;
  scheduledEnd?: string | null;
  timezone?: string | null;
  durationMinutes?: number | null;
  capacity?: number | null;
  registrationCount?: number | null;
  publicSlug?: string | null;
  meetingUrl?: string | null;
  seriesId?: string | null;
  seriesTitle?: string | null;
  version?: number | null;
  followupEnabled?: boolean;
  productUrl?: string | null;
}

export interface WebinarRegistration {
  id: string;
  name: string;
  email: string;
  status?: string | null;
  registeredAt?: string | null;
  selectedSessions?: string[];
}

export interface WebinarParticipant {
  id: string;
  displayName?: string | null;
  identityType?: string | null;
  registrationName?: string | null;
  registrationEmail?: string | null;
  reviewStatus?: string | null;
  joinedAt?: string | null;
  leftAt?: string | null;
}

export interface WebinarDetail extends WebinarSession {
  registrations?: WebinarRegistration[] | null;
  attendance?: {
    importStatus?: "pending" | "running" | "incomplete" | "complete" | "failed" | null;
    lastSyncedAt?: string | null;
    registeredCount?: number | null;
    participantCount?: number | null;
    attendedCount?: number | null;
    noShowCount?: number | null;
    reviewStatus?: "unresolved" | "resolved" | null;
    participants?: WebinarParticipant[] | null;
  } | null;
  followup?: {
    enabled?: boolean;
    status?: "disabled" | "draft" | "awaiting_approval" | "scheduled" | "sent" | "blocked" | "partial" | "provider_accepted" | "cancelled" | null;
    attendeeSubject?: string | null;
    attendeeBody?: string | null;
    noShowSubject?: string | null;
    noShowBody?: string | null;
    scheduledFor?: string | null;
    blockedReason?: string | null;
  } | null;
  feedback?: {
    responseCount?: number | null;
    eligibleCount?: number | null;
    averageRating?: number | null;
    helpfulCount?: number | null;
    productInterestCount?: number | null;
    responses?: Array<{ registrationId: string; name: string; rating: number | null; wasUseful: boolean | null; comments: string | null; productInterest: boolean; marketingOptIn: boolean; submittedAt: string | null }>;
  } | null;
}

export interface WebinarListData {
  sessions: WebinarSession[];
  series?: Array<{ id: string; name: string; sessionCount?: number | null }>;
}

export interface WebinarDetailData {
  session: WebinarDetail;
}

export interface WebinarSeries {
  id: string;
  title: string;
  description?: string | null;
}

export type WebinarApiPayload = {
  title: string;
  description: string | null;
  presenter: string | null;
  scheduled_start: string | null;
  timezone: string;
  duration_minutes: number;
  capacity: number | null;
  followup_enabled: boolean;
  product_url: string | null;
  series_id: string | null;
  status?: "draft" | "scheduled";
  expected_version?: number;
  registration_closes_at?: string | null;
};

type ApiRow = Record<string, unknown>;

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });
  const body = (await response.json().catch(() => null)) as { data?: T; error?: { message?: string } } | null;
  if (!response.ok) {
    throw new Error(body?.error?.message ?? "The webinar request could not be completed.");
  }
  return (body?.data ?? body) as T;
}

function stringValue(row: ApiRow, ...keys: string[]) {
  for (const key of keys) if (typeof row[key] === "string") return row[key] as string;
  return null;
}

function numberValue(row: ApiRow, ...keys: string[]) {
  for (const key of keys) if (typeof row[key] === "number") return row[key] as number;
  return null;
}

export function normalizeSession(input: ApiRow): WebinarSession {
  return {
    id: String(input.id ?? ""),
    title: String(input.title ?? "Untitled webinar"),
    description: stringValue(input, "description"),
    presenter: stringValue(input, "presenter"),
    status: (input.status as WebinarStatus) ?? "draft",
    scheduledStart: stringValue(input, "scheduled_start", "scheduledStart"),
    registrationClosesAt: stringValue(input, "registration_closes_at", "registrationClosesAt"),
    scheduledEnd: stringValue(input, "scheduled_end", "scheduledEnd"),
    timezone: stringValue(input, "timezone"),
    durationMinutes: numberValue(input, "duration_minutes", "durationMinutes"),
    capacity: numberValue(input, "capacity"),
    registrationCount: numberValue(input, "registration_count", "registrationCount"),
    publicSlug: stringValue(input, "public_slug", "publicSlug"),
    meetingUrl: stringValue(input, "meeting_uri", "meeting_url", "meetingUrl"),
    seriesId: stringValue(input, "series_id", "seriesId"),
    seriesTitle: stringValue(input, "series_title", "seriesTitle"),
    version: numberValue(input, "version"),
    followupEnabled: Boolean(input.followup_enabled ?? input.followupEnabled ?? false),
    productUrl: stringValue(input, "product_url", "productUrl"),
  };
}

function normalizeDetail(input: ApiRow): WebinarDetail {
  const session = normalizeSession(input);
  const registrations = Array.isArray(input.registrations) ? input.registrations as ApiRow[] : undefined;
  return {
    ...session,
    registrations: registrations?.map((row) => ({
      id: String(row.id ?? ""), name: String(row.name ?? row.full_name ?? "Unknown attendee"), email: String(row.email ?? ""),
      status: stringValue(row, "status"), registeredAt: stringValue(row, "registered_at", "registeredAt"),
    })),
    attendance: input.attendance as WebinarDetail["attendance"],
    followup: input.followup as WebinarDetail["followup"],
    feedback: input.feedback as WebinarDetail["feedback"],
  };
}

export async function listWebinars(): Promise<WebinarListData> {
  const data = await request<ApiRow[] | { sessions: ApiRow[] }>("/api/webinars");
  const rows = Array.isArray(data) ? data : data.sessions ?? [];
  return { sessions: rows.map(normalizeSession) };
}

export async function listWebinarSeries(): Promise<WebinarSeries[]> {
  const data = await request<ApiRow[] | { series: ApiRow[] }>("/api/webinar-series");
  const rows = Array.isArray(data) ? data : data.series ?? [];
  return rows.map((row) => ({ id: String(row.id ?? ""), title: String(row.title ?? "Untitled series"), description: stringValue(row, "description") }));
}

export async function getWebinar(id: string): Promise<WebinarDetail> {
  const data = await request<ApiRow | { session: ApiRow }>(`/api/webinars/${encodeURIComponent(id)}`);
  const row = "session" in data ? data.session as ApiRow : data as ApiRow;
  return normalizeDetail(row);
}

export async function createWebinar(payload: WebinarApiPayload) {
  return normalizeSession(await request<ApiRow>("/api/webinars", { method: "POST", body: JSON.stringify(payload) }));
}

export async function updateWebinar(id: string, payload: WebinarApiPayload) {
  return normalizeSession(await request<ApiRow>(`/api/webinars/${encodeURIComponent(id)}`, { method: "PATCH", body: JSON.stringify(payload) }));
}

export function payloadFromSession(session: WebinarSession, status?: "draft" | "scheduled"): WebinarApiPayload {
  return { ...(session.version ? { expected_version: session.version } : {}), title: session.title, description: session.description ?? null, presenter: session.presenter ?? null, scheduled_start: session.scheduledStart ?? null, registration_closes_at: session.registrationClosesAt ?? null, timezone: session.timezone || "UTC", duration_minutes: session.durationMinutes ?? 60, capacity: session.capacity ?? null, followup_enabled: session.followupEnabled ?? false, product_url: session.productUrl ?? null, series_id: session.seriesId ?? null, ...(status ? { status } : {}) };
}

export async function scheduleWebinar(id: string, session: WebinarSession) {
  return request<{ data: Record<string, unknown> }>(`/api/webinars/${encodeURIComponent(id)}/schedule`, {
    method: "POST",
    body: JSON.stringify({ expected_version: session.version }),
  });
}

export async function webinarAction(id: string, action: "cancel" | "followup", payload: Record<string, unknown> = {}) {
  if (action === "cancel") {
    return request<{ webinar: ApiRow; notifications: { status: string; recipients: number; queued: number } }>(
      `/api/webinars/${encodeURIComponent(id)}/${action}`,
      { method: "POST", body: JSON.stringify(payload) },
    );
  }
  return request<ApiRow>(`/api/webinars/${encodeURIComponent(id)}/${action}`, { method: "POST", body: JSON.stringify(payload) });
}

export async function deleteWebinar(id: string, version?: number | null) {
  return request<{ deleted: boolean }>(`/api/webinars/${encodeURIComponent(id)}`, {
    method: "DELETE",
    body: JSON.stringify({ confirmation: "DELETE", expected_version: version ?? undefined }),
  });
}

export function formatDate(value?: string | null, timezone?: string | null) {
  if (!value) return "Unscheduled";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Invalid date";
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: timezone || undefined,
  }).format(date);
}

export function statusLabel(status: WebinarStatus) {
  return status === "completed" ? "Ended" : status.charAt(0).toUpperCase() + status.slice(1);
}

export function statusClass(status: WebinarStatus) {
  if (status === "live") return "bg-status-success-bg text-status-success-fg border border-status-success-border font-bold";
  if (status === "scheduled") return "bg-status-info-bg text-status-info-fg border border-status-info-border font-semibold";
  if (status === "cancelled") return "bg-status-danger-bg text-status-danger-fg border border-status-danger-border font-semibold";
  if (status === "completed") return "bg-muted text-muted-foreground border border-border font-medium";
  return "bg-status-warning-bg text-status-warning-fg border border-status-warning-border font-semibold";
}

export async function createWebinarSeries(payload: { title: string; description?: string | null }) {
  return request<WebinarSeries>("/api/webinar-series", { method: "POST", body: JSON.stringify(payload) });
}

export async function getWebinarSeriesDeletePreview(id: string) {
  return request<{ id: string; title: string; counts: Record<string, number> }>(`/api/webinar-series?id=${encodeURIComponent(id)}&preview=delete`);
}

export async function deleteWebinarSeries(id: string, expectedCounts: Record<string, number>) {
  return request<{ deleted: boolean; counts: Record<string, number> }>("/api/webinar-series", {
    method: "DELETE",
    body: JSON.stringify({ id, confirmation: "DELETE", expected_counts: expectedCounts }),
  });
}
