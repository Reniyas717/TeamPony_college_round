import { ownerContextErrorResponse, requireOwnerContext } from "@/lib/supabase/owner-context";
import { UpdateContactSchema } from "@/lib/validations/crm";
import { CrmService, CrmServiceError } from "@/services/crm.service";
import { NextResponse } from "next/server";

interface RouteParams {
  params: Promise<{ id: string }>;
}

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

export async function GET(_request: Request, { params }: RouteParams) {
  try {
    const context = await requireOwnerContext();
    const { id } = await params;
    const contact = await CrmService.getContactById(id, context);
    if (!contact) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Contact was not found.", details: null } },
        { status: 404 }
      );
    }
    return NextResponse.json({ data: contact }, { status: 200 });
  } catch (error) {
    return ownerContextErrorResponse(error) ?? serviceErrorResponse(error, "Failed to fetch contact details");
  }
}

export async function PATCH(request: Request, { params }: RouteParams) {
  try {
    const context = await requireOwnerContext();
    const { id } = await params;
    const parsed = UpdateContactSchema.safeParse(await request.json().catch(() => null));
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
    const contact = await CrmService.updateContact(id, parsed.data, context);
    if (!contact) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Contact was not found.", details: null } },
        { status: 404 }
      );
    }
    return NextResponse.json({ data: contact }, { status: 200 });
  } catch (error) {
    return ownerContextErrorResponse(error) ?? serviceErrorResponse(error, "Failed to update contact");
  }
}

export async function DELETE(_request: Request, { params }: RouteParams) {
  try {
    const context = await requireOwnerContext();
    const { id } = await params;
    const deleted = await CrmService.deleteContact(id, context);
    if (!deleted) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Contact was not found.", details: null } },
        { status: 404 }
      );
    }
    return NextResponse.json({ data: { success: true } }, { status: 200 });
  } catch (error) {
    return ownerContextErrorResponse(error) ?? serviceErrorResponse(error, "Failed to delete contact");
  }
}
