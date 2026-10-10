import { timingSafeEqual } from "node:crypto";

import { NextResponse } from "next/server";

import { WebinarWorkRequestSchema } from "@/lib/validations/webinar-work";
import { EmailWorkerError, processWebinarEmailOutbox } from "@/services/webinar/email-worker.service";

function hasValidWorkerSecret(request: Request, configuredSecret: string) {
  const expected = Buffer.from(`Bearer ${configuredSecret}`);
  const received = Buffer.from(request.headers.get("authorization") || "");
  return received.length === expected.length && timingSafeEqual(received, expected);
}

export async function POST(request: Request) {
  const configuredSecret = process.env.WEBINAR_WORKER_SECRET;
  if (!configuredSecret || !hasValidWorkerSecret(request, configuredSecret)) {
    return NextResponse.json(
      { error: { code: "UNAUTHORIZED", message: "Worker authentication required.", details: null } },
      { status: 401 },
    );
  }

  const input = await request.json().catch(() => ({}));
  const parsed = WebinarWorkRequestSchema.safeParse(input);
  if (!parsed.success) {
    return NextResponse.json(
      { error: { code: "VALIDATION_ERROR", message: "Invalid worker request.", details: parsed.error.flatten() } },
      { status: 400 },
    );
  }

  try {
    const data = await processWebinarEmailOutbox(parsed.data.batch_size);
    return NextResponse.json({ data });
  } catch (error) {
    if (error instanceof EmailWorkerError) {
      return NextResponse.json(
        { error: { code: "INTERNAL_ERROR", message: error.message, details: null } },
        { status: 500 },
      );
    }
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Webinar worker failed.", details: null } },
      { status: 500 },
    );
  }
}
