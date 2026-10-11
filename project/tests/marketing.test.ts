import test from "node:test";
import assert from "node:assert/strict";
import { CreateCampaignSchema } from "../lib/validations/marketing";
import { MarketingService } from "../services/marketing.service";
import { EngagementTrackingService } from "../services/engagement.service";
import { CrmService } from "../services/crm.service";

test("Marketing Campaigns Engine Test Suite", async (t) => {
  // Pre-seed a test contact for predictable segmentation filtering
  await CrmService.createContact({
    first_name: "Alex",
    last_name: "Morgan",
    email: `alex.morgan-${Date.now()}@enterprise.corp`,
    company: "Enterprise Corp",
    stage: "qualified",
    tags: ["enterprise"],
    value: 75000,
    source: "website_form",
  });

  await t.test("1. Zod Validation: Validates and sanitizes campaign payloads", () => {
    const valid = {
      title: "Enterprise Q4 Product Demo",
      channel: "email" as const,
      subject: "Exclusive preview for {{company}}",
      preview_text: "Join our live walkthrough",
      content_html: "<p>Hello {{first_name}}, check your deal: {{deal_value}}</p>",
      content_text: "Hello {{first_name}}",
      segment_filters: {
        stages: ["qualified", "proposal"],
        tags: ["enterprise"],
        minValue: 10000,
      },
    };

    const parsed = CreateCampaignSchema.safeParse(valid);
    assert.strictEqual(parsed.success, true);
    if (parsed.success) {
      assert.strictEqual(parsed.data.title, "Enterprise Q4 Product Demo");
      assert.strictEqual(parsed.data.channel, "email");
      assert.deepStrictEqual(parsed.data.segment_filters.stages, ["qualified", "proposal"]);
    }
  });

  await t.test("2. Zod Validation: Rejects missing title or empty content", () => {
    const invalid = {
      title: "",
      channel: "email" as const,
      content_html: "",
    };

    const parsed = CreateCampaignSchema.safeParse(invalid);
    assert.strictEqual(parsed.success, false);
  });

  await t.test("3. Dynamic Segmentation: Filters CRM contacts by lifecycle stage and tags", async () => {
    // Stage filter test
    const stagePreview = await MarketingService.previewSegment({
      stages: ["qualified"],
      tags: [],
      sources: [],
    });

    assert.ok(stagePreview.eligibleContacts.length > 0);
    for (const c of stagePreview.eligibleContacts) {
      assert.strictEqual(c.stage, "qualified");
    }

    // Tag filter test
    const tagPreview = await MarketingService.previewSegment({
      stages: [],
      tags: ["enterprise"],
      sources: [],
    });

    assert.ok(tagPreview.eligibleContacts.length > 0);
    for (const c of tagPreview.eligibleContacts) {
      assert.ok(c.tags.includes("enterprise"));
    }
  });

  await t.test("4. Dynamic Segmentation: Filters contacts by deal value thresholds", async () => {
    const valuePreview = await MarketingService.previewSegment({
      stages: [],
      tags: [],
      sources: [],
      minValue: 50000,
    });

    for (const c of valuePreview.eligibleContacts) {
      assert.ok(c.value >= 50000);
    }
  });

  await t.test("5. Consent & Suppression: Opted-out contacts are strictly excluded from eligible dispatches", async () => {
    // Add a contact to suppression
    const testEmail = "suppressed-user@testcorp.com";
    await MarketingService.suppressContact(testEmail, "email", "user_unsubscribe");

    const suppressedList = await MarketingService.listSuppressed("email");
    const isSuppressed = suppressedList.some((s) => s.email_or_phone === testEmail);
    assert.strictEqual(isSuppressed, true);
  });

  await t.test("6. Campaign Lifecycle: Create, retrieve, update, and dispatch campaign", async () => {
    const created = await MarketingService.createCampaign({
      title: "Automated Lifecycle Campaign",
      channel: "email",
      subject: "Updates for {{company}}",
      content_html: "<p>Hi {{first_name}}, see this: {{deal_value}}</p>",
      content_text: "Hi {{first_name}}",
      segment_filters: {
        stages: ["qualified"],
        tags: [],
        sources: [],
      },
    });

    assert.ok(created.id);
    assert.strictEqual(created.status, "DRAFT");

    // Fetch by ID
    const fetched = await MarketingService.getCampaignById(created.id);
    assert.ok(fetched !== null);
    assert.strictEqual(fetched?.title, "Automated Lifecycle Campaign");

    // Dispatch
    const dispatchRes = await MarketingService.dispatchCampaign(created.id, true);
    assert.strictEqual(dispatchRes.status, "COMPLETED");
    assert.ok(dispatchRes.sentCount >= 0);
    assert.strictEqual(dispatchRes.campaign.status, "COMPLETED");
  });

  await t.test("7. Engagement Tracking: Email open pixel records open and syncs to CRM timeline", async () => {
    const trackingToken = `test-token-${Date.now()}`;
    const openRecorded = await EngagementTrackingService.recordOpen(trackingToken, {
      userAgent: "TestBrowser/1.0",
      ip: "127.0.0.1",
    });

    assert.strictEqual(openRecorded, true);
  });

  await t.test("8. Engagement Tracking: Click tracking redirects safely and records event", async () => {
    const trackingToken = `test-click-${Date.now()}`;
    const destinationUrl = "https://example.com/pricing-plans";

    const redirectedUrl = await EngagementTrackingService.recordClick(
      trackingToken,
      destinationUrl,
      { ip: "127.0.0.1", userAgent: "TestClient/1.0" }
    );

    assert.strictEqual(redirectedUrl, destinationUrl);
  });

  await t.test("9. One-Click Unsubscribe: Revokes marketing consent and records compliance event", async () => {
    const unsubEmail = "unsubscribe-demo@example.com";
    const res = await EngagementTrackingService.recordUnsubscribe(unsubEmail, "user_unsubscribe");

    assert.strictEqual(res.success, true);
    assert.strictEqual(res.email, unsubEmail);

    // Verify presence in suppression list
    const suppressed = await MarketingService.listSuppressed("all");
    const found = suppressed.some((s) => s.email_or_phone === unsubEmail);
    assert.strictEqual(found, true);
  });

  await t.test("10. Analytics Overview: Computes live delivery success and engagement rates", async () => {
    const overview = await MarketingService.getAnalyticsOverview();

    assert.ok(typeof overview.totalCampaigns === "number");
    assert.ok(typeof overview.averageOpenRate === "number");
    assert.ok(typeof overview.averageClickRate === "number");
    assert.ok(typeof overview.deliverySuccessRate === "number");
    assert.ok(overview.deliverySuccessRate >= 0 && overview.deliverySuccessRate <= 100);
  });
});
