import { z } from "zod";

/**
 * Valid subscription tier identifiers.
 */
export const BillingPlanIdSchema = z.enum(["starter", "growth", "enterprise"]);
export type BillingPlanId = z.infer<typeof BillingPlanIdSchema>;

/**
 * Plan specifications and usage quotas.
 */
export interface PlanSpec {
  id: BillingPlanId;
  name: string;
  tagline: string;
  priceInr: number;
  quotas: {
    crmContacts: number;
    webinarMinutes: number;
    emailsDispatched: number;
    aiOperations: number;
  };
  features: string[];
}

export const BILLING_PLANS: Record<BillingPlanId, PlanSpec> = {
  starter: {
    id: "starter",
    name: "Nexus Starter",
    tagline: "Ideal for solo founders and early-stage ventures",
    priceInr: 1999,
    quotas: {
      crmContacts: 500,
      webinarMinutes: 120,
      emailsDispatched: 1000,
      aiOperations: 500,
    },
    features: [
      "Up to 500 CRM Contacts",
      "120 Webinar Streaming Mins/mo",
      "1,000 Marketing Emails/mo",
      "500 Autonomous AI Operations",
      "1 Live Published Website",
      "Standard Community Support",
    ],
  },
  growth: {
    id: "growth",
    name: "Nexus Growth",
    tagline: "For scaling businesses automating multi-channel operations",
    priceInr: 4999,
    quotas: {
      crmContacts: 5000,
      webinarMinutes: 1200,
      emailsDispatched: 15000,
      aiOperations: 5000,
    },
    features: [
      "Up to 5,000 CRM Contacts",
      "1,200 Webinar Streaming Mins/mo",
      "15,000 Marketing Emails/mo",
      "5,000 Autonomous AI Operations",
      "Unlimited Live Published Websites",
      "Razorpay & Stripe Live Webhooks",
      "Priority 24/7 SLA Support",
    ],
  },
  enterprise: {
    id: "enterprise",
    name: "Nexus Enterprise",
    tagline: "Full-scale autonomous operating platform for large organizations",
    priceInr: 14999,
    quotas: {
      crmContacts: 50000,
      webinarMinutes: 10000,
      emailsDispatched: 100000,
      aiOperations: 50000,
    },
    features: [
      "Up to 50,000 CRM Contacts",
      "10,000 Webinar Streaming Mins/mo",
      "100,000 Marketing Emails/mo",
      "50,000 Autonomous AI Operations",
      "Custom Domain Provisioning",
      "Dedicated AI Workflow Engine",
      "Executive Account Management",
    ],
  },
};

/**
 * Subscription record representation.
 */
export interface SubscriptionRecord {
  id: string;
  business_id: string;
  plan_id: BillingPlanId;
  plan_name: string;
  status: "active" | "past_due" | "canceled" | "trialing";
  price_inr: number;
  billing_interval: "monthly" | "annual";
  current_period_start: string;
  current_period_end: string;
  razorpay_subscription_id?: string | null;
  razorpay_customer_id?: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Invoice line item and invoice representation.
 */
export interface InvoiceItem {
  description: string;
  quantity: number;
  unitPriceInr: number;
  totalInr: number;
}

export interface InvoiceRecord {
  id: string;
  business_id: string;
  invoice_number: string;
  amount_inr: number;
  currency: string;
  status: "paid" | "pending" | "failed" | "refunded";
  plan_id: string;
  description: string;
  customer_name?: string | null;
  customer_email?: string | null;
  paid_at?: string | null;
  razorpay_payment_id?: string | null;
  razorpay_order_id?: string | null;
  items: InvoiceItem[];
  created_at: string;
  updated_at: string;
}

/**
 * Usage metrics tracking.
 */
export interface UsageRecord {
  metric: "crm_contacts" | "webinar_minutes" | "emails_dispatched" | "ai_operations";
  quantity: number;
  quota: number;
  percentage: number;
}

export interface WorkspaceUsageSummary {
  period_start: string;
  period_end: string;
  metrics: {
    crm_contacts: UsageRecord;
    webinar_minutes: UsageRecord;
    emails_dispatched: UsageRecord;
    ai_operations: UsageRecord;
  };
}

/**
 * Inbound validation schemas.
 */
export const ChangePlanSchema = z.object({
  planId: BillingPlanIdSchema,
  billingInterval: z.enum(["monthly", "annual"]).optional().default("monthly"),
  razorpayPaymentId: z.string().optional(),
  razorpayOrderId: z.string().optional(),
});
export type ChangePlanInput = z.infer<typeof ChangePlanSchema>;

export const CreateInvoiceSchema = z.object({
  description: z.string().min(3, "Description must be at least 3 characters"),
  amountInr: z.number().int().positive("Amount must be positive"),
  planId: z.string().default("custom"),
  customerName: z.string().min(2, "Customer name is required"),
  customerEmail: z.string().email("Invalid email address"),
  items: z
    .array(
      z.object({
        description: z.string().min(1),
        quantity: z.number().int().positive(),
        unitPriceInr: z.number().int().positive(),
        totalInr: z.number().int().positive(),
      })
    )
    .optional(),
});
export type CreateInvoiceInput = z.infer<typeof CreateInvoiceSchema>;

export const SimulateUsageSchema = z.object({
  metric: z.enum(["crm_contacts", "webinar_minutes", "emails_dispatched", "ai_operations"]),
  increment: z.number().int().positive(),
});
export type SimulateUsageInput = z.infer<typeof SimulateUsageSchema>;

export const CreateRazorpayOrderSchema = z.object({
  planId: BillingPlanIdSchema,
  billingInterval: z.enum(["monthly", "annual"]).default("monthly"),
});
export type CreateRazorpayOrderInput = z.infer<typeof CreateRazorpayOrderSchema>;

export const VerifyRazorpayPaymentSchema = z.object({
  razorpay_order_id: z.string(),
  razorpay_payment_id: z.string(),
  razorpay_signature: z.string(),
  planId: BillingPlanIdSchema,
});
export type VerifyRazorpayPaymentInput = z.infer<typeof VerifyRazorpayPaymentSchema>;
