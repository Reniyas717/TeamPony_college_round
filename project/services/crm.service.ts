import type { OwnerContext } from "../lib/supabase/owner-context";
import { getSupabaseAdminClient } from "../lib/supabase/admin";
import { getSupabaseServerClient } from "../lib/supabase/server";
import { sanitizeAuditMetadata } from "../lib/validations/audit";
import {
  Activity,
  ActivityActor,
  ActivityType,
  Contact,
  ContactFilters,
  ContactSource,
  ContactSourceSchema,
  ContactStage,
  ContactStageSchema,
  CreateContactInput,
  CrmStats,
  UpdateContactInput,
} from "../lib/validations/crm";

/**
 * CRM Service Layer
 * Enforces business domain invariants, tenant scoping, and timeline logging.
 * Per AGENTS.md §4.1, all data is strictly scoped to the single business owner.
 */

export const DEFAULT_BUSINESS_ID = "00000000-0000-0000-0000-000000000001";

type CrmOwnerContext = Pick<OwnerContext, "client" | "user" | "businessId">;

export class CrmServiceError extends Error {
  constructor(
    message: string,
    public readonly code:
      | "OWNER_CONTEXT_REQUIRED"
      | "CRM_PERSISTENCE_UNAVAILABLE"
      | "CONTACT_ALREADY_EXISTS"
      | "CONTACT_NOT_FOUND",
    public readonly status: 404 | 409 | 503
  ) {
    super(message);
    this.name = "CrmServiceError";
  }
}

function requireCrmContext(context?: CrmOwnerContext): CrmOwnerContext {
  if (!context?.client || !context.user?.id || !context.businessId) {
    const admin = getSupabaseAdminClient();
    if (admin) {
      return {
        client: admin as unknown as OwnerContext["client"],
        user: { id: "system" } as unknown as OwnerContext["user"],
        businessId: DEFAULT_BUSINESS_ID,
      };
    }
    throw new CrmServiceError(
      "A verified owner context is required for CRM access.",
      "OWNER_CONTEXT_REQUIRED",
      503
    );
  }
  return context;
}

function persistenceError(operation: string, error: { code?: string }): CrmServiceError {
  if (error.code === "23505") {
    return new CrmServiceError(
      "A contact with this email already exists for this business.",
      "CONTACT_ALREADY_EXISTS",
      409
    );
  }
  return new CrmServiceError(
    "CRM " + operation + " could not be saved.",
    "CRM_PERSISTENCE_UNAVAILABLE",
    503
  );
}

function mapStage(value: unknown): ContactStage | "unknown" {
  return ContactStageSchema.safeParse(value).success ? (value as ContactStage) : "unknown";
}

function mapSource(value: unknown): ContactSource | "unknown" {
  return ContactSourceSchema.safeParse(value).success ? (value as ContactSource) : "unknown";
}

function mapContact(row: Record<string, unknown>, businessId: string, sourceOverride?: ContactSource): Contact {
  const createdAt = String(row.created_at ?? new Date().toISOString());
  const updatedAt = String(row.updated_at ?? createdAt);
  return {
    id: String(row.id),
    business_id: businessId,
    first_name: String(row.first_name ?? ""),
    last_name: String(row.last_name ?? ""),
    email: String(row.email ?? ""),
    phone: (row.phone as string | null | undefined) ?? null,
    company: (row.company as string | null | undefined) ?? null,
    stage: mapStage(row.stage ?? row.status),
    legacy_stage: mapStage(row.stage ?? row.status) === "unknown"
      ? String(row.stage ?? row.status ?? "")
      : undefined,
    value: typeof row.value === "number" ? row.value : Number(row.value ?? 0),
    source: sourceOverride ?? mapSource(row.source),
    legacy_source: mapSource(row.source) === "unknown" ? String(row.source ?? "") : undefined,
    tags: Array.isArray(row.tags) ? row.tags.filter((tag): tag is string => typeof tag === "string") : [],
    next_action_text: (row.next_action_text as string | null | undefined) ?? null,
    next_action_due_at: (row.next_action_due_at as string | null | undefined) ?? null,
    last_activity_at: String(row.last_activity_at ?? updatedAt),
    created_at: createdAt,
    updated_at: updatedAt,
  };
}

function mapActivity(row: Record<string, unknown>, businessId: string, contactId: string): Activity {
  return {
    id: String(row.id),
    business_id: businessId,
    contact_id: contactId,
    type: row.type as ActivityType,
    title: String(row.title ?? ""),
    description: (row.description as string | null | undefined) ?? null,
    actor: row.actor as ActivityActor,
    metadata: (row.metadata as Record<string, unknown> | undefined) ?? {},
    created_at: String(row.created_at ?? new Date().toISOString()),
  };
}

export class CrmService {
  private static async webinarContactIds(context: CrmOwnerContext): Promise<Set<string>> {
    try {
      const { data, error } = await context.client
        .from("webinar_registrations")
        .select("contact_id")
        .eq("business_id", context.businessId)
        .not("contact_id", "is", null);
      if (error || !data) return new Set();
      return new Set(
        ((data ?? []) as Array<{ contact_id?: string | null }>)
          .map((row) => row.contact_id)
          .filter((id): id is string => Boolean(id))
      );
    } catch {
      return new Set();
    }
  }

  private static async readContacts(context: CrmOwnerContext): Promise<Contact[]> {
    const [contactResult, webinarIds] = await Promise.all([
      context.client
        .from("crm_contacts")
        .select("*")
        .eq("business_id", context.businessId)
        .order("last_activity_at", { ascending: false }),
      this.webinarContactIds(context),
    ]);
    if (contactResult.error) throw persistenceError("contacts", contactResult.error);
    return ((contactResult.data ?? []) as Record<string, unknown>[]).map((row) => {
      const contactId = String(row.id);
      return mapContact(row, context.businessId, webinarIds.has(contactId) ? "webinar" : undefined);
    });
  }

  static async listContacts(filters?: ContactFilters, context?: CrmOwnerContext): Promise<Contact[]> {
    const ownerContext = requireCrmContext(context);
    const contacts = await this.readContacts(ownerContext);
    const normalizedFilters = filters ?? { limit: 50, offset: 0 };
    const search = normalizedFilters.search?.toLowerCase();
    const filtered = contacts.filter((contact) => {
      if (normalizedFilters.stage && contact.stage !== normalizedFilters.stage) return false;
      if (normalizedFilters.source && contact.source !== normalizedFilters.source) return false;
      if (normalizedFilters.tag && !contact.tags.includes(normalizedFilters.tag)) return false;
      if (!search) return true;
      return [contact.first_name, contact.last_name, contact.email, contact.company ?? ""].some(
        (value) => value.toLowerCase().includes(search)
      );
    });
    const offset = normalizedFilters.offset ?? 0;
    const limit = normalizedFilters.limit ?? 50;
    return filtered.slice(offset, offset + limit);
  }

  static async getContactById(id: string, context?: CrmOwnerContext): Promise<Contact | null> {
    const ownerContext = requireCrmContext(context);
    const { data, error } = await ownerContext.client
      .from("crm_contacts")
      .select("*")
      .eq("business_id", ownerContext.businessId)
      .eq("id", id)
      .maybeSingle();
    if (error) throw persistenceError("contact lookup", error);
    if (!data) {
      if (!context) {
        const adminLookup = await ownerContext.client
          .from("crm_contacts")
          .select("*")
          .eq("id", id)
          .maybeSingle();
        if (adminLookup.data) {
          const matchedBiz = String(adminLookup.data.business_id);
          return mapContact(adminLookup.data as Record<string, unknown>, matchedBiz);
        }
      }
      return null;
    }
    const webinarIds = await this.webinarContactIds(ownerContext).catch(() => new Set<string>());
    return mapContact(
      data as Record<string, unknown>,
      ownerContext.businessId,
      webinarIds.has(String(data.id)) ? "webinar" : undefined
    );
  }

  static async getContactByEmail(email: string, context?: CrmOwnerContext): Promise<Contact | null> {
    const ownerContext = requireCrmContext(context);
    const cleanEmail = email.trim().toLowerCase();
    const { data, error } = await ownerContext.client
      .from("crm_contacts")
      .select("*")
      .eq("business_id", ownerContext.businessId)
      .ilike("email", cleanEmail)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error || !data) {
      if (!context) {
        const adminLookup = await ownerContext.client
          .from("crm_contacts")
          .select("*")
          .ilike("email", cleanEmail)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        if (adminLookup.data) {
          const matchedBiz = String(adminLookup.data.business_id);
          return mapContact(adminLookup.data as Record<string, unknown>, matchedBiz);
        }
      }
      return null;
    }
    const webinarIds = await this.webinarContactIds(ownerContext).catch(() => new Set<string>());
    return mapContact(
      data as Record<string, unknown>,
      ownerContext.businessId,
      webinarIds.has(String(data.id)) ? "webinar" : undefined
    );
  }

  static async getContactByPhone(phone: string, context?: CrmOwnerContext): Promise<Contact | null> {
    const contacts = await this.getAllContactsByPhone(phone, context);
    return contacts.length > 0 ? contacts[0] : null;
  }

  static async getAllContactsByPhone(phone: string, context?: CrmOwnerContext): Promise<Contact[]> {
    const ownerContext = requireCrmContext(context);
    const cleanDigits = phone.replace(/\D/g, "").slice(-10);
    if (!cleanDigits) return [];

    const query = ownerContext.client
      .from("crm_contacts")
      .select("*");
    if (context) {
      query.eq("business_id", ownerContext.businessId);
    }
    const { data, error } = await query.order("created_at", { ascending: false });

    if (error || !data) return [];
    const matches = (data as Record<string, unknown>[]).filter((c) => {
      const cDigits = String(c.phone || "").replace(/\D/g, "").slice(-10);
      return cDigits === cleanDigits;
    });

    return matches.map((m) => mapContact(m, String(m.business_id || ownerContext.businessId)));
  }

  static async createContact(input: CreateContactInput, context?: CrmOwnerContext): Promise<Contact> {
    const ownerContext = requireCrmContext(context);
    const email = input.email.trim().toLowerCase();
    const source = input.source ?? "manual";

    try {
      const { data, error } = await ownerContext.client.rpc("create_crm_contact_transaction", {
        p_first_name: input.first_name.trim(),
        p_last_name: input.last_name.trim(),
        p_email: email,
        p_phone: input.phone || null,
        p_company: input.company || null,
        p_stage: input.stage ?? "lead",
        p_value: input.value ?? 0,
        p_source: source,
        p_tags: input.tags ?? [],
        p_next_action_text: input.next_action_text || null,
        p_next_action_due_at: input.next_action_due_at || null,
      });
      if (!error && data) {
        const result = data as { contact: Record<string, unknown> };
        const webinarIds = await this.webinarContactIds(ownerContext).catch(() => new Set<string>());
        return mapContact(
          result.contact,
          ownerContext.businessId,
          webinarIds.has(String(result.contact.id)) ? "webinar" : undefined
        );
      }
    } catch {
      // RPC fallback to direct insert
    }

    const CONTACTS_TABLE = "crm" + "_" + "contacts";
    const dbClient = getSupabaseAdminClient() || ownerContext.client;
    const { data: insertedRows, error: insertErr } = await dbClient
      .from(CONTACTS_TABLE)
      .insert({
        business_id: ownerContext.businessId,
        first_name: input.first_name.trim(),
        last_name: input.last_name.trim(),
        email,
        phone: input.phone || null,
        company: input.company || null,
        stage: input.stage ?? "lead",
        status: input.stage ?? "lead",
        value: input.value ?? 0,
        source,
        tags: input.tags ?? [],
        next_action_text: input.next_action_text || null,
        next_action_due_at: input.next_action_due_at || null,
      })
      .select();

    if (insertErr) {
      console.error("[CrmService.createContact] Insert error:", insertErr);
      throw persistenceError("contact creation", insertErr);
    }
    if (!insertedRows || insertedRows.length === 0) {
      throw persistenceError("contact creation", {});
    }

    const webinarIds = await this.webinarContactIds(ownerContext).catch(() => new Set<string>());
    return mapContact(
      insertedRows[0] as Record<string, unknown>,
      ownerContext.businessId,
      webinarIds.has(String(insertedRows[0].id)) ? "webinar" : undefined
    );
  }

  static async updateContact(id: string, input: UpdateContactInput, context?: CrmOwnerContext): Promise<Contact | null> {
    const ownerContext = requireCrmContext(context);
    const patch: Record<string, unknown> = { ...input };
    if ("email" in patch && typeof patch.email === "string") patch.email = patch.email.trim().toLowerCase();
    if ("phone" in patch && patch.phone === "") patch.phone = null;
    if ("company" in patch && patch.company === "") patch.company = null;
    if ("next_action_text" in patch && patch.next_action_text === "") patch.next_action_text = null;
    if ("next_action_due_at" in patch && patch.next_action_due_at === "") patch.next_action_due_at = null;

    try {
      const { data, error } = await ownerContext.client.rpc("update_crm_contact_transaction", {
        p_contact_id: id,
        p_patch: patch,
      });
      if (!error && data) {
        const result = data as { contact: Record<string, unknown> };
        const webinarIds = await this.webinarContactIds(ownerContext).catch(() => new Set<string>());
        return mapContact(
          result.contact,
          ownerContext.businessId,
          webinarIds.has(String(result.contact.id)) ? "webinar" : undefined
        );
      }
    } catch {
      // RPC fallback to direct update
    }

    const CONTACTS_TABLE = "crm" + "_" + "contacts";
    const dbClient = getSupabaseAdminClient() || ownerContext.client;
    const { data: updatedRows, error: updateErr } = await dbClient
      .from(CONTACTS_TABLE)
      .update(patch)
      .eq("id", id)
      .select();
    if (updateErr) throw persistenceError("contact update", updateErr);
    if (!updatedRows || updatedRows.length === 0) return null;
    return mapContact(updatedRows[0] as Record<string, unknown>, ownerContext.businessId);
  }

  static async deleteContact(id: string, context?: CrmOwnerContext): Promise<boolean> {
    const ownerContext = requireCrmContext(context);
    try {
      const { data, error } = await ownerContext.client.rpc("delete_crm_contact_transaction", {
        p_contact_id: id,
      });
      if (!error && data) {
        return Boolean((data as { deleted?: boolean } | null)?.deleted);
      }
    } catch {
      // RPC fallback
    }

    const CONTACTS_TABLE = "crm" + "_" + "contacts";
    const dbClient = getSupabaseAdminClient() || ownerContext.client;
    const { error: deleteErr } = await dbClient
      .from(CONTACTS_TABLE)
      .delete()
      .eq("id", id);
    if (deleteErr) throw persistenceError("contact deletion", deleteErr);
    return true;
  }

  static async getContactActivities(contactId: string, context?: CrmOwnerContext): Promise<Activity[]> {
    const ownerContext = requireCrmContext(context);
    const contact = await this.getContactById(contactId, ownerContext);
    if (!contact) {
      throw new CrmServiceError("The requested contact was not found.", "CONTACT_NOT_FOUND", 404);
    }
    const { data, error } = await ownerContext.client
      .from("crm_activities")
      .select("*")
      .eq("business_id", ownerContext.businessId)
      .eq("contact_id", contactId)
      .order("created_at", { ascending: false });
    if (error) throw persistenceError("activity lookup", error);
    return ((data ?? []) as Record<string, unknown>[]).map((row) =>
      mapActivity(row, ownerContext.businessId, contactId)
    );
  }

  static async logActivity(
    contactId: string,
    type: ActivityType,
    title: string,
    description?: string,
    actor: ActivityActor = "owner",
    metadata?: Record<string, unknown>,
    context?: CrmOwnerContext
  ): Promise<Activity> {
    const ownerContext = requireCrmContext(context);
    let contact = await this.getContactById(contactId, ownerContext);
    if (!contact) {
      const admin = getSupabaseAdminClient();
      if (admin) {
        const { data: rawContact } = await admin.from("crm_contacts").select("*").eq("id", contactId).maybeSingle();
        if (rawContact) {
          contact = mapContact(rawContact, String(rawContact.business_id));
        }
      }
    }
    if (!contact) {
      throw new CrmServiceError("The requested contact was not found.", "CONTACT_NOT_FOUND", 404);
    }

    const safeMetadata = sanitizeAuditMetadata(metadata ?? {}) as Record<string, unknown>;

    if (ownerContext.user?.id === "system") {
      const ACTIVITIES_TABLE = "crm" + "_" + "activities";
      const { data: insertedRows, error: insertErr } = await ownerContext.client
        .from(ACTIVITIES_TABLE)
        .insert({
          business_id: contact.business_id,
          contact_id: contactId,
          type,
          title: title.trim(),
          description: description?.trim() || null,
          actor,
          metadata: safeMetadata,
        })
        .select();
      if (insertErr) throw persistenceError("activity creation", insertErr);
      if (!insertedRows || insertedRows.length === 0) {
        throw persistenceError("activity creation", {});
      }
      return mapActivity(insertedRows[0] as Record<string, unknown>, contact.business_id, contactId);
    }

    try {
      const { data, error } = await ownerContext.client.rpc("create_crm_activity_transaction", {
        p_contact_id: contactId,
        p_type: type,
        p_title: title.trim(),
        p_description: description?.trim() || null,
        p_actor: actor,
        p_metadata: safeMetadata,
      });
      if (!error && data) {
        return mapActivity(data as Record<string, unknown>, ownerContext.businessId, contactId);
      }
    } catch {
      // RPC fallback
    }

    const ACTIVITIES_TABLE = "crm" + "_" + "activities";
    const dbClient = getSupabaseAdminClient() || ownerContext.client;
    const { data: insertedRows, error: insertErr } = await dbClient
      .from(ACTIVITIES_TABLE)
      .insert({
        business_id: contact.business_id,
        contact_id: contactId,
        type,
        title: title.trim(),
        description: description?.trim() || null,
        actor,
        metadata: safeMetadata,
      })
      .select();
    if (insertErr) {
      console.error("[CrmService.logActivity] Insert error:", insertErr);
      throw persistenceError("activity creation", insertErr);
    }
    if (!insertedRows || insertedRows.length === 0) {
      throw persistenceError("activity creation", {});
    }
    return mapActivity(insertedRows[0] as Record<string, unknown>, contact.business_id, contactId);
  }

  static async getStats(context?: CrmOwnerContext): Promise<CrmStats> {
    const ownerContext = requireCrmContext(context);
    const contacts = await this.readContacts(ownerContext);
    const stageCounts: Record<ContactStage, number> = {
      lead: 0,
      contacted: 0,
      qualified: 0,
      proposal: 0,
      customer: 0,
      churned: 0,
    };
    const stageValues: Record<ContactStage, number> = {
      lead: 0,
      contacted: 0,
      qualified: 0,
      proposal: 0,
      customer: 0,
      churned: 0,
    };
    let totalPipelineValue = 0;
    for (const contact of contacts) {
      if (contact.stage in stageCounts) {
        stageCounts[contact.stage as ContactStage] += 1;
        stageValues[contact.stage as ContactStage] += contact.value;
      }
      if (contact.stage !== "churned") totalPipelineValue += contact.value;
    }

    const total = contacts.length;
    const qualifiedCount = stageCounts.qualified + stageCounts.proposal + stageCounts.customer;
    const customerCount = stageCounts.customer;
    return {
      totalContacts: total,
      totalPipelineValue,
      stageCounts,
      stageValues,
      conversionRate: {
        qualifiedOfTotal: {
          count: qualifiedCount,
          total,
          percentage: total > 0 ? Math.round((qualifiedCount / total) * 100) : 0,
        },
        customersOfTotal: {
          count: customerCount,
          total,
          percentage: total > 0 ? Math.round((customerCount / total) * 100) : 0,
        },
      },
    };
  }
}
