import "server-only";

import { createClient } from "@/lib/supabase/server";
import { WebinarServiceError } from "./session.service";

async function owner() {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) throw new WebinarServiceError("UNAUTHORIZED", "Sign in to manage webinar series.");
  const { data: business, error } = await supabase.from("businesses").select("id")
    .eq("owner_id", user.id).maybeSingle();
  if (error || !business) throw new WebinarServiceError("NOT_FOUND", "Business workspace not found.");
  return { supabase, businessId: business.id };
}

export async function listSeries() {
  const { supabase, businessId } = await owner();
  const { data, error } = await supabase.from("webinar_series").select("*, webinars(*)")
    .eq("business_id", businessId).order("created_at", { ascending: false });
  if (error) throw new WebinarServiceError("DATABASE_ERROR", "Could not load webinar series.");
  return data ?? [];
}

export async function createSeries(input: { title: string; description?: string | null }) {
  const { supabase, businessId } = await owner();
  const { data, error } = await supabase.from("webinar_series").insert({
    business_id: businessId, title: input.title, description: input.description ?? null,
  }).select("*").single();
  if (error || !data) throw new WebinarServiceError("DATABASE_ERROR", "Could not create webinar series.");
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
  const { supabase } = await owner();
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
  return { deleted: true, counts: data as Record<string, number> };
}
