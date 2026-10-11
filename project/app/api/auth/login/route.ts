import { NextResponse } from "next/server";
import { AuthService } from "@/services/auth.service";
import { LoginSchema } from "@/lib/validations/auth";
import { AuditService } from "@/services/audit.service";

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null);
    const parsed = LoginSchema.safeParse(body);

    if (!parsed.success) {
      await AuditService.recordPlatformSecurityEvent(
        "auth.failed_login",
        { type: "auth_session", id: "unauthenticated" },
        { method: "password", reason_code: "VALIDATION_ERROR" },
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
    const message = err instanceof Error ? err.message : "Invalid username or password";
    console.error("[AUTH-LOGIN-POST-ERROR]", err);
    return NextResponse.json(
      {
        error: {
          code: "UNAUTHORIZED",
          message,
        },
      },
      { status: 401 }
    );
  }
}
