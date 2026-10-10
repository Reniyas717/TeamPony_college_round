import test from "node:test";
import assert from "node:assert/strict";
import crypto from "crypto";
import {
  BILLING_PLANS,
  ChangePlanSchema,
  CreateInvoiceSchema,
  SimulateUsageSchema,
  VerifyRazorpayPaymentSchema,
} from "../lib/validations/billing";
import { BillingService } from "../services/billing.service";

test("Nexus Operational SaaS Billing & Usage-Based Pricing Test Suite", async (t) => {
  const testBusinessId = "00000000-0000-0000-0000-000000000001";

  await t.test("1. Tier definitions adhere to specified INR pricing and quotas", () => {
    assert.strictEqual(BILLING_PLANS.starter.priceInr, 1999);
    assert.strictEqual(BILLING_PLANS.growth.priceInr, 4999);
    assert.strictEqual(BILLING_PLANS.enterprise.priceInr, 14999);

    assert.strictEqual(BILLING_PLANS.starter.quotas.crmContacts, 500);
    assert.strictEqual(BILLING_PLANS.growth.quotas.crmContacts, 5000);
    assert.strictEqual(BILLING_PLANS.enterprise.quotas.crmContacts, 50000);
  });

  await t.test("2. ChangePlanSchema rejects invalid tiers and validates correct payloads", () => {
    const valid = ChangePlanSchema.safeParse({ planId: "enterprise" });
    assert.ok(valid.success);
    assert.strictEqual(valid.data?.planId, "enterprise");

    const invalid = ChangePlanSchema.safeParse({ planId: "infinite_tier" });
    assert.strictEqual(invalid.success, false);
  });

  await t.test("3. BillingService retrieves subscription and defaults to active growth plan", async () => {
    const sub = await BillingService.getSubscription(testBusinessId);
    assert.ok(sub);
    assert.strictEqual(sub.business_id, testBusinessId);
    assert.strictEqual(sub.status, "active");
  });

  await t.test("4. Upgrading subscription generates paid invoice and updates tier", async () => {
    const { subscription, invoice } = await BillingService.changePlan(
      testBusinessId,
      "enterprise",
      {
        razorpayPaymentId: "pay_test_enterprise_001",
        razorpayOrderId: "order_test_enterprise_001",
      }
    );

    assert.strictEqual(subscription.plan_id, "enterprise");
    assert.strictEqual(subscription.price_inr, 14999);
    assert.strictEqual(invoice.amount_inr, 14999);
    assert.strictEqual(invoice.status, "paid");
    assert.ok(invoice.invoice_number.startsWith("INV-"));
  });

  await t.test("5. Real-time usage calculation meters against active quotas", async () => {
    const usage = await BillingService.getUsage(testBusinessId);
    assert.ok(usage.metrics.crm_contacts);
    assert.ok(usage.metrics.webinar_minutes);
    assert.ok(usage.metrics.emails_dispatched);
    assert.ok(usage.metrics.ai_operations);

    // Current plan is enterprise (quota: 50,000)
    assert.strictEqual(usage.metrics.crm_contacts.quota, 50000);
  });

  await t.test("6. Simulating usage surge updates meter consumption and percentages", async () => {
    const before = await BillingService.getUsage(testBusinessId);
    const beforeContacts = before.metrics.crm_contacts.quantity;

    const after = await BillingService.simulateUsage(testBusinessId, "crm_contacts", 100);
    assert.strictEqual(after.metrics.crm_contacts.quantity, beforeContacts + 100);
  });

  await t.test("7. Custom invoice creation validates line items and records invoice", async () => {
    const newInvoice = await BillingService.createInvoice(testBusinessId, {
      customerName: "Rohan Verma",
      customerEmail: "rohan@enterprise.in",
      description: "Dedicated Dedicated AI Node Setup",
      amountInr: 25000,
      planId: "custom",
    });

    assert.ok(newInvoice.id);
    assert.strictEqual(newInvoice.amount_inr, 25000);
    assert.strictEqual(newInvoice.customer_name, "Rohan Verma");
    assert.strictEqual(newInvoice.status, "paid");

    const allInvoices = await BillingService.listInvoices(testBusinessId);
    assert.ok(allInvoices.some((inv) => inv.id === newInvoice.id));
  });

  await t.test("8. HTML invoice generator renders valid document with print styles", async () => {
    const invoice = (await BillingService.listInvoices(testBusinessId))[0];
    const html = BillingService.renderInvoiceHtml(invoice);

    assert.ok(html.includes("<!DOCTYPE html>"));
    assert.ok(html.includes(invoice.invoice_number));
    assert.ok(html.includes("Nexus"));
    assert.ok(html.includes("window.print()"));
  });

  await t.test("9. Razorpay HMAC verification validates signed webhooks / payments", async () => {
    const secret = "MFEdDJix8jHvUppKU3hOzqh7";
    const orderId = "order_rzp_9812";
    const paymentId = "pay_rzp_4410";
    const signature = crypto
      .createHmac("sha256", secret)
      .update(`${orderId}|${paymentId}`)
      .digest("hex");

    const parsed = VerifyRazorpayPaymentSchema.safeParse({
      razorpay_order_id: orderId,
      razorpay_payment_id: paymentId,
      razorpay_signature: signature,
      planId: "growth",
    });

    assert.ok(parsed.success);

    const result = await BillingService.verifyRazorpayPayment(testBusinessId, parsed.data);
    assert.strictEqual(result.subscription.plan_id, "growth");
    assert.strictEqual(result.invoice.razorpay_payment_id, paymentId);
  });
});
