import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

test("CRM migration keeps writes inside owner transaction seams", () => {
  const service = readFileSync(new URL("../services/crm.service.ts", import.meta.url), "utf8");
  const migration = readFileSync(
    new URL("../supabase/migrations/20261020_tenant_isolation_compatibility.sql", import.meta.url),
    "utf8",
  );
  const laterMigration = readFileSync(
    new URL("../supabase/migrations/20261021_atomic_crm_journey_rpc.sql", import.meta.url),
    "utf8",
  );
  const auditActions = readFileSync(new URL("../lib/validations/audit-actions.ts", import.meta.url), "utf8");

  assert.equal(service.includes("AuditService"), false);
  assert.equal(/\.from\("crm_(contacts|activities)"\)[\s\S]{0,120}\.(insert|update|delete)/.test(service), false);
  for (const name of [
    "create_crm_contact_transaction",
    "update_crm_contact_transaction",
    "delete_crm_contact_transaction",
    "create_crm_activity_transaction",
    "update_crm_activity_transaction",
    "delete_crm_activity_transaction",
  ]) {
    assert.match(laterMigration, new RegExp(`CREATE OR REPLACE FUNCTION public\\.${name}`));
    assert.match(laterMigration, new RegExp(`${name}[\\s\\S]{0,12000}record_audit_log_tx`));
  }
  assert.match(migration, /CREATE POLICY "Owners can manage CRM contacts"/);
  assert.match(migration, /CREATE POLICY "Owners can manage CRM activities"/);
  assert.match(laterMigration, /REVOKE INSERT, UPDATE, DELETE ON TABLE[\s\S]{0,180}public\.crm_contacts/);
  assert.match(laterMigration, /REVOKE INSERT, UPDATE, DELETE ON TABLE[\s\S]{0,180}public\.crm_activities/);

  for (const name of [
    "create_crm_contact_transaction",
    "update_crm_contact_transaction",
    "delete_crm_contact_transaction",
    "create_crm_activity_transaction",
    "update_crm_activity_transaction",
    "delete_crm_activity_transaction",
  ]) {
    assert.match(laterMigration, new RegExp(`REVOKE ALL ON FUNCTION public\\.${name}`));
    assert.match(laterMigration, new RegExp(`GRANT EXECUTE ON FUNCTION public\\.${name}`));
  }
  assert.match(laterMigration, /nexus_atomic_owner_business_id\(\) FROM PUBLIC, anon, authenticated, service_role/);
  assert.match(laterMigration, /'webinar\.notification\.queued'/);
  assert.match(laterMigration, /WEBINAR_REGISTRATION_NOT_OWNED/);
  assert.match(laterMigration, /WEBINAR_WORKER_BATCH_NOT_OWNED/);
  assert.match(laterMigration, /WEBINAR_WORKER_JOB_NOT_OWNED/);
  assert.match(laterMigration, /generate_customer_journey_map_transaction/);
  assert.match(service, /create_crm_contact_transaction/);
  assert.match(service, /update_crm_contact_transaction/);
  assert.match(service, /delete_crm_contact_transaction/);
  assert.match(service, /create_crm_activity_transaction/);

  const actionNames = new Set(
    [...auditActions.matchAll(/"([a-z]+\.[a-z0-9_.]+)"/g)].map((match) => match[1]),
  );
  assert.equal(actionNames.size, 84);
  assert.match(auditActions, /crm\.activity\.updated/);
  assert.match(auditActions, /crm\.activity\.deleted/);
});
