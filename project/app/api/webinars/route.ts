import { NextResponse } from "next/server";
import { WebinarInputSchema } from "@/lib/validations/webinar";
import { createWebinar, listWebinars, WebinarServiceError } from "@/services/webinar/session.service";

function failure(error: unknown) {
  const known = error instanceof WebinarServiceError;
  const code = known ? error.code : "INTERNAL_ERROR";
  const status = code === "UNAUTHORIZED" ? 401 : code === "NOT_FOUND" ? 404 : code === "INTEGRATION_REQUIRED" ? 409 : 500;
  return NextResponse.json({ error: { code, message: known ? error.message : "Webinar request failed.", details: null } }, { status });
}

export async function GET() {
  try { return NextResponse.json({ data: await listWebinars() }); }
  catch (error) { return failure(error); }
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = WebinarInputSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: { code: "VALIDATION_ERROR", message: "Invalid webinar details.", details: parsed.error.flatten() } }, { status: 400 });
  try { return NextResponse.json({ data: await createWebinar(parsed.data) }, { status: 201 }); }
  catch (error) { return failure(error); }
}
