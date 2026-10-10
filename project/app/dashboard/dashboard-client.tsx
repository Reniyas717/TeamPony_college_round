"use client";

import * as React from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Global,
  SecurityUser,
  Card as CardIcon,
  DirectSend,
  VideoPlay,
  Magicpen,
  ArrowRight,
  TickCircle,
  ShieldSecurity,
} from "iconsax-react";

interface DashboardClientProps {
  user: {
    id: string;
    email: string | undefined;
    username: string;
    workspaceName?: string;
  };
}

export default function DashboardClient({ user }: DashboardClientProps) {
  const modules = [
    {
      id: "crm",
      href: "/dashboard/crm",
      title: "Intelligent CRM",
      description: "Manage customer lifecycles, track touchpoints, and sync contacts with billing records.",
      icon: SecurityUser,
      meta: "0 Contacts recorded",
      action: "Manage CRM",
    },
    {
      id: "billing",
      href: "/dashboard/billing",
      title: "SaaS Billing & Subscriptions",
      description: "Automated recurring plans, usage-based metering, and Stripe customer invoicing.",
      icon: CardIcon,
      meta: "₹0.00 Current MRR",
      action: "View Invoices",
    },
    {
      id: "website",
      href: "/dashboard/website",
      title: "Visual Website Builder",
      description: "Customize and deploy responsive landing pages with instant live previews.",
      icon: Global,
      meta: "1 Active public site",
      action: "Open Studio",
    },
    {
      id: "marketing",
      href: "/dashboard/marketing",
      title: "Marketing Automation",
      description: "Automate dynamic customer segments triggered by real-time billing and product usage.",
      icon: DirectSend,
      meta: "0 Active campaigns",
      action: "Build Flow",
    },
    {
      id: "webinars",
      href: "/dashboard/webinars",
      title: "Webinar Management",
      description: "Host live interactive events with attendance analytics and auto follow-up workflows.",
      icon: VideoPlay,
      meta: "0 Upcoming events",
      action: "Create Event",
    },
    {
      id: "agent",
      href: "/dashboard/agent",
      title: "AI Business Agent",
      description: "Autonomous multi-step business operations with mandatory human approval checkpoints.",
      icon: Magicpen,
      meta: "Semantic graph linked",
      action: "Configure Agent",
    },
    {
      id: "audit-logs",
      href: "/dashboard/audit-logs",
      title: "Audit Trail & Compliance",
      description: "Immutable, append-only security logs of all system, AI, and human operations.",
      icon: ShieldSecurity,
      meta: "PostgreSQL RLS Protected",
      action: "View Audit Trail",
    },
  ];

  return (
    <main className="p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto space-y-8">
      {/* Welcome Action Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2">
        <div>
          <h1 className="font-display text-page-sm md:text-page font-bold tracking-tight text-foreground">
            Workspace Operations
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Nexus Unified Operating Platform • Account:{" "}
            <span className="text-foreground font-medium">{user.email || user.username}</span>
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link href="/dashboard/agent" className="cursor-pointer">
            <Button variant="primary" size="md" className="gap-2 cursor-pointer shadow-sm">
              <Magicpen size="16" className="text-brand-foreground" />
              <span>Prompt AI Agent</span>
            </Button>
          </Link>
        </div>
      </div>

      {/* Architectural Metric Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 flex flex-col gap-1 bg-card/60 rounded-sm">
          <p className="text-[10px] font-semibold uppercase text-muted-foreground tracking-wider">Revenue (MRR)</p>
          <p className="font-display text-2xl font-bold tabular-nums">₹0.00</p>
          <p className="text-xs text-muted-foreground mt-0.5">Synced with Stripe</p>
        </div>

        <div className="p-5 flex flex-col gap-1 bg-card/60 rounded-sm">
          <p className="text-[10px] font-semibold uppercase text-muted-foreground tracking-wider">CRM Contacts</p>
          <p className="font-display text-2xl font-bold tabular-nums">0 Leads</p>
          <p className="text-xs text-muted-foreground mt-0.5">Ready for capture</p>
        </div>

        <div className="p-5 flex flex-col gap-1 bg-card/60 rounded-sm">
          <p className="text-[10px] font-semibold uppercase text-muted-foreground tracking-wider">AI Approval Queue</p>
          <p className="font-display text-2xl font-bold tabular-nums">0 Pending</p>
          <p className="text-xs text-muted-foreground mt-0.5">Queue is clear</p>
        </div>

        <div className="p-5 flex flex-col gap-1 bg-card/60 rounded-sm">
          <p className="text-[10px] font-semibold uppercase text-muted-foreground tracking-wider">Tenant Isolation</p>
          <p className="font-display text-2xl font-bold">Single-Owner</p>
          <p className="text-xs text-muted-foreground mt-0.5">PostgreSQL RLS scope</p>
        </div>
      </div>

      {/* Two-Column Operating Matrix */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left 8/12: Core Business Modules */}
        <div className="lg:col-span-8 space-y-4">
          <div>
            <h2 className="font-display text-lg font-bold tracking-tight">Core Business Modules</h2>
            <p className="text-xs text-muted-foreground">Select an operational domain to manage your business graph.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {modules.map((mod) => {
              const IconComp = mod.icon;
              return (
                <Link
                  key={mod.id}
                  href={mod.href}
                  className="bg-card/60 p-5 rounded-sm hover:bg-card transition-all duration-200 flex flex-col justify-between group cursor-pointer"
                >
                  <div>
                    <div className="w-9 h-9 rounded-sm bg-muted/40 flex items-center justify-center text-foreground group-hover:text-brand-text transition-colors mb-3">
                      <IconComp size="18" />
                    </div>
                    <h3 className="font-display font-bold text-base tracking-tight mb-1">{mod.title}</h3>
                    <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">{mod.description}</p>
                  </div>

                  <div className="pt-4 mt-4 flex items-center justify-between border-t border-border/20">
                    <span className="text-[11px] font-mono text-muted-foreground">{mod.meta}</span>
                    <span className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground group-hover:text-foreground">
                      <span>{mod.action}</span>
                      <ArrowRight size="12" className="group-hover:translate-x-0.5 transition-transform" />
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>

        {/* Right 4/12: Agent Action Guard & Governance */}
        <div className="lg:col-span-4 space-y-4">
          <div>
            <h2 className="font-display text-lg font-bold tracking-tight flex items-center gap-2">
              <Magicpen size="18" className="text-brand-text" />
              <span>Agent Action Guard</span>
            </h2>
            <p className="text-xs text-muted-foreground">Autonomous workflows protected by human verification.</p>
          </div>

          <div className="bg-card/60 p-5 rounded-sm space-y-4">
            <div className="flex items-center justify-between pb-2 text-xs">
              <span className="font-semibold text-foreground">Operational Status</span>
              <span className="text-muted-foreground font-medium">Continuous Monitoring</span>
            </div>

            <p className="text-xs text-muted-foreground leading-relaxed">
              The Nexus AI Agent continuously inspects your CRM touchpoints, billing events, and marketing funnels.
              Consequential side effects pause automatically for review.
            </p>

            {/* Clear Queue State */}
            <div className="p-4 bg-muted/30 rounded-sm text-center space-y-2">
              <TickCircle size="24" className="mx-auto text-status-success-fg" />
              <p className="text-xs font-semibold text-foreground">All Clear: 0 Pending Approvals</p>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                No mass updates, invoice refunds, or email dispatches waiting for signature.
              </p>
            </div>

            <div className="pt-2">
              <Link href="/dashboard/audit-logs" className="block w-full cursor-pointer">
                <Button
                  variant="secondary"
                  size="sm"
                  className="w-full text-xs h-9 cursor-pointer justify-between bg-muted/40 hover:bg-muted/60"
                >
                  <span className="flex items-center gap-1.5">
                    <ShieldSecurity size="14" />
                    <span>Inspect Agent Audit Log</span>
                  </span>
                  <ArrowRight size="12" />
                </Button>
              </Link>
            </div>
          </div>

          {/* Tenant Isolation Info */}
          <div className="bg-sidebar/60 p-4 rounded-sm text-xs space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground font-semibold uppercase text-[10px] tracking-wider">Tenant Scope</span>
              <span className="text-foreground font-mono text-[10px]">1:1 Bound</span>
            </div>
            <p className="text-muted-foreground text-[11px] leading-relaxed">
              Single-owner account strictly isolated via PostgreSQL Row Level Security. Cross-tenant leakage is
              cryptographically prevented.
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
