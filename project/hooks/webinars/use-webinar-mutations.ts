"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  createWebinar, createWebinarSeries, deleteWebinar, deleteWebinarSeries, scheduleWebinar, updateWebinar, webinarAction,
  type WebinarApiPayload, type WebinarSession,
} from "@/app/dashboard/webinars/webinar-api";
import { webinarKeys } from "./use-webinars";

export function useWebinarMutations() {
  const queryClient = useQueryClient();
  const refresh = () => queryClient.invalidateQueries({ queryKey: webinarKeys.all });
  const create = useMutation({ mutationFn: (payload: WebinarApiPayload) => createWebinar(payload), onSuccess: refresh });
  const createSeries = useMutation({ mutationFn: (payload: { title: string; description?: string | null }) => createWebinarSeries(payload), onSuccess: refresh });
  const removeSeries = useMutation({ mutationFn: ({ id, counts }: { id: string; counts: Record<string, number> }) => deleteWebinarSeries(id, counts), onSuccess: refresh });
  const update = useMutation({ mutationFn: ({ id, payload }: { id: string; payload: WebinarApiPayload }) => updateWebinar(id, payload), onSuccess: refresh });
  const schedule = useMutation({ mutationFn: ({ id, session }: { id: string; session: WebinarSession }) => scheduleWebinar(id, session), onSuccess: refresh });
  const remove = useMutation({ mutationFn: ({ id, version }: { id: string; version?: number | null }) => deleteWebinar(id, version), onSuccess: refresh });
  const action = useMutation({ mutationFn: ({ id, action, payload }: { id: string; action: "cancel" | "followup"; payload?: Record<string, unknown> }) => webinarAction(id, action, payload), onSuccess: refresh });
  return { create, createSeries, removeSeries, update, schedule, remove, action };
}
