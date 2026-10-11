import { ownerContextErrorResponse, requireOwnerContext, OwnerContextError } from "@/lib/supabase/owner-context";
import { ContactFiltersSchema, CreateContactSchema } from "@/lib/validations/crm";
import { CrmService, CrmServiceError } from "@/services/crm.service";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";

function serviceErrorResponse(error: unknown, message: string) {
  if (error instanceof CrmServiceError) {
    return NextResponse.json(
      { error: { code: error.code, message: error.message, details: null } },
      { status: error.status }
    );
  }
  return NextResponse.json(
    { error: { code: "INTERNAL_ERROR", message, details: null } },
    { status: 500 }
  );
}

export async function GET(request: Request) {
  try {
    const context = await requireOwnerContext();
    const { searchParams } = new URL(request.url);
    const parsedFilters = ContactFiltersSchema.safeParse({
      search: searchParams.get("search") || undefined,
      stage: searchParams.get("stage") || undefined,
      source: searchParams.get("source") || undefined,
      tag: searchParams.get("tag") || undefined,
      limit: searchParams.get("limit") || undefined,
      offset: searchParams.get("offset") || undefined,
    });
    if (!parsedFilters.success) {
      return NextResponse.json(
        {
          error: {
            code: "VALIDATION_ERROR",
            message: "Invalid query parameters",
            details: parsedFilters.error.flatten(),
          },
        },
        { status: 400 }
      );
    }
    const contacts = await CrmService.listContacts(parsedFilters.data, context);
    return NextResponse.json({ data: contacts }, { status: 200 });
  } catch (error) {
    return ownerContextErrorResponse(error) ?? serviceErrorResponse(error, "Failed to retrieve contacts");
  }
}

export async function POST(request: Request) {
  try {
    const rawBody = await request.json().catch(() => null);
    const parsed = CreateContactSchema.safeParse(rawBody);
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: {
            code: "VALIDATION_ERROR",
            message: "Validation failed for new contact",
            details: parsed.error.flatten(),
          },
        },
        { status: 400 }
      );
    }

    let context;
    try {
      context = await requireOwnerContext();
    } catch {
      // Unauthenticated visitor (e.g. prospective customer on published website builder site)
    }

    if (!context) {
      // Support public inquiry submission from published website builder site
      const businessId = parsed.data.business_id;
      if (businessId) {
        const admin = getSupabaseAdminClient();
        if (admin) {
          const { data: biz } = await admin
            .from("businesses")
            .select("id")
            .eq("id", businessId)
            .maybeSingle();

          if (biz) {
            context = {
              client: admin,
              user: { id: "system" } as any,
              businessId: biz.id,
            };
          }
        }
      }
    }

    if (!context) {
      throw new OwnerContextError("Sign in to continue.", 401, "UNAUTHORIZED");
    }

    const contact = await CrmService.createContact(parsed.data, context);

    // Also log website form submission activity
    if (parsed.data.source === "website_form") {
      try {
        await CrmService.logActivity(
          contact.id,
          "form_submission",
          "Website Inquiry Submitted",
          parsed.data.next_action_text || "Customer submitted contact form on published website.",
          "system",
          { source: "website_form" },
          context
        );
      } catch {
        // Activity log non-blocking
      }
    }

    return NextResponse.json({ data: contact }, { status: 201 });
  } catch (error) {
    return ownerContextErrorResponse(error) ?? serviceErrorResponse(error, "Failed to create contact");
  }
}
