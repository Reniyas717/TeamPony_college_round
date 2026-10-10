import { NextResponse } from "next/server";

import { ownerContextErrorResponse, requireOwnerContext } from "@/lib/supabase/owner-context";
import { WebinarWorkRequestSchema } from "@/lib/validations/webinar-work";
import { EmailWorkerError, processWebinarEmailOutbox } from "@/services/webinar/email-worker.service";

export async function POST(request: Request) {
  let context;
  try {
    context = await requireOwnerContext();
  } catch (error) {
    const response = ownerContextErrorResponse(error);
    if (response) return response;
    return NextResponse.json({ error: { code: "INTERNAL_ERROR", message: "Could not verify the business workspace.", details: null } }, { status: 500 });
  }

  const input = await request.json().catch(() => ({}));
  const parsed = WebinarWorkRequestSchema.safeParse(input);
  if (!parsed.success) {
    return NextResponse.json({ error: { code: "VALIDATION_ERROR", message: "Invalid worker request.", details: parsed.error.flatten() } }, { status: 400 });
  }

  try {
    const data = await processWebinarEmailOutbox(parsed.data.batch_size, context.businessId);
    return NextResponse.json({ data });
  } catch (error) {
    const message = error instanceof EmailWorkerError ? error.message : "Webinar worker failed.";
    return NextResponse.json({ error: { code: "INTERNAL_ERROR", message, details: null } }, { status: 500 });
  }
}
