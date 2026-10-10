"use client";

import { useQuery } from "@tanstack/react-query";
import { AnalyticsDashboardPayload } from "@/lib/validations/analytics";

export const analyticsKeys = {
  all: ["analytics"] as const,
  dashboard: () => [...analyticsKeys.all, "dashboard"] as const,
};

export function useAnalyticsDashboard() {
  return useQuery({
    queryKey: analyticsKeys.dashboard(),
    queryFn: async (): Promise<AnalyticsDashboardPayload> => {
      const res = await fetch("/api/analytics");
      if (!res.ok) {
        throw new Error("Failed to load analytics metrics");
      }
      const json = await res.json();
      return json.data;
    },
    staleTime: 1000 * 30, // 30 seconds fresh
    refetchOnWindowFocus: true,
  });
}
