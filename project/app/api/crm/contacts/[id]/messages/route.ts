import { NextResponse } from "next/server";
import { z } from "zod";
import { CrmService } from "@/services/crm.service";
import { NotificationService } from "@/services/notification.service";
import { AuditService } from "@/services/audit.service";
import { requireOwnerContext } from "@/lib/supabase/owner-context";

interface RouteParams {
  params: Promise<{ id: string }>;
}

const SendMessageSchema = z.object({
  channel: z.enum(["email", "whatsapp", "sms"]),
  subject: z.string().trim().optional(),
  message: z.string().trim().optional(),
});

function resolveBaseUrl(request: Request): string {
  if (process.env.NEXT_PUBLIC_APP_URL && !process.env.NEXT_PUBLIC_APP_URL.includes("localhost")) {
    return process.env.NEXT_PUBLIC_APP_URL.replace(/\/$/, "");
  }
  const host = request.headers.get("x-forwarded-host") || request.headers.get("host");
  const proto = request.headers.get("x-forwarded-proto") || (host?.includes("localhost") ? "http" : "https");
  if (host && !host.includes("localhost")) {
    return `${proto}://${host}`;
  }
  // Production Vercel domain fallback so mobile WhatsApp / Email links are globally reachable
  return "https://nexus-team-pony.vercel.app";
}

/**
 * POST /api/crm/contacts/[id]/messages
 * Dispatches a direct message (Email via Resend, WhatsApp via Twilio)
 * to the specified contact and records the interaction to their timeline.
 */
export async function POST(request: Request, { params }: RouteParams) {
  try {
    const context = await requireOwnerContext();
    const resolvedParams = await params;
    const id = resolvedParams?.id;
    const json = await request.json().catch(() => ({}));
    const parsed = SendMessageSchema.safeParse(json);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: {
            code: "VALIDATION_ERROR",
            message: "Invalid message payload",
            details: parsed.error.flatten(),
          },
        },
        { status: 400 }
      );
    }

    const contact = await CrmService.getContactById(id, context);
    if (!contact) {
      return NextResponse.json(
        {
          error: {
            code: "NOT_FOUND",
            message: `Contact with ID '${id}' not found`,
            details: null,
          },
        },
        { status: 404 }
      );
    }

    const { channel, subject, message } = parsed.data;
    const baseUrl = resolveBaseUrl(request);
    const firstNameParam = contact.first_name ? `&name=${encodeURIComponent(contact.first_name)}` : "";
    const yesUrl = `${baseUrl}/response?id=${contact.id}&decision=yes${firstNameParam}`;
    const noUrl = `${baseUrl}/response?id=${contact.id}&decision=no${firstNameParam}`;

    let result;

    const hydrateStr = (raw?: string) => {
      if (!raw) return "";
      const firstName = (contact.first_name || "").trim();
      const lastName = (contact.last_name || "").trim();
      const fullName = [firstName, lastName].filter(Boolean).join(" ") || firstName || "there";
      const company = (contact.company || "").trim() || "your team";

      return raw
        .replace(/\{\{\s*first_name\s*\}\}/gi, firstName)
        .replace(/\{\{\s*firstName\s*\}\}/gi, firstName)
        .replace(/\{\{\s*last_name\s*\}\}/gi, lastName)
        .replace(/\{\{\s*lastName\s*\}\}/gi, lastName)
        .replace(/\{\{\s*full_name\s*\}\}/gi, fullName)
        .replace(/\{\{\s*company\s*\}\}/gi, company)
        .replace(/\{\s*first_name\s*\}/gi, firstName)
        .replace(/\{\s*last_name\s*\}/gi, lastName)
        .replace(/\{\s*company\s*\}/gi, company);
    };

    const hydratedMessage = message ? hydrateStr(message) : undefined;
    const hydratedSubject = subject ? hydrateStr(subject) : undefined;

    if (channel === "email") {
      const emailSubject = hydratedSubject || `Regarding your inquiry with ${contact.company || "Nexus"}`;

      const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #fbf9f5; margin: 0; padding: 32px 16px; color: #1c1917; -webkit-font-smoothing: antialiased;">
  <div style="max-width: 560px; margin: 0 auto; background: #ffffff; border: 1px solid #e7e3dc; border-radius: 14px; padding: 36px 32px; box-shadow: 0 4px 20px -2px rgba(44, 34, 20, 0.05);">
    
    <!-- Brand Pill Header -->
    <div style="margin-bottom: 24px;">
      <span style="display: inline-block; font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; background-color: #f4efe6; color: #786e64; padding: 4px 10px; border-radius: 20px; border: 1px solid #e5ded3;">
        Nexus Operations
      </span>
    </div>

    <!-- Personal Greeting -->
    <h1 style="margin: 0 0 14px 0; color: #1c1917; font-size: 22px; font-weight: 700; letter-spacing: -0.015em; line-height: 1.3;">
      Hi ${contact.first_name},
    </h1>
    <p style="font-size: 15px; line-height: 1.6; color: #44403c; margin: 0 0 24px 0;">
      ${hydratedMessage || "Thank you for reaching out via our website inquiry form! We received your submission and would love to connect."}
    </p>

    <!-- Response Decision Box -->
    <div style="background-color: #f9f7f2; border: 1px solid #e8e3da; border-radius: 12px; padding: 22px 20px; margin: 24px 0;">
      <p style="font-size: 14px; font-weight: 700; color: #1c1917; margin: 0 0 4px 0;">
        Are you interested in connecting with our team?
      </p>
      <p style="font-size: 12px; color: #78716c; margin: 0 0 16px 0;">
        Tap one of the fast-response options below to instantly record your preference:
      </p>

      <table cellpadding="0" cellspacing="0" border="0" style="width: 100%;">
        <tr>
          <td style="padding-right: 8px; width: 50%;">
            <a href="${yesUrl}" style="display: block; text-align: center; background-color: #15803d; color: #ffffff; text-decoration: none; padding: 12px 18px; border-radius: 8px; font-weight: 600; font-size: 13px; box-shadow: 0 2px 4px rgba(21, 128, 61, 0.2); letter-spacing: 0.01em;">
              Yes, I'm Interested
            </a>
          </td>
          <td style="padding-left: 8px; width: 50%;">
            <a href="${noUrl}" style="display: block; text-align: center; background-color: #ffffff; color: #b91c1c; text-decoration: none; padding: 12px 18px; border-radius: 8px; font-weight: 600; font-size: 13px; border: 1px solid #fca5a5; letter-spacing: 0.01em;">
              No, Not Interested
            </a>
          </td>
        </tr>
      </table>
    </div>

    <!-- Direct Reply Note -->
    <p style="font-size: 12px; line-height: 1.5; color: #78716c; margin: 20px 0 0 0;">
      Prefer replying directly? You can also reply to this email directly with your thoughts or questions.
    </p>

    <!-- Brand Footer -->
    <div style="margin-top: 28px; padding-top: 16px; border-top: 1px solid #ede8e1;">
      <span style="font-size: 11px; color: #a8a29e; font-weight: 500;">
        Nexus Autonomous Business Platform • Powered by Real-Time Telemetry
      </span>
    </div>
  </div>
</body>
</html>`;

      const emailText = `${hydratedMessage || `Hi ${contact.first_name}, thank you for reaching out via our website form!`}\n\nPlease select an option:\n- YES (Interested): ${yesUrl}\n- NO (Not Interested): ${noUrl}\n\nOr reply directly to this email with YES or NO.`;

      result = await NotificationService.sendEmail({
        to: contact.email,
        subject: emailSubject,
        html: emailHtml,
        text: emailText,
        contactId: contact.id,
        context,
      });

    } else if (channel === "whatsapp") {
      const recipientPhone = contact.phone;
      if (!recipientPhone) {
        return NextResponse.json({ error: { code: "VALIDATION_ERROR", message: "This contact has no phone number.", details: null } }, { status: 422 });
      }

      const waMessage =
`Hello ${contact.first_name}! 👋
${hydratedMessage || "We received your project inquiry from our website and would love to connect."}

Please select an option below:

1️⃣ *YES* — I'm interested in speaking with your team
👉 Tap to confirm: ${yesUrl}

2️⃣ *NO* — Not interested / Opt-out
👉 Tap to opt-out: ${noUrl}

💬 _You can also simply reply with "YES" or "NO" directly in this chat!_`;

      result = await NotificationService.sendWhatsApp({
        to: recipientPhone,
        message: waMessage,
        contactId: contact.id,
        context,
      });

    } else {
      const recipientPhone = contact.phone;
      if (!recipientPhone) {
        return NextResponse.json({ error: { code: "VALIDATION_ERROR", message: "This contact has no phone number.", details: null } }, { status: 422 });
      }
      const smsMessage = hydratedMessage || `Hi ${contact.first_name}, thank you for your project inquiry!\nInterested: ${yesUrl}\nNot interested: ${noUrl}`;

      result = await NotificationService.sendSms({
        to: recipientPhone,
        message: smsMessage,
        contactId: contact.id,
        context,
      });
    }

    if (result && !result.success && !result.simulated) {
      return NextResponse.json(
        {
          error: {
            code: "PROVIDER_DISPATCH_FAILED",
            message: result.error || "Failed to dispatch message via provider",
            details: result.details || null,
          },
        },
        { status: 422 }
      );
    }

    try {
      await CrmService.logActivity(
        contact.id,
        "email_sent",
        `${channel.toUpperCase()} sent`,
        `A ${channel} message was sent to this contact.`,
        "owner",
        { channel },
        context
      );
    } catch (logErr) {
      console.warn("[Messages Route] Activity logging failed:", logErr);
    }

    try {
      await AuditService.recordEvent(
        {
          business_id: context.businessId,
          action: "marketing.campaign.dispatched",
          actor: { id: context.user.id, type: "user" },
          resource: { type: "crm_contact", id: contact.id },
          outcome: "success",
          metadata: { channel, contact_id: contact.id },
        },
        { client: context.client, critical: false }
      );
    } catch (auditErr) {
      console.warn("[Messages Route] Audit logging failed:", auditErr);
    }

    return NextResponse.json({ data: result }, { status: 200 });
  } catch (err: unknown) {
    return NextResponse.json(
      {
        error: {
          code: "INTERNAL_ERROR",
          message: err instanceof Error ? err.message : "Failed to dispatch message",
          details: null,
        },
      },
      { status: 500 }
    );
  }
}
