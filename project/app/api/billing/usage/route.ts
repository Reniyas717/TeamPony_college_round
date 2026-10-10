import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { BillingService } from "@/services/billing.service";
import { SimulateUsageSchema } from "@/lib/validations/billing";

async function resolveBusinessId(): Promise<string> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      const { data: business } = await supabase
        .from("businesses")
        .select("id")
        .eq("owner_id", user.id)
        .maybeSingle();

      if (business?.id) {
        return business.id;
      }
    }
  } catch {
    // Demo fallback
  }
  return "00000000-0000-0000-0000-000000000001";
}

export async function GET() {
  try {
    const businessId = await resolveBusinessId();
    const usage = await BillingService.getUsage(businessId);
    return NextResponse.json({ data: usage }, { status: 200 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to retrieve usage metrics";
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message } },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const json = await request.json().catch(() => null);
    const parsed = SimulateUsageSchema.safeParse(json);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: {
            code: "VALIDATION_ERROR",
            message: "Invalid usage simulation request",
            details: parsed.error.flatten(),
          },
        },
        { status: 400 }
      );
    }

    const businessId = await resolveBusinessId();
    const updated = await BillingService.simulateUsage(
      businessId,
      parsed.data.metric,
      parsed.data.increment
    );

    return NextResponse.json({ data: updated }, { status: 200 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to simulate usage";
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message } },
      { status: 500 }
    );
  }
}
