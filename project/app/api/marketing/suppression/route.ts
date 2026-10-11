import { NextResponse } from "next/server";
import { AuthService } from "@/services/auth.service";
import { MarketingService } from "@/services/marketing.service";
import { z } from "zod";

const AddSuppressionSchema = z.object({
  identifier: z.string().min(1, "Email or phone number is required"),
  channel: z.enum(["email", "sms", "whatsapp", "all"]).default("all"),
  reason: z.string().default("manual_admin_suppression"),
});

export async function GET(request: Request) {
  const user = await AuthService.getCurrentUser();
  if (!user) {
    return NextResponse.json(
      { error: { code: "UNAUTHORIZED", message: "Authentication required" } },
      { status: 401 }
    );
  }

  const { searchParams } = new URL(request.url);
  const channel = searchParams.get("channel") || undefined;

  const records = await MarketingService.listSuppressed(channel);
  return NextResponse.json({ data: records });
}

export async function POST(request: Request) {
  const user = await AuthService.getCurrentUser();
  if (!user) {
    return NextResponse.json(
      { error: { code: "UNAUTHORIZED", message: "Authentication required" } },
      { status: 401 }
    );
  }

  const json = await request.json().catch(() => null);
  const parsed = AddSuppressionSchema.safeParse(json);

  if (!parsed.success) {
    return NextResponse.json(
      {
        error: {
          code: "VALIDATION_ERROR",
          message: "Invalid suppression payload",
          details: parsed.error.flatten(),
        },
      },
      { status: 400 }
    );
  }

  const record = await MarketingService.suppressContact(
    parsed.data.identifier,
    parsed.data.channel,
    parsed.data.reason
  );

  return NextResponse.json({ data: record }, { status: 201 });
}
