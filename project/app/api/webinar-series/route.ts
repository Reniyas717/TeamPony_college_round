import { NextResponse } from "next/server";
import { z } from "zod";
import { WebinarSeriesDeleteSchema, WebinarSeriesSchema } from "@/lib/validations/webinar-series";
import { createSeries, deleteWebinarSeries, getSeriesDeletePreview, listSeries } from "@/services/webinar/series.service";
import { WebinarServiceError } from "@/services/webinar/session.service";

function failure(error: unknown) {
  const known = error instanceof WebinarServiceError;
  const code = known ? error.code : "INTERNAL_ERROR";
  const status = code === "UNAUTHORIZED" ? 401 : code === "NOT_FOUND" ? 404 : code === "CONFLICT" ? 409 : 500;
  return NextResponse.json({ error: { code, message: known ? error.message : "Webinar series request failed.", details: null } }, { status });
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    if (url.searchParams.get("preview") === "delete") {
      const id = url.searchParams.get("id");
      if (!id) return NextResponse.json({ error: { code: "VALIDATION_ERROR", message: "Series ID is required.", details: null } }, { status: 400 });
      const parsedId = z.string().uuid().safeParse(id);
      if (!parsedId.success) return NextResponse.json({ error: { code: "VALIDATION_ERROR", message: "Invalid series ID.", details: null } }, { status: 400 });
      return NextResponse.json({ data: await getSeriesDeletePreview(parsedId.data) });
    }
    return NextResponse.json({ data: await listSeries() });
  }
  catch (error) { return failure(error); }
}

export async function POST(request: Request) {
  const parsed = WebinarSeriesSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: { code: "VALIDATION_ERROR", message: "Invalid webinar series details.", details: parsed.error.flatten() } }, { status: 400 });
  try { return NextResponse.json({ data: await createSeries(parsed.data) }, { status: 201 }); }
  catch (error) { return failure(error); }
}

export async function DELETE(request: Request) {
  const parsed = WebinarSeriesDeleteSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: { code: "VALIDATION_ERROR", message: "Review and confirm series deletion.", details: parsed.error.flatten() } }, { status: 400 });
  try {
    const data = await deleteWebinarSeries(parsed.data.id, parsed.data.expected_counts);
    return NextResponse.json({ data });
  } catch (error) { return failure(error); }
}
