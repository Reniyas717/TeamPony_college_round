import { NextResponse } from "next/server";
import { CrmService } from "@/services/crm.service";
import { UpdateContactSchema } from "@/lib/validations/crm";

/**
 * /api/crm/contacts/[id]
 * Handles single contact retrieval, stage/detail updates, and deletion.
 */

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(_request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;
    const contact = await CrmService.getContactById(id);

    if (!contact) {
      return NextResponse.json(
        {
          error: {
            code: "NOT_FOUND",
            message: `Contact with ID '${id}' was not found`,
            details: null,
          },
        },
        { status: 404 }
      );
    }

    return NextResponse.json({ data: contact }, { status: 200 });
  } catch {
    return NextResponse.json(
      {
        error: {
          code: "INTERNAL_ERROR",
          message: "Failed to fetch contact details",
          details: null,
        },
      },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;
    const json = await request.json().catch(() => null);

    if (!json) {
      return NextResponse.json(
        {
          error: {
            code: "VALIDATION_ERROR",
            message: "Empty update payload",
            details: null,
          },
        },
        { status: 400 }
      );
    }

    const parsed = UpdateContactSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: {
            code: "VALIDATION_ERROR",
            message: "Validation failed for contact update",
            details: parsed.error.flatten(),
          },
        },
        { status: 400 }
      );
    }

    const updated = await CrmService.updateContact(id, parsed.data);
    if (!updated) {
      return NextResponse.json(
        {
          error: {
            code: "NOT_FOUND",
            message: `Contact with ID '${id}' was not found`,
            details: null,
          },
        },
        { status: 404 }
      );
    }

    return NextResponse.json({ data: updated }, { status: 200 });
  } catch {
    return NextResponse.json(
      {
        error: {
          code: "INTERNAL_ERROR",
          message: "Failed to update contact",
          details: null,
        },
      },
      { status: 500 }
    );
  }
}

export async function DELETE(_request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;
    const success = await CrmService.deleteContact(id);

    if (!success) {
      return NextResponse.json(
        {
          error: {
            code: "NOT_FOUND",
            message: `Contact with ID '${id}' not found or could not be deleted`,
            details: null,
          },
        },
        { status: 404 }
      );
    }

    return NextResponse.json({ data: { success: true } }, { status: 200 });
  } catch {
    return NextResponse.json(
      {
        error: {
          code: "INTERNAL_ERROR",
          message: "Failed to delete contact",
          details: null,
        },
      },
      { status: 500 }
    );
  }
}
