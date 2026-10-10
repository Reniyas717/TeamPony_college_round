import { AuditService } from "./audit.service";
import {
  Contact,
  Activity,
  CrmStats,
  CreateContactInput,
  UpdateContactInput,
  ContactFilters,
  ContactStage,
} from "../lib/validations/crm";

import { getSupabaseAdminClient } from "../lib/supabase/admin";

/**
 * CRM Service Layer
 * Enforces business domain invariants, tenant scoping, and timeline logging.
 * Per AGENTS.md §4.1, all data is strictly scoped to the single business owner.
 */

export const DEFAULT_BUSINESS_ID = "00000000-0000-0000-0000-000000000001";

// In-Memory Store (Clean initial state; populated via forms, API, or live actions)
let memoryContacts: Contact[] = [];
let memoryActivities: Activity[] = [];


export class CrmService {
  /**
   * Retrieves filtered contacts for the verified business.
   */
  static async listContacts(filters?: ContactFilters): Promise<Contact[]> {
    const supabase = getSupabaseAdminClient();

    let query = supabase
      .from("crm_contacts")
      .select("*")
      .eq("business_id", DEFAULT_BUSINESS_ID)
      .order("last_activity_at", { ascending: false });

    if (filters?.stage) {
      query = query.eq("stage", filters.stage);
    }
    if (filters?.source) {
      query = query.eq("source", filters.source);
    }

    const { data, error } = await query;
    if (error) {
      throw new Error("Supabase query error: " + error.message);
    }

    if (data && data.length > 0) {
      let results = data as Contact[];
      if (filters?.search) {
        const s = filters.search.toLowerCase();
        results = results.filter(
          (c) =>
            c.first_name.toLowerCase().includes(s) ||
            c.last_name.toLowerCase().includes(s) ||
            c.email.toLowerCase().includes(s) ||
            (c.company && c.company.toLowerCase().includes(s))
        );
      }
      return results;
    }

    return [];
  }

  /**
   * Finds a specific contact by ID.
   */
  static async getContactById(id: string): Promise<Contact | null> {
    const supabase = getSupabaseAdminClient();
    if (supabase) {
      try {
        const { data, error } = await supabase
          .from("crm_contacts")
          .select("*")
          .eq("business_id", DEFAULT_BUSINESS_ID)
          .eq("id", id)
          .single();

        if (error) {
          console.error("[CrmService.getContactById] supabase error:", error);
        }
        if (!error && data) {
          return data as Contact;
        }
      } catch (err) {
        console.error("[CrmService.getContactById] catch error:", err);
      }
    } else {
      console.warn("[CrmService.getContactById] supabase client is null!");
    }

    return memoryContacts.find((c) => c.id === id) || null;
  }

  /**
   * Finds a contact by email address.
   */
  static async getContactByEmail(email: string): Promise<Contact | null> {
    const cleanEmail = email.trim().toLowerCase();
    const supabase = getSupabaseAdminClient();
    if (supabase) {
      try {
        const { data } = await supabase
          .from("crm_contacts")
          .select("*")
          .eq("business_id", DEFAULT_BUSINESS_ID)
          .ilike("email", cleanEmail)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (data) return data as Contact;
      } catch {}
    }
    return memoryContacts.find((c) => c.email.toLowerCase() === cleanEmail) || null;
  }

  /**
   * Finds a contact by phone number (matching normalized digits).
   */
  static async getContactByPhone(phone: string): Promise<Contact | null> {
    const cleanDigits = phone.replace(/\D/g, "").slice(-10);
    if (!cleanDigits) return null;
    const supabase = getSupabaseAdminClient();
    if (supabase) {
      try {
        const { data } = await supabase
          .from("crm_contacts")
          .select("*")
          .eq("business_id", DEFAULT_BUSINESS_ID)
          .order("created_at", { ascending: false });

        if (data) {
          const match = (data as Contact[]).find((c) => {
            const cDigits = (c.phone || "").replace(/\D/g, "").slice(-10);
            return cDigits === cleanDigits;
          });
          if (match) return match;
        }
      } catch {}
    }
    return (
      memoryContacts.find((c) => {
        const cDigits = (c.phone || "").replace(/\D/g, "").slice(-10);
        return cDigits === cleanDigits;
      }) || null
    );
  }

  /**
   * Creates a new contact and records initial activity.
   */
  static async createContact(input: CreateContactInput): Promise<Contact> {
    const now = new Date().toISOString();
    const newContact: Contact = {
      id: `cont-${Date.now()}`,
      business_id: DEFAULT_BUSINESS_ID,
      first_name: input.first_name,
      last_name: input.last_name,
      email: input.email,
      phone: input.phone || null,
      company: input.company || null,
      stage: input.stage || "lead",
      value: input.value ?? 0,
      source: input.source || "manual",
      tags: input.tags || [],
      next_action_text: input.next_action_text || null,
      next_action_due_at: input.next_action_due_at || null,
      last_activity_at: now,
      created_at: now,
      updated_at: now,
    };

    let created: Contact = newContact;
    const supabase = getSupabaseAdminClient();
    if (supabase) {
      try {
        const { data, error } = await supabase
          .from("crm_contacts")
          .insert({
            ...newContact,
            id: undefined, // Let PostgreSQL gen_random_uuid
          })
          .select()
          .single();

        if (!error && data) {
          created = data as Contact;
        }
      } catch {
        // Fallback
      }
    }

    if (created === newContact) {
      memoryContacts.unshift(newContact);
    }

    await this.logActivity(
      created.id,
      input.source === "website_form" ? "form_submission" : "note",
      input.source === "website_form" ? "Website Lead Captured" : "Contact Created",
      `Lead created via ${input.source}`,
      input.source === "website_form" ? "system" : "owner"
    );

    // Central Audit Logging per AGENTS.md §9
    await AuditService.recordEvent(
      {
        business_id: DEFAULT_BUSINESS_ID,
        action: "crm.contact.created",
        actor: {
          id: input.source === "website_form" ? "system" : "owner",
          type: input.source === "website_form" ? "system" : "user",
        },
        resource: {
          type: "crm_contact",
          id: created.id,
        },
        outcome: "success",
        metadata: {
          first_name: created.first_name,
          last_name: created.last_name,
          email: created.email,
          stage: created.stage,
          source: created.source,
        },
      },
      { critical: false }
    );

    return created;
  }

  /**
   * Updates an existing contact and logs stage progression.
   */
  static async updateContact(
    id: string,
    input: UpdateContactInput
  ): Promise<Contact | null> {
    const existing = await this.getContactById(id);
    if (!existing) return null;

    const now = new Date().toISOString();
    const stageChanged = Boolean(input.stage && input.stage !== existing.stage);

    let updated: Contact | null = null;
    const supabase = getSupabaseAdminClient();
    if (supabase) {
      try {
        const { data, error } = await supabase
          .from("crm_contacts")
          .update({
            ...input,
            last_activity_at: now,
            updated_at: now,
          })
          .eq("business_id", DEFAULT_BUSINESS_ID)
          .eq("id", id)
          .select()
          .single();

        if (!error && data) {
          updated = data as Contact;
        }
      } catch {
        // Fallback
      }
    }

    if (!updated) {
      const index = memoryContacts.findIndex((c) => c.id === id);
      if (index !== -1) {
        updated = {
          ...memoryContacts[index],
          ...input,
          last_activity_at: now,
          updated_at: now,
        };
        memoryContacts[index] = updated;
      }
    }

    if (!updated) return null;

    if (stageChanged) {
      await this.logActivity(
        id,
        "stage_change",
        `Stage moved to ${input.stage}`,
        `Stage changed from ${existing.stage} to ${input.stage}`,
        "owner",
        { previous_stage: existing.stage, new_stage: input.stage }
      );
    }

    // Central Audit Logging per AGENTS.md §9
    const action = stageChanged ? "crm.contact.stage_changed" : "crm.contact.updated";
    await AuditService.recordEvent(
      {
        business_id: DEFAULT_BUSINESS_ID,
        action,
        actor: {
          id: "owner",
          type: "user",
        },
        resource: {
          type: "crm_contact",
          id,
        },
        outcome: "success",
        metadata: {
          previous_stage: existing.stage,
          new_stage: input.stage ?? existing.stage,
          updated_fields: Object.keys(input),
        },
      },
      { critical: false }
    );

    return updated;
  }

  /**
   * Deletes a contact and cleans up associated memory.
   */
  static async deleteContact(id: string): Promise<boolean> {
    let deleted = false;
    const supabase = getSupabaseAdminClient();
    if (supabase) {
      try {
        const { error } = await supabase
          .from("crm_contacts")
          .delete()
          .eq("business_id", DEFAULT_BUSINESS_ID)
          .eq("id", id);
        if (!error) deleted = true;
      } catch {
        // Fallback
      }
    }

    const initialLen = memoryContacts.length;
    memoryContacts = memoryContacts.filter((c) => c.id !== id);
    memoryActivities = memoryActivities.filter((a) => a.contact_id !== id);
    if (memoryContacts.length < initialLen) {
      deleted = true;
    }

    if (deleted) {
      // Central Audit Logging per AGENTS.md §9
      await AuditService.recordEvent(
        {
          business_id: DEFAULT_BUSINESS_ID,
          action: "crm.contact.deleted",
          actor: {
            id: "owner",
            type: "user",
          },
          resource: {
            type: "crm_contact",
            id,
          },
          outcome: "success",
          metadata: {
            contact_id: id,
          },
        },
        { critical: false }
      );
    }

    return deleted;
  }

  /**
   * Retrieves timeline activities for a given contact.
   */
  static async getContactActivities(contactId: string): Promise<Activity[]> {
    const supabase = getSupabaseAdminClient();
    if (supabase) {
      try {
        const { data, error } = await supabase
          .from("crm_activities")
          .select("*")
          .eq("business_id", DEFAULT_BUSINESS_ID)
          .eq("contact_id", contactId)
          .order("created_at", { ascending: false });

        if (!error && data) {
          return data as Activity[];
        }
      } catch {
        // Fallback
      }
    }

    return memoryActivities
      .filter((a) => a.contact_id === contactId)
      .sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
  }

  /**
   * Logs an action in the contact timeline (system, user, or AI agent).
   */
  static async logActivity(
    contactId: string,
    type: Activity["type"],
    title: string,
    description?: string,
    actor: Activity["actor"] = "owner",
    metadata?: Record<string, unknown>
  ): Promise<Activity> {
    const newActivity: Activity = {
      id: `act-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      business_id: DEFAULT_BUSINESS_ID,
      contact_id: contactId,
      type,
      title,
      description: description || null,
      actor,
      metadata: metadata || {},
      created_at: new Date().toISOString(),
    };

    const supabase = getSupabaseAdminClient();
    if (supabase) {
      try {
        await supabase.from("crm_activities").insert({
          ...newActivity,
          id: undefined,
        });
      } catch {
        // Continue to memory
      }
    }

    memoryActivities.unshift(newActivity);
    return newActivity;
  }

  /**
   * Computes funnel and conversion statistics per DESIGN.md §15.2.
   */
  static async getStats(): Promise<CrmStats> {
    const contacts = await this.listContacts();

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

    for (const c of contacts) {
      stageCounts[c.stage] = (stageCounts[c.stage] || 0) + 1;
      stageValues[c.stage] = (stageValues[c.stage] || 0) + c.value;
      if (c.stage !== "churned") {
        totalPipelineValue += c.value;
      }
    }

    const total = contacts.length;
    const qualifiedCount = (stageCounts.qualified || 0) + (stageCounts.proposal || 0) + (stageCounts.customer || 0);
    const customerCount = stageCounts.customer || 0;

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
