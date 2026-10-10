import { NextResponse } from "next/server";
import { CrmService, DEFAULT_BUSINESS_ID } from "@/services/crm.service";
import { AuditService } from "@/services/audit.service";
import { LeadSentimentService } from "@/services/lead-sentiment.service";

/**
 * POST /api/webhooks/twilio
 * Inbound webhook for Twilio WhatsApp and SMS replies from customers.
 * Evaluates incoming message text using Groq / Gemini AI (with fallback),
 * finds the matching contact in CRM, and dynamically qualifies or churns the lead.
 */
export async function POST(request: Request) {
  try {
    let from = "";
    let body = "";

    const contentType = request.headers.get("content-type") || "";
    if (contentType.includes("application/x-www-form-urlencoded")) {
      const formData = await request.formData();
      from = formData.get("From")?.toString() || "";
      body = formData.get("Body")?.toString() || "";
    } else {
      const json = await request.json().catch(() => ({}));
      from = json.From || json.from || "";
      body = json.Body || json.body || "";
    }

    if (!from || !body) {
      return new NextResponse(
        `<?xml version="1.0" encoding="UTF-8"?><Response><Message>Received.</Message></Response>`,
        { status: 200, headers: { "Content-Type": "text/xml" } }
      );
    }

    // Clean phone number: remove whatsapp: prefix and whitespace
    const cleanPhone = from.replace(/^whatsapp:/i, "").trim();
    const contact = await CrmService.getContactByPhone(cleanPhone);

    if (!contact) {
      console.warn(`[Twilio Webhook] Received reply from unknown number: ${cleanPhone}`);
      return new NextResponse(
        `<?xml version="1.0" encoding="UTF-8"?><Response><Message>Inquiry received.</Message></Response>`,
        { status: 200, headers: { "Content-Type": "text/xml" } }
      );
    }

    // Evaluate incoming customer sentiment using Groq / Gemini AI
    const evaluation = await LeadSentimentService.evaluateSentiment(body);
    const { decision, isChurned, targetStage, reasoning, engine, confidence } = evaluation;

    const replyMsg = isChurned
      ? `Thank you ${contact.first_name}. We have noted that you are not interested and unsubscribed you from future outreach.`
      : `Awesome, ${contact.first_name}! Our team will connect with you shortly with next steps.`;

    // Update tags
    const existingTags = Array.isArray(contact.tags) ? contact.tags : [];
    const cleanTags = existingTags.filter((t) => !t.startsWith("response:"));
    cleanTags.push(isChurned ? "response:churned" : "response:interested");

    await CrmService.updateContact(contact.id, {
      stage: targetStage,
      tags: cleanTags,
      next_action_text: `Customer WhatsApp: "${body.slice(0, 80)}"`,
    });

    // Record activity on timeline
    await CrmService.logActivity(
      contact.id,
      decision === "CHURNED" ? "stage_change" : "email_sent",
      decision === "CHURNED" ? "Lead Churned (WhatsApp Reply)" : "Lead Qualified (WhatsApp Reply)",
      `Customer replied via WhatsApp: "${body}"\nOutcome: ${decision === "CHURNED" ? "Churned" : "Qualified"}`,
      "ai_agent",
      {
        channel: "whatsapp",
        body,
        decision,
        isChurned: decision === "CHURNED",
      }
    );

    // Audit Log
    await AuditService.recordEvent(
      {
        business_id: DEFAULT_BUSINESS_ID,
        action: "crm.contact.stage_changed",
        actor: { id: "customer", type: "user" },
        resource: { type: "crm_contact", id: contact.id },
        outcome: "success",
        metadata: {
          channel: "whatsapp",
          decision,
          body,
          targetStage,
        },
      },
      { critical: false }
    );

    // Return TwiML
    const twiml = `<?xml version="1.0" encoding="UTF-8"?><Response><Message>${replyMsg}</Message></Response>`;
    return new NextResponse(twiml, {
      status: 200,
      headers: { "Content-Type": "text/xml" },
    });
  } catch (err: unknown) {
    console.error("[Twilio Webhook Error]", err);
    return new NextResponse(
      `<?xml version="1.0" encoding="UTF-8"?><Response><Message>Received.</Message></Response>`,
      { status: 200, headers: { "Content-Type": "text/xml" } }
    );
  }
}
