import { NextResponse } from "next/server";
import {
  EngagementTrackingService,
  TRANSPARENT_GIF_BUFFER,
} from "@/services/engagement.service";

export async function GET(
  request: Request,
  props: { params: Promise<{ token: string }> }
) {
  const { token } = await props.params;
  const userAgent = request.headers.get("user-agent") || undefined;
  const forwarded = request.headers.get("x-forwarded-for");
  const ip = forwarded ? forwarded.split(",")[0].trim() : undefined;

  // Record open asynchronously
  EngagementTrackingService.recordOpen(token, { ip, userAgent }).catch((err) => {
    console.warn("[TrackingPixel] Error recording open:", err);
  });

  return new NextResponse(TRANSPARENT_GIF_BUFFER, {
    status: 200,
    headers: {
      "Content-Type": "image/gif",
      "Content-Length": TRANSPARENT_GIF_BUFFER.length.toString(),
      "Cache-Control": "no-cache, no-store, must-revalidate, max-age=0",
      Pragma: "no-cache",
      Expires: "0",
    },
  });
}
