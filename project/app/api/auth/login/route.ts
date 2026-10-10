import { NextResponse } from "next/server";
import { AuthService } from "@/services/auth.service";
import { LoginSchema } from "@/lib/validations/auth";
import { AuditService } from "@/services/audit.service";
import { SYSTEM_BUSINESS_ID } from "@/lib/validations/audit";

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null);
    const parsed = LoginSchema.safeParse(body);

    if (!parsed.success) {
      await AuditService.recordEvent(
        {
          business_id: SYSTEM_BUSINESS_ID,
          action: "auth.failed_login",
          actor: { id: "anonymous", type: "user" },
          resource: { type: "auth_session", id: "unauthenticated" },
          outcome: "failure",
          error: { code: "VALIDATION_ERROR", message: "Malformed login credentials" },
          metadata: { reason: "validation_failure" },
        },
        { critical: false, useAdminClient: true }
      );

      return NextResponse.json(
        {
          error: {
            code: "VALIDATION_ERROR",
            message: "Invalid login credentials",
            details: parsed.error.flatten(),
          },
        },
        { status: 400 }
      );
    }

    const result = await AuthService.logIn(parsed.data);

    return NextResponse.json(
      {
        data: result,
      },
      { status: 200 }
    );
  } catch (err: unknown) {
    const error = err as Error;
    return NextResponse.json(
      {
        error: {
          code: "UNAUTHORIZED",
          message: error.message.replace("INVALID_CREDENTIALS: ", "") || "Invalid username or password",
        },
      },
      { status: 401 }
    );
  }
}
