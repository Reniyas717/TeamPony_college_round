import { NextResponse } from "next/server";
import { AuthService } from "@/services/auth.service";

export async function POST() {
  try {
    await AuthService.logOut();
    return NextResponse.json({ data: { success: true } });
  } catch (err: unknown) {
    const error = err as Error;
    return NextResponse.json(
      {
        error: {
          code: "INTERNAL_ERROR",
          message: error.message || "Failed to log out",
        },
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const user = await AuthService.getCurrentUser();
    return NextResponse.json({ data: { user } });
  } catch {
    return NextResponse.json({ data: { user: null } });
  }
}
