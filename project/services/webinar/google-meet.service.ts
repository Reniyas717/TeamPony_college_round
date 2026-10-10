import "server-only";

import { getGoogleAccessTokenForBusiness, GoogleTokenVaultError } from "./google-token-vault.service";

export type MeetSpaceResult = { name: string; meetingUri: string };

export class MeetApiError extends Error {
  constructor(public readonly outcome: "failed" | "unknown" | "reconnect", message: string) {
    super(message);
  }
}

export async function createGoogleMeetSpace(businessId: string): Promise<MeetSpaceResult> {
  let accessToken: string;
  try {
    accessToken = await getGoogleAccessTokenForBusiness(businessId);
  } catch (error) {
    const code = error instanceof GoogleTokenVaultError ? error.code : "UNKNOWN";
    console.error(`[GOOGLE-MEET-TOKEN-UNAVAILABLE] code=${code}`);
    throw new MeetApiError("reconnect", "Google Meet access is unavailable. Sign in with Google again.");
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15_000);
  let response: Response;
  try {
    response = await fetch("https://meet.googleapis.com/v2/spaces", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({}),
      signal: controller.signal,
      cache: "no-store",
    });
  } catch {
    throw new MeetApiError("unknown", "Meet space creation outcome is unknown; review before retrying.");
  } finally {
    clearTimeout(timeout);
  }

  if (!response.ok) {
    if (response.status === 401 || response.status === 403) {
      const payload = await response.clone().json().catch(() => null) as {
        error?: {
          status?: unknown;
          errors?: Array<{ reason?: unknown }>;
          details?: Array<{ reason?: unknown }>;
        };
      } | null;
      const labels = [
        payload?.error?.status,
        ...(payload?.error?.details ?? []).map((detail) => detail.reason),
        ...(payload?.error?.errors ?? []).map((detail) => detail.reason),
      ].filter((value): value is string => typeof value === "string" && /^[A-Z0-9_]{1,64}$/.test(value));
      console.error(`[GOOGLE-MEET-AUTH-REJECTED] status=${response.status}${labels.length ? ` reason=${labels.join(",")}` : ""}`);
      throw new MeetApiError("reconnect", "Google Meet access is unavailable. Sign in with Google again.");
    }
    if (response.status >= 500) {
      throw new MeetApiError("unknown", "Meet space creation outcome is unknown; review before retrying.");
    }
    throw new MeetApiError("failed", "Google Meet could not create a space for this webinar.");
  }

  const data = await response.json().catch(() => null) as { name?: unknown; meetingUri?: unknown } | null;
  if (typeof data?.name !== "string" || typeof data.meetingUri !== "string") {
    throw new MeetApiError("unknown", "Meet space creation outcome is unknown; review before retrying.");
  }
  return { name: data.name, meetingUri: data.meetingUri };
}
