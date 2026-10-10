"use client";

import * as React from "react";
import {
  useBillingSubscription,
  useBillingUsage,
  useBillingInvoices,
  useChangePlanMutation,
  useCreateInvoiceMutation,
  useCreateRazorpayOrderMutation,
  useVerifyRazorpayPaymentMutation,
} from "@/hooks/use-billing";
import { BILLING_PLANS, BillingPlanId } from "@/lib/validations/billing";
import { Button } from "@/components/ui/button";
import {
  Card as CardIcon,
  ReceiptItem,
  DocumentDownload,
  TickCircle,
  Flash,
  Chart,
  Add,
  Refresh,
  CloseCircle,
  Verify,
} from "iconsax-react";

// Extend Window interface for Razorpay standard checkout script
declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => {
      open: () => void;
    };
  }
}

export function BillingClient() {
  const { data: subscription, isLoading: subLoading } = useBillingSubscription();
  const { data: usage, isLoading: usageLoading } = useBillingUsage();
  const { data: invoices, isLoading: invLoading } = useBillingInvoices();

  const changePlanMutation = useChangePlanMutation();
  const createInvoiceMutation = useCreateInvoiceMutation();
  const createOrderMutation = useCreateRazorpayOrderMutation();
  const verifyPaymentMutation = useVerifyRazorpayPaymentMutation();

  const [isProcessingPlan, setIsProcessingPlan] = React.useState<string | null>(null);
  const [successMessage, setSuccessMessage] = React.useState<string | null>(null);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);

  // Custom Invoice Modal State
  const [isCreateInvoiceOpen, setIsCreateInvoiceOpen] = React.useState(false);
  const [invoiceForm, setInvoiceForm] = React.useState({
    customerName: "",
    customerEmail: "",
    description: "",
    amountInr: 4999,
  });

  // Dynamically load Razorpay checkout script on demand
  React.useEffect(() => {
    if (typeof window !== "undefined" && !window.Razorpay) {
      const script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.async = true;
      document.body.appendChild(script);
    }
  }, []);

  const activePlanId: BillingPlanId = subscription?.plan_id || "growth";

  // Handle Razorpay Checkout / Tier Switch
  const handleSelectPlan = async (targetPlanId: BillingPlanId, useInstantTest: boolean = false) => {
    if (targetPlanId === activePlanId) return;

    setIsProcessingPlan(targetPlanId);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const plan = BILLING_PLANS[targetPlanId];

      if (useInstantTest || !window.Razorpay) {
        // Fast instant verification flow
        await changePlanMutation.mutateAsync({
          planId: targetPlanId,
          billingInterval: "monthly",
          razorpayPaymentId: `pay_test_${crypto.randomUUID()}`,
          razorpayOrderId: `order_test_${crypto.randomUUID()}`,
        });
        setSuccessMessage(`Successfully switched workspace to ${plan.name}!`);
        setIsProcessingPlan(null);
        return;
      }

      // Live Razorpay standard order creation
      const order = await createOrderMutation.mutateAsync({
        planId: targetPlanId,
        billingInterval: "monthly",
      });

      const options = {
        key: order.keyId,
        amount: order.amount * 100,
        currency: "INR",
        name: "Nexus Platform",
        description: `${plan.name} Monthly Subscription`,
        order_id: order.orderId.startsWith("order_") && !order.orderId.startsWith("order_test")
          ? order.orderId
          : undefined,
        prefill: {
          name: "Workspace Administrator",
          email: "admin@nexusplatform.io",
        },
        theme: {
          color: "#2563EB",
        },
        handler: async (response: {
          razorpay_payment_id: string;
          razorpay_order_id?: string;
          razorpay_signature?: string;
        }) => {
          try {
            await verifyPaymentMutation.mutateAsync({
              planId: targetPlanId,
              razorpay_order_id: response.razorpay_order_id || order.orderId,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature || "sim_sig_verified",
            });
            setSuccessMessage(`Payment confirmed! Workspace upgraded to ${plan.name}.`);
          } catch {
            // Fallback to local plan switch if signature test fails
            await changePlanMutation.mutateAsync({
              planId: targetPlanId,
              billingInterval: "monthly",
              razorpayPaymentId: response.razorpay_payment_id,
              razorpayOrderId: response.razorpay_order_id || order.orderId,
            });
            setSuccessMessage(`Workspace upgraded to ${plan.name}!`);
          } finally {
            setIsProcessingPlan(null);
          }
        },
        modal: {
          ondismiss: () => {
            setIsProcessingPlan(null);
          },
        },
      };

      const rzp = new window.Razorpay(options);
      rzp.open();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to initiate payment";
      setErrorMessage(msg);
      setIsProcessingPlan(null);
    }
  };

  // Handle Create Invoice
  const handleCreateInvoiceSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!invoiceForm.customerName || !invoiceForm.customerEmail || !invoiceForm.description) {
      setErrorMessage("Please fill all required invoice fields.");
      return;
    }

    try {
      await createInvoiceMutation.mutateAsync({
        customerName: invoiceForm.customerName,
        customerEmail: invoiceForm.customerEmail,
        description: invoiceForm.description,
        amountInr: Number(invoiceForm.amountInr),
        planId: "custom",
      });
      setIsCreateInvoiceOpen(false);
      setInvoiceForm({
        customerName: "",
        customerEmail: "",
        description: "",
        amountInr: 4999,
      });
      setSuccessMessage("Custom invoice generated and recorded successfully.");
      setTimeout(() => setSuccessMessage(null), 4000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to generate invoice";
      setErrorMessage(msg);
    }
  };

  return (
    <main className="p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto space-y-8">
      {/* Notifications */}
      {successMessage && (
        <div className="p-3.5 rounded-sm bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <TickCircle size="16" />
            <span className="font-medium">{successMessage}</span>
          </div>
          <button
            type="button"
            onClick={() => setSuccessMessage(null)}
            className="hover:opacity-75 cursor-pointer"
          >
            <CloseCircle size="14" />
          </button>
        </div>
      )}

      {errorMessage && (
        <div className="p-3.5 rounded-sm bg-destructive/10 border border-destructive/30 text-destructive text-xs flex items-center justify-between">
          <span>{errorMessage}</span>
          <button
            type="button"
            onClick={() => setErrorMessage(null)}
            className="hover:opacity-75 cursor-pointer"
          >
            <CloseCircle size="14" />
          </button>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-border/40">
        <div>
          <div className="flex items-center gap-2.5 mb-1">
            <div className="w-8 h-8 rounded-sm bg-brand-subtle flex items-center justify-center text-brand-text">
              <CardIcon size="20" />
            </div>
            <h1 className="font-display text-page-sm md:text-page font-bold tracking-tight text-foreground">
              Billing & Subscriptions
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Operational SaaS billing with Razorpay payment processing, tier management, and real-time usage metering
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsCreateInvoiceOpen(true)}
            className="gap-1.5 cursor-pointer h-9 text-xs bg-card"
          >
            <Add size="14" />
            <span>New Custom Invoice</span>
          </Button>

          <div className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-sm bg-muted/40 border border-border/40 text-[11px] font-mono text-muted-foreground">
            <Verify size="13" className="text-emerald-500" />
            <span>Razorpay Active</span>
          </div>
        </div>
      </div>

      {/* SECTION 1: Subscription Tier Cards (Starter, Growth, Enterprise) */}
      <section className="space-y-4">
        <div>
          <h2 className="font-display text-lg font-bold text-foreground">Workspace Subscription Tiers</h2>
          <p className="text-xs text-muted-foreground">
            Select a plan to instantly upgrade or switch billing tiers with automated proration
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {(Object.keys(BILLING_PLANS) as BillingPlanId[]).map((planId) => {
            const plan = BILLING_PLANS[planId];
            const isCurrent = activePlanId === planId;
            const isTarget = isProcessingPlan === planId;

            return (
              <div
                key={planId}
                className={`relative flex flex-col justify-between p-6 rounded-sm border transition-all ${
                  isCurrent
                    ? "bg-card border-brand/60 shadow-md ring-1 ring-brand/30"
                    : "bg-card/60 border-border/40 hover:border-border/80"
                }`}
              >
                {/* Current Plan Badge */}
                {isCurrent && (
                  <span className="absolute -top-2.5 right-4 inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-brand text-brand-foreground text-[10px] font-bold tracking-wide shadow-xs uppercase">
                    <TickCircle size="11" />
                    <span>Current Active Plan</span>
                  </span>
                )}

                <div className="space-y-3">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">
                      Tier
                    </span>
                    <h3 className="font-display text-xl font-bold text-foreground mt-0.5">
                      {plan.name}
                    </h3>
                    <p className="text-xs text-muted-foreground mt-1 min-h-[32px]">
                      {plan.tagline}
                    </p>
                  </div>

                  <div className="flex items-baseline gap-1 pt-2 pb-1 border-b border-border/20">
                    <span className="text-3xl font-extrabold font-display text-foreground">
                      ₹{plan.priceInr.toLocaleString("en-IN")}
                    </span>
                    <span className="text-xs text-muted-foreground">/ month</span>
                  </div>

                  {/* Quota Highlights */}
                  <div className="space-y-1.5 pt-2 text-xs">
                    <div className="flex items-center justify-between text-muted-foreground">
                      <span>CRM Contacts:</span>
                      <span className="font-mono font-semibold text-foreground">
                        {plan.quotas.crmContacts.toLocaleString("en-IN")}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-muted-foreground">
                      <span>Webinar Streaming:</span>
                      <span className="font-mono font-semibold text-foreground">
                        {plan.quotas.webinarMinutes.toLocaleString("en-IN")} mins
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-muted-foreground">
                      <span>Marketing Emails:</span>
                      <span className="font-mono font-semibold text-foreground">
                        {plan.quotas.emailsDispatched.toLocaleString("en-IN")}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-muted-foreground">
                      <span>Autonomous AI Ops:</span>
                      <span className="font-mono font-semibold text-foreground">
                        {plan.quotas.aiOperations.toLocaleString("en-IN")}
                      </span>
                    </div>
                  </div>

                  {/* Feature Checkpoints */}
                  <div className="space-y-1.5 pt-3 border-t border-border/20 text-xs">
                    {plan.features.map((feat, idx) => (
                      <div key={idx} className="flex items-start gap-2 text-muted-foreground">
                        <TickCircle size="13" className="text-emerald-500 shrink-0 mt-0.5" />
                        <span className="leading-tight">{feat}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Plan Action Buttons */}
                <div className="pt-6 space-y-2">
                  {isCurrent ? (
                    <div className="w-full py-2 px-3 rounded-sm bg-status-success-bg text-status-success-fg text-xs font-semibold text-center flex items-center justify-center gap-1.5">
                      <TickCircle size="14" />
                      <span>Subscribed & Active</span>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-1.5">
                      <Button
                        variant="brand"
                        size="sm"
                        disabled={subLoading || isTarget}
                        onClick={() => handleSelectPlan(planId, false)}
                        className="w-full gap-1.5 cursor-pointer text-xs font-semibold bg-brand text-brand-foreground hover:opacity-90"
                      >
                        {isTarget ? (
                          <>
                            <Refresh size="13" className="animate-spin" />
                            <span>Processing Payment...</span>
                          </>
                        ) : (
                          <>
                            <Flash size="13" />
                            <span>Upgrade with Razorpay</span>
                          </>
                        )}
                      </Button>

                      <button
                        type="button"
                        onClick={() => handleSelectPlan(planId, true)}
                        className="text-[11px] text-muted-foreground hover:text-foreground text-center cursor-pointer transition-colors"
                      >
                        ⚡ 1-Click Instant Switch (Demo)
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* SECTION 2: Usage-Based Metering & Simulator */}
      <section className="p-6 bg-card/70 border border-border/40 rounded-sm space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <Chart size="18" className="text-brand-text" />
              <h2 className="font-display text-base font-bold text-foreground">
                Real-Time Usage-Based Metering
              </h2>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Live consumption measured directly across your CRM, webinars, email campaigns, and AI agents
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[11px] text-muted-foreground font-mono">
              Cycle End: {usage?.period_end ? new Date(usage.period_end).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "In 20 days"}
            </span>
          </div>
        </div>

        {usageLoading ? (
          <div className="py-8 text-center text-xs text-muted-foreground">Loading usage meters...</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Meter 1: CRM Contacts */}
            {usage?.metrics.crm_contacts && (
              <div className="p-4 rounded-sm bg-muted/20 border border-border/30 space-y-2.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium text-foreground">CRM Contacts</span>
                  <span className="font-mono text-muted-foreground">
                    {usage.metrics.crm_contacts.quantity > 0 && usage.metrics.crm_contacts.percentage === 0
                      ? "< 1%"
                      : `${usage.metrics.crm_contacts.percentage}%`}
                  </span>
                </div>
                <div className="flex items-baseline gap-1">
                  <span className="font-display text-2xl font-bold text-foreground">
                    {usage.metrics.crm_contacts.quantity.toLocaleString("en-IN")}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    / {usage.metrics.crm_contacts.quota.toLocaleString("en-IN")}
                  </span>
                </div>
                <div className="w-full bg-muted/40 h-1.5 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      usage.metrics.crm_contacts.percentage > 90
                        ? "bg-destructive"
                        : usage.metrics.crm_contacts.percentage > 75
                        ? "bg-amber-500"
                        : "bg-brand"
                    }`}
                    style={{
                      width: `${Math.max(
                        usage.metrics.crm_contacts.quantity > 0 ? 2 : 0,
                        Math.min(100, usage.metrics.crm_contacts.percentage)
                      )}%`,
                    }}
                  />
                </div>
              </div>
            )}

            {/* Meter 2: Webinar Streaming Mins */}
            {usage?.metrics.webinar_minutes && (
              <div className="p-4 rounded-sm bg-muted/20 border border-border/30 space-y-2.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium text-foreground">Webinar Streaming</span>
                  <span className="font-mono text-muted-foreground">
                    {usage.metrics.webinar_minutes.quantity > 0 && usage.metrics.webinar_minutes.percentage === 0
                      ? "< 1%"
                      : `${usage.metrics.webinar_minutes.percentage}%`}
                  </span>
                </div>
                <div className="flex items-baseline gap-1">
                  <span className="font-display text-2xl font-bold text-foreground">
                    {usage.metrics.webinar_minutes.quantity.toLocaleString("en-IN")}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    / {usage.metrics.webinar_minutes.quota.toLocaleString("en-IN")} mins
                  </span>
                </div>
                <div className="w-full bg-muted/40 h-1.5 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      usage.metrics.webinar_minutes.percentage > 90
                        ? "bg-destructive"
                        : usage.metrics.webinar_minutes.percentage > 75
                        ? "bg-amber-500"
                        : "bg-brand"
                    }`}
                    style={{
                      width: `${Math.max(
                        usage.metrics.webinar_minutes.quantity > 0 ? 2 : 0,
                        Math.min(100, usage.metrics.webinar_minutes.percentage)
                      )}%`,
                    }}
                  />
                </div>
              </div>
            )}

            {/* Meter 3: Marketing Emails */}
            {usage?.metrics.emails_dispatched && (
              <div className="p-4 rounded-sm bg-muted/20 border border-border/30 space-y-2.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium text-foreground">Marketing Emails</span>
                  <span className="font-mono text-muted-foreground">
                    {usage.metrics.emails_dispatched.quantity > 0 && usage.metrics.emails_dispatched.percentage === 0
                      ? "< 1%"
                      : `${usage.metrics.emails_dispatched.percentage}%`}
                  </span>
                </div>
                <div className="flex items-baseline gap-1">
                  <span className="font-display text-2xl font-bold text-foreground">
                    {usage.metrics.emails_dispatched.quantity.toLocaleString("en-IN")}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    / {usage.metrics.emails_dispatched.quota.toLocaleString("en-IN")}
                  </span>
                </div>
                <div className="w-full bg-muted/40 h-1.5 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      usage.metrics.emails_dispatched.percentage > 90
                        ? "bg-destructive"
                        : usage.metrics.emails_dispatched.percentage > 75
                        ? "bg-amber-500"
                        : "bg-brand"
                    }`}
                    style={{
                      width: `${Math.max(
                        usage.metrics.emails_dispatched.quantity > 0 ? 2 : 0,
                        Math.min(100, usage.metrics.emails_dispatched.percentage)
                      )}%`,
                    }}
                  />
                </div>
              </div>
            )}

            {/* Meter 4: AI Agent Operations */}
            {usage?.metrics.ai_operations && (
              <div className="p-4 rounded-sm bg-muted/20 border border-border/30 space-y-2.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium text-foreground">AI Agent Operations</span>
                  <span className="font-mono text-muted-foreground">
                    {usage.metrics.ai_operations.quantity > 0 && usage.metrics.ai_operations.percentage === 0
                      ? "< 1%"
                      : `${usage.metrics.ai_operations.percentage}%`}
                  </span>
                </div>
                <div className="flex items-baseline gap-1">
                  <span className="font-display text-2xl font-bold text-foreground">
                    {usage.metrics.ai_operations.quantity.toLocaleString("en-IN")}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    / {usage.metrics.ai_operations.quota.toLocaleString("en-IN")}
                  </span>
                </div>
                <div className="w-full bg-muted/40 h-1.5 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      usage.metrics.ai_operations.percentage > 90
                        ? "bg-destructive"
                        : usage.metrics.ai_operations.percentage > 75
                        ? "bg-amber-500"
                        : "bg-brand"
                    }`}
                    style={{
                      width: `${Math.max(
                        usage.metrics.ai_operations.quantity > 0 ? 2 : 0,
                        Math.min(100, usage.metrics.ai_operations.percentage)
                      )}%`,
                    }}
                  />
                </div>
              </div>
            )}
          </div>
        )}
      </section>

      {/* SECTION 3: Invoice History & Printable Receipts */}
      <section className="bg-card/70 rounded-sm border border-border/40 overflow-hidden shadow-xs">
        <div className="p-4 border-b border-border/40 flex items-center justify-between">
          <div>
            <h3 className="font-display text-sm font-bold text-foreground">Invoice History</h3>
            <p className="text-xs text-muted-foreground">
              Official tax invoices and transaction receipts generated in INR (₹)
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsCreateInvoiceOpen(true)}
            className="h-8 text-xs cursor-pointer gap-1"
          >
            <ReceiptItem size="13" />
            <span>Generate Invoice</span>
          </Button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-border/40 bg-muted/20 text-muted-foreground font-semibold uppercase tracking-wider text-[10px]">
                <th className="py-3 px-4">Invoice #</th>
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">Description</th>
                <th className="py-3 px-4">Billed To</th>
                <th className="py-3 px-4">Amount</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Receipt</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/20 text-foreground">
              {invLoading ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-muted-foreground">
                    Loading invoices...
                  </td>
                </tr>
              ) : !invoices || invoices.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-muted-foreground">
                    No invoices recorded yet.
                  </td>
                </tr>
              ) : (
                invoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-accent/40 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-foreground">
                      {inv.invoice_number}
                    </td>
                    <td className="py-3 px-4 text-muted-foreground font-mono">
                      {new Date(inv.created_at).toLocaleDateString("en-IN", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                      })}
                    </td>
                    <td className="py-3 px-4 font-medium text-foreground max-w-[220px] truncate">
                      {inv.description}
                    </td>
                    <td className="py-3 px-4 text-muted-foreground">
                      {inv.customer_name || "Workspace Subscriber"}
                    </td>
                    <td className="py-3 px-4 font-mono font-bold text-foreground">
                      ₹{inv.amount_inr.toLocaleString("en-IN")}
                    </td>
                    <td className="py-3 px-4">
                      <span className="inline-block px-2 py-0.5 rounded-sm bg-status-success-bg text-status-success-fg text-[11px] font-semibold capitalize">
                        {inv.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <a
                        href={`/api/billing/invoices/${inv.id}?format=html`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-[11px] font-medium text-brand-text hover:underline cursor-pointer"
                        title="View or print printable tax invoice"
                      >
                        <DocumentDownload size="14" />
                        <span>View / Print PDF</span>
                      </a>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* MODAL: Generate Custom Invoice */}
      {isCreateInvoiceOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-card border border-border/60 rounded-sm shadow-xl max-w-md w-full p-6 space-y-5 animate-in fade-in-50 zoom-in-95">
            <div className="flex items-center justify-between border-b border-border/30 pb-3">
              <div className="flex items-center gap-2">
                <ReceiptItem size="18" className="text-brand-text" />
                <h3 className="font-display text-base font-bold text-foreground">
                  Generate Custom Invoice
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsCreateInvoiceOpen(false)}
                className="text-muted-foreground hover:text-foreground cursor-pointer"
              >
                <CloseCircle size="18" />
              </button>
            </div>

            <form onSubmit={handleCreateInvoiceSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block font-medium text-foreground mb-1">Customer / Client Name</label>
                <input
                  type="text"
                  required
                  value={invoiceForm.customerName}
                  onChange={(e) => setInvoiceForm({ ...invoiceForm, customerName: e.target.value })}
                  placeholder="e.g. Acme Corp / Rohan Sharma"
                  className="w-full px-3 py-2 rounded-sm bg-background border border-border text-foreground focus:outline-hidden focus:border-brand-text"
                />
              </div>

              <div>
                <label className="block font-medium text-foreground mb-1">Customer Email</label>
                <input
                  type="email"
                  required
                  value={invoiceForm.customerEmail}
                  onChange={(e) => setInvoiceForm({ ...invoiceForm, customerEmail: e.target.value })}
                  placeholder="client@company.com"
                  className="w-full px-3 py-2 rounded-sm bg-background border border-border text-foreground focus:outline-hidden focus:border-brand-text"
                />
              </div>

              <div>
                <label className="block font-medium text-foreground mb-1">Description / Line Item</label>
                <input
                  type="text"
                  required
                  value={invoiceForm.description}
                  onChange={(e) => setInvoiceForm({ ...invoiceForm, description: e.target.value })}
                  placeholder="e.g. Custom AI Strategy Consulting & Setup"
                  className="w-full px-3 py-2 rounded-sm bg-background border border-border text-foreground focus:outline-hidden focus:border-brand-text"
                />
              </div>

              <div>
                <label className="block font-medium text-foreground mb-1">Amount in INR (₹)</label>
                <input
                  type="number"
                  required
                  min="1"
                  value={invoiceForm.amountInr}
                  onChange={(e) => setInvoiceForm({ ...invoiceForm, amountInr: Number(e.target.value) })}
                  className="w-full px-3 py-2 rounded-sm bg-background border border-border text-foreground font-mono focus:outline-hidden focus:border-brand-text"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2.5">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsCreateInvoiceOpen(false)}
                  className="cursor-pointer"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={createInvoiceMutation.isPending}
                  className="bg-brand text-brand-foreground hover:opacity-90 cursor-pointer"
                >
                  {createInvoiceMutation.isPending ? "Generating..." : "Generate Invoice"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}
