import { NextResponse } from "next/server";

import { AttendanceReviewSchema } from "@/lib/validations/webinar-attendance";
import {
  MeetAttendanceServiceError,
  reviewWebinarParticipant,
} from "@/services/webinar/meet-attendance.service";

type Context = { params: Promise<{ webinarId: string; participantId: string }> };

function failure(error: unknown) {
  const known = error instanceof MeetAttendanceServiceError;
  const code = known ? error.code : "INTERNAL_ERROR";
  const status = code === "UNAUTHORIZED" ? 401 : code === "NOT_FOUND" ? 404 : code === "VALIDATION_ERROR" ? 400 : code === "CONFLICT" ? 409 : 500;
  return NextResponse.json({ error: { code, message: known ? error.message : "Attendance review failed.", details: null } }, { status });
}

export async function PATCH(request: Request, { params }: Context) {
  const parsed = AttendanceReviewSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: { code: "VALIDATION_ERROR", message: "Invalid attendance review.", details: parsed.error.flatten() } }, { status: 400 });
  }
  const resolved = await params;
  try {
    return NextResponse.json({ data: await reviewWebinarParticipant(resolved.webinarId, resolved.participantId, parsed.data) });
  } catch (error) {
    return failure(error);
  }
}
