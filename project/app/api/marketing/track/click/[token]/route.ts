import { NextResponse } from "next/server";
import { EngagementTrackingService } from "@/services/engagement.service";

export async function GET(
  request: Request,
  props: { params: Promise<{ token: string }> }
) {
  const { token } = await props.params;
  const { searchParams } = new URL(request.url);
  const targetUrl = searchParams.get("url") || "/";

  const userAgent = request.headers.get("user-agent") || undefined;
  const forwarded = request.headers.get("x-forwarded-for");
  const ip = forwarded ? forwarded.split(",")[0].trim() : undefined;

  const safeRedirectUrl = await EngagementTrackingService.recordClick(
    token,
    targetUrl,
    { ip, userAgent }
  );

  return NextResponse.redirect(safeRedirectUrl, { status: 302 });
}
