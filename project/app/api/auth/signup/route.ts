import { NextResponse } from "next/server";
import { AuthService } from "@/services/auth.service";
import { SignUpSchema } from "@/lib/validations/auth";

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null);
    const parsed = SignUpSchema.safeParse(body);

    if (!parsed.success) {
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
