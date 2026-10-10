import * as React from "react";
import { Button } from "@/components/ui/button";
import { TickCircle, CloseCircle, Warning2, Magicpen } from "iconsax-react";

export default function ApprovalsPage() {
  const pendingApprovals = [
    {
      id: "wf-app-001",
      action: "Bulk Email Campaign Dispatch",
      reason: "Quarterly re-engagement for inactive subscribers meeting criteria.",
      affectedCount: "1,240 contacts",
      consequence: "Irreversible external email dispatch to live recipient mailboxes.",
      requestedBy: "AI Business Agent (workflow-engine-v1)",
      timestamp: "Today, 15:30 IST",
    },
    {
      id: "wf-app-002",
      action: "Invoice Payment Refund Approval",
      reason: "Duplicate charge reported by customer for subscription renewal.",
      affectedCount: "1 customer (₹14,999.00)",
      consequence: "Initiates real financial reversal via Stripe gateway.",
      requestedBy: "AI Business Agent (billing-reconciliation)",
      timestamp: "Today, 14:15 IST",
    },
  ];

  return (
    <main className="p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-border/40">
        <div>
          <div className="flex items-center gap-2.5 mb-1">
            <div className="w-8 h-8 rounded-sm bg-brand-subtle flex items-center justify-center text-brand-text">
              <TickCircle size="20" />
            </div>
            <h1 className="font-display text-page-sm md:text-page font-bold tracking-tight text-foreground">
              Approval Queue
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Mandatory human verification gates for consequential AI workflows and financial side effects
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold px-2.5 py-1 rounded-sm bg-brand-subtle text-brand-text">
            {pendingApprovals.length} Pending Review
          </span>
        </div>
      </div>

      {/* Approvals List */}
      <div className="space-y-4">
        {pendingApprovals.map((item) => (
          <div
            key={item.id}
            className="p-5 bg-card/70 border border-border/40 rounded-sm space-y-4 shadow-xs"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border/20 pb-3">
              <div>
                <span className="text-[10px] uppercase font-mono text-muted-foreground">{item.id}</span>
                <h3 className="font-display text-base font-bold text-foreground mt-0.5">{item.action}</h3>
              </div>
              <span className="text-xs font-mono text-muted-foreground">{item.timestamp}</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
              <div className="space-y-1">
                <span className="text-[10px] uppercase font-semibold text-muted-foreground">Business Rationale</span>
                <p className="text-foreground">{item.reason}</p>
              </div>
              <div className="space-y-1">
                <span className="text-[10px] uppercase font-semibold text-muted-foreground">Scope / Affected Entities</span>
                <p className="font-semibold text-foreground">{item.affectedCount}</p>
              </div>
            </div>

            <div className="p-3 rounded-sm bg-destructive/10 border border-destructive/20 flex items-start gap-2.5 text-xs text-destructive">
              <Warning2 size="16" className="shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold">Irreversible Consequence: </span>
                <span>{item.consequence}</span>
              </div>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-border/20">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Magicpen size="14" className="text-brand-text" />
                <span>Requested by <span className="font-mono text-foreground">{item.requestedBy}</span></span>
              </div>

              <div className="flex items-center gap-2.5">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 text-xs gap-1.5 cursor-pointer text-destructive border-destructive/40 hover:bg-destructive/10"
                >
                  <CloseCircle size="14" />
                  <span>Reject Action</span>
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  className="h-8 text-xs gap-1.5 cursor-pointer shadow-xs"
                >
                  <TickCircle size="14" />
                  <span>Approve & Execute</span>
                </Button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
