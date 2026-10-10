import { NextResponse } from "next/server";

import { AttendanceImportSchema } from "@/lib/validations/webinar-attendance";
import {
  getWebinarAttendance,
  importWebinarAttendance,
  MeetAttendanceServiceError,
} from "@/services/webinar/meet-attendance.service";

type Context = { params: Promise<{ webinarId: string }> };

function failure(error: unknown) {
  const known = error instanceof MeetAttendanceServiceError;
  const code = known ? error.code : "INTERNAL_ERROR";
  const status = code === "UNAUTHORIZED" ? 401 : code === "NOT_FOUND" ? 404 : code === "VALIDATION_ERROR" ? 400 : code === "CONFLICT" ? 409 : 500;
  return NextResponse.json({ error: { code, message: known ? error.message : "Attendance request failed.", details: null } }, { status });
}

export async function GET(_request: Request, { params }: Context) {
  try {
    return NextResponse.json({ data: await getWebinarAttendance((await params).webinarId) });
  } catch (error) {
    return failure(error);
  }
}

export async function POST(request: Request, { params }: Context) {
  const parsed = AttendanceImportSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: { code: "VALIDATION_ERROR", message: "Invalid attendance import request.", details: parsed.error.flatten() } }, { status: 400 });
  }
  try {
    return NextResponse.json({ data: await importWebinarAttendance((await params).webinarId, parsed.data.max_pages) });
  } catch (error) {
    return failure(error);
  }
}
