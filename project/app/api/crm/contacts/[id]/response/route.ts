import { NextResponse } from "next/server";
import { z } from "zod";
import { CrmService } from "@/services/crm.service";
import { requireOwnerContext } from "@/lib/supabase/owner-context";

interface RouteParams {
  params: Promise<{ id: string }>;
}

const ProcessResponseSchema = z.object({
  channel: z.enum(["email", "whatsapp", "message"]).default("email"),
  responseText: z.string().trim().min(1, "Response text cannot be empty"),
});

/**
 * POST /api/crm/contacts/[id]/response
 * Ingests an inbound customer response (Email/WhatsApp/Message),
 * evaluates sentiment (Yes/No / Interested/Not Interested),
 * and automatically decides whether to mark the lead as Churned or Qualified.
 */
export async function POST(request: Request, { params }: RouteParams) {
  try {
    const context = await requireOwnerContext();
    const { id } = await params;
    const json = await request.json().catch(() => ({}));
    const parsed = ProcessResponseSchema.safeParse(json);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: {
            code: "VALIDATION_ERROR",
            message: "Invalid response payload",
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

    const { channel, responseText } = parsed.data;
    const textLower = responseText.toLowerCase().trim();

    // Negative indicators (Lead says No / Not interested / Unsubscribe / Churned)
    const negativeKeywords = [
      /\bno\b/,
      /\bnot interested\b/,
      /\bunsubscribe\b/,
      /\bstop\b/,
      /\bremove\b/,
      /\bcancel\b/,
      /\bdon't contact\b/,
      /\bdont contact\b/,
      /\bnot right now\b/,
      /\bnever\b/,
      /\bpass\b/,
      /\bnot looking\b/,
      /\bopt out\b/,
      /\bopt-out\b/,
      /\bnah\b/,
      /\bnope\b/,
    ];

    // Positive indicators (Lead says Yes / Interested / Retained)
    const positiveKeywords = [
      /\byes\b/,
      /\binterested\b/,
      /\bsure\b/,
      /\bsounds good\b/,
      /\blet'?s talk\b/,
      /\blet'?s connect\b/,
      /\blet'?s meet\b/,
      /\bproceed\b/,
      /\byep\b/,
      /\byeah\b/,
      /\bdefinitely\b/,
      /\bcount me in\b/,
      /\bcall me\b/,
      /\bmore info\b/,
      /\bready\b/,
      /\bok\b/,
      /\bokay\b/,
    ];

    const hasNegative = negativeKeywords.some((regex) => regex.test(textLower));
    const hasPositive = positiveKeywords.some((regex) => regex.test(textLower));

    let decision: "INTERESTED" | "CHURNED";
    let targetStage: "qualified" | "churned";
    let reason: string;

    if (hasNegative) {
      decision = "CHURNED";
      targetStage = "churned";
      reason = "Lead declined outreach ('No' / 'Not interested' / Opt-out). Automatically marked as CHURNED.";
    } else if (hasPositive) {
      decision = "INTERESTED";
      targetStage = "qualified";
      reason = "Lead expressed positive interest ('Yes' / Interested). Automatically QUALIFIED and retained.";
    } else {
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: "The response is ambiguous; provide a clear yes or no before changing this lead's stage.", details: null } },
        { status: 422 }
      );
    }

    // Update the contact's stage and save the response snippet
    const existingTags = Array.isArray(contact.tags) ? contact.tags : [];
    const cleanTags = existingTags.filter((t) => !t.startsWith("response:"));
    cleanTags.push(decision === "CHURNED" ? "response:churned" : "response:interested");

    const updated = await CrmService.updateContact(id, {
      stage: targetStage,
      tags: cleanTags,
      next_action_text: `Inbound ${channel.toUpperCase()}: "${responseText.slice(0, 80)}"`,
    }, context);

    // Record activity on the contact's timeline
    await CrmService.logActivity(
      id,
      decision === "CHURNED" ? "stage_change" : "email_sent",
      decision === "CHURNED"
        ? `Lead Churned (${channel.toUpperCase()})`
        : `Lead Qualified (${channel.toUpperCase()})`,
      `Inbound customer response: "${responseText}"\nDecision Engine: ${reason}`,
      "ai_agent",
      {
        channel,
        responseText,
        decision,
        isChurned: decision === "CHURNED",
        previous_stage: contact.stage,
        new_stage: targetStage,
      },
      context
    );

    return NextResponse.json(
      {
        data: {
          contact: updated,
          decision,
          isChurned: decision === "CHURNED",
          reason,
        },
      },
      { status: 200 }
    );
  } catch (err: unknown) {
    return NextResponse.json(
      {
        error: {
          code: "INTERNAL_ERROR",
          message: err instanceof Error ? err.message : "Failed to process lead response",
          details: null,
        },
      },
      { status: 500 }
    );
  }
}
