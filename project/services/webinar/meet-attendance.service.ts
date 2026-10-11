import "server-only";

import { createClient } from "@/lib/supabase/server";
import { requireOwnerContext } from "@/lib/supabase/owner-context";
import type { AttendanceReviewInput } from "@/lib/validations/webinar-attendance";
import { getGoogleAccessTokenForBusiness, getGoogleConnectionStatus } from "./google-token-vault.service";
import { recordWebinarAudit } from "./audit";

type DatabaseClient = Awaited<ReturnType<typeof createClient>>;

export type ProviderPage<T> = {
  items: T[];
  nextPageToken: string | null;
};

export type MeetConference = {
  name: string;
  spaceName?: string | null;
  startTime?: string | null;
  endTime?: string | null;
  rawPayload: Record<string, unknown>;
};

export type MeetParticipant = {
  name: string;
  identityType: "signed_in" | "anonymous" | "phone" | "unknown";
  providerIdentity?: string | null;
  email?: string | null;
  displayName?: string | null;
  rawPayload: Record<string, unknown>;
};

export type MeetParticipantSession = {
  name: string;
  participantName: string;
  joinedAt?: string | null;
  leftAt?: string | null;
  durationSeconds?: number | null;
  rawPayload: Record<string, unknown>;
};

/**
 * Server-only seam for the existing Google integration.
 * An implementation must obtain credentials from that integration and return
 * normalized provider records. It must never accept a browser supplied token.
 */
export interface MeetAttendanceProvider {
  listConferences(input: { spaceName: string; pageToken?: string | null }): Promise<ProviderPage<MeetConference>>;
  listParticipants(input: { conferenceName: string; pageToken?: string | null }): Promise<ProviderPage<MeetParticipant>>;
  listParticipantSessions(input: { participantName: string; pageToken?: string | null }): Promise<ProviderPage<MeetParticipantSession>>;
}

export function getMeetAttendanceProvider(businessId: string): MeetAttendanceProvider | null {
  if (!businessId) return null;
  const fetchPage = async <T,>(path: string, key: string, pageToken?: string | null): Promise<ProviderPage<T>> => {
    const accessToken = await getGoogleAccessTokenForBusiness(businessId);
    const url = new URL(`https://meet.googleapis.com/v2/${path}`);
    url.searchParams.set("pageSize", "250");
    if (pageToken) url.searchParams.set("pageToken", pageToken);
    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${accessToken}` },
      cache: "no-store",
    });
    if (!response.ok) throw new Error(response.status === 401 || response.status === 403 ? "Google Meet authorization is required." : "Google Meet attendance could not be loaded.");
    const payload = await response.json() as Record<string, unknown>;
    return {
      items: Array.isArray(payload[key]) ? payload[key] as T[] : [],
      nextPageToken: typeof payload.nextPageToken === "string" ? payload.nextPageToken : null,
    };
  };
  return {
    async listConferences({ spaceName, pageToken }) {
      if (!/^spaces\/[A-Za-z0-9_-]+$/.test(spaceName)) throw new Error("Invalid Meet space reference.");
      const params = new URLSearchParams({ filter: `space.name = "${spaceName}"` });
      const query = pageToken ? `&pageToken=${encodeURIComponent(pageToken)}` : "";
      const accessToken = await getGoogleAccessTokenForBusiness(businessId);
      const response = await fetch(`https://meet.googleapis.com/v2/conferenceRecords?${params}${query}`, {
        headers: { Authorization: `Bearer ${accessToken}` }, cache: "no-store",
      });
      if (!response.ok) throw new Error(response.status === 401 || response.status === 403 ? "Google Meet authorization is required." : "Google Meet attendance could not be loaded.");
      const payload = await response.json() as { conferenceRecords?: Array<Record<string, unknown>>; nextPageToken?: unknown };
      return {
        items: (payload.conferenceRecords ?? []).filter((item) => typeof item.name === "string").map((item) => ({
          name: item.name as string,
          spaceName: typeof item.space === "string" ? item.space : spaceName,
          startTime: typeof item.startTime === "string" ? item.startTime : null,
          endTime: typeof item.endTime === "string" ? item.endTime : null,
          rawPayload: item,
        })),
        nextPageToken: typeof payload.nextPageToken === "string" ? payload.nextPageToken : null,
      };
    },
    async listParticipants({ conferenceName, pageToken }) {
      if (!/^conferenceRecords\/[A-Za-z0-9_-]+$/.test(conferenceName)) throw new Error("Invalid Meet conference reference.");
      const page = await fetchPage<Record<string, unknown>>(`${conferenceName}/participants`, "participants", pageToken);
      return {
        ...page,
        items: page.items.filter((item) => typeof item.name === "string").map((item) => {
          const user = item.user && typeof item.user === "object" ? item.user as Record<string, Record<string, unknown>> : {};
          const signedIn = user.signedinUser ?? user.signedInUser;
          const anonymous = user.anonymousUser;
          const phone = user.phoneUser;
          const identity = signedIn ?? anonymous ?? phone;
          return {
            name: item.name as string,
            identityType: signedIn ? "signed_in" as const : anonymous ? "anonymous" as const : phone ? "phone" as const : "unknown" as const,
            providerIdentity: typeof signedIn?.user === "string" ? signedIn.user : null,
            displayName: typeof identity?.displayName === "string" ? identity.displayName : null,
            email: null,
            rawPayload: item,
          };
        }),
      };
    },
    async listParticipantSessions({ participantName, pageToken }) {
      if (!/^conferenceRecords\/[A-Za-z0-9_-]+\/participants\/[A-Za-z0-9_-]+$/.test(participantName)) throw new Error("Invalid Meet participant reference.");
      const page = await fetchPage<Record<string, unknown>>(`${participantName}/participantSessions`, "participantSessions", pageToken);
      return {
        ...page,
        items: page.items.filter((item) => typeof item.name === "string").map((item) => ({
          name: item.name as string,
          participantName,
          joinedAt: typeof item.startTime === "string" ? item.startTime : null,
          leftAt: typeof item.endTime === "string" ? item.endTime : null,
          durationSeconds: null,
          rawPayload: item,
        })),
      };
    },
  };
}

export class MeetAttendanceServiceError extends Error {
  constructor(
    public code: "UNAUTHORIZED" | "NOT_FOUND" | "DATABASE_ERROR" | "VALIDATION_ERROR" | "CONFLICT",
    message: string,
  ) {
    super(message);
  }
}

type AttendanceCheckpoint = {
  conferencePageToken: string | null;
  conferencesComplete: boolean;
  conferenceIndex: number;
  participantPageTokens: Record<string, string | null>;
  participantPagesComplete: Record<string, boolean>;
  participantSessionPageTokens: Record<string, string | null>;
  participantSessionPagesComplete: Record<string, boolean>;
};

const emptyCheckpoint = (): AttendanceCheckpoint => ({
  conferencePageToken: null,
  conferencesComplete: false,
  conferenceIndex: 0,
  participantPageTokens: {},
  participantPagesComplete: {},
  participantSessionPageTokens: {},
  participantSessionPagesComplete: {},
});

function readCheckpoint(value: unknown): AttendanceCheckpoint {
  if (!value || typeof value !== "object") return emptyCheckpoint();
  const source = value as Partial<AttendanceCheckpoint>;
  return {
    conferencePageToken: typeof source.conferencePageToken === "string" ? source.conferencePageToken : null,
    conferencesComplete: source.conferencesComplete === true,
    conferenceIndex: typeof source.conferenceIndex === "number" && source.conferenceIndex >= 0
      ? Math.trunc(source.conferenceIndex)
      : 0,
    participantPageTokens: source.participantPageTokens && typeof source.participantPageTokens === "object"
      ? source.participantPageTokens as Record<string, string | null>
      : {},
    participantPagesComplete: source.participantPagesComplete && typeof source.participantPagesComplete === "object"
      ? source.participantPagesComplete as Record<string, boolean>
      : {},
    participantSessionPageTokens: source.participantSessionPageTokens && typeof source.participantSessionPageTokens === "object"
      ? source.participantSessionPageTokens as Record<string, string | null>
      : {},
    participantSessionPagesComplete: source.participantSessionPagesComplete && typeof source.participantSessionPagesComplete === "object"
      ? source.participantSessionPagesComplete as Record<string, boolean>
      : {},
  };
}

function safeDate(value: string | null | undefined) {
  return value && !Number.isNaN(Date.parse(value)) ? value : null;
}

function normalizedEmail(value: string | null | undefined) {
  const normalized = value?.trim().toLowerCase();
  return normalized && normalized.includes("@") ? normalized : null;
}

async function ownerContext() {
  try {
    const context = await requireOwnerContext();
    return { supabase: context.client, businessId: context.businessId, userId: context.user.id, user: context.user };
  } catch (error) {
    if (error instanceof Error && "status" in error) {
      const status = (error as { status?: number }).status;
      if (status === 401) throw new MeetAttendanceServiceError("UNAUTHORIZED", error.message);
      if (status === 404) throw new MeetAttendanceServiceError("NOT_FOUND", error.message);
    }
    throw new MeetAttendanceServiceError("DATABASE_ERROR", "Business data is temporarily unavailable.");
  }
}

async function getOwnedWebinar(supabase: DatabaseClient, businessId: string, webinarId: string) {
  const { data, error } = await supabase
    .from("webinars")
    .select("id, business_id, meet_space_name, provisioning_status, status, scheduled_start, duration_minutes")
    .eq("business_id", businessId)
    .eq("id", webinarId)
    .maybeSingle();
  if (error) throw new MeetAttendanceServiceError("DATABASE_ERROR", "Could not load the webinar.");
  if (!data) throw new MeetAttendanceServiceError("NOT_FOUND", "Webinar not found.");
  return data;
}

async function getOrCreateImport(supabase: DatabaseClient, businessId: string, webinarId: string) {
  const { data: existing, error: readError } = await supabase
    .from("webinar_attendance_imports")
    .select("*")
    .eq("business_id", businessId)
    .eq("webinar_id", webinarId)
    .maybeSingle();
  if (readError) throw new MeetAttendanceServiceError("DATABASE_ERROR", "Could not load attendance import state.");
  if (existing) return existing;

  const { data, error } = await supabase
    .from("webinar_attendance_imports")
    .insert({ business_id: businessId, webinar_id: webinarId, checkpoint: emptyCheckpoint() })
    .select("*")
    .single();
  if (error || !data) throw new MeetAttendanceServiceError("DATABASE_ERROR", "Could not create attendance import state.");
  return data;
}

async function updateImport(
  supabase: DatabaseClient,
  businessId: string,
  importId: string,
  values: Record<string, unknown>,
) {
  const { data, error } = await supabase
    .from("webinar_attendance_imports")
    .update(values)
    .eq("business_id", businessId)
    .eq("id", importId)
    .select("*")
    .single();
  if (error || !data) throw new MeetAttendanceServiceError("DATABASE_ERROR", "Could not persist attendance import state.");
  return data;
}

async function persistPage(
  supabase: DatabaseClient,
  input: {
    businessId: string;
    webinarId: string;
    importId: string;
    level: "conferences" | "participants" | "participant_sessions";
    parentProviderName: string;
    pageToken: string | null;
    nextPageToken: string | null;
    items: unknown[];
  },
) {
  const { error } = await supabase.from("webinar_attendance_pages").upsert({
    business_id: input.businessId,
    webinar_id: input.webinarId,
    import_id: input.importId,
    level: input.level,
    parent_provider_name: input.parentProviderName,
    page_key: input.pageToken ?? "",
    next_page_token: input.nextPageToken,
    payload: { items: input.items },
  }, { onConflict: "business_id,import_id,level,parent_provider_name,page_key" });
  if (error) throw new MeetAttendanceServiceError("DATABASE_ERROR", "Could not persist an attendance provider page.");
}

async function findParticipant(supabase: DatabaseClient, businessId: string, webinarId: string, providerName: string) {
  const { data, error } = await supabase
    .from("webinar_participants")
    .select("*")
    .eq("business_id", businessId)
    .eq("webinar_id", webinarId)
    .eq("provider_participant_name", providerName)
    .maybeSingle();
  if (error) throw new MeetAttendanceServiceError("DATABASE_ERROR", "Could not load an attendance participant.");
  return data;
}

async function persistConference(
  supabase: DatabaseClient,
  businessId: string,
  webinarId: string,
  conference: MeetConference,
) {
  const { data, error } = await supabase.from("webinar_conferences").upsert({
    business_id: businessId,
    webinar_id: webinarId,
    provider_conference_name: conference.name,
    provider_space_name: conference.spaceName ?? null,
    started_at: safeDate(conference.startTime),
    ended_at: safeDate(conference.endTime),
    raw_payload: conference.rawPayload,
  }, { onConflict: "business_id,webinar_id,provider_conference_name" }).select("*").single();
  if (error || !data) throw new MeetAttendanceServiceError("DATABASE_ERROR", "Could not persist an attendance conference.");
  return data;
}

async function registrationForEmail(
  supabase: DatabaseClient,
  businessId: string,
  webinarId: string,
  email: string | null,
) {
  if (!email) return null;
  const { data, error } = await supabase
    .from("webinar_registration_sessions")
    .select("registration_id")
    .eq("business_id", businessId)
    .eq("webinar_id", webinarId)
    .eq("normalized_email", email);
  if (error) throw new MeetAttendanceServiceError("DATABASE_ERROR", "Could not match attendance to registrations.");
  return data?.length === 1 ? data[0].registration_id : null;
}

async function persistParticipant(
  supabase: DatabaseClient,
  businessId: string,
  webinarId: string,
  conferenceId: string,
  participant: MeetParticipant,
) {
  const existing = await findParticipant(supabase, businessId, webinarId, participant.name);
  const email = normalizedEmail(participant.email);
  const autoRegistrationId = participant.identityType === "signed_in"
    ? await registrationForEmail(supabase, businessId, webinarId, email)
    : null;

  if (existing) {
    const update: Record<string, unknown> = {
      conference_id: conferenceId,
      provider_identity: participant.providerIdentity ?? null,
      identity_type: participant.identityType,
      email,
      display_name: participant.displayName ?? null,
      raw_payload: participant.rawPayload,
    };
    if (existing.review_disposition === "unresolved" && autoRegistrationId) {
      update.registration_id = autoRegistrationId;
      update.review_disposition = "matched";
    }
    const { data, error } = await supabase.from("webinar_participants")
      .update(update)
      .eq("business_id", businessId)
      .eq("id", existing.id)
      .select("*")
      .single();
    if (error || !data) throw new MeetAttendanceServiceError("DATABASE_ERROR", "Could not update an attendance participant.");
    return data;
  }

  const { data, error } = await supabase.from("webinar_participants").insert({
    business_id: businessId,
    webinar_id: webinarId,
    conference_id: conferenceId,
    provider_participant_name: participant.name,
    provider_identity: participant.providerIdentity ?? null,
    identity_type: participant.identityType,
    email,
    display_name: participant.displayName ?? null,
    registration_id: autoRegistrationId,
    review_disposition: autoRegistrationId ? "matched" : "unresolved",
    raw_payload: participant.rawPayload,
  }).select("*").single();
  if (error || !data) throw new MeetAttendanceServiceError("DATABASE_ERROR", "Could not persist an attendance participant.");
  return data;
}

async function persistParticipantSession(
  supabase: DatabaseClient,
  businessId: string,
  webinarId: string,
  conferenceId: string,
  participantId: string,
  session: MeetParticipantSession,
) {
  const { error } = await supabase.from("webinar_participant_sessions").upsert({
    business_id: businessId,
    webinar_id: webinarId,
    conference_id: conferenceId,
    participant_id: participantId,
    provider_session_name: session.name,
    joined_at: safeDate(session.joinedAt),
    left_at: safeDate(session.leftAt),
    duration_seconds: session.durationSeconds ?? null,
    raw_payload: session.rawPayload,
  }, { onConflict: "business_id,provider_session_name" });
  if (error) throw new MeetAttendanceServiceError("DATABASE_ERROR", "Could not persist an attendance join session.");
}

async function counts(supabase: DatabaseClient, businessId: string, webinarId: string) {
  const [conferenceResult, participantResult, sessionResult, unresolvedResult] = await Promise.all([
    supabase.from("webinar_conferences").select("id", { count: "exact", head: true }).eq("business_id", businessId).eq("webinar_id", webinarId),
    supabase.from("webinar_participants").select("id", { count: "exact", head: true }).eq("business_id", businessId).eq("webinar_id", webinarId),
    supabase.from("webinar_participant_sessions").select("id", { count: "exact", head: true }).eq("business_id", businessId).eq("webinar_id", webinarId),
    supabase.from("webinar_participants").select("id", { count: "exact", head: true }).eq("business_id", businessId).eq("webinar_id", webinarId).eq("review_disposition", "unresolved"),
  ]);
  if ([conferenceResult, participantResult, sessionResult, unresolvedResult].some((result) => result.error)) {
    throw new MeetAttendanceServiceError("DATABASE_ERROR", "Could not count imported attendance records.");
  }
  return {
    conference_count: conferenceResult.count ?? 0,
    participant_count: participantResult.count ?? 0,
    participant_session_count: sessionResult.count ?? 0,
    unresolved_count: unresolvedResult.count ?? 0,
  };
}

async function processParticipantSessions(
  supabase: DatabaseClient,
  provider: MeetAttendanceProvider,
  businessId: string,
  webinarId: string,
  conferenceId: string,
  participant: MeetParticipant,
  checkpoint: AttendanceCheckpoint,
  pagesLeft: { value: number },
  importId: string,
) {
  const participantKey = participant.name;
  if (checkpoint.participantSessionPagesComplete[participantKey]) return true;
  let pageToken = checkpoint.participantSessionPageTokens[participantKey] ?? null;
  while (pagesLeft.value > 0) {
    const page = await provider.listParticipantSessions({ participantName: participantKey, pageToken });
    pagesLeft.value -= 1;
    await persistPage(supabase, {
      businessId,
      webinarId,
      importId,
      level: "participant_sessions",
      parentProviderName: participantKey,
      pageToken,
      nextPageToken: page.nextPageToken,
      items: page.items,
    });
    for (const session of page.items) {
      if (session.participantName !== participantKey || !session.name) continue;
      const savedParticipant = await findParticipant(supabase, businessId, webinarId, participantKey);
      if (!savedParticipant) {
        throw new MeetAttendanceServiceError("DATABASE_ERROR", "Could not resolve the imported participant.");
      }
      await persistParticipantSession(supabase, businessId, webinarId, conferenceId, savedParticipant.id, session);
    }
    pageToken = page.nextPageToken;
    checkpoint.participantSessionPageTokens[participantKey] = pageToken;
    if (!pageToken) {
      checkpoint.participantSessionPagesComplete[participantKey] = true;
      return true;
    }
    if (pagesLeft.value <= 0) return false;
  }
  return false;
}

async function processParticipantPages(
  supabase: DatabaseClient,
  provider: MeetAttendanceProvider,
  businessId: string,
  webinarId: string,
  conference: { id: string; provider_conference_name: string },
  checkpoint: AttendanceCheckpoint,
  pagesLeft: { value: number },
  importId: string,
) {
  const conferenceKey = conference.provider_conference_name;
  if (checkpoint.participantPagesComplete[conferenceKey]) return true;
  let pageToken = checkpoint.participantPageTokens[conferenceKey] ?? null;
  while (pagesLeft.value > 0) {
    const page = await provider.listParticipants({ conferenceName: conferenceKey, pageToken });
    pagesLeft.value -= 1;
    await persistPage(supabase, {
      businessId,
      webinarId,
      importId,
      level: "participants",
      parentProviderName: conferenceKey,
      pageToken,
      nextPageToken: page.nextPageToken,
      items: page.items,
    });
    for (const participant of page.items) {
      if (!participant.name) continue;
      const saved = await persistParticipant(supabase, businessId, webinarId, conference.id, participant);
      const sessionsComplete = await processParticipantSessions(supabase, provider, businessId, webinarId, conference.id, participant, checkpoint, pagesLeft, importId);
      if (!sessionsComplete) {
        checkpoint.participantPageTokens[conferenceKey] = pageToken;
        return false;
      }
      if (!saved.id) return false;
    }
    pageToken = page.nextPageToken;
    checkpoint.participantPageTokens[conferenceKey] = pageToken;
    if (!pageToken) {
      checkpoint.participantPagesComplete[conferenceKey] = true;
      return true;
    }
  }
  return false;
}

export async function getWebinarAttendance(webinarId: string) {
  const { supabase, businessId } = await ownerContext();
  const webinar = await getOwnedWebinar(supabase, businessId, webinarId);
  const [importResult, conferencesResult, participantsResult, sessionsResult] = await Promise.all([
    supabase.from("webinar_attendance_imports").select("*").eq("business_id", businessId).eq("webinar_id", webinarId).maybeSingle(),
    supabase.from("webinar_conferences").select("*").eq("business_id", businessId).eq("webinar_id", webinarId).order("started_at", { ascending: true }),
    supabase.from("webinar_participants").select("*").eq("business_id", businessId).eq("webinar_id", webinarId).order("created_at", { ascending: true }),
    supabase.from("webinar_participant_sessions").select("*").eq("business_id", businessId).eq("webinar_id", webinarId).order("joined_at", { ascending: true }),
  ]);
  if ([importResult, conferencesResult, participantsResult, sessionsResult].some((result) => result.error)) {
    throw new MeetAttendanceServiceError("DATABASE_ERROR", "Could not load webinar attendance.");
  }
  const { data: registrationLinks, error: registrationLinksError } = await supabase.from("webinar_registration_sessions")
    .select("registration_id")
    .eq("business_id", businessId)
    .eq("webinar_id", webinarId);
  if (registrationLinksError) throw new MeetAttendanceServiceError("DATABASE_ERROR", "Could not load webinar registrations.");
  const registrationIds = [...new Set(registrationLinks?.map((row) => row.registration_id) ?? [])];
  const { data: registrations, error: registrationsError } = registrationIds.length
    ? await supabase.from("webinar_registrations").select("id,full_name,email")
      .eq("business_id", businessId).in("id", registrationIds)
    : { data: [], error: null };
  if (registrationsError) throw new MeetAttendanceServiceError("DATABASE_ERROR", "Could not load webinar registrations.");
  const conferences = conferencesResult.data ?? [];
  const participants = participantsResult.data ?? [];
  const importState = importResult.data ?? null;
  const googleStatus = await getGoogleConnectionStatus(businessId);
  const activeConference = conferences.some((conference) => !conference.ended_at || new Date(conference.ended_at).getTime() > Date.now());
  const sessionEnded = Boolean(webinar.scheduled_start && Date.parse(webinar.scheduled_start) + webinar.duration_minutes * 60_000 <= Date.now());
  const noShowFinalizationReady = Boolean(
    sessionEnded && importState?.status === "complete" && conferences.length > 0 && !activeConference &&
    participants.every((participant) => participant.review_disposition !== "unresolved"),
  );
  return {
    integration: {
      status: googleStatus.connected && googleStatus.scope_granted && webinar.meet_space_name
        ? "available" as const
        : "integration_unavailable" as const,
      connected: googleStatus.connected,
      scope_granted: googleStatus.scope_granted,
      updated_at: googleStatus.updated_at,
    },
    import: importState,
    conferences,
    participants,
    participant_sessions: sessionsResult.data ?? [],
    registrations: registrations ?? [],
    counts: {
      registered_participants: participants.filter((participant) => participant.registration_id).length,
      imported_participants: participants.length,
      imported_join_sessions: sessionsResult.data?.length ?? 0,
      unresolved_participants: participants.filter((participant) => participant.review_disposition === "unresolved").length,
    },
    no_show_finalization_ready: noShowFinalizationReady,
  };
}

export async function importWebinarAttendance(
  webinarId: string,
  maxPages: number,
  providerOverride?: MeetAttendanceProvider | null,
) {
  const context = await ownerContext();
  const { supabase, businessId } = context;
  const webinar = await getOwnedWebinar(supabase, businessId, webinarId);
  const importState = await getOrCreateImport(supabase, businessId, webinarId);
  await recordWebinarAudit(context, {
    action: "webinar.attendance.import_started", resourceType: "webinar", resourceId: webinarId,
    metadata: { webinar_id: webinarId, import_id: importState.id, page_count: Math.max(1, Math.min(Math.trunc(maxPages), 50)) },
  });
  const provider = providerOverride ?? getMeetAttendanceProvider(businessId);
  const googleStatus = await getGoogleConnectionStatus(businessId);
  if (!provider || !webinar.meet_space_name || !googleStatus.connected || !googleStatus.scope_granted) {
    const unavailable = await updateImport(supabase, businessId, importState.id, {
      status: "integration_unavailable",
      last_error: "Google Meet attendance integration is unavailable; no provider credentials were supplied.",
      completed_at: null,
    });
    await recordWebinarAudit(context, {
      action: "webinar.attendance.import_completed", resourceType: "webinar", resourceId: webinarId, outcome: "failure",
      metadata: { webinar_id: webinarId, import_id: importState.id, participant_count: 0, unresolved_count: unavailable.unresolved_count ?? 0, reason_code: "INTEGRATION_UNAVAILABLE" },
      error: { code: "INTEGRATION_UNAVAILABLE", message: "Google Meet attendance integration is unavailable." },
    });
    return { status: "integration_unavailable" as const, import: unavailable, pages_processed: 0 };
  }

  const restartCompletedImport = importState.status === "complete";
  const checkpoint = restartCompletedImport ? emptyCheckpoint() : readCheckpoint(importState.checkpoint);
  let pagesFetched = restartCompletedImport ? 0 : importState.pages_fetched;
  const pagesLeft = { value: Math.max(1, Math.min(Math.trunc(maxPages), 50)) };
  await updateImport(supabase, businessId, importState.id, {
    status: "running",
    started_at: importState.started_at ?? new Date().toISOString(),
    last_error: null,
    checkpoint,
  });

  try {
    while (!checkpoint.conferencesComplete && pagesLeft.value > 0) {
      const page = await provider.listConferences({ spaceName: webinar.meet_space_name, pageToken: checkpoint.conferencePageToken });
      pagesLeft.value -= 1;
      await persistPage(supabase, {
        businessId,
        webinarId,
        importId: importState.id,
        level: "conferences",
        parentProviderName: "",
        pageToken: checkpoint.conferencePageToken,
        nextPageToken: page.nextPageToken,
        items: page.items,
      });
      for (const conference of page.items) {
        if (conference.name) await persistConference(supabase, businessId, webinarId, conference);
      }
      checkpoint.conferencePageToken = page.nextPageToken;
      checkpoint.conferencesComplete = !page.nextPageToken;
      pagesFetched += 1;
      await updateImport(supabase, businessId, importState.id, { checkpoint, pages_fetched: pagesFetched });
    }

    if (!checkpoint.conferencesComplete) {
      const incomplete = await updateImport(supabase, businessId, importState.id, { status: "incomplete", checkpoint });
      await recordWebinarAudit(context, {
        action: "webinar.attendance.import_completed", resourceType: "webinar", resourceId: webinarId, outcome: "failure",
        metadata: { webinar_id: webinarId, import_id: importState.id, participant_count: incomplete.participant_count ?? 0, unresolved_count: incomplete.unresolved_count ?? 0, reason_code: "PAGE_LIMIT_REACHED" },
        error: { code: "PAGE_LIMIT_REACHED", message: "Attendance import is incomplete." },
      });
      return { status: "incomplete" as const, import: incomplete, pages_processed: Math.max(0, maxPages - pagesLeft.value) };
    }

    const { data: conferences, error: conferenceError } = await supabase
      .from("webinar_conferences")
      .select("id, provider_conference_name")
      .eq("business_id", businessId)
      .eq("webinar_id", webinarId)
      .order("started_at", { ascending: true });
    if (conferenceError) throw new MeetAttendanceServiceError("DATABASE_ERROR", "Could not load imported conferences.");

    while (checkpoint.conferenceIndex < (conferences?.length ?? 0) && pagesLeft.value > 0) {
      const conference = conferences?.[checkpoint.conferenceIndex];
      const complete = await processParticipantPages(supabase, provider, businessId, webinarId, conference, checkpoint, pagesLeft, importState.id);
      if (!complete) break;
      checkpoint.conferenceIndex += 1;
      await updateImport(supabase, businessId, importState.id, { checkpoint });
    }

    const fullyImported = checkpoint.conferenceIndex >= (conferences?.length ?? 0) &&
      (conferences?.length ?? 0) > 0 &&
      (conferences ?? []).every((conference) => checkpoint.participantPagesComplete[conference.provider_conference_name]);
    const recordCounts = await counts(supabase, businessId, webinarId);
    const finalState = await updateImport(supabase, businessId, importState.id, {
      status: fullyImported ? "complete" : "incomplete",
      checkpoint,
      ...recordCounts,
      last_successful_sync_at: fullyImported ? new Date().toISOString() : importState.last_successful_sync_at,
      completed_at: fullyImported ? new Date().toISOString() : null,
      last_error: fullyImported ? null : "Attendance import is incomplete; resume paging before finalizing no-shows.",
    });
    await recordWebinarAudit(context, {
      action: "webinar.attendance.import_completed", resourceType: "webinar", resourceId: webinarId,
      outcome: finalState.status === "complete" ? "success" : "failure",
      metadata: { webinar_id: webinarId, import_id: importState.id, participant_count: finalState.participant_count ?? 0, unresolved_count: finalState.unresolved_count ?? 0, reason_code: finalState.status === "complete" ? "COMPLETE" : "INCOMPLETE" },
      ...(finalState.status === "complete" ? {} : { error: { code: "INCOMPLETE", message: "Attendance import is incomplete." } }),
    });
    return { status: finalState.status, import: finalState, pages_processed: Math.max(0, maxPages - pagesLeft.value) };
  } catch (error) {
    const recordCounts = await counts(supabase, businessId, webinarId);
    const failedState = await updateImport(supabase, businessId, importState.id, {
      status: "incomplete",
      checkpoint,
      ...recordCounts,
      last_error: error instanceof MeetAttendanceServiceError ? error.message : "Attendance provider request failed; retry is required.",
    });
    await recordWebinarAudit(context, {
      action: "webinar.attendance.import_completed", resourceType: "webinar", resourceId: webinarId, outcome: "failure",
      metadata: { webinar_id: webinarId, import_id: importState.id, participant_count: failedState.participant_count ?? 0, unresolved_count: failedState.unresolved_count ?? 0, reason_code: "PROVIDER_ERROR" },
      error: { code: "PROVIDER_ERROR", message: "Attendance provider request failed." },
    });
    return { status: "incomplete" as const, import: failedState, pages_processed: Math.max(0, maxPages - pagesLeft.value) };
  }
}

export async function reviewWebinarParticipant(webinarId: string, participantId: string, input: AttendanceReviewInput) {
  const context = await ownerContext();
  const { supabase, businessId, userId } = context;
  await getOwnedWebinar(supabase, businessId, webinarId);
  const { data: participant, error: participantError } = await supabase
    .from("webinar_participants")
    .select("id")
    .eq("business_id", businessId)
    .eq("webinar_id", webinarId)
    .eq("id", participantId)
    .maybeSingle();
  if (participantError) throw new MeetAttendanceServiceError("DATABASE_ERROR", "Could not load the participant.");
  if (!participant) throw new MeetAttendanceServiceError("NOT_FOUND", "Attendance participant not found.");

  if (input.registration_id) {
    const { data: registration, error } = await supabase
      .from("webinar_registration_sessions")
      .select("registration_id")
      .eq("business_id", businessId)
      .eq("webinar_id", webinarId)
      .eq("registration_id", input.registration_id)
      .maybeSingle();
    if (error) throw new MeetAttendanceServiceError("DATABASE_ERROR", "Could not validate the registration.");
    if (!registration) throw new MeetAttendanceServiceError("VALIDATION_ERROR", "Registration does not belong to this webinar.");
  }

  const { data: updated, error } = await supabase.from("webinar_participants")
    .update({
      registration_id: input.registration_id ?? null,
      review_disposition: input.disposition,
      reviewed_at: new Date().toISOString(),
      reviewed_by: userId,
    })
    .eq("business_id", businessId)
    .eq("webinar_id", webinarId)
    .eq("id", participantId)
    .select("*")
    .single();
  if (error || !updated) throw new MeetAttendanceServiceError("DATABASE_ERROR", "Could not save the participant review.");

  const { data: currentImport } = await supabase
    .from("webinar_attendance_imports")
    .select("id, eligibility_version")
    .eq("business_id", businessId)
    .eq("webinar_id", webinarId)
    .maybeSingle();
  if (currentImport) {
    const { count: unresolvedCount } = await supabase
      .from("webinar_participants")
      .select("id", { count: "exact", head: true })
      .eq("business_id", businessId)
      .eq("webinar_id", webinarId)
      .eq("review_disposition", "unresolved");
    await updateImport(supabase, businessId, currentImport.id, {
      eligibility_version: currentImport.eligibility_version + 1,
      unresolved_count: unresolvedCount ?? 0,
    });
  }
  await recordWebinarAudit(context, {
    action: "webinar.participant.reviewed", resourceType: "webinar_participant", resourceId: participantId,
    metadata: { webinar_id: webinarId, participant_id: participantId, review_disposition: input.disposition },
  });
  return updated;
}
