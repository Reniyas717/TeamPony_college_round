import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { WebinarWorkRequestSchema } from "@/lib/validations/webinar-work";
import { EmailWorkerError, processWebinarEmailOutbox } from "@/services/webinar/email-worker.service";

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: { code: "UNAUTHORIZED", message: "Sign in to process webinar emails.", details: null } }, { status: 401 });
  }

  const { data: business, error: businessError } = await supabase
    .from("businesses").select("id").eq("owner_id", user.id).maybeSingle();
  if (businessError) {
    return NextResponse.json({ error: { code: "INTERNAL_ERROR", message: "Could not verify the business workspace.", details: null } }, { status: 500 });
  }
  if (!business) {
    return NextResponse.json({ error: { code: "NOT_FOUND", message: "Business workspace not found.", details: null } }, { status: 404 });
  }

  const input = await request.json().catch(() => ({}));
  const parsed = WebinarWorkRequestSchema.safeParse(input);
  if (!parsed.success) {
    return NextResponse.json({ error: { code: "VALIDATION_ERROR", message: "Invalid worker request.", details: parsed.error.flatten() } }, { status: 400 });
  }

  try {
    const data = await processWebinarEmailOutbox(parsed.data.batch_size, business.id);
    return NextResponse.json({ data });
  } catch (error) {
    const message = error instanceof EmailWorkerError ? error.message : "Webinar worker failed.";
    return NextResponse.json({ error: { code: "INTERNAL_ERROR", message, details: null } }, { status: 500 });
  }
}
