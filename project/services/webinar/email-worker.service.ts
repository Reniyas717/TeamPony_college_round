import "server-only";

import { randomUUID } from "node:crypto";

import { createAdminClient } from "@/lib/supabase/server";

import { EmailProviderError, sendResendEmail } from "./email-provider";
import { recordWebinarAudit } from "./audit";

type EmailOutboxJob = {
  id: string;
  business_id: string;
  webinar_id: string;
  to_email: string;
  from_email: string;
  reply_to_email: string | null;
  subject: string;
  html_body: string;
  text_body: string | null;
  idempotency_key: string;
  kind: string;
};

export type EmailWorkerSummary = {
  claimed: number;
  provider_accepted: number;
  failed: number;
  unknown: number;
  finalization_failed: number;
  blocked: number;
};

export class EmailWorkerError extends Error {}

const MAX_BATCH_SIZE = 50;
const LEASE_SECONDS = 300;

async function markFailed(
  admin: ReturnType<typeof createAdminClient>,
  job: EmailOutboxJob,
  workerId: string,
  error: EmailProviderError,
) {
  const { data, error: databaseError } = await admin.rpc("mark_webinar_email_failed", {
    p_job_id: job.id,
    p_worker_id: workerId,
    p_safe_error: error.message,
    p_retryable: error.outcome === "retryable",
  });
  if (databaseError || data !== true) throw new EmailWorkerError("Could not persist email failure state.");
}

async function markUnknown(
  admin: ReturnType<typeof createAdminClient>,
  job: EmailOutboxJob,
  workerId: string,
  error: EmailProviderError,
) {
  const { data, error: databaseError } = await admin.rpc("mark_webinar_email_unknown", {
    p_job_id: job.id,
    p_worker_id: workerId,
    p_safe_error: error.message,
  });
  if (databaseError || data !== true) throw new EmailWorkerError("Could not persist unknown email state.");
}

export async function processWebinarEmailOutbox(batchSize: number, businessId?: string): Promise<EmailWorkerSummary> {
  const boundedBatchSize = Math.min(Math.max(Math.trunc(batchSize), 1), MAX_BATCH_SIZE);
  const workerId = randomUUID();
  const admin = createAdminClient();
  const claimRpc = businessId ? "claim_webinar_email_jobs_for_business" : "claim_webinar_email_jobs";
  const { data, error } = await admin.rpc(claimRpc, {
    ...(businessId ? { p_business_id: businessId } : {}),
    p_worker_id: workerId,
    p_limit: boundedBatchSize,
    p_lease_seconds: LEASE_SECONDS,
  });

  if (error) throw new EmailWorkerError("Could not claim webinar email jobs.");

  const jobs = (data ?? []) as EmailOutboxJob[];
  const summary: EmailWorkerSummary = {
    claimed: jobs.length,
    provider_accepted: 0,
    failed: 0,
    unknown: 0,
    finalization_failed: 0,
    blocked: 0,
  };

  const jobsByWebinar = new Map<string, EmailOutboxJob[]>();
  for (const job of jobs) {
    const key = `${job.business_id}:${job.webinar_id}`;
    jobsByWebinar.set(key, [...(jobsByWebinar.get(key) ?? []), job]);
  }
  for (const groupedJobs of jobsByWebinar.values()) {
    const first = groupedJobs[0];
    await recordWebinarAudit({ businessId: first.business_id }, {
      action: "webinar.email.processing_started", resourceType: "webinar", resourceId: first.webinar_id,
      actorId: "webinar.manual-worker", actorType: "system",
      client: admin,
      metadata: { webinar_id: first.webinar_id, operation_id: workerId, job_count: groupedJobs.length },
    });
  }

  for (const job of jobs) {
    try {
      if (job.kind === "followup_attendee" || job.kind === "followup_no_show") {
        const { data: eligible, error: eligibilityError } = await admin.rpc("validate_webinar_followup_email", { p_job_id: job.id });
        if (eligibilityError) throw new EmailWorkerError("Could not verify follow-up approval.");
        if (eligible !== true) {
          const { data: blocked, error: blockError } = await admin.rpc("mark_webinar_email_blocked", { p_job_id: job.id, p_worker_id: workerId });
          if (blockError || blocked !== true) summary.finalization_failed += 1;
          else summary.blocked += 1;
          continue;
        }
      }
      const result = await sendResendEmail({
        to: job.to_email,
        from: job.from_email,
        replyTo: job.reply_to_email,
        subject: job.subject,
        html: job.html_body,
        text: job.text_body,
        idempotencyKey: job.idempotency_key,
      });

      const { data: accepted, error: databaseError } = await admin.rpc(
        "mark_webinar_email_provider_accepted",
        {
          p_job_id: job.id,
          p_worker_id: workerId,
          p_provider_id: result.providerId,
        },
      );
      if (databaseError || accepted !== true) {
        summary.finalization_failed += 1;
        await recordWebinarAudit({ businessId: job.business_id }, {
          action: "webinar.email.needs_review", resourceType: "webinar_email", resourceId: job.id,
          actorId: "webinar.manual-worker", actorType: "system", outcome: "failure",
          client: admin,
          metadata: { webinar_id: job.webinar_id, operation_id: workerId, job_id: job.id, provider: "resend", reason_code: "LOCAL_FINALIZATION_FAILED" },
          error: { code: "LOCAL_FINALIZATION_FAILED", message: "Provider accepted the email but local finalization failed." },
        });
        continue;
      }
      summary.provider_accepted += 1;
      await recordWebinarAudit({ businessId: job.business_id }, {
        action: "webinar.email.provider_accepted", resourceType: "webinar_email", resourceId: job.id,
        actorId: "webinar.manual-worker", actorType: "system",
        client: admin,
        metadata: { webinar_id: job.webinar_id, operation_id: workerId, job_id: job.id, provider: "resend" },
      });
    } catch (error) {
      const providerError = error instanceof EmailProviderError
        ? error
        : new EmailProviderError("unknown", "Email provider outcome is unknown.");

      try {
        if (providerError.outcome === "unknown") {
          await markUnknown(admin, job, workerId, providerError);
          summary.unknown += 1;
          await recordWebinarAudit({ businessId: job.business_id }, {
            action: "webinar.email.needs_review", resourceType: "webinar_email", resourceId: job.id,
            actorId: "webinar.manual-worker", actorType: "system", outcome: "failure",
            client: admin,
            metadata: { webinar_id: job.webinar_id, operation_id: workerId, job_id: job.id, provider: "resend", reason_code: "PROVIDER_OUTCOME_UNKNOWN" },
            error: { code: "PROVIDER_OUTCOME_UNKNOWN", message: providerError.message },
          });
        } else {
          await markFailed(admin, job, workerId, providerError);
          summary.failed += 1;
          await recordWebinarAudit({ businessId: job.business_id }, {
            action: "webinar.email.failed", resourceType: "webinar_email", resourceId: job.id,
            actorId: "webinar.manual-worker", actorType: "system", outcome: "failure",
            client: admin,
            metadata: { webinar_id: job.webinar_id, operation_id: workerId, job_id: job.id, provider: "resend", reason_code: providerError.outcome },
            error: { code: "PROVIDER_SEND_FAILED", message: providerError.message },
          });
        }
      } catch {
        summary.finalization_failed += 1;
      }
    }
  }

  return summary;
}
