import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const root = process.cwd();
const authFiles = [
  "services/auth.service.ts",
  "app/auth/callback/route.ts",
  "app/api/auth/login/route.ts",
  "app/api/auth/signup/route.ts",
  "app/api/auth/session/route.ts",
];

async function source(file: string) {
  return readFile(`${root}/${file}`, "utf8");
}

test("auth paths use platform scope for unauthenticated failures", async () => {
  const [service, callback, login, signup] = await Promise.all([
    source(authFiles[0]),
    source(authFiles[1]),
    source(authFiles[2]),
    source(authFiles[3]),
  ]);
  const combined = `${service}\n${callback}\n${login}\n${signup}`;

  const defaultTenantName = ["SYSTEM", "BUSINESS_ID"].join("_");
  assert.equal(combined.includes(defaultTenantName), false);
  assert.ok(combined.includes("recordPlatformSecurityEvent"));
  assert.ok(service.includes("requireOwnerContext"));
  assert.ok(callback.includes("requireOwnerContext"));
  assert.ok(service.includes("recordBusinessEvent"));
  assert.ok(callback.includes("recordBusinessEvent"));
});

test("Google audit metadata contains provider and scope only", async () => {
  const callback = await source(authFiles[1]);
  const googleAuditBlock = callback.slice(callback.indexOf("action: googleEvent"));

  assert.match(googleAuditBlock, /provider: "google"/);
  assert.match(googleAuditBlock, /scopes: \[GOOGLE_MEET_SCOPE\]/);
  assert.doesNotMatch(googleAuditBlock, /provider_token|provider_refresh_token|access_token|refresh_token|email/);
});

test("OAuth callback does not expose provider errors or raw callback payloads", async () => {
  const callback = await source(authFiles[1]);

  assert.doesNotMatch(callback, /error\.message/);
  assert.doesNotMatch(callback, /encodeURIComponent\(error/);
  assert.match(callback, /Authentication failed\. Please try again\./);
});
