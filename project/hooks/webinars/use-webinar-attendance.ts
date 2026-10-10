"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { webinarKeys } from "./use-webinars";

type ApiError = { error?: { message?: string } };
export type WebinarAttendanceData = {
  integration: { status: "available" | "integration_unavailable"; connected: boolean; scope_granted: boolean; updated_at: string | null };
  import: { status: string; last_successful_sync_at: string | null; last_error: string | null } | null;
  conferences: Array<{ id: string; ended_at: string | null }>;
  participants: Array<{ id: string; display_name: string | null; identity_type: string; review_disposition: string; registration_id: string | null; email: string | null }>;
  participant_sessions: Array<{ id: string; participant_id: string; joined_at: string | null; left_at: string | null; duration_seconds: number | null }>;
  registrations: Array<{ id: string; full_name: string; email: string }>;
  counts: { registered_participants: number; imported_participants: number; imported_join_sessions: number; unresolved_participants: number };
  no_show_finalization_ready: boolean;
};

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, { ...init, headers: { "Content-Type": "application/json", ...init?.headers } });
  const payload = await response.json() as { data?: T } & ApiError;
  if (!response.ok || payload.data === undefined) throw new Error(payload.error?.message ?? "Attendance request failed.");
  return payload.data;
}

export const webinarAttendanceKeys = {
  all: (id: string) => [...webinarKeys.detail(id), "attendance"] as const,
};

export function useWebinarAttendance(id: string) {
  return useQuery({ queryKey: webinarAttendanceKeys.all(id), queryFn: () => request<WebinarAttendanceData>(`/api/webinars/${encodeURIComponent(id)}/attendance`) });
}

export function useWebinarAttendanceActions(id: string) {
  const client = useQueryClient();
  const refresh = () => client.invalidateQueries({ queryKey: webinarAttendanceKeys.all(id) });
  const importAttendance = useMutation({
    mutationFn: () => request(`/api/webinars/${encodeURIComponent(id)}/attendance`, { method: "POST", body: JSON.stringify({ max_pages: 10 }) }),
    onSuccess: refresh,
  });
  const reviewParticipant = useMutation({
    mutationFn: (input: { participantId: string; disposition: string; registration_id?: string | null }) =>
      request(`/api/webinars/${encodeURIComponent(id)}/attendance/participants/${encodeURIComponent(input.participantId)}`, {
        method: "PATCH",
        body: JSON.stringify({ disposition: input.disposition, registration_id: input.registration_id ?? null }),
      }),
    onSuccess: refresh,
  });
  return { importAttendance, reviewParticipant };
}
