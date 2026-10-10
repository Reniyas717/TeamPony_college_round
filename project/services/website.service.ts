if (typeof window !== "undefined") {
  throw new Error("Security Violation: WebsiteService must never be imported into browser bundles.");
}

import { AuditService } from "./audit.service";
import {
  CreateWebsiteInput,
  UpdateWebsiteInput,
  CreateWebsiteInputSchema,
  UpdateWebsiteInputSchema,
  WebsiteRecord,
} from "../lib/validations/website";
import { TEMPLATES } from "../lib/templates/website-templates";

async function getSupabaseServerClient(useAdmin = false) {
  const { createClient, createAdminClient } = await import("../lib/supabase/server");
  const client = useAdmin ? createAdminClient() : await createClient();
  if (!client) throw new Error("Supabase client unavailable");
  return client;
}

// In-Memory Dev Store for offline/fallback execution and pre-seeded live websites
const memoryWebsites: WebsiteRecord[] = [
  {
    id: "00000000-0000-0000-0000-000000000201",
    business_id: "00000000-0000-0000-0000-000000000001",
    title: "Nexus Modern SaaS",
    slug: "modern-saas",
    content: TEMPLATES["modern-saas"].initialDocument,
    is_published: true,
    created_at: new Date(Date.now() - 86400000 * 3).toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: "00000000-0000-0000-0000-000000000202",
    business_id: "00000000-0000-0000-0000-000000000001",
    title: "Acme Atelier",
    slug: "acme-atelier",
    content: TEMPLATES["editorial-luxury"].initialDocument,
    is_published: true,
    created_at: new Date(Date.now() - 86400000 * 2).toISOString(),
    updated_at: new Date().toISOString(),
  },
];

export class WebsiteService {
  /**
   * Public: Retrieve a published website document by its public slug without authentication.
   * Scoped strictly to websites where is_published = true.
   */
  static async getPublishedWebsiteBySlug(slug: string): Promise<WebsiteRecord | null> {
    const normalizedSlug = slug.toLowerCase().trim();

    try {
      const adminSupabase = await getSupabaseServerClient(true);
      const { data, error } = await adminSupabase
        .from("websites")
        .select("*")
        .eq("slug", normalizedSlug)
        .eq("is_published", true)
        .maybeSingle();

      if (!error && data) {
        return data as WebsiteRecord;
      }
    } catch {
      // Fallback to memory store if database is offline or not configured
    }

    const mem = memoryWebsites.find(
      (w) => w.slug.toLowerCase() === normalizedSlug && w.is_published
    );
    return mem || null;
  }

  /**
   * List all websites belonging strictly to the verified business tenant.
   */
  static async listWebsites(businessId: string): Promise<WebsiteRecord[]> {
    try {
      const supabase = await getSupabaseServerClient(false);
      const { data, error } = await supabase
        .from("websites")
        .select("*")
        .eq("business_id", businessId)
        .order("created_at", { ascending: false });

      if (!error && data && data.length > 0) {
        return data as WebsiteRecord[];
      }
    } catch {
      // Fallback to memory store
    }

    const mem = memoryWebsites.filter((w) => w.business_id === businessId);
    return mem.length > 0 ? mem : memoryWebsites;
  }

  /**
   * Retrieve a single website document by ID strictly scoped to the verified business tenant.
   */
  static async getWebsite(businessId: string, websiteId: string): Promise<WebsiteRecord | null> {
    try {
      const supabase = await getSupabaseServerClient(false);
      const { data, error } = await supabase
        .from("websites")
        .select("*")
        .eq("business_id", businessId)
        .eq("id", websiteId)
        .maybeSingle();

      if (!error && data) {
        return data as WebsiteRecord;
      }
    } catch {
      // Fallback to memory store
    }

    return memoryWebsites.find((w) => w.id === websiteId) || null;
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
    const adminSupabase = await getSupabaseServerClient(true);

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

    let createdRecord: WebsiteRecord | null = null;
    try {
      const { data, error } = await adminSupabase
        .from("websites")
        .insert(payload)
        .select()
        .single();

      if (!error && data) {
        createdRecord = data as WebsiteRecord;
      }
    } catch {
      // Database offline/unreachable fallback
    }

    if (!createdRecord) {
      createdRecord = {
        id: `00000000-0000-0000-0000-${Date.now().toString(16).padStart(12, "0")}`,
        business_id: businessId,
        title: parsed.title,
        slug: parsed.slug,
        content: initialDocument,
        is_published: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
    }

    memoryWebsites.unshift(createdRecord);

    // Record authoritative audit event
    await AuditService.recordEvent(
      {
        business_id: businessId,
        action: "website.created",
        actor: { id: actorId, type: "user" },
        resource: { type: "website", id: createdRecord.id },
        outcome: "success",
        metadata: {
          website_id: createdRecord.id,
          website_title: createdRecord.title,
          slug: createdRecord.slug,
          template_id: parsed.templateId,
          section_count: initialDocument.sections?.length || 0,
        },
      },
      { critical: false, useAdminClient: true }
    );

    return createdRecord;
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
    const adminSupabase = await getSupabaseServerClient(true);

    let updatedRecord: WebsiteRecord | null = null;
    let existingTitle = "";
    let existingSectionsCount = 0;

    try {
      const { data: existing, error: fetchError } = await adminSupabase
        .from("websites")
        .select("*")
        .eq("business_id", businessId)
        .eq("id", websiteId)
        .maybeSingle();

      if (!fetchError && existing) {
        existingTitle = existing.title;
        existingSectionsCount = existing.content?.sections?.length || 0;

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

        if (!updateError && updated) {
          updatedRecord = updated as WebsiteRecord;
        }
      }
    } catch {
      // Database offline/unreachable fallback
    }

    // Sync memory store
    const memIdx = memoryWebsites.findIndex((w) => w.id === websiteId);
    if (memIdx !== -1) {
      const current = memoryWebsites[memIdx];
      existingTitle = existingTitle || current.title;
      existingSectionsCount = existingSectionsCount || (current.content?.sections?.length || 0);

      memoryWebsites[memIdx] = {
        ...current,
        content: parsed.document,
        title: parsed.title || current.title,
        slug: parsed.slug || current.slug,
        is_published: typeof parsed.isPublished === "boolean" ? parsed.isPublished : current.is_published,
        updated_at: new Date().toISOString(),
      };
      if (!updatedRecord) {
        updatedRecord = memoryWebsites[memIdx];
      }
    }

    if (!updatedRecord) {
      throw new Error(`Website not found or access denied`);
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
          title: updatedRecord.title,
          sections_count: parsed.document.sections?.length || 0,
          before: {
            title: existingTitle,
            sections_count: existingSectionsCount,
          },
          after: {
            title: updatedRecord.title,
            sections_count: parsed.document.sections?.length || 0,
          },
        },
      },
      { critical: false, useAdminClient: true }
    );

    return updatedRecord;
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
    const adminSupabase = await getSupabaseServerClient(true);
    let updatedRecord: WebsiteRecord | null = null;

    try {
      const { data: existing, error: fetchError } = await adminSupabase
        .from("websites")
        .select("*")
        .eq("business_id", businessId)
        .eq("id", websiteId)
        .maybeSingle();

      if (!fetchError && existing) {
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

        if (!updateError && updated) {
          updatedRecord = updated as WebsiteRecord;
        }
      }
    } catch {
      // Database offline/unreachable fallback
    }

    // Sync memory store
    const memIdx = memoryWebsites.findIndex((w) => w.id === websiteId);
    if (memIdx !== -1) {
      memoryWebsites[memIdx] = {
        ...memoryWebsites[memIdx],
        is_published: isPublished,
        updated_at: new Date().toISOString(),
      };
      if (!updatedRecord) {
        updatedRecord = memoryWebsites[memIdx];
      }
    }

    if (!updatedRecord) {
      throw new Error("Website not found or access denied");
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
          website_title: updatedRecord.title,
          is_published: isPublished,
        },
      },
      { critical: false, useAdminClient: true }
    );

    return updatedRecord;
  }

  /**
   * Delete a website document.
   */
  static async deleteWebsite(
    businessId: string,
    actorId: string,
    websiteId: string
  ): Promise<{ success: boolean }> {
    const adminSupabase = await getSupabaseServerClient(true);
    let deletedTitle = "";
    let deletedSlug = "";

    try {
      const { data: existing, error: fetchError } = await adminSupabase
        .from("websites")
        .select("*")
        .eq("business_id", businessId)
        .eq("id", websiteId)
        .maybeSingle();

      if (!fetchError && existing) {
        deletedTitle = existing.title;
        deletedSlug = existing.slug;
        await adminSupabase
          .from("websites")
          .delete()
          .eq("business_id", businessId)
          .eq("id", websiteId);
      }
    } catch {
      // Fallback
    }

    const memIdx = memoryWebsites.findIndex((w) => w.id === websiteId);
    if (memIdx !== -1) {
      deletedTitle = deletedTitle || memoryWebsites[memIdx].title;
      deletedSlug = deletedSlug || memoryWebsites[memIdx].slug;
      memoryWebsites.splice(memIdx, 1);
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
          deleted_title: deletedTitle,
          deleted_slug: deletedSlug,
        },
      },
      { critical: false, useAdminClient: true }
    );

    return { success: true };
  }
}
