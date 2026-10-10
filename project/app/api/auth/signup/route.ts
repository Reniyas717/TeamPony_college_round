import { NextResponse } from "next/server";
import { AuthService } from "@/services/auth.service";
import { SignUpSchema } from "@/lib/validations/auth";
import { AuditService } from "@/services/audit.service";

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null);
    const parsed = SignUpSchema.safeParse(body);

    if (!parsed.success) {
      await AuditService.recordPlatformSecurityEvent(
        "auth.signup",
        { type: "auth_user", id: "unregistered" },
        { method: "password", reason_code: "VALIDATION_ERROR" },
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
    const isConflict = /already|exists|taken/i.test(error.message);
    const status = isConflict ? 409 : 400;

    return NextResponse.json(
      {
        error: {
          code: isConflict ? "CONFLICT" : "AUTH_ERROR",
          message: isConflict ? "An account with those details already exists." : "Could not create account.",
        },
      },
      { status }
    );
  }
}
