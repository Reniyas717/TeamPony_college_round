import { NextResponse } from "next/server";
import { CrmService } from "@/services/crm.service";
import { CreateContactSchema, ContactFiltersSchema } from "@/lib/validations/crm";

/**
 * /api/crm/contacts
 * Handles contact listing with query filters and validated lead creation.
 * Standard response contract per AGENTS.md §6.2
 */

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);

    const queryParams: Record<string, string | number | undefined> = {};
    if (searchParams.get("search")) queryParams.search = searchParams.get("search")!;
    if (searchParams.get("stage")) queryParams.stage = searchParams.get("stage")!;
    if (searchParams.get("source")) queryParams.source = searchParams.get("source")!;
    if (searchParams.get("tag")) queryParams.tag = searchParams.get("tag")!;
    if (searchParams.get("limit")) queryParams.limit = Number(searchParams.get("limit"));
    if (searchParams.get("offset")) queryParams.offset = Number(searchParams.get("offset"));

    const parsedFilters = ContactFiltersSchema.safeParse(queryParams);
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

    const contacts = await CrmService.listContacts(parsedFilters.data);

    return NextResponse.json({ data: contacts }, { status: 200 });
  } catch (err: unknown) {
    return NextResponse.json(
      {
        error: {
          code: "INTERNAL_ERROR",
          message: err instanceof Error ? err.message : "Failed to retrieve contacts",
          details: null,
        },
      },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const json = await request.json().catch(() => null);
    if (!json) {
      return NextResponse.json(
        {
          error: {
            code: "VALIDATION_ERROR",
            message: "Invalid or empty request body",
            details: null,
          },
        },
        { status: 400 }
      );
    }

    const parsed = CreateContactSchema.safeParse(json);
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

    const newContact = await CrmService.createContact(parsed.data);

    return NextResponse.json({ data: newContact }, { status: 201 });
  } catch {
    return NextResponse.json(
      {
        error: {
          code: "INTERNAL_ERROR",
          message: "Failed to create contact",
          details: null,
        },
      },
      { status: 500 }
    );
  }
}
