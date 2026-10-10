import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { BillingService } from "@/services/billing.service";
import { VerifyRazorpayPaymentSchema } from "@/lib/validations/billing";

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

export async function POST(request: Request) {
  try {
    const json = await request.json().catch(() => null);
    const parsed = VerifyRazorpayPaymentSchema.safeParse(json);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: {
            code: "VALIDATION_ERROR",
            message: "Invalid payment verification payload",
            details: parsed.error.flatten(),
          },
        },
        { status: 400 }
      );
    }

    const businessId = await resolveBusinessId();
    const result = await BillingService.verifyRazorpayPayment(businessId, parsed.data);

    return NextResponse.json({ data: result }, { status: 200 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Payment verification failed";
    return NextResponse.json(
      { error: { code: "PAYMENT_FAILED", message } },
      { status: 400 }
    );
  }
}
