"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  AddStageInput,
  CustomerJourneyMap,
  ExecuteActionInput,
  GenerateJourneyMapInput,
  JourneyMapStage,
  JourneyStageAction,
  UpdateStageInput,
} from "@/lib/validations/journey-map";

export const journeyMapKeys = {
  all: ["journey-maps"] as const,
  list: () => [...journeyMapKeys.all, "list"] as const,
  detail: (id: string) => [...journeyMapKeys.all, "detail", id] as const,
};

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, init);
  const json = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(json?.error?.message || "Journey map request failed");
  }
  return json.data as T;
}

export function useJourneyMaps() {
  return useQuery({
    queryKey: journeyMapKeys.list(),
    queryFn: () => request<CustomerJourneyMap[]>("/api/journey-maps"),
  });
}

export function useGenerateJourneyMap() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: GenerateJourneyMapInput) => request<CustomerJourneyMap>("/api/journey-maps/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: journeyMapKeys.list() }),
  });
}

export function useJourneyActionDecision() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ mapId, actionId, decision }: { mapId: string; actionId: string } & ExecuteActionInput) =>
      request<JourneyStageAction>(`/api/journey-maps/${mapId}/actions/${actionId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ decision }),
      }),
    onSuccess: (_action, variables) => queryClient.invalidateQueries({ queryKey: journeyMapKeys.detail(variables.mapId) }),
  });
}

export function useUpdateJourneyStage() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ mapId, stageId, input }: { mapId: string; stageId: string; input: UpdateStageInput }) =>
      request<JourneyMapStage>(`/api/journey-maps/${mapId}/stages/${stageId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      }),
    onSuccess: (_stage, variables) => queryClient.invalidateQueries({ queryKey: journeyMapKeys.detail(variables.mapId) }),
  });
}

export function useAddJourneyStage() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ mapId, input }: { mapId: string; input: AddStageInput }) =>
      request<JourneyMapStage>(`/api/journey-maps/${mapId}/stages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      }),
    onSuccess: (_stage, variables) => queryClient.invalidateQueries({ queryKey: journeyMapKeys.detail(variables.mapId) }),
  });
}

export function useDeleteJourneyStage() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ mapId, stageId }: { mapId: string; stageId: string }) =>
      request<{ success: true }>(`/api/journey-maps/${mapId}/stages/${stageId}`, { method: "DELETE" }),
    onSuccess: (_data, variables) => queryClient.invalidateQueries({ queryKey: journeyMapKeys.detail(variables.mapId) }),
  });
}
