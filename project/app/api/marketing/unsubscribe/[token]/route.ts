import { NextResponse } from "next/server";
import { EngagementTrackingService } from "@/services/engagement.service";

export async function GET(
  _request: Request,
  props: { params: Promise<{ token: string }> }
) {
  const { token } = await props.params;
  const result = await EngagementTrackingService.recordUnsubscribe(token);

  const emailDisplay = result.email ? `for <strong>${result.email}</strong>` : "";

  const html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Unsubscribed — Nexus</title>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #09090b; color: #f4f4f5; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; padding: 20px; box-sizing: border-box; }
        .card { background: #18181b; border: 1px solid #27272a; border-radius: 8px; max-width: 440px; width: 100%; padding: 32px; text-align: center; box-shadow: 0 4px 12px rgba(0,0,0,0.5); }
        .icon { width: 44px; height: 44px; background: rgba(34, 197, 94, 0.1); color: #22c55e; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 16px; font-size: 20px; }
        h1 { font-size: 20px; font-weight: 700; margin: 0 0 8px; color: #ffffff; }
        p { font-size: 13px; color: #a1a1aa; line-height: 1.5; margin: 0 0 24px; }
        .badge { display: inline-block; background: #27272a; color: #d4d4d8; font-size: 11px; font-family: monospace; padding: 4px 10px; border-radius: 4px; margin-bottom: 20px; }
      </style>
    </head>
    <body>
      <div class="card">
        <div class="icon">✓</div>
        <h1>Successfully Unsubscribed</h1>
        <p>Your marketing preferences have been updated ${emailDisplay}. You will no longer receive broadcast marketing campaigns from this workspace.</p>
        <div class="badge">Status: Suppressed in Compliance Registry</div>
      </div>
    </body>
    </html>
  `;

  return new NextResponse(html, {
    status: 200,
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}

export async function POST(
  _request: Request,
  props: { params: Promise<{ token: string }> }
) {
  const { token } = await props.params;
  const result = await EngagementTrackingService.recordUnsubscribe(token);
  return NextResponse.json({ data: result });
}
