import "server-only";

export type ResendEmailInput = {
  to: string;
  from: string;
  replyTo?: string | null;
  subject: string;
  html: string;
  text?: string | null;
  idempotencyKey: string;
};

export class EmailProviderError extends Error {
  constructor(
    public readonly outcome: "retryable" | "unknown" | "failed",
    message: string,
  ) {
    super(message);
  }
}

const RESEND_URL = "https://api.resend.com/emails";

export async function sendResendEmail(input: ResendEmailInput) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    throw new EmailProviderError("failed", "Email provider is not configured.");
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10_000);

  try {
    const response = await fetch(RESEND_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "Idempotency-Key": input.idempotencyKey,
      },
      body: JSON.stringify({
        to: [input.to],
        from: input.from,
        reply_to: input.replyTo || undefined,
        subject: input.subject,
        html: input.html,
        text: input.text || undefined,
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      if (response.status === 429 || response.status >= 500) {
        throw new EmailProviderError("retryable", "Email provider temporarily unavailable.");
      }
      throw new EmailProviderError("failed", "Email provider rejected the message.");
    }

    const result = (await response.json().catch(() => null)) as { id?: unknown } | null;
    if (!result || typeof result.id !== "string" || result.id.length === 0) {
      throw new EmailProviderError("unknown", "Email provider acceptance could not be confirmed.");
    }

    return { providerId: result.id };
  } catch (error) {
    if (error instanceof EmailProviderError) throw error;
    throw new EmailProviderError("unknown", "Email provider outcome is unknown.");
  } finally {
    clearTimeout(timeout);
  }
}
