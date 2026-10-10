import { NextResponse } from "next/server";
import { z } from "zod";
import { CrmService, DEFAULT_BUSINESS_ID } from "@/services/crm.service";
import { NotificationService } from "@/services/notification.service";
import { AuditService } from "@/services/audit.service";

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

    const contact = await CrmService.getContactById(id);
    if (!contact) {
      return NextResponse.json(
        {
          error: {
            code: "NOT_FOUND",
            message: `Contact with ID '${id}' not found`,
            details: { id, resolvedParams, typeOfId: typeof id },
          },
        },
        { status: 404 }
      );
    }

    const { channel, subject, message } = parsed.data;

    let result;

    if (channel === "email") {
      const emailSubject = subject || `Regarding your inquiry with ${contact.company || "Nexus"}`;
      const emailBody =
        message ||
        `Hi ${contact.first_name},\n\nThank you for reaching out via our website form. We received your inquiry and would love to schedule a quick consultation.\n\nBest regards,\nThe Nexus Team`;

      result = await NotificationService.sendEmail({
        to: contact.email,
        subject: emailSubject,
        text: emailBody,
        contactId: contact.id,
      });

      await AuditService.recordEvent(
        {
          business_id: DEFAULT_BUSINESS_ID,
          action: "marketing.campaign.dispatched",
          actor: { id: "owner", type: "user" },
          resource: { type: "crm_contact", id: contact.id },
          outcome: "success",
          metadata: { channel: "email", to: contact.email, subject: emailSubject },
        },
        { critical: false }
      );
    } else if (channel === "whatsapp") {
      const recipientPhone = contact.phone || "+919082565845";
      const waMessage =
        message ||
        `Hello ${contact.first_name}! We received your project inquiry from our website. When is a good time for a quick 10-minute discovery call?`;

      result = await NotificationService.sendWhatsApp({
        to: recipientPhone,
        message: waMessage,
        contactId: contact.id,
      });

      await AuditService.recordEvent(
        {
          business_id: DEFAULT_BUSINESS_ID,
          action: "marketing.campaign.dispatched",
          actor: { id: "owner", type: "user" },
          resource: { type: "crm_contact", id: contact.id },
          outcome: "success",
          metadata: { channel: "whatsapp", to: recipientPhone },
        },
        { critical: false }
      );
    } else {
      const recipientPhone = contact.phone || "+919082565845";
      const smsMessage = message || `Hi ${contact.first_name}, thank you for your project inquiry!`;

      result = await NotificationService.sendSms({
        to: recipientPhone,
        message: smsMessage,
        contactId: contact.id,
      });
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
