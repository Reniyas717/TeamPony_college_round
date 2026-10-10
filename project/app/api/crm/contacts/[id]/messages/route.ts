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

    let result;

    if (channel === "email") {
      const emailSubject = subject || `Regarding your inquiry with ${contact.company || "Nexus"}`;
      const yesUrl = `http://localhost:3000/response?id=${contact.id}&decision=yes`;
      const noUrl = `http://localhost:3000/response?id=${contact.id}&decision=no`;

      const emailHtml = `
<!DOCTYPE html>
<html>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f9fafb; margin: 0; padding: 24px; color: #111827;">
  <div style="max-width: 540px; margin: 0 auto; background: #ffffff; border: 1px solid #e5e7eb; border-radius: 8px; padding: 32px; box-shadow: 0 1px 3px rgba(0,0,0,0.05);">
    <h2 style="margin-top: 0; color: #111827; font-size: 20px;">Hi ${contact.first_name},</h2>
    <p style="font-size: 15px; line-height: 1.5; color: #374151;">
      ${message || "Thank you for reaching out via our website inquiry form! We received your submission and would love to connect."}
    </p>
    <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 16px; margin: 24px 0;">
      <p style="font-size: 14px; font-weight: 600; color: #0f172a; margin-top: 0; margin-bottom: 12px;">
        Are you interested in connecting with our team?
      </p>
      <div style="display: flex; gap: 12px; margin: 12px 0;">
        <a href="${yesUrl}" style="display: inline-block; background-color: #16a34a; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-weight: 600; font-size: 14px; margin-right: 12px;">
          ✅ Yes, I'm Interested
        </a>
        <a href="${noUrl}" style="display: inline-block; background-color: #dc2626; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-weight: 600; font-size: 14px;">
          ❌ No, Not Interested
        </a>
      </div>
      <p style="font-size: 12px; color: #64748b; margin-bottom: 0; margin-top: 12px;">
        Clicking either button will automatically record your preference.
      </p>
    </div>
    <p style="font-size: 12px; color: #94a3b8; margin-top: 24px; border-top: 1px solid #f1f5f9; padding-top: 12px;">
      Prefer replying directly? Simply reply to this email with &quot;YES&quot; or &quot;NO&quot; and our AI engine will handle it.
    </p>
  </div>
</body>
</html>`;

      const emailText = `${message || `Hi ${contact.first_name}, thank you for reaching out via our website form!`}\n\nPlease select an option:\n- YES (Interested): ${yesUrl}\n- NO (Not Interested): ${noUrl}\n\nOr reply directly to this email with YES or NO.`;

      result = await NotificationService.sendEmail({
        to: contact.email,
        subject: emailSubject,
        html: emailHtml,
        text: emailText,
        contactId: contact.id,
      });

    } else if (channel === "whatsapp") {
      const recipientPhone = contact.phone;
      if (!recipientPhone) {
        return NextResponse.json({ error: { code: "VALIDATION_ERROR", message: "This contact has no phone number.", details: null } }, { status: 422 });
      }
      const yesUrl = `http://localhost:3000/response?id=${contact.id}&decision=yes`;
      const noUrl = `http://localhost:3000/response?id=${contact.id}&decision=no`;

      const waMessage =
`Hello ${contact.first_name}! 👋
${message || "We received your project inquiry from our website and would love to connect."}

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
      });

    } else {
      const recipientPhone = contact.phone;
      if (!recipientPhone) {
        return NextResponse.json({ error: { code: "VALIDATION_ERROR", message: "This contact has no phone number.", details: null } }, { status: 422 });
      }
      const smsMessage = message || `Hi ${contact.first_name}, thank you for your project inquiry!`;

      result = await NotificationService.sendSms({
        to: recipientPhone,
        message: smsMessage,
        contactId: contact.id,
      });
    }

    await CrmService.logActivity(
      contact.id,
      "email_sent",
      `${channel.toUpperCase()} sent`,
      `A ${channel} message was sent to this contact.`,
      "owner",
      { channel },
      context
    );
    await AuditService.recordEvent(
      {
        business_id: context.businessId,
        action: "marketing.campaign.dispatched",
        actor: { id: context.user.id, type: "user" },
        resource: { type: "crm_contact", id: contact.id },
        outcome: "success",
        metadata: { channel, contact_id: contact.id },
      },
      { client: context.client, critical: true }
    );
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
