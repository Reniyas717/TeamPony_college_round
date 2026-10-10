import "server-only";

export type WebinarEmailInput = {
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
    public readonly outcome: "retryable" | "unknown" | "failed" | "reconnect",
    message: string,
  ) {
    super(message);
  }
}
