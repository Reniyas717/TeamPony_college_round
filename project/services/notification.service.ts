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

        return {
          success: false,
          simulated: false,
          channel: "email",
          to: options.to,
          error: `Resend Error ${response.status}: ${data?.message || "Failed to dispatch email"}`,
          details: data,
        };
      } catch (err) {
        console.warn("[NotificationService] Resend dispatch network error:", err);
        return {
          success: false,
          simulated: false,
          channel: "email",
          to: options.to,
          error: err instanceof Error ? err.message : "Network error contacting Resend API",
        };
      }
    }

    // Dev Sandbox fallback (Zero Cost, Zero Failure) - only when RESEND_API_KEY is missing
    if (options.contactId) {
      try {
        await CrmService.logActivity(
          options.contactId,
          "email_sent",
          `[SIMULATED] Sent Email: ${options.subject}`,
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

        const errorMessage = `Twilio SMS Error ${data.code || response.status}: ${data.message || "SMS dispatch failed."}`;
        console.error("[NotificationService] Twilio SMS rejected message:", { code: data.code, message: data.message });

        return {
          success: false,
          simulated: false,
          channel: "sms",
          to: formattedTo,
          error: errorMessage,
          details: data,
        };
      } catch (err) {
        console.error("[NotificationService] Twilio SMS network error:", err);
        return {
          success: false,
          simulated: false,
          channel: "sms",
          to: formattedTo,
          error: err instanceof Error ? err.message : "Network error contacting Twilio SMS API",
        };
      }
    }

    // Dev Sandbox fallback - only when TWILIO credentials are not configured
    if (options.contactId) {
      try {
        await CrmService.logActivity(
          options.contactId,
          "ai_agent_action",
          `[SIMULATED] Sent SMS to ${options.to}`,
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

        const errorMessage = data.code === 21654
          ? `Twilio Error 21654 (ContentSid Required): WhatsApp Trial accounts require a pre-approved template for business-initiated messages. Add TWILIO_WHATSAPP_CONTENT_SID in .env.local (from Twilio Console > Messaging > Try out WhatsApp) OR text the sandbox number from your WhatsApp to open an active 24-hour window.`
          : `Twilio Error ${data.code || response.status}: ${data.message || "Message dispatch failed."}`;

        console.error("[NotificationService] Twilio WhatsApp rejected message:", { code: data.code, message: data.message });

        return {
          success: false,
          simulated: false,
          channel: "whatsapp",
          to: formattedTo,
          error: errorMessage,
          details: data,
        };
      } catch (err) {
        console.error("[NotificationService] Twilio WhatsApp network error:", err);
        return {
          success: false,
          simulated: false,
          channel: "whatsapp",
          to: formattedTo,
          error: err instanceof Error ? err.message : "Network error contacting Twilio API",
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
