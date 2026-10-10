if (typeof window !== "undefined") {
  throw new Error("Security Violation: WebsiteService must never be imported into browser bundles.");
}

import { createClient, createAdminClient } from "@/lib/supabase/server";
import { AuditService } from "./audit.service";
import {
  CreateWebsiteInput,
  UpdateWebsiteInput,
  CreateWebsiteInputSchema,
  UpdateWebsiteInputSchema,
  WebsiteRecord,
} from "@/lib/validations/website";
import { TEMPLATES } from "@/lib/templates/website-templates";

export class WebsiteService {
  /**
   * List all websites belonging strictly to the verified business tenant.
   */
  static async listWebsites(businessId: string): Promise<WebsiteRecord[]> {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("websites")
      .select("*")
      .eq("business_id", businessId)
      .order("created_at", { ascending: false });

    if (error) {
      throw new Error(`Failed to list websites: ${error.message}`);
    }

    return (data || []) as WebsiteRecord[];
  }

  /**
   * Retrieve a single website document by ID strictly scoped to the verified business tenant.
   */
  static async getWebsite(businessId: string, websiteId: string): Promise<WebsiteRecord | null> {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("websites")
      .select("*")
      .eq("business_id", businessId)
      .eq("id", websiteId)
      .maybeSingle();

    if (error) {
      throw new Error(`Failed to fetch website ${websiteId}: ${error.message}`);
    }

    return data as WebsiteRecord | null;
  }

  /**
   * Create a new website from a template or blank document.
   */
  static async createWebsite(
    businessId: string,
    actorId: string,
    rawInput: CreateWebsiteInput
  ): Promise<WebsiteRecord> {
    const parsed = CreateWebsiteInputSchema.parse(rawInput);
    const adminSupabase = createAdminClient();

    // Check slug uniqueness within this business
    const { data: existingSlug } = await adminSupabase
      .from("websites")
      .select("id")
      .eq("business_id", businessId)
      .eq("slug", parsed.slug)
      .maybeSingle();

    if (existingSlug) {
      throw new Error(`A website with the slug "${parsed.slug}" already exists in your workspace.`);
    }

    // Resolve template document
    const templateDef = TEMPLATES[parsed.templateId] || TEMPLATES["blank"];
    const initialDocument = parsed.initialDocument || templateDef.initialDocument;

    const payload = {
      business_id: businessId,
      title: parsed.title,
      slug: parsed.slug,
      content: initialDocument,
      is_published: false,
    };

    const { data, error } = await adminSupabase
      .from("websites")
      .insert(payload)
      .select()
      .single();

    if (error || !data) {
      throw new Error(`Failed to create website: ${error?.message || "Unknown database error"}`);
    }

    // Record authoritative audit event
    await AuditService.recordEvent(
      {
        business_id: businessId,
        action: "website.created",
        actor: { id: actorId, type: "user" },
        resource: { type: "website", id: data.id },
        outcome: "success",
        metadata: {
          website_id: data.id,
          website_title: data.title,
          slug: data.slug,
          template_id: parsed.templateId,
          section_count: initialDocument.sections?.length || 0,
        },
      },
      { critical: false, useAdminClient: true }
    );

    return data as WebsiteRecord;
  }

  /**
   * Update a website document (save draft, modify content, change properties).
   */
  static async updateWebsite(
    businessId: string,
    actorId: string,
    websiteId: string,
    rawInput: UpdateWebsiteInput
  ): Promise<WebsiteRecord> {
    const parsed = UpdateWebsiteInputSchema.parse(rawInput);
    const adminSupabase = createAdminClient();

    // Fetch before state for verification and audit trail
    const { data: existing, error: fetchError } = await adminSupabase
      .from("websites")
      .select("*")
      .eq("business_id", businessId)
      .eq("id", websiteId)
      .maybeSingle();

    if (fetchError || !existing) {
      throw new Error(`Website not found or not owned by business`);
    }

    const updatePayload: Record<string, unknown> = {
      content: parsed.document,
      updated_at: new Date().toISOString(),
    };

    if (parsed.title) updatePayload.title = parsed.title;
    if (parsed.slug) updatePayload.slug = parsed.slug;
    if (typeof parsed.isPublished === "boolean") updatePayload.is_published = parsed.isPublished;

    const { data: updated, error: updateError } = await adminSupabase
      .from("websites")
      .update(updatePayload)
      .eq("business_id", businessId)
      .eq("id", websiteId)
      .select()
      .single();

    if (updateError || !updated) {
      throw new Error(`Failed to update website: ${updateError?.message || "Update error"}`);
    }

    // Record authoritative audit event
    await AuditService.recordEvent(
      {
        business_id: businessId,
        action: "website.updated",
        actor: { id: actorId, type: "user" },
        resource: { type: "website", id: websiteId },
        outcome: "success",
        metadata: {
          website_id: websiteId,
          title: updated.title,
          sections_count: parsed.document.sections?.length || 0,
          before: {
            title: existing.title,
            sections_count: existing.content?.sections?.length || 0,
          },
          after: {
            title: updated.title,
            sections_count: parsed.document.sections?.length || 0,
          },
        },
      },
      { critical: false, useAdminClient: true }
    );

    return updated as WebsiteRecord;
  }

  /**
   * Publish or unpublish a website.
   */
  static async setPublishStatus(
    businessId: string,
    actorId: string,
    websiteId: string,
    isPublished: boolean
  ): Promise<WebsiteRecord> {
    const adminSupabase = createAdminClient();

    const { data: existing, error: fetchError } = await adminSupabase
      .from("websites")
      .select("*")
      .eq("business_id", businessId)
      .eq("id", websiteId)
      .maybeSingle();

    if (fetchError || !existing) {
      throw new Error("Website not found or access denied");
    }

    const { data: updated, error: updateError } = await adminSupabase
      .from("websites")
      .update({
        is_published: isPublished,
        updated_at: new Date().toISOString(),
      })
      .eq("business_id", businessId)
      .eq("id", websiteId)
      .select()
      .single();

    if (updateError || !updated) {
      throw new Error(`Failed to update publish status: ${updateError?.message}`);
    }

    const action = isPublished ? "website.published" : "website.unpublished";

    await AuditService.recordEvent(
      {
        business_id: businessId,
        action: action,
        actor: { id: actorId, type: "user" },
        resource: { type: "website", id: websiteId },
        outcome: "success",
        metadata: {
          website_id: websiteId,
          website_title: updated.title,
          is_published: isPublished,
        },
      },
      { critical: false, useAdminClient: true }
    );

    return updated as WebsiteRecord;
  }

  /**
   * Delete a website document.
   */
  static async deleteWebsite(
    businessId: string,
    actorId: string,
    websiteId: string
  ): Promise<{ success: boolean }> {
    const adminSupabase = createAdminClient();

    const { data: existing, error: fetchError } = await adminSupabase
      .from("websites")
      .select("*")
      .eq("business_id", businessId)
      .eq("id", websiteId)
      .maybeSingle();

    if (fetchError || !existing) {
      throw new Error("Website not found or access denied");
    }

    const { error: deleteError } = await adminSupabase
      .from("websites")
      .delete()
      .eq("business_id", businessId)
      .eq("id", websiteId);

    if (deleteError) {
      throw new Error(`Failed to delete website: ${deleteError.message}`);
    }

    await AuditService.recordEvent(
      {
        business_id: businessId,
        action: "website.deleted",
        actor: { id: actorId, type: "user" },
        resource: { type: "website", id: websiteId },
        outcome: "success",
        metadata: {
          website_id: websiteId,
          deleted_title: existing.title,
          deleted_slug: existing.slug,
        },
      },
      { critical: false, useAdminClient: true }
    );

    return { success: true };
  }
}
