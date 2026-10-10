"use client";

import { useQuery } from "@tanstack/react-query";
import { getWebinar, listWebinarSeries, listWebinars } from "@/app/dashboard/webinars/webinar-api";

export const webinarKeys = {
  all: ["webinars"] as const,
  lists: () => [...webinarKeys.all, "list"] as const,
  series: () => [...webinarKeys.all, "series"] as const,
  list: () => [...webinarKeys.lists()] as const,
  details: () => [...webinarKeys.all, "detail"] as const,
  detail: (id: string) => [...webinarKeys.details(), id] as const,
};

export function useWebinarList() {
  return useQuery({ queryKey: webinarKeys.list(), queryFn: listWebinars });
}

export function useWebinar(id: string) {
  return useQuery({ queryKey: webinarKeys.detail(id), queryFn: () => getWebinar(id) });
}

export function useWebinarSeries() {
  return useQuery({ queryKey: webinarKeys.series(), queryFn: listWebinarSeries });
}
