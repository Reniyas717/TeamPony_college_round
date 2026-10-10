import { getSupabaseServerClient } from "../lib/supabase/server";
import { AuditService } from "./audit.service";
import { CrmService, DEFAULT_BUSINESS_ID } from "./crm.service";
import { NotificationService } from "./notification.service";
import {
  MarketingCampaign,
  CampaignRecipient,
  SuppressionRecord,
  CreateCampaignInput,
  UpdateCampaignInput,
  SegmentFilters,
  CampaignChannel,
  MarketingAnalyticsOverview,
} from "../lib/validations/marketing";
import { Contact } from "../lib/validations/crm";

if (typeof window !== "undefined") {
  throw new Error("Security Violation: MarketingService must never be imported into browser bundles.");
}

// In-memory fallback stores
let memoryCampaigns: MarketingCampaign[] = [];
const memoryRecipients: CampaignRecipient[] = [];
const memorySuppression: SuppressionRecord[] = [];

export class MarketingService {
  /**
   * Lists all campaigns for the business.
   */
  static async listCampaigns(): Promise<MarketingCampaign[]> {
    const supabase = getSupabaseServerClient();
    if (supabase) {
      try {
        const { data, error } = await supabase
          .from("marketing_campaigns")
          .select("*")
          .eq("business_id", DEFAULT_BUSINESS_ID)
          .order("created_at", { ascending: false });

        if (!error && data) {
          return data as MarketingCampaign[];
        }
      } catch {
        // Fallback
      }
    }

    return [...memoryCampaigns].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  }

  /**
   * Retrieves a single campaign by ID.
   */
  static async getCampaignById(id: string): Promise<MarketingCampaign | null> {
    const supabase = getSupabaseServerClient();
    if (supabase) {
      try {
        const { data, error } = await supabase
          .from("marketing_campaigns")
          .select("*")
          .eq("business_id", DEFAULT_BUSINESS_ID)
          .eq("id", id)
          .single();

        if (!error && data) {
          return data as MarketingCampaign;
        }
      } catch {
        // Fallback
      }
    }

    return memoryCampaigns.find((c) => c.id === id) || null;
  }

  /**
   * Creates a new marketing campaign draft.
   */
  static async createCampaign(input: CreateCampaignInput): Promise<MarketingCampaign> {
    const now = new Date().toISOString();
    const id = `cmp-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;

    // Calculate initial estimated recipient count
    const preview = await this.previewSegment(input.segment_filters, input.channel);

    const newCampaign: MarketingCampaign = {
      id,
      business_id: DEFAULT_BUSINESS_ID,
      title: input.title,
      channel: input.channel,
      subject: input.subject || null,
      preview_text: input.preview_text || null,
      content_html: input.content_html,
      content_text: input.content_text || null,
      segment_filters: input.segment_filters,
      status: input.scheduled_at ? "QUEUED" : "DRAFT",
      scheduled_at: input.scheduled_at || null,
      sent_at: null,
      total_recipients: preview.eligibleContacts.length,
      delivered_count: 0,
      opened_count: 0,
      clicked_count: 0,
      bounced_count: 0,
      unsubscribed_count: 0,
      created_at: now,
      updated_at: now,
    };

    let created: MarketingCampaign = newCampaign;
    const supabase = getSupabaseServerClient();
    if (supabase) {
      try {
        const { data, error } = await supabase
          .from("marketing_campaigns")
          .insert({
            ...newCampaign,
            id: undefined,
          })
          .select()
          .single();

        if (!error && data) {
          created = data as MarketingCampaign;
        }
      } catch {
        // Fallback
      }
    }

    if (created === newCampaign) {
      memoryCampaigns.unshift(newCampaign);
    }

    // Central Audit Logging
    await AuditService.recordEvent(
      {
        business_id: DEFAULT_BUSINESS_ID,
        action: "marketing.campaign.created",
        actor: { id: "owner", type: "user" },
        resource: { type: "marketing_campaign", id: created.id },
        outcome: "success",
        metadata: {
          title: created.title,
          channel: created.channel,
          estimated_recipients: created.total_recipients,
        },
      },
      { critical: false, useAdminClient: true }
    );

    return created;
  }

  /**
   * Updates an existing campaign draft or schedule.
   */
  static async updateCampaign(
    id: string,
    input: UpdateCampaignInput
  ): Promise<MarketingCampaign | null> {
    const existing = await this.getCampaignById(id);
    if (!existing) return null;

    const now = new Date().toISOString();
    let updated: MarketingCampaign | null = null;

    const supabase = getSupabaseServerClient();
    if (supabase) {
      try {
        const { data, error } = await supabase
          .from("marketing_campaigns")
          .update({
            ...input,
            updated_at: now,
          })
          .eq("business_id", DEFAULT_BUSINESS_ID)
          .eq("id", id)
          .select()
          .single();

        if (!error && data) {
          updated = data as MarketingCampaign;
        }
      } catch {
        // Fallback
      }
    }

    if (!updated) {
      const idx = memoryCampaigns.findIndex((c) => c.id === id);
      if (idx !== -1) {
        updated = {
          ...memoryCampaigns[idx],
          ...input,
          updated_at: now,
        };
        memoryCampaigns[idx] = updated;
      }
    }

    return updated;
  }

  /**
   * Deletes a campaign.
   */
  static async deleteCampaign(id: string): Promise<boolean> {
    let deleted = false;
    const supabase = getSupabaseServerClient();
    if (supabase) {
      try {
        const { error } = await supabase
          .from("marketing_campaigns")
          .delete()
          .eq("business_id", DEFAULT_BUSINESS_ID)
          .eq("id", id);
        if (!error) deleted = true;
      } catch {
        // Fallback
      }
    }

    const initLen = memoryCampaigns.length;
    memoryCampaigns = memoryCampaigns.filter((c) => c.id !== id);
    if (memoryCampaigns.length < initLen) deleted = true;

    if (deleted) {
      await AuditService.recordEvent(
        {
          business_id: DEFAULT_BUSINESS_ID,
          action: "marketing.campaign.deleted",
          actor: { id: "owner", type: "user" },
          resource: { type: "marketing_campaign", id },
          outcome: "success",
          metadata: { campaign_id: id },
        },
        { critical: false, useAdminClient: true }
      );
    }

    return deleted;
  }

  /**
   * Evaluates dynamic CRM segment filters against live contacts minus suppressed users.
   */
  static async previewSegment(
    filters: SegmentFilters,
    channel: CampaignChannel = "email"
  ): Promise<{
    eligibleContacts: Contact[];
    suppressedCount: number;
    totalMatched: number;
  }> {
    const allContacts = await CrmService.listContacts();
    const suppressionList = await this.listSuppressed(channel);
    const suppressedSet = new Set(suppressionList.map((s) => s.email_or_phone.toLowerCase()));

    // Filter contacts by CRM criteria
    const matched = allContacts.filter((c) => {
      // 1. Channel validity
      if (channel === "email" && (!c.email || !c.email.includes("@"))) return false;
      if ((channel === "sms" || channel === "whatsapp") && !c.phone) return false;

      // 2. Stage Filter
      if (filters.stages && filters.stages.length > 0) {
        if (!filters.stages.includes(c.stage)) return false;
      }

      // 3. Tag Filter
      if (filters.tags && filters.tags.length > 0) {
        const hasMatchingTag = filters.tags.some((t) => c.tags.includes(t));
        if (!hasMatchingTag) return false;
      }

      // 4. Source Filter
      if (filters.sources && filters.sources.length > 0) {
        if (!filters.sources.includes(c.source)) return false;
      }

      // 5. Value Filter
      const contactVal = Number(c.value || 0);
      if (typeof filters.minValue === "number" && !isNaN(filters.minValue) && filters.minValue > 0) {
        if (contactVal < filters.minValue) return false;
      }
      if (typeof filters.maxValue === "number" && !isNaN(filters.maxValue) && filters.maxValue > 0) {
        if (contactVal > filters.maxValue) return false;
      }

      // 6. Search Query
      if (filters.searchQuery) {
        const q = filters.searchQuery.toLowerCase();
        const matches =
          c.first_name.toLowerCase().includes(q) ||
          c.last_name.toLowerCase().includes(q) ||
          c.email.toLowerCase().includes(q) ||
          (c.company && c.company.toLowerCase().includes(q));
        if (!matches) return false;
      }

      return true;
    });

    let suppressedCount = 0;
    const eligibleContacts: Contact[] = [];

    for (const c of matched) {
      const identifier = channel === "email" ? c.email.toLowerCase() : (c.phone || "").toLowerCase();
      if (suppressedSet.has(identifier)) {
        suppressedCount++;
      } else {
        eligibleContacts.push(c);
      }
    }

    return {
      eligibleContacts,
      suppressedCount,
      totalMatched: matched.length,
    };
  }

  /**
   * Dispatches a campaign to all eligible recipients with token hydration and engagement tracking.
   */
  static async dispatchCampaign(
    campaignId: string,
    isApproved: boolean = false
  ): Promise<{
    status: "COMPLETED" | "AWAITING_APPROVAL" | "FAILED";
    sentCount: number;
    failedCount: number;
    campaign: MarketingCampaign;
  }> {
    const campaign = await this.getCampaignById(campaignId);
    if (!campaign) {
      throw new Error("Campaign not found");
    }

    // Resolve recipients
    const { eligibleContacts } = await this.previewSegment(
      campaign.segment_filters,
      campaign.channel
    );

    // Human Approval Checkpoint (AGENTS.md §8.2: High impact > 10 recipients)
    if (eligibleContacts.length > 10 && !isApproved) {
      const updated = await this.updateCampaign(campaignId, {
        status: "AWAITING_APPROVAL",
      });
      return {
        status: "AWAITING_APPROVAL",
        sentCount: 0,
        failedCount: 0,
        campaign: updated || campaign,
      };
    }

    // Update status to SENDING
    await this.updateCampaign(campaignId, {
      status: "SENDING",
      total_recipients: eligibleContacts.length,
    });

    let sentCount = 0;
    let failedCount = 0;
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

    for (const contact of eligibleContacts) {
      const trackingToken = `trk-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
      const unsubToken = `unsub-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;

      // Hydrate Dynamic Tokens
      const hydrateText = (raw: string) => {
        return raw
          .replace(/\{\{first_name\}\}/g, contact.first_name)
          .replace(/\{\{last_name\}\}/g, contact.last_name)
          .replace(/\{\{company\}\}/g, contact.company || "Your Business")
          .replace(/\{\{deal_value\}\}/g, `₹${contact.value.toLocaleString()}`)
          .replace(/\{\{unsubscribe_url\}\}/g, `${baseUrl}/api/marketing/unsubscribe/${unsubToken}`);
      };

      const hydratedSubject = hydrateText(campaign.subject || campaign.title);
      let hydratedHtml = hydrateText(campaign.content_html);
      const hydratedText = campaign.content_text ? hydrateText(campaign.content_text) : undefined;

      // Inject Tracking Pixel & Unsubscribe Footer for Email
      if (campaign.channel === "email") {
        const trackingPixel = `<img src="${baseUrl}/api/marketing/track/open/${trackingToken}" width="1" height="1" style="display:none;" alt="" />`;
        const complianceFooter = `
          <div style="margin-top: 32px; padding-top: 16px; border-top: 1px solid #e5e7eb; font-size: 11px; color: #6b7280; font-family: sans-serif;">
            <p>You received this email because you are a registered contact of Nexus Workspace.</p>
            <p><a href="${baseUrl}/api/marketing/unsubscribe/${unsubToken}" style="color: #4b5563; text-decoration: underline;">Unsubscribe / Opt-out</a></p>
          </div>
        `;
        hydratedHtml = `${hydratedHtml}${complianceFooter}${trackingPixel}`;
      }

      // Dispatch via multi-channel notification provider
      let dispatchResult;
      if (campaign.channel === "email") {
        dispatchResult = await NotificationService.sendEmail({
          to: contact.email,
          subject: hydratedSubject,
          html: hydratedHtml,
          text: hydratedText,
          contactId: contact.id,
        });
      } else if (campaign.channel === "sms" && contact.phone) {
        dispatchResult = await NotificationService.sendSms({
          to: contact.phone,
          message: hydratedText || hydratedSubject,
          contactId: contact.id,
        });
      } else if (campaign.channel === "whatsapp" && contact.phone) {
        dispatchResult = await NotificationService.sendWhatsApp({
          to: contact.phone,
          message: hydratedText || hydratedSubject,
          contactId: contact.id,
        });
      }

      const success = dispatchResult?.success ?? false;
      if (success) {
        sentCount++;
      } else {
        failedCount++;
      }

      // Record recipient log
      const recipientRecord: CampaignRecipient = {
        id: `rec-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        campaign_id: campaignId,
        business_id: DEFAULT_BUSINESS_ID,
        contact_id: contact.id || null,
        recipient_email: contact.email,
        recipient_phone: contact.phone || null,
        status: success ? "SENT" : "FAILED",
        provider_message_id: (dispatchResult?.details as { id?: string })?.id || null,
        tracking_token: trackingToken,
        first_opened_at: null,
        first_clicked_at: null,
        error_message: success ? null : dispatchResult?.error || "Provider delivery failed",
        created_at: new Date().toISOString(),
      };

      const supabase = getSupabaseServerClient();
      if (supabase) {
        try {
          await supabase.from("marketing_campaign_recipients").insert({
            ...recipientRecord,
            id: undefined,
          });
        } catch {
          // Fallback to memory
        }
      }
      memoryRecipients.push(recipientRecord);
    }

    const now = new Date().toISOString();
    const finalStatus = failedCount === eligibleContacts.length && eligibleContacts.length > 0 ? "FAILED" : "COMPLETED";

    const updated = await this.updateCampaign(campaignId, {
      status: finalStatus,
      sent_at: now,
      delivered_count: sentCount,
      bounced_count: failedCount,
    });

    // Central Audit Logging
    await AuditService.recordEvent(
      {
        business_id: DEFAULT_BUSINESS_ID,
        action: "marketing.campaign.dispatched",
        actor: { id: "owner", type: "user" },
        resource: { type: "marketing_campaign", id: campaignId },
        outcome: successStatus(finalStatus),
        metadata: {
          title: campaign.title,
          channel: campaign.channel,
          recipients_count: eligibleContacts.length,
          sent_count: sentCount,
          failed_count: failedCount,
        },
      },
      { critical: false, useAdminClient: true }
    );

    return {
      status: finalStatus,
      sentCount,
      failedCount,
      campaign: updated || campaign,
    };
  }

  /**
   * Retrieves suppression list records.
   */
  static async listSuppressed(channel?: string): Promise<SuppressionRecord[]> {
    const supabase = getSupabaseServerClient();
    if (supabase) {
      try {
        let query = supabase
          .from("marketing_suppression_list")
          .select("*")
          .eq("business_id", DEFAULT_BUSINESS_ID);

        if (channel && channel !== "all") {
          query = query.in("channel", [channel, "all"]);
        }

        const { data, error } = await query;
        if (!error && data) {
          return data as SuppressionRecord[];
        }
      } catch {
        // Fallback
      }
    }

    return memorySuppression.filter((s) => {
      if (!channel || channel === "all") return true;
      return s.channel === channel || s.channel === "all";
    });
  }

  /**
   * Adds an email or phone to the suppression list.
   */
  static async suppressContact(
    identifier: string,
    channel: string = "all",
    reason: string = "user_unsubscribe",
    contactId?: string
  ): Promise<SuppressionRecord> {
    const record: SuppressionRecord = {
      id: `sup-${Date.now()}`,
      business_id: DEFAULT_BUSINESS_ID,
      contact_id: contactId || null,
      email_or_phone: identifier.toLowerCase().trim(),
      channel,
      reason,
      suppressed_at: new Date().toISOString(),
    };

    const supabase = getSupabaseServerClient();
    if (supabase) {
      try {
        await supabase.from("marketing_suppression_list").upsert({
          ...record,
          id: undefined,
        });
      } catch {
        // Fallback
      }
    }

    const idx = memorySuppression.findIndex(
      (s) => s.email_or_phone === record.email_or_phone && s.channel === record.channel
    );
    if (idx !== -1) {
      memorySuppression[idx] = record;
    } else {
      memorySuppression.push(record);
    }

    // Central Audit Logging
    await AuditService.recordEvent(
      {
        business_id: DEFAULT_BUSINESS_ID,
        action: "marketing.consent.revoked",
        actor: { id: "contact", type: "user" },
        resource: { type: "marketing_suppression", id: record.email_or_phone },
        outcome: "success",
        metadata: { identifier, channel, reason },
      },
      { critical: false, useAdminClient: true }
    );

    return record;
  }

  /**
   * Computes aggregate telemetry overview across all marketing campaigns.
   */
  static async getAnalyticsOverview(): Promise<MarketingAnalyticsOverview> {
    const campaigns = await this.listCampaigns();

    let totalSent = 0;
    let totalDelivered = 0;
    let uniqueOpens = 0;
    let uniqueClicks = 0;
    let totalUnsubscribes = 0;

    for (const c of campaigns) {
      totalSent += c.total_recipients;
      totalDelivered += c.delivered_count;
      uniqueOpens += c.opened_count;
      uniqueClicks += c.clicked_count;
      totalUnsubscribes += c.unsubscribed_count;
    }

    const averageOpenRate = totalDelivered > 0 ? (uniqueOpens / totalDelivered) * 100 : 0;
    const averageClickRate = totalDelivered > 0 ? (uniqueClicks / totalDelivered) * 100 : 0;
    const deliverySuccessRate = totalSent > 0 ? (totalDelivered / totalSent) * 100 : 100;

    return {
      totalCampaigns: campaigns.length,
      totalSent,
      totalDelivered,
      uniqueOpens,
      uniqueClicks,
      totalUnsubscribes,
      averageOpenRate: Number(averageOpenRate.toFixed(1)),
      averageClickRate: Number(averageClickRate.toFixed(1)),
      deliverySuccessRate: Number(deliverySuccessRate.toFixed(1)),
    };
  }
}

function successStatus(status: string): "success" | "failure" {
  return status === "COMPLETED" ? "success" : "failure";
}
