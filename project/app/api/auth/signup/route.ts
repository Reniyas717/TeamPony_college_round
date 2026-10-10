import { NextResponse } from "next/server";
import { AuthService } from "@/services/auth.service";
import { SignUpSchema } from "@/lib/validations/auth";
import { AuditService } from "@/services/audit.service";
import { SYSTEM_BUSINESS_ID } from "@/lib/validations/audit";

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null);
    const parsed = SignUpSchema.safeParse(body);

    if (!parsed.success) {
      await AuditService.recordEvent(
        {
          business_id: SYSTEM_BUSINESS_ID,
          action: "auth.signup",
          actor: { id: "anonymous", type: "user" },
          resource: { type: "auth_user", id: "unregistered" },
          outcome: "failure",
          error: { code: "VALIDATION_ERROR", message: "Malformed registration details" },
          metadata: { reason: "validation_failure" },
        },
        { critical: false, useAdminClient: true }
      );

      return NextResponse.json(
        {
          error: {
            code: "VALIDATION_ERROR",
            message: "Invalid registration details",
            details: parsed.error.flatten(),
          },
        },
        { status: 400 }
      );
    }

    const result = await AuthService.signUp(parsed.data);

    return NextResponse.json(
      {
        data: result,
      },
      { status: 201 }
    );
  } catch (err: unknown) {
    const error = err as Error;
    const isConflict = error.message.includes("USERNAME_TAKEN") || error.message.includes("already registered");
    const status = isConflict ? 409 : 400;

    return NextResponse.json(
      {
        error: {
          code: isConflict ? "CONFLICT" : "AUTH_ERROR",
          message: error.message || "Failed to create account",
        },
      },
      { status }
    );
  }
}
