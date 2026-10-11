"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { webinarKeys } from "./use-webinars";

export type WebinarWorkSummary = {
  claimed: number;
  provider_accepted: number;
  retry_queued: number;
  failed: number;
  reconnect_required: number;
  unknown: number;
  finalization_failed: number;
  blocked: number;
};

export function useProcessWebinarEmails() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (): Promise<WebinarWorkSummary> => {
      const response = await fetch("/api/webinars/work", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ batch_size: 50 }),
      });
      const result = await response.json().catch(() => null) as {
        data?: WebinarWorkSummary;
        error?: { message?: string };
      } | null;
      if (!response.ok || !result?.data) throw new Error(result?.error?.message ?? "Could not process queued webinar emails.");
      return result.data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: webinarKeys.all }),
  });
}
