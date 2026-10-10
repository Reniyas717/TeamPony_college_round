import { NextResponse } from "next/server";
import { CrmService, DEFAULT_BUSINESS_ID } from "@/services/crm.service";
import { AuditService } from "@/services/audit.service";
import { LeadSentimentService } from "@/services/lead-sentiment.service";

/**
 * POST /api/webhooks/inbound-email
 * Inbound webhook for customer email replies.
 * Uses Groq / Gemini AI to evaluate whether the customer replied with Yes or No sentiment,
 * and automatically updates lead stage to Qualified or Churned.
 */
export async function POST(request: Request) {
  try {
    const json = await request.json().catch(() => ({}));
    const from = json.from || json.sender || json.email || "";
    const body = json.text || json.body || json.message || json.content || "";

    if (!from || !body) {
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: "Missing from email or body content" } },
        { status: 400 }
      );
    }

    // Extract email from formats like "John Doe <john@example.com>"
    const emailMatch = from.match(/<([^>]+)>/) || [null, from];
    const cleanEmail = (emailMatch[1] || from).trim();

    const contact = await CrmService.getContactByEmail(cleanEmail);
    if (!contact) {
      console.warn(`[Inbound Email Webhook] Received email reply from unknown address: ${cleanEmail}`);
      return NextResponse.json({ received: true, matched: false }, { status: 200 });
    }

    // Evaluate customer response using Groq / Gemini AI
    const evaluation = await LeadSentimentService.evaluateSentiment(body);
    const { decision, isChurned, targetStage, reasoning, engine, confidence } = evaluation;

    const existingTags = Array.isArray(contact.tags) ? contact.tags : [];
    const cleanTags = existingTags.filter((t) => !t.startsWith("response:"));
    cleanTags.push(isChurned ? "response:churned" : "response:interested");

    await CrmService.updateContact(contact.id, {
      stage: targetStage,
      tags: cleanTags,
      next_action_text: `Customer Email [${engine.toUpperCase()}]: "${body.slice(0, 80)}"`,
    });

    await CrmService.logActivity(
      contact.id,
      isChurned ? "stage_change" : "email_sent",
      isChurned ? "Lead Churned (Email Reply)" : "Lead Qualified (Email Reply)",
      `Customer replied to email: "${body}"\nOutcome: ${isChurned ? "Churned" : "Qualified"}`,
      "ai_agent",
      {
        channel: "email",
        body,
        decision,
        isChurned,
      }
    );

    await AuditService.recordEvent(
      {
        business_id: DEFAULT_BUSINESS_ID,
        action: "crm.contact.stage_changed",
        actor: { id: "customer", type: "user" },
        resource: { type: "crm_contact", id: contact.id },
        outcome: "success",
        metadata: {
          channel: "email",
          decision,
          targetStage,
        },
      },
      { critical: false }
    );

    return NextResponse.json({
      received: true,
      matched: true,
      decision,
      stage: targetStage,
      contactId: contact.id,
    });
  } catch (err: unknown) {
    console.error("[Inbound Email Webhook Error]", err);
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Failed to process inbound email" } },
      { status: 500 }
    );
  }
}
