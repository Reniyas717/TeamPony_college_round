import "server-only";

import { createHash } from "node:crypto";
import { getGoogleGmailCredentialsForBusiness, GoogleTokenVaultError } from "./google-token-vault.service";
import { EmailProviderError, type WebinarEmailInput } from "./email-provider";

function cleanHeader(value: string, label: string) {
  if (/[\r\n]/.test(value)) throw new EmailProviderError("failed", `The email ${label} is invalid.`);
  return value.trim();
}

function validEmail(value: string) {
  return /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(value);
}

function encodeHeader(value: string) {
  return `=?UTF-8?B?${Buffer.from(value, "utf8").toString("base64")}?=`;
}

function encodeMimeBody(value: string) {
  return Buffer.from(value, "utf8").toString("base64").replace(/.{1,76}/g, "$&\r\n").trimEnd();
}

function createRawMessage(input: WebinarEmailInput, senderEmail: string) {
  const to = cleanHeader(input.to, "recipient");
  const sender = cleanHeader(senderEmail, "sender");
  const subject = cleanHeader(input.subject, "subject");
  if (!validEmail(to) || !validEmail(sender)) throw new EmailProviderError("failed", "The email address is invalid.");
  const boundary = `nexus-${createHash("sha256").update(input.idempotencyKey).digest("hex").slice(0, 32)}`;
  const messageId = createHash("sha256").update(input.idempotencyKey).digest("hex");
  const text = (input.text || input.html.replace(/<[^>]*>/g, " ")).replace(/\r?\n/g, "\r\n");
  const html = input.html.replace(/\r?\n/g, "\r\n");
  const message = [
    `To: <${to}>`, `From: <${sender}>`, `Subject: ${encodeHeader(subject)}`,
    `Message-ID: <${messageId}@${sender.split("@")[1]}>`, `MIME-Version: 1.0`,
    `Content-Type: multipart/alternative; boundary="${boundary}"`, "",
    `--${boundary}`, `Content-Type: text/plain; charset="UTF-8"`, `Content-Transfer-Encoding: base64`, "",
    encodeMimeBody(text), `--${boundary}`,
    `Content-Type: text/html; charset="UTF-8"`, `Content-Transfer-Encoding: base64`, "",
    encodeMimeBody(html), `--${boundary}--`, "",
  ].join("\r\n");
  return Buffer.from(message, "utf8").toString("base64url");
}

function gmailError(response: Response, payload: unknown): EmailProviderError {
  const apiError = payload && typeof payload === "object" && "error" in payload
    ? (payload as { error?: { status?: unknown; message?: unknown; errors?: Array<{ reason?: unknown }> } }).error
    : undefined;
  const reasons = (apiError?.errors ?? []).map((item) => item.reason).filter((item): item is string => typeof item === "string");
  if (response.status === 401 || reasons.includes("insufficientPermissions")) {
    return new EmailProviderError("reconnect", "Reconnect Google and grant Gmail send permission.");
  }
  if (response.status === 429 || reasons.some((reason) => /rateLimit|userRateLimit/i.test(reason))) {
    return new EmailProviderError("retryable", "Gmail is temporarily rate limiting email delivery.");
  }
  if (response.status >= 500) return new EmailProviderError("unknown", "Gmail did not confirm whether it sent the message.");
  if (reasons.includes("accessNotConfigured")) return new EmailProviderError("failed", "Enable the Gmail API in the Google Cloud project used by Nexus.");
  if (reasons.includes("dailyLimitExceeded")) return new EmailProviderError("failed", "The connected Gmail account has reached its sending limit.");
  if (response.status === 403) return new EmailProviderError("failed", "Gmail rejected the message. Check the connected account and its sending limits.");
  return new EmailProviderError("failed", "Gmail rejected the email message. Check the recipient and message fields.");
}

export async function sendGmailEmail(businessId: string, input: WebinarEmailInput) {
  let senderEmail: string;
  let accessToken: string;
  try {
    ({ senderEmail, accessToken } = await getGoogleGmailCredentialsForBusiness(businessId));
  } catch (error) {
    if (error instanceof GoogleTokenVaultError) {
      const outcome = error.code === "RECONNECT_REQUIRED" || error.code === "NOT_CONNECTED"
        ? "reconnect"
        : error.code === "PROVIDER_ERROR" ? "retryable" : "failed";
      throw new EmailProviderError(outcome, outcome === "reconnect"
        ? "Reconnect Google and grant Gmail send permission."
        : "Google email authorization is temporarily unavailable.");
    }
    throw new EmailProviderError("failed", "Google email authorization is unavailable.");
  }

  if (input.from.toLowerCase() !== senderEmail.toLowerCase()) {
    throw new EmailProviderError("failed", "This queued email belongs to a different sender. Review it and create a new message.");
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15_000);
  try {
    const response = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/messages/send", {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({ raw: createRawMessage(input, senderEmail) }),
      signal: controller.signal,
      cache: "no-store",
    });
    if (!response.ok) {
      const payload = await response.json().catch(() => null);
      console.error(`[WEBINAR-GMAIL-REJECTED] status=${response.status}`);
      throw gmailError(response, payload);
    }
    const result = await response.json().catch(() => null) as { id?: unknown } | null;
    if (typeof result?.id !== "string" || !result.id) {
      throw new EmailProviderError("unknown", "Gmail did not confirm whether it sent the message.");
    }
    return { providerId: result.id };
  } catch (error) {
    if (error instanceof EmailProviderError) throw error;
    throw new EmailProviderError("unknown", "Gmail did not confirm whether it sent the message.");
  } finally {
    clearTimeout(timeout);
  }
}
