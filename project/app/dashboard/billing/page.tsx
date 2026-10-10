import * as React from "react";
import { Button } from "@/components/ui/button";
import { Card as CardIcon, ReceiptItem, DocumentDownload, TickCircle } from "iconsax-react";

export default function BillingPage() {
  const invoices = [
    {
      id: "INV-2026-003",
      date: "01 Oct 2026",
      amount: "₹14,999.00",
      status: "Paid",
      plan: "Nexus Enterprise Growth",
    },
    {
      id: "INV-2026-002",
      date: "01 Sep 2026",
      amount: "₹14,999.00",
      status: "Paid",
      plan: "Nexus Enterprise Growth",
    },
    {
      id: "INV-2026-001",
      date: "01 Aug 2026",
      amount: "₹14,999.00",
      status: "Paid",
      plan: "Nexus Enterprise Growth",
    },
  ];

  return (
    <main className="p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto space-y-6">
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
            Manage your workspace subscription tier, payment methods, and historical invoices
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" className="gap-2 cursor-pointer h-9 text-xs bg-card">
            <ReceiptItem size="14" />
            <span>Manage Payment Method</span>
          </Button>
        </div>
      </div>

      {/* Plan Details Strip */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Active Plan Card */}
        <div className="md:col-span-2 p-6 bg-card/70 border border-border/40 rounded-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-[10px] uppercase font-semibold text-muted-foreground tracking-wider">
                Current Plan
              </span>
              <h3 className="font-display text-xl font-bold text-foreground mt-0.5">Nexus Growth Tier</h3>
            </div>
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-sm bg-status-success-bg text-status-success-fg text-xs font-semibold">
              <TickCircle size="12" />
              <span>Active</span>
            </span>
          </div>

          <div className="flex items-baseline gap-1">
            <span className="text-3xl font-bold font-display text-foreground">₹14,999</span>
            <span className="text-xs text-muted-foreground">/ month</span>
          </div>

          <div className="grid grid-cols-2 gap-2 pt-2 border-t border-border/20 text-xs text-muted-foreground">
            <div>Next billing renewal: <span className="font-medium text-foreground">01 Nov 2026</span></div>
            <div>Payment card: <span className="font-mono text-foreground font-medium">•••• 4242</span></div>
          </div>
        </div>

        {/* Usage & Metering Card */}
        <div className="p-6 bg-card/70 border border-border/40 rounded-sm space-y-3 flex flex-col justify-between">
          <div>
            <span className="text-[10px] uppercase font-semibold text-muted-foreground tracking-wider">
              AI Agent Execution
            </span>
            <p className="font-display text-2xl font-bold text-foreground mt-1">2,840 / 10,000</p>
            <p className="text-xs text-muted-foreground mt-1">Operations consumed this cycle</p>
          </div>

          <div className="w-full bg-muted/40 h-2 rounded-sm overflow-hidden">
            <div className="bg-brand h-full rounded-sm" style={{ width: "28.4%" }} />
          </div>
        </div>
      </div>

      {/* Invoice History Table */}
      <div className="bg-card/70 rounded-sm border border-border/40 overflow-hidden shadow-xs">
        <div className="p-4 border-b border-border/40 flex items-center justify-between">
          <h3 className="font-display text-sm font-bold text-foreground">Invoice History</h3>
          <span className="text-xs text-muted-foreground">All transactions recorded in INR (₹)</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-border/40 bg-muted/20 text-muted-foreground font-semibold uppercase tracking-wider text-[10px]">
                <th className="py-3 px-4">Invoice ID</th>
                <th className="py-3 px-4">Billing Date</th>
                <th className="py-3 px-4">Tier Description</th>
                <th className="py-3 px-4">Amount</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Receipt</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/20 text-foreground">
              {invoices.map((inv) => (
                <tr key={inv.id} className="hover:bg-accent/40 transition-colors">
                  <td className="py-3 px-4 font-mono font-medium text-foreground">{inv.id}</td>
                  <td className="py-3 px-4 text-muted-foreground font-mono">{inv.date}</td>
                  <td className="py-3 px-4 font-medium text-foreground">{inv.plan}</td>
                  <td className="py-3 px-4 font-mono font-semibold text-foreground">{inv.amount}</td>
                  <td className="py-3 px-4">
                    <span className="inline-block px-2 py-0.5 rounded-sm bg-status-success-bg text-status-success-fg text-[11px] font-medium">
                      {inv.status}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right">
                    <button
                      type="button"
                      className="inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground cursor-pointer"
                    >
                      <DocumentDownload size="14" />
                      <span>PDF</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}
