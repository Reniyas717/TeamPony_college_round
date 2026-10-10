import { NextResponse } from "next/server";
import { DeleteWebinarSchema, WebinarInputSchema } from "@/lib/validations/webinar";
import { deleteWebinar, getWebinar, updateWebinar, WebinarServiceError } from "@/services/webinar/session.service";

type Context = { params: Promise<{ webinarId: string }> };

function failure(error: unknown) {
  const known = error instanceof WebinarServiceError;
  const code = known ? error.code : "INTERNAL_ERROR";
  const status = code === "UNAUTHORIZED" ? 401 : code === "NOT_FOUND" ? 404 : code === "INTEGRATION_REQUIRED" || code === "CONFLICT" ? 409 : 500;
  return NextResponse.json({ error: { code, message: known ? error.message : "Webinar request failed.", details: null } }, { status });
}

export async function GET(_request: Request, { params }: Context) {
  try { return NextResponse.json({ data: await getWebinar((await params).webinarId) }); }
  catch (error) { return failure(error); }
}

export async function PATCH(request: Request, { params }: Context) {
  const body = await request.json().catch(() => null);
  const parsed = WebinarInputSchema.safeParse(body);
  if (!parsed.success || parsed.data.expected_version === undefined) return NextResponse.json({ error: { code: "VALIDATION_ERROR", message: "Invalid webinar details or missing version.", details: parsed.success ? { expected_version: ["Required"] } : parsed.error.flatten() } }, { status: 400 });
  try { return NextResponse.json({ data: await updateWebinar((await params).webinarId, parsed.data) }); }
  catch (error) { return failure(error); }
}

export async function DELETE(request: Request, { params }: Context) {
  const body = await request.json().catch(() => null);
  const parsed = DeleteWebinarSchema.safeParse(body);
  if (!parsed.success || parsed.data.expected_version === undefined) return NextResponse.json({ error: { code: "VALIDATION_ERROR", message: "Confirm permanent deletion and review the latest version.", details: parsed.success ? { expected_version: ["Required"] } : parsed.error.flatten() } }, { status: 400 });
  const expectedVersion = parsed.data.expected_version;
  try { await deleteWebinar((await params).webinarId, true, expectedVersion); return NextResponse.json({ data: { deleted: true } }); }
  catch (error) { return failure(error); }
}
