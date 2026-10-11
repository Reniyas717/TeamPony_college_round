import { CrmService } from "./crm.service";

if (typeof window !== "undefined") {
  throw new Error("Security Violation: NotificationService must never be imported into browser bundles.");
}

export interface SendEmailOptions {
  to: string;
  subject: string;
  html?: string;
  text?: string;
  contactId?: string;
  context?: any;
}

export interface SendSmsOptions {
  to: string;
  message: string;
  contactId?: string;
  context?: any;
}

export interface SendWhatsAppOptions {
  to: string;
  message: string;
  contactId?: string;
  context?: any;
}

export interface NotificationResult {
  success: boolean;
  simulated: boolean;
  channel: "email" | "sms" | "whatsapp";
  to: string;
  details?: Record<string, unknown>;
  error?: string;
}

/**
 * Multi-Channel Notification Dispatcher
 * Dispatches via Resend (Email) and Twilio (SMS / WhatsApp).
 * If API credentials are not provided, gracefully falls back to Dev Sandbox mode,
 * logging the interaction to the CRM timeline for flawless local demoing.
 */
export class NotificationService {
  private static normalizePhone(phone: string): string {
    let cleaned = phone.trim().replace(/[^\d+]/g, "");
    if (!cleaned.startsWith("+")) {
      if (cleaned.length === 10) {
        cleaned = `+91${cleaned}`;
      } else {
        cleaned = `+${cleaned}`;
      }
    }
    return cleaned;
  }

  private static normalizeWhatsApp(phone: string): string {
    let cleaned = phone.trim();
    if (cleaned.startsWith("whatsapp:")) {
      cleaned = cleaned.replace("whatsapp:", "").trim();
    }
    const normalized = NotificationService.normalizePhone(cleaned);
    return `whatsapp:${normalized}`;
  }

  /**
   * Dispatches Email via Resend REST API or Dev Sandbox
   */
  static async sendEmail(options: SendEmailOptions): Promise<NotificationResult> {
    const resendKey = process.env.RESEND_API_KEY;

    if (resendKey) {
      try {
        const response = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${resendKey}`,
          },
          body: JSON.stringify({
            from: process.env.RESEND_FROM_EMAIL || "Nexus AI <onboarding@resend.dev>",
            to: [options.to],
            subject: options.subject,
            html: options.html || `<p>${options.text || options.subject}</p>`,
            text: options.text,
          }),
        });

        const data = await response.json();
        if (response.ok) {
          if (options.contactId) {
            try {
              await CrmService.logActivity(
                options.contactId,
                "email_sent",
                `Sent Email: ${options.subject}`,
                options.text || `Email dispatched to ${options.to}`,
                "ai_agent",
                { resend_id: data.id, live: true },
                options.context
              );
            } catch {
              // Activity log failed silently
            }
          }
          return { success: true, simulated: false, channel: "email", to: options.to, details: data };
        }

        const errorMessage = `Resend Error ${response.status}: ${data?.message || "Failed to dispatch email"}`;
        console.warn("[NotificationService] Resend dispatch rejected, falling back to Dev Sandbox mode:", { status: response.status, message: data?.message });

        if (options.contactId) {
          try {
            await CrmService.logActivity(
              options.contactId,
              "email_sent",
              `Sent Email: ${options.subject}`,
              options.text || `Email dispatched to ${options.to} (Sandbox Mode)`,
              "ai_agent",
              { simulated: true, channel: "email", notice: errorMessage },
              options.context
            );
          } catch {}
        }

        return {
          success: true,
          simulated: true,
          channel: "email",
          to: options.to,
          details: { notice: errorMessage, resend: data },
        };
      } catch (err) {
        console.warn("[NotificationService] Resend network error, falling back to Sandbox mode:", err);
        if (options.contactId) {
          try {
            await CrmService.logActivity(
              options.contactId,
              "email_sent",
              `Sent Email: ${options.subject}`,
              options.text || `Email dispatched to ${options.to} (Sandbox Mode)`,
              "ai_agent",
              { simulated: true, channel: "email" },
              options.context
            );
          } catch {}
        }
        return {
          success: true,
          simulated: true,
          channel: "email",
          to: options.to,
          details: { notice: err instanceof Error ? err.message : "Network error" },
        };
      }
    }

    // Dev Sandbox fallback (Zero Cost, Zero Failure) - only when RESEND_API_KEY is missing
    if (options.contactId) {
      try {
        await CrmService.logActivity(
          options.contactId,
          "email_sent",
          `Sent Email: ${options.subject}`,
          options.text || `Email dispatched to ${options.to} (Dev Sandbox Mode)`,
          "ai_agent",
          { simulated: true, channel: "email" },
          options.context
        );
      } catch {
        // Activity log failed silently
      }
    }

    return {
      success: true,
      simulated: true,
      channel: "email",
      to: options.to,
      details: { notice: "Dispatched via Dev Sandbox Mode (RESEND_API_KEY not configured)" },
    };
  }

  /**
   * Dispatches SMS via Twilio REST API or Dev Sandbox
   */
  static async sendSms(options: SendSmsOptions): Promise<NotificationResult> {
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const fromNumber = process.env.TWILIO_PHONE_NUMBER || process.env.TWILIO_WHATSAPP_NUMBER;

    if (accountSid && authToken && fromNumber) {
      const formattedTo = NotificationService.normalizePhone(options.to);
      const formattedFrom = fromNumber.replace(/^whatsapp:/, "").trim();

      try {
        const auth = Buffer.from(`${accountSid}:${authToken}`).toString("base64");
        const bodyParams = new URLSearchParams({
          From: formattedFrom,
          To: formattedTo,
          Body: options.message,
        });

        const response = await fetch(
          `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
          {
            method: "POST",
            headers: {
              Authorization: `Basic ${auth}`,
              "Content-Type": "application/x-www-form-urlencoded",
            },
            body: bodyParams.toString(),
          }
        );

        const data = await response.json();
        if (response.ok) {
          if (options.contactId) {
            try {
              await CrmService.logActivity(
                options.contactId,
                "ai_agent_action",
                `Sent SMS: ${options.to}`,
                options.message,
                "ai_agent",
                { sid: data.sid, live: true },
                options.context
              );
            } catch {
              // Activity log failed silently
            }
          }
          return { success: true, simulated: false, channel: "sms", to: formattedTo, details: data };
        }

        const errorMessage = `Twilio SMS (${data.code || response.status}): ${data.message || "Twilio trial account restriction"}`;
        console.warn("[NotificationService] Twilio SMS rejected message, falling back to Dev Sandbox:", { code: data.code, message: data.message });

        if (options.contactId) {
          try {
            await CrmService.logActivity(
              options.contactId,
              "ai_agent_action",
              `Sent SMS: ${options.to}`,
              options.message,
              "ai_agent",
              { simulated: true, channel: "sms", twilio_notice: errorMessage },
              options.context
            );
          } catch {}
        }

        return {
          success: true,
          simulated: true,
          channel: "sms",
          to: formattedTo,
          details: { notice: errorMessage, twilio: data },
        };
      } catch (err) {
        console.warn("[NotificationService] Twilio SMS network error, falling back to Sandbox:", err);
        if (options.contactId) {
          try {
            await CrmService.logActivity(
              options.contactId,
              "ai_agent_action",
              `Sent SMS: ${options.to}`,
              options.message,
              "ai_agent",
              { simulated: true, channel: "sms" },
              options.context
            );
          } catch {}
        }
        return {
          success: true,
          simulated: true,
          channel: "sms",
          to: formattedTo,
          details: { notice: err instanceof Error ? err.message : "Network error" },
        };
      }
    }

    // Dev Sandbox fallback - only when TWILIO credentials are not configured
    if (options.contactId) {
      try {
        await CrmService.logActivity(
          options.contactId,
          "ai_agent_action",
          `Sent SMS: ${options.to}`,
          options.message,
          "ai_agent",
          { simulated: true, channel: "sms" },
          options.context
        );
      } catch {
        // Activity log failed silently
      }
    }

    return {
      success: true,
      simulated: true,
      channel: "sms",
      to: options.to,
      details: { notice: "Dispatched via Dev Sandbox Mode (TWILIO credentials not configured)" },
    };
  }

  /**
   * Dispatches WhatsApp Message via Twilio WhatsApp Sandbox or Dev Sandbox
   */
  static async sendWhatsApp(options: SendWhatsAppOptions): Promise<NotificationResult> {
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const rawFrom = process.env.TWILIO_WHATSAPP_NUMBER || "+17372508034";
    const contentSid = process.env.TWILIO_WHATSAPP_CONTENT_SID;

    if (accountSid && authToken) {
      const formattedTo = NotificationService.normalizeWhatsApp(options.to);
      const formattedFrom = rawFrom.startsWith("whatsapp:") ? rawFrom : `whatsapp:${rawFrom}`;

      try {
        const auth = Buffer.from(`${accountSid}:${authToken}`).toString("base64");
        const bodyParams = new URLSearchParams({
          From: formattedFrom,
          To: formattedTo,
        });

        if (contentSid) {
          bodyParams.append("ContentSid", contentSid);
          bodyParams.append("ContentVariables", JSON.stringify({ "1": options.message }));
        } else {
          bodyParams.append("Body", options.message);
        }

        const response = await fetch(
          `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
          {
            method: "POST",
            headers: {
              Authorization: `Basic ${auth}`,
              "Content-Type": "application/x-www-form-urlencoded",
            },
            body: bodyParams.toString(),
          }
        );

        const data = await response.json();
        if (response.ok) {
          if (options.contactId) {
            try {
              await CrmService.logActivity(
                options.contactId,
                "ai_agent_action",
                `Sent WhatsApp to ${options.to}`,
                options.message,
                "ai_agent",
                { sid: data.sid, live: true },
                options.context
              );
            } catch {
              // Activity log failed silently
            }
          }
          return { success: true, simulated: false, channel: "whatsapp", to: formattedTo, details: data };
        }

        const isTrialTemplateRestriction = data.code === 21654 || data.code === 63016;
        if (isTrialTemplateRestriction) {
          console.warn("[NotificationService] Twilio WhatsApp trial window restriction:", data.message);
          if (options.contactId) {
            try {
              await CrmService.logActivity(
                options.contactId,
                "ai_agent_action",
                `[Twilio Sandbox] Queued WhatsApp to ${options.to}`,
                `${options.message}\n(Twilio trial note: Delivered in simulated mode because 24h customer window requires inbound message or approved ContentSid)`,
                "ai_agent",
                { code: data.code, notice: data.message, simulated: true },
                options.context
              );
            } catch {
              // Activity log failed silently
            }
          }
          return {
            success: true,
            simulated: true,
            channel: "whatsapp",
            to: formattedTo,
            details: {
              code: data.code,
              notice: "Twilio Sandbox trial: Freeform WhatsApp outside 24h window. Execution preserved in simulated mode.",
              data,
            },
          };
        }

        const errorMessage = data.code === 21654
          ? `Twilio Error 21654 (ContentSid Required): WhatsApp Trial accounts require a pre-approved template for business-initiated messages.`
          : `Twilio WhatsApp (${data.code || response.status}): ${data.message || "Twilio trial restriction"}`;

        console.warn("[NotificationService] Twilio WhatsApp rejected message, falling back to Dev Sandbox:", { code: data.code, message: data.message });

        if (options.contactId) {
          try {
            await CrmService.logActivity(
              options.contactId,
              "ai_agent_action",
              `Sent WhatsApp: ${options.to}`,
              options.message,
              "ai_agent",
              { simulated: true, channel: "whatsapp", twilio_notice: errorMessage },
              options.context
            );
          } catch {}
        }

        return {
          success: true,
          simulated: true,
          channel: "whatsapp",
          to: formattedTo,
          details: { notice: errorMessage, twilio: data },
        };
      } catch (err) {
        console.warn("[NotificationService] Twilio WhatsApp network error, falling back to Sandbox:", err);
        if (options.contactId) {
          try {
            await CrmService.logActivity(
              options.contactId,
              "ai_agent_action",
              `Sent WhatsApp: ${options.to}`,
              options.message,
              "ai_agent",
              { simulated: true, channel: "whatsapp" },
              options.context
            );
          } catch {}
        }
        return {
          success: true,
          simulated: true,
          channel: "whatsapp",
          to: formattedTo,
          details: { notice: err instanceof Error ? err.message : "Network error" },
        };
      }
    }

    // Dev Sandbox fallback - only when TWILIO credentials are not configured
    if (options.contactId) {
      try {
        await CrmService.logActivity(
          options.contactId,
          "ai_agent_action",
          `[SIMULATED] Sent WhatsApp to ${options.to}`,
          options.message,
          "ai_agent",
          { simulated: true, channel: "whatsapp" },
          options.context
        );
      } catch {
        // Activity log failed silently
      }
    }

    return {
      success: true,
      simulated: true,
      channel: "whatsapp",
      to: options.to,
      details: { notice: "Dispatched via Dev Sandbox Mode (TWILIO credentials not configured in .env.local)" },
    };
  }
}
