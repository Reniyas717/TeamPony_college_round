import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

const projectRoot = join(process.cwd());

async function source(relativePath: string) {
  return readFile(join(projectRoot, relativePath), "utf8");
}

test("webinar owner services resolve the verified owner context", async () => {
  const files = [
    "services/webinar/session.service.ts",
    "services/webinar/series.service.ts",
    "services/webinar/followup.service.ts",
    "services/webinar/meet-attendance.service.ts",
  ];

  for (const file of files) {
    const content = await source(file);
    assert.match(content, /requireOwnerContext/);
    assert.doesNotMatch(content, /DEFAULT_BUSINESS_ID|memory[A-Z]\w*/);
    assert.doesNotMatch(content, /createAdminClient/);
  }
});

test("webinar lifecycle validates child ownership and preserves external review states", async () => {
  const session = await source("services/webinar/session.service.ts");
  const attendance = await source("services/webinar/meet-attendance.service.ts");
  const worker = await source("services/webinar/email-worker.service.ts");

  assert.match(session, /ensureOwnedSeries/);
  assert.match(session, /\.eq\("business_id", businessId\)\.eq\("id", seriesId\)/);
  assert.match(attendance, /\.eq\("business_id", businessId\)/);
  assert.match(attendance, /\.eq\("webinar_id", webinarId\)/);
  assert.match(attendance, /\.eq\("id", participantId\)/);
  assert.match(session, /Meet was created but could not be safely linked/);
  assert.match(worker, /webinar\.email\.needs_review/);
  assert.match(worker, /provider_accepted/);
});

test("public webinar routes keep slug/token RPC boundaries and separate consent", async () => {
  const registration = await source("app/api/public/webinars/[slug]/registrations/route.ts");
  const feedback = await source("app/api/public/webinar-feedback/[token]/route.ts");
  const publicAuditMigration = await source("supabase/migrations/20261024_atomic_webinar_public_rpc.sql");

  assert.match(registration, /register_public_webinar_attendee/);
  assert.match(registration, /p_selected_session_slugs/);
  assert.match(registration, /p_marketing_opt_in/);
  assert.doesNotMatch(registration, /action:\s*"webinar\.registration\.created"/);
  assert.match(feedback, /submit_public_webinar_feedback/);
  assert.match(feedback, /tokenHash/);
  assert.doesNotMatch(feedback, /recordWebinarAudit/);
  assert.match(publicAuditMigration, /crm\.contact\.created/);
  assert.match(publicAuditMigration, /webinar\.registration\.created/);
  assert.match(publicAuditMigration, /webinar\.feedback\.submitted/);
  assert.match(publicAuditMigration, /webinar\.feedback\.marketing_opt_in/);
});

test("manual worker requires its secret and uses a constant-time comparison", async () => {
  const route = await source("app/api/internal/webinar-work/route.ts");
  const ownerRoute = await source("app/api/webinars/work/route.ts");

  assert.match(route, /WEBINAR_WORKER_SECRET/);
  assert.match(route, /timingSafeEqual/);
  assert.match(route, /WebinarWorkRequestSchema/);
  assert.match(ownerRoute, /requireOwnerContext/);
  assert.match(ownerRoute, /processWebinarEmailOutbox/);
});

test("webinar audit adapter uses the central service and per-action allowlist", async () => {
  const audit = await source("services/webinar/audit.ts");

  assert.match(audit, /AuditService\.recordEvent/);
  assert.match(audit, /allowlistedAuditMetadata/);
  assert.match(audit, /critical: false/);
});

