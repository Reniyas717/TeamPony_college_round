import { NextResponse } from "next/server";
import { BillingService } from "@/services/billing.service";
import { CreateRazorpayOrderSchema } from "@/lib/validations/billing";

export async function POST(request: Request) {
  try {
    const json = await request.json().catch(() => null);
    const parsed = CreateRazorpayOrderSchema.safeParse(json);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: {
            code: "VALIDATION_ERROR",
            message: "Invalid plan selection for order creation",
            details: parsed.error.flatten(),
          },
        },
        { status: 400 }
      );
    }

    const order = await BillingService.createRazorpayOrder(parsed.data.planId);
    return NextResponse.json({ data: order }, { status: 200 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to create payment order";
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message } },
      { status: 500 }
    );
  }
}
