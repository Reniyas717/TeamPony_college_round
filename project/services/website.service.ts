if (typeof window !== "undefined") {
  throw new Error("Security Violation: WebsiteService must never be imported into browser bundles.");
}

import {
  CreateWebsiteInput,
  UpdateWebsiteInput,
  CreateWebsiteInputSchema,
  UpdateWebsiteInputSchema,
  WebsiteRecord,
} from "@/lib/validations/website";
import { TEMPLATES } from "@/lib/templates/website-templates";
import {
  requireOwnerContext,
  type OwnerContext,
} from "@/lib/supabase/owner-context";

export class WebsiteServiceError extends Error {
  constructor(
    message: string,
    public readonly status: 400 | 404 | 409 | 503,
    public readonly code:
      | "VALIDATION_ERROR"
      | "NOT_FOUND"
      | "CONFLICT"
      | "DATABASE_UNAVAILABLE"
  ) {
    super(message);
    this.name = "WebsiteServiceError";
  }
}

type WebsiteReadContext = OwnerContext | string;

function databaseError(message: string): WebsiteServiceError {
  console.error(`[WEBSITE_DB_ERROR] ${message}`);
  return new WebsiteServiceError(
    "Website data is temporarily unavailable.",
    503,
    "DATABASE_UNAVAILABLE"
  );
}

type WebsiteRpcError = { code?: string; message?: string };

function websiteRpcError(
  operation: string,
  error: WebsiteRpcError,
  conflictMessage?: string
): WebsiteServiceError {
  if (error.code === "23505") {
    return new WebsiteServiceError(
      conflictMessage || "A website with that slug already exists in your workspace.",
      409,
      "CONFLICT"
    );
  }

  if (error.code === "P0002" || error.message?.includes("WEBSITE_NOT_FOUND")) {
    return new WebsiteServiceError(
      "Website not found or access denied.",
      404,
      "NOT_FOUND"
    );
  }

  return databaseError(`${operation}: ${error.message || "RPC failed"}`);
}

export class WebsiteService {
  /**
   * The dashboard and preview server components still pass their existing business ID
   * while their route files remain outside this scoped change. The ID is only a
   * compatibility check; all authority and database access come from a fresh owner context.
   */
  private static async resolveReadContext(
    input: WebsiteReadContext
  ): Promise<OwnerContext> {
    if (typeof input !== "string") return input;

    const context = await requireOwnerContext();
    if (context.businessId !== input) {
      throw new WebsiteServiceError(
        "Website access is not available for this workspace.",
        404,
        "NOT_FOUND"
      );
    }

    return context;
  }

  /**
   * List all websites belonging strictly to the verified business tenant.
   */
  static async listWebsites(context: WebsiteReadContext): Promise<WebsiteRecord[]> {
    const owner = await this.resolveReadContext(context);

    const { data, error } = await owner.client
      .from("websites")
      .select("*")
      .eq("business_id", owner.businessId)
      .order("created_at", { ascending: false });

    if (error) throw databaseError(`list websites: ${error.message}`);

    return (data || []) as WebsiteRecord[];
  }

  /**
   * Retrieve a single website document by ID strictly scoped to the verified business tenant.
   */
  static async getWebsite(
    context: WebsiteReadContext,
    websiteId: string
  ): Promise<WebsiteRecord | null> {
    const owner = await this.resolveReadContext(context);

    const { data, error } = await owner.client
      .from("websites")
      .select("*")
      .eq("business_id", owner.businessId)
      .eq("id", websiteId)
      .maybeSingle();

    if (error) throw databaseError(`get website ${websiteId}: ${error.message}`);

    return data as WebsiteRecord | null;
  }

  /**
   * Create a new website from a template or blank document.
   */
  static async createWebsite(
    owner: OwnerContext,
    rawInput: CreateWebsiteInput
  ): Promise<WebsiteRecord> {
    const parsedResult = CreateWebsiteInputSchema.safeParse(rawInput);
    if (!parsedResult.success) {
      throw new WebsiteServiceError(
        "Invalid website payload.",
        400,
        "VALIDATION_ERROR"
      );
    }
    const parsed = parsedResult.data;

    // Check slug uniqueness within this business
    const { data: existingSlug, error: slugError } = await owner.client
      .from("websites")
      .select("id")
      .eq("business_id", owner.businessId)
      .eq("slug", parsed.slug)
      .maybeSingle();

    if (slugError) throw databaseError(`check website slug: ${slugError.message}`);
    if (existingSlug) {
      throw new WebsiteServiceError(
        `A website with the slug "${parsed.slug}" already exists in your workspace.`,
        409,
        "CONFLICT"
      );
    }

    // Resolve template document
    const templateDef = TEMPLATES[parsed.templateId] || TEMPLATES["blank"];
    const initialDocument = parsed.initialDocument || templateDef.initialDocument;

    const { data, error } = await owner.client.rpc("website_create_with_audit", {
      p_title: parsed.title,
      p_slug: parsed.slug,
      p_content: initialDocument,
      p_template_id: parsed.templateId,
    });

    if (error || !data) {
      throw websiteRpcError(
        "create website",
        error || { message: "empty response" },
        `A website with the slug "${parsed.slug}" already exists in your workspace.`
      );
    }

    return data as WebsiteRecord;
  }

  /**
   * Update a website document (save draft, modify content, change properties).
   */
  static async updateWebsite(
    owner: OwnerContext,
    websiteId: string,
    rawInput: UpdateWebsiteInput
  ): Promise<WebsiteRecord> {
    const parsedResult = UpdateWebsiteInputSchema.safeParse(rawInput);
    if (!parsedResult.success) {
      throw new WebsiteServiceError(
        "Invalid website update payload.",
        400,
        "VALIDATION_ERROR"
      );
    }
    const parsed = parsedResult.data;

    const changedFields = [
      "document",
      ...(parsed.title ? ["title"] : []),
      ...(parsed.slug ? ["slug"] : []),
      ...(typeof parsed.isPublished === "boolean" ? ["is_published"] : []),
    ];

    const { data: updated, error: updateError } = await owner.client.rpc(
      "website_save_with_audit",
      {
        p_website_id: websiteId,
        p_title: parsed.title ?? null,
        p_slug: parsed.slug ?? null,
        p_content: parsed.document,
        p_is_published: parsed.isPublished ?? null,
        p_changed_fields: changedFields,
      }
    );

    if (updateError || !updated) {
      throw websiteRpcError(
        `update website ${websiteId}`,
        updateError || { message: "empty response" },
        "A website with that slug already exists in your workspace."
      );
    }

    return updated as WebsiteRecord;
  }

  /**
   * Publish or unpublish a website.
   */
  static async setPublishStatus(
    owner: OwnerContext,
    websiteId: string,
    isPublished: boolean
  ): Promise<WebsiteRecord> {
    const functionName = isPublished
      ? "website_publish_with_audit"
      : "website_unpublish_with_audit";
    const { data: updated, error: updateError } = await owner.client.rpc(functionName, {
      p_website_id: websiteId,
    });

    if (updateError || !updated) {
      throw websiteRpcError(
        `${isPublished ? "publish" : "unpublish"} website ${websiteId}`,
        updateError || { message: "empty response" }
      );
    }

    return updated as WebsiteRecord;
  }

  /**
   * Delete a website document.
   */
  static async deleteWebsite(
    owner: OwnerContext,
    websiteId: string
  ): Promise<{ success: boolean }> {
    const { data: deleted, error: deleteError } = await owner.client.rpc(
      "website_delete_with_audit",
      { p_website_id: websiteId }
    );

    if (deleteError || deleted !== true) {
      throw websiteRpcError(
        `delete website ${websiteId}`,
        deleteError || { message: "empty response" }
      );
    }

    return { success: true };
  }
}
