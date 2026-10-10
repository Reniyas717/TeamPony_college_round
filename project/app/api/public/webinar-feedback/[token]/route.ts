import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  PublicWebinarFeedbackSchema,
  WebinarFeedbackTokenSchema,
} from "@/lib/validations/webinar-feedback";

type Context = { params: Promise<{ token: string }> };

function tokenHash(token: string) {
  return createHash("sha256").update(token, "utf8").digest("hex");
}

function errorResponse(code: string, message: string, status: number, details: unknown = null) {
  return NextResponse.json({ error: { code, message, details } }, { status });
}

function mapRpcError(message: string) {
  if (message.includes("FEEDBACK_NOT_FOUND")) {
    return errorResponse("NOT_FOUND", "This feedback link is invalid or has expired.", 404);
  }
  if (message.includes("FEEDBACK_NOT_AVAILABLE")) {
    return errorResponse("NOT_AVAILABLE", "Feedback is not available for this session yet.", 409);
  }
  if (message.includes("INVALID_FEEDBACK")) {
    return errorResponse("VALIDATION_ERROR", "Check the feedback details and try again.", 400);
  }
  return errorResponse("INTERNAL_ERROR", "Could not process this feedback link.", 500);
}

export async function GET(_request: Request, { params }: Context) {
  const parsedToken = WebinarFeedbackTokenSchema.safeParse((await params).token);
  if (!parsedToken.success) return errorResponse("VALIDATION_ERROR", "Invalid feedback link.", 400);

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_public_webinar_feedback_form", {
    p_token_hash: tokenHash(parsedToken.data),
  });

  if (error) return mapRpcError(error.message);
  return NextResponse.json({ data });
}

export async function POST(request: Request, { params }: Context) {
  const parsedToken = WebinarFeedbackTokenSchema.safeParse((await params).token);
  if (!parsedToken.success) return errorResponse("VALIDATION_ERROR", "Invalid feedback link.", 400);

  const parsed = PublicWebinarFeedbackSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return errorResponse("VALIDATION_ERROR", "Enter a rating and tell us whether the session was useful.", 400, parsed.error.flatten());
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("submit_public_webinar_feedback", {
    p_token_hash: tokenHash(parsedToken.data),
    p_rating: parsed.data.rating,
    p_was_useful: parsed.data.was_useful,
    p_comments: parsed.data.comments,
    p_product_interest: parsed.data.product_interest,
    p_marketing_opt_in: parsed.data.marketing_opt_in,
  });

  if (error) return mapRpcError(error.message);
  return NextResponse.json({ data });
}
