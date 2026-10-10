import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { BillingService } from "@/services/billing.service";

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

interface Context {
  params: Promise<{ id: string }>;
}

export async function GET(request: Request, { params }: Context) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const format = searchParams.get("format");

    const businessId = await resolveBusinessId();
    const invoices = await BillingService.listInvoices(businessId);
    const invoice = invoices.find((inv) => inv.id === id || inv.invoice_number === id);

    if (!invoice) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Invoice not found" } },
        { status: 404 }
      );
    }

    if (format === "html") {
      const html = BillingService.renderInvoiceHtml(invoice);
      return new Response(html, {
        headers: {
          "Content-Type": "text/html; charset=utf-8",
        },
      });
    }

    return NextResponse.json({ data: invoice }, { status: 200 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to retrieve invoice";
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message } },
      { status: 500 }
    );
  }
}
