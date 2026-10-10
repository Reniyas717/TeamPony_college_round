import * as React from "react";
import { Button } from "@/components/ui/button";
import { Magicpen, Play, Setting2, TickCircle } from "iconsax-react";

export default function AgentPage() {
  const capabilities = [
    { title: "Lead Qualification & Enrichment", status: "Active", description: "Scores inbound form submissions and syncs verified company metadata into CRM." },
    { title: "Invoice Reconciliation", status: "Active", description: "Cross-references failed Stripe charges with email reminders." },
    { title: "Campaign Segment Optimization", status: "Active", description: "Dynamically clusters customers based on usage metrics and engagement." },
    { title: "Automated Approval Enforcement", status: "Active", description: "Enforces mandatory human confirmation checkpoints for destructive or financial operations." },
  ];

  return (
    <main className="p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-border/40">
        <div>
          <div className="flex items-center gap-2.5 mb-1">
            <div className="w-8 h-8 rounded-sm bg-brand-subtle flex items-center justify-center text-brand-text">
              <Magicpen size="20" />
            </div>
            <h1 className="font-display text-page-sm md:text-page font-bold tracking-tight text-foreground">
              AI Business Agent
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Autonomous execution engine for business operations with built-in auditability and approval gates
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" className="gap-2 cursor-pointer h-9 text-xs bg-card">
            <Setting2 size="14" />
            <span>Agent Settings</span>
          </Button>
          <Button variant="primary" size="md" className="gap-2 cursor-pointer shadow-sm">
            <Play size="14" className="text-brand-foreground" />
            <span>Execute Task</span>
          </Button>
        </div>
      </div>

      {/* Prompt Execution Box */}
      <div className="p-5 bg-card/70 border border-border/40 rounded-sm space-y-3">
        <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
          <Magicpen size="14" className="text-brand-text" />
          <span>Instruct AI Agent</span>
        </label>
        <div className="flex flex-col sm:flex-row gap-2.5">
          <input
            type="text"
            placeholder="e.g., Identify leads who haven't replied in 7 days and draft a personalized follow-up..."
            className="flex-1 px-3.5 py-2 text-xs rounded-sm bg-background border border-border text-foreground placeholder:text-muted-foreground focus:outline-hidden focus:border-brand-text"
          />
          <Button variant="primary" size="sm" className="h-9 px-4 text-xs cursor-pointer">
            Run Workflow
          </Button>
        </div>
        <p className="text-[11px] text-muted-foreground">
          Every action executed by this agent is audited under actor type <code className="font-mono text-brand-text">ai_agent</code> with complete initiator attribution.
        </p>
      </div>

      {/* Autonomous Capabilities Grid */}
      <div className="space-y-3">
        <h3 className="font-display text-sm font-bold text-foreground">Active Autonomous Capabilities</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {capabilities.map((c) => (
            <div key={c.title} className="p-4 bg-card/50 border border-border/30 rounded-sm space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="font-display font-semibold text-xs text-foreground">{c.title}</h4>
                <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-status-success-fg bg-status-success-bg px-2 py-0.5 rounded-sm">
                  <TickCircle size="10" />
                  <span>{c.status}</span>
                </span>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">{c.description}</p>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
