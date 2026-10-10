import "server-only";

import { requireOwnerContext } from "@/lib/supabase/owner-context";
import { WebinarServiceError } from "./session.service";
import { recordWebinarAudit } from "./audit";

async function owner() {
  try {
    const context = await requireOwnerContext();
    return { ...context, supabase: context.client };
  } catch (error) {
    if (error instanceof Error && "status" in error) {
      const status = (error as { status?: number }).status;
      if (status === 401) throw new WebinarServiceError("UNAUTHORIZED", error.message);
      if (status === 404) throw new WebinarServiceError("NOT_FOUND", error.message);
    }
    throw new WebinarServiceError("DATABASE_ERROR", "Business data is temporarily unavailable.");
  }
}

export async function listSeries() {
  const { supabase, businessId } = await owner();
  const { data, error } = await supabase.from("webinar_series").select("*, webinars(*)")
    .eq("business_id", businessId).order("created_at", { ascending: false });
  if (error) throw new WebinarServiceError("DATABASE_ERROR", "Could not load webinar series.");
  return data ?? [];
}

export async function createSeries(input: { title: string; description?: string | null }) {
  const context = await owner();
  const { supabase, businessId } = context;
  const { data, error } = await supabase.from("webinar_series").insert({
    business_id: businessId, title: input.title, description: input.description ?? null,
  }).select("*").single();
  if (error || !data) throw new WebinarServiceError("DATABASE_ERROR", "Could not create webinar series.");
  await recordWebinarAudit(context, {
    action: "webinar.series.created", resourceType: "webinar_series", resourceId: data.id,
    metadata: { series_id: data.id, session_count: 0 },
  });
  return data;
}

export async function getSeriesDeletePreview(id: string) {
  const { supabase, businessId } = await owner();
  const { data: series, error: seriesError } = await supabase.from("webinar_series")
    .select("id,title,description,created_at").eq("business_id", businessId).eq("id", id).maybeSingle();
  if (seriesError) throw new WebinarServiceError("DATABASE_ERROR", "Could not load series deletion preview.");
  if (!series) throw new WebinarServiceError("NOT_FOUND", "Webinar series not found.");
  const { data: counts, error } = await supabase.rpc("webinar_series_delete_counts", { p_series_id: id });
  if (error || !counts) throw new WebinarServiceError("DATABASE_ERROR", "Could not count series records for deletion.");
  return { ...series, counts };
}

export async function deleteWebinarSeries(id: string, expectedCounts: Record<string, number>) {
  const context = await owner();
  const { supabase } = context;
  const { data, error } = await supabase.rpc("delete_webinar_series", {
    p_series_id: id,
    p_expected_counts: expectedCounts,
  });
  if (error) {
    if (error.code === "40001" || error.message.includes("WEBINAR_SERIES_DELETE_PREVIEW_STALE") || error.message.includes("WEBINAR_SERIES_EXTERNAL_OPERATION_UNRESOLVED")) {
      throw new WebinarServiceError("CONFLICT", "Series records changed or an external operation is unresolved. Refresh the preview and reconcile active work before retrying.");
    }
    if (error.message.includes("WEBINAR_SERIES_NOT_FOUND")) throw new WebinarServiceError("NOT_FOUND", "Webinar series not found.");
    throw new WebinarServiceError("DATABASE_ERROR", "Could not delete webinar series.");
  }
  await recordWebinarAudit(context, {
    action: "webinar.series.deleted", resourceType: "webinar_series", resourceId: id,
    metadata: { series_id: id, result: "deleted" },
  });
  return { deleted: true, counts: data as Record<string, number> };
}
