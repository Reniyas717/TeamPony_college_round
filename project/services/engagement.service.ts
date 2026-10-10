import { getSupabaseServerClient } from "../lib/supabase/server";
import { CrmService, DEFAULT_BUSINESS_ID } from "./crm.service";
import { MarketingService } from "./marketing.service";

if (typeof window !== "undefined") {
  throw new Error("Security Violation: EngagementTrackingService must never be imported into browser bundles.");
}

// 1x1 Transparent GIF buffer
export const TRANSPARENT_GIF_BUFFER = Buffer.from(
  "R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7",
  "base64"
);

export class EngagementTrackingService {
  /**
   * Records an email open event via 1x1 transparent tracking pixel.
   */
  static async recordOpen(
    trackingToken: string,
    meta?: { ip?: string; userAgent?: string }
  ): Promise<boolean> {
    const supabase = getSupabaseServerClient();
    const now = new Date().toISOString();

    if (supabase) {
      try {
        // Look up recipient
        const { data: recipient } = await supabase
          .from("marketing_campaign_recipients")
          .select("id, campaign_id, contact_id, first_opened_at, recipient_email")
          .eq("tracking_token", trackingToken)
          .single();

        if (recipient) {
          const isFirstOpen = !recipient.first_opened_at;

          // Record engagement event
          await supabase.from("marketing_engagement_events").insert({
            campaign_id: recipient.campaign_id,
            recipient_id: recipient.id,
            business_id: DEFAULT_BUSINESS_ID,
            event_type: "OPEN",
            ip_address: meta?.ip || null,
            user_agent: meta?.userAgent || null,
          });

          if (isFirstOpen) {
            // Update recipient record
            await supabase
              .from("marketing_campaign_recipients")
              .update({ first_opened_at: now, status: "DELIVERED" })
              .eq("id", recipient.id);

            // Increment campaign opened_count
            const { data: campaign } = await supabase
              .from("marketing_campaigns")
              .select("opened_count")
              .eq("id", recipient.campaign_id)
              .single();

            if (campaign) {
              await supabase
                .from("marketing_campaigns")
                .update({ opened_count: (campaign.opened_count || 0) + 1 })
                .eq("id", recipient.campaign_id);
            }

            // Sync to CRM contact activity
            if (recipient.contact_id) {
              await CrmService.logActivity(
                recipient.contact_id,
                "ai_agent_action",
                "Marketing Email Opened",
                `Recipient ${recipient.recipient_email} viewed the campaign.`,
                "system",
                { tracking_token: trackingToken, user_agent: meta?.userAgent }
              );
            }
          }
          return true;
        }
      } catch (err) {
        console.warn("[EngagementService] Failed to record open in Supabase:", err);
      }
    }

    return true;
  }

  /**
   * Records a link click event and provides safe redirect destination.
   */
  static async recordClick(
    trackingToken: string,
    targetUrl: string,
    meta?: { ip?: string; userAgent?: string }
  ): Promise<string> {
    const supabase = getSupabaseServerClient();
    const now = new Date().toISOString();
    const safeUrl = targetUrl.startsWith("http://") || targetUrl.startsWith("https://")
      ? targetUrl
      : `https://${targetUrl}`;

    if (supabase) {
      try {
        const { data: recipient } = await supabase
          .from("marketing_campaign_recipients")
          .select("id, campaign_id, contact_id, first_clicked_at, recipient_email")
          .eq("tracking_token", trackingToken)
          .single();

        if (recipient) {
          const isFirstClick = !recipient.first_clicked_at;

          // Record engagement event
          await supabase.from("marketing_engagement_events").insert({
            campaign_id: recipient.campaign_id,
            recipient_id: recipient.id,
            business_id: DEFAULT_BUSINESS_ID,
            event_type: "CLICK",
            target_url: safeUrl,
            ip_address: meta?.ip || null,
            user_agent: meta?.userAgent || null,
          });

          if (isFirstClick) {
            await supabase
              .from("marketing_campaign_recipients")
              .update({ first_clicked_at: now })
              .eq("id", recipient.id);

            const { data: campaign } = await supabase
              .from("marketing_campaigns")
              .select("clicked_count")
              .eq("id", recipient.campaign_id)
              .single();

            if (campaign) {
              await supabase
                .from("marketing_campaigns")
                .update({ clicked_count: (campaign.clicked_count || 0) + 1 })
                .eq("id", recipient.campaign_id);
            }

            if (recipient.contact_id) {
              await CrmService.logActivity(
                recipient.contact_id,
                "ai_agent_action",
                "Marketing Link Clicked",
                `Contact clicked: ${safeUrl}`,
                "system",
                { target_url: safeUrl, tracking_token: trackingToken }
              );
            }
          }
        }
      } catch (err) {
        console.warn("[EngagementService] Failed to record click in Supabase:", err);
      }
    }

    return safeUrl;
  }

  /**
   * Processes a one-click unsubscribe request.
   */
  static async recordUnsubscribe(
    token: string,
    reason: string = "user_unsubscribe"
  ): Promise<{ success: boolean; email?: string }> {
    const supabase = getSupabaseServerClient();
    let recipientEmail = "";
    let contactId: string | undefined = undefined;

    if (supabase) {
      try {
        const { data: recipient } = await supabase
          .from("marketing_campaign_recipients")
          .select("id, campaign_id, contact_id, recipient_email")
          .eq("tracking_token", token)
          .single();

        if (recipient) {
          recipientEmail = recipient.recipient_email;
          contactId = recipient.contact_id || undefined;

          // Increment campaign unsubscribe count
          const { data: campaign } = await supabase
            .from("marketing_campaigns")
            .select("unsubscribed_count")
            .eq("id", recipient.campaign_id)
            .single();

          if (campaign) {
            await supabase
              .from("marketing_campaigns")
              .update({ unsubscribed_count: (campaign.unsubscribed_count || 0) + 1 })
              .eq("id", recipient.campaign_id);
          }
        }
      } catch {
        // Fallback
      }
    }

    if (!recipientEmail && token.includes("@")) {
      recipientEmail = token;
    }

    if (recipientEmail) {
      await MarketingService.suppressContact(
        recipientEmail,
        "all",
        reason,
        contactId
      );

      if (contactId) {
        await CrmService.logActivity(
          contactId,
          "ai_agent_action",
          "Marketing Consent Revoked",
          `Contact unsubscribed from all marketing campaigns.`,
          "system",
          { reason }
        );
      }

      return { success: true, email: recipientEmail };
    }

    return { success: true };
  }
}
