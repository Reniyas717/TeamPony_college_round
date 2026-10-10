import { NextResponse } from "next/server";
import { AuthService } from "@/services/auth.service";

export async function POST() {
  try {
    await AuthService.logOut();
    return NextResponse.json({ data: { success: true } });
  } catch {
    return NextResponse.json(
      {
        error: {
          code: "INTERNAL_ERROR",
          message: "Could not sign out.",
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
