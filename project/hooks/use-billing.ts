"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  SubscriptionRecord,
  WorkspaceUsageSummary,
  InvoiceRecord,
  ChangePlanInput,
  CreateInvoiceInput,
  SimulateUsageInput,
  CreateRazorpayOrderInput,
  VerifyRazorpayPaymentInput,
} from "@/lib/validations/billing";

/**
 * Deterministic Query Keys per AGENTS.md §7.2
 */
export const billingKeys = {
  all: ["billing"] as const,
  subscription: () => [...billingKeys.all, "subscription"] as const,
  usage: () => [...billingKeys.all, "usage"] as const,
  invoices: () => [...billingKeys.all, "invoices"] as const,
  invoice: (id: string) => [...billingKeys.invoices(), id] as const,
};

/**
 * Fetch current subscription status and plan.
 */
export function useBillingSubscription() {
  return useQuery({
    queryKey: billingKeys.subscription(),
    queryFn: async (): Promise<SubscriptionRecord> => {
      const res = await fetch("/api/billing/subscription");
      if (!res.ok) {
        throw new Error("Failed to load subscription details");
      }
      const json = await res.json();
      return json.data;
    },
  });
}

/**
 * Fetch live usage metrics and quotas.
 */
export function useBillingUsage() {
  return useQuery({
    queryKey: billingKeys.usage(),
    queryFn: async (): Promise<WorkspaceUsageSummary> => {
      const res = await fetch("/api/billing/usage");
      if (!res.ok) {
        throw new Error("Failed to load workspace usage metrics");
      }
      const json = await res.json();
      return json.data;
    },
  });
}

/**
 * Fetch invoice history.
 */
export function useBillingInvoices() {
  return useQuery({
    queryKey: billingKeys.invoices(),
    queryFn: async (): Promise<InvoiceRecord[]> => {
      const res = await fetch("/api/billing/invoices");
      if (!res.ok) {
        throw new Error("Failed to load invoices");
      }
      const json = await res.json();
      return json.data;
    },
  });
}

/**
 * Mutation: Change subscription plan.
 */
export function useChangePlanMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (
      payload: ChangePlanInput
    ): Promise<{ subscription: SubscriptionRecord; invoice: InvoiceRecord }> => {
      const res = await fetch("/api/billing/subscription", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => null);
        throw new Error(err?.error?.message || "Failed to update subscription tier");
      }

      const json = await res.json();
      return json.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: billingKeys.subscription() });
      queryClient.invalidateQueries({ queryKey: billingKeys.usage() });
      queryClient.invalidateQueries({ queryKey: billingKeys.invoices() });
    },
  });
}

/**
 * Mutation: Simulate usage surge for live quota testing.
 */
export function useSimulateUsageMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: SimulateUsageInput): Promise<WorkspaceUsageSummary> => {
      const res = await fetch("/api/billing/usage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        throw new Error("Failed to record usage simulation");
      }

      const json = await res.json();
      return json.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: billingKeys.usage() });
    },
  });
}

/**
 * Mutation: Generate a custom business invoice.
 */
export function useCreateInvoiceMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: CreateInvoiceInput): Promise<InvoiceRecord> => {
      const res = await fetch("/api/billing/invoices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => null);
        throw new Error(err?.error?.message || "Failed to create invoice");
      }

      const json = await res.json();
      return json.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: billingKeys.invoices() });
    },
  });
}

/**
 * Mutation: Create Razorpay Order.
 */
export function useCreateRazorpayOrderMutation() {
  return useMutation({
    mutationFn: async (
      payload: CreateRazorpayOrderInput
    ): Promise<{ orderId: string; amount: number; currency: string; keyId: string }> => {
      const res = await fetch("/api/billing/razorpay/order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        throw new Error("Failed to create Razorpay checkout order");
      }

      const json = await res.json();
      return json.data;
    },
  });
}

/**
 * Mutation: Verify Razorpay Payment.
 */
export function useVerifyRazorpayPaymentMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (
      payload: VerifyRazorpayPaymentInput
    ): Promise<{ subscription: SubscriptionRecord; invoice: InvoiceRecord }> => {
      const res = await fetch("/api/billing/razorpay/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => null);
        throw new Error(err?.error?.message || "Payment verification failed");
      }

      const json = await res.json();
      return json.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: billingKeys.subscription() });
      queryClient.invalidateQueries({ queryKey: billingKeys.usage() });
      queryClient.invalidateQueries({ queryKey: billingKeys.invoices() });
    },
  });
}
