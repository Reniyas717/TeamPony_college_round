import { NextResponse } from "next/server";
import { z } from "zod";
import { CrmService } from "@/services/crm.service";
import { requireOwnerContext } from "@/lib/supabase/owner-context";
import { LeadSentimentService } from "@/services/lead-sentiment.service";

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
 * evaluates sentiment via Groq or Gemini AI (with deterministic fallback),
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

    // Evaluate customer response using Groq / Gemini AI
    const evaluation = await LeadSentimentService.evaluateSentiment(responseText);
    const { decision, isChurned, targetStage, reasoning, engine, confidence } = evaluation;

    // Update the contact's stage and save the response snippet
    const existingTags = Array.isArray(contact.tags) ? contact.tags : [];
    const cleanTags = existingTags.filter((t) => !t.startsWith("response:"));
    cleanTags.push(isChurned ? "response:churned" : "response:interested");

    const updated = await CrmService.updateContact(id, {
      stage: targetStage,
      tags: cleanTags,
      next_action_text: `Inbound ${channel.toUpperCase()}: "${responseText.slice(0, 80)}"`,
    }, context);

    // Record activity on the contact's timeline
    await CrmService.logActivity(
      id,
      isChurned ? "stage_change" : "email_sent",
      isChurned
        ? `Lead Churned (${channel.toUpperCase()})`
        : `Lead Qualified (${channel.toUpperCase()})`,
      `Inbound customer response: "${responseText}"\nAI Engine [${engine.toUpperCase()}]: ${reasoning}`,
      "ai_agent",
      {
        channel,
        responseText,
        decision,
        isChurned,
        engine,
        confidence,
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
          isChurned,
          reasoning,
          engine,
          confidence,
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
