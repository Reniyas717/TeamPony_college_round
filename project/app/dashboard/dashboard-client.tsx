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
  TrendUp,
  Chart21,
  Warning2,
} from "iconsax-react";
import { useAnalyticsDashboard } from "@/hooks/use-analytics";

interface DashboardClientProps {
  user: {
    id: string;
    email: string | undefined;
    username: string;
    workspaceName?: string;
  };
}

export default function DashboardClient({ user }: DashboardClientProps) {
  const { data: analyticsData } = useAnalyticsDashboard();

  const overview = analyticsData?.overview;
  const mrrDisplay =
    overview?.mrrFormatted ??
    analyticsData?.summaryMetrics?.find((m) => m.id === "mrr" || m.id === "mrr_observed")?.value ??
    "₹4,999.00";
  const contactsDisplay =
    overview?.contactsCount !== undefined
      ? `${overview.contactsCount} Contact${overview.contactsCount === 1 ? "" : "s"}`
      : analyticsData?.summaryMetrics?.find((m) => m.id === "contacts" || m.id === "contacts_observed")?.value ??
        "3 Contacts";
  const contactsCount = overview?.contactsCount ?? 3;
  const pendingApprovalsCount = overview?.pendingApprovalsCount ?? 0;
  const publishedWebsitesCount = overview?.publishedWebsitesCount ?? 0;
  const totalWebsitesCount = overview?.totalWebsitesCount ?? 0;
  const activeCampaignsCount = overview?.activeCampaignsCount ?? 0;
  const upcomingWebinarsCount = overview?.upcomingWebinarsCount ?? 0;
  const journeyMapsCount = overview?.journeyMapsCount ?? 0;
  const auditLogsCount = overview?.auditLogsCount ?? 0;
  const totalWorkflowsCount = overview?.totalWorkflowsCount ?? 0;

  const modules = [
    {
      id: "analytics",
      title: "Analytics & Performance",
      description: "Track revenue growth, contact acquisition, funnel conversion, and video summaries.",
      icon: Chart21,
      meta: "Live Performance",
      action: "View Analytics",
      href: "/dashboard/analytics",
    },
    {
      id: "intelligence",
      title: "Customer Journey Studio",
      description: "AI-synthesized stages, drop-off friction diagnostics, visual Mermaid diagrams, and executable module actions.",
      icon: TrendUp,
      meta: `${journeyMapsCount} Funnel${journeyMapsCount === 1 ? "" : "s"} Active`,
      action: "Open Studio",
      href: "/dashboard/intelligence",
    },
    {
      id: "crm",
      href: "/dashboard/crm",
      title: "Intelligent CRM",
      description: "Manage customer lifecycles, track touchpoints, and sync contacts with billing records.",
      icon: SecurityUser,
      meta: `${contactsCount} Contact${contactsCount === 1 ? "" : "s"} recorded`,
      action: "Manage CRM",
    },
    {
      id: "billing",
      href: "/dashboard/billing",
      title: "SaaS Billing & Subscriptions",
      description: "Automated recurring plans, usage-based metering, and Stripe customer invoicing.",
      icon: CardIcon,
      meta: `${mrrDisplay} Current MRR`,
      action: "View Invoices",
    },
    {
      id: "website",
      href: "/dashboard/website",
      title: "Visual Website Builder",
      description: "Customize and deploy responsive landing pages with instant live previews.",
      icon: Global,
      meta: `${publishedWebsitesCount} Published • ${totalWebsitesCount} Site${totalWebsitesCount === 1 ? "" : "s"}`,
      action: "Open Studio",
    },
    {
      id: "marketing",
      href: "/dashboard/marketing",
      title: "Marketing Automation",
      description: "Automate dynamic customer segments triggered by real-time billing and product usage.",
      icon: DirectSend,
      meta: `${activeCampaignsCount} Active campaign${activeCampaignsCount === 1 ? "" : "s"}`,
      action: "Build Flow",
    },
    {
      id: "webinars",
      href: "/dashboard/webinars",
      title: "Webinar Management",
      description: "Host live interactive events with attendance analytics and auto follow-up workflows.",
      icon: VideoPlay,
      meta: `${upcomingWebinarsCount} Upcoming event${upcomingWebinarsCount === 1 ? "" : "s"}`,
      action: "Create Event",
    },
    {
      id: "agent",
      href: "/dashboard/agent",
      title: "AI Business Agent",
      description: "Autonomous multi-step business operations with mandatory human approval checkpoints.",
      icon: Magicpen,
      meta: `${totalWorkflowsCount} Workflows linked`,
      action: "Configure Agent",
    },
    {
      id: "audit-logs",
      href: "/dashboard/audit-logs",
      title: "Audit Trail & Compliance",
      description: "Immutable, append-only security logs of all system, AI, and human operations.",
      icon: ShieldSecurity,
      meta: `${auditLogsCount} Events logged`,
      action: "View Audit Trail",
    },
  ];

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto space-y-8">
      {/* Welcome Action Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2">
        <div>
          <h1 className="font-display text-page-sm md:text-page font-bold tracking-tight text-foreground">
            Workspace Operations
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Nexus Unified Operating Platform • Account:{" "}
            <span className="text-foreground font-medium">
              {user.email || user.username}
            </span>
          </p>
        </div>
      </div>

      {/* Architectural Metric Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Link href="/dashboard/billing" className="p-5 flex flex-col gap-1 bg-card/60 hover:bg-card/90 transition rounded-sm border border-border/30">
          <p className="text-[10px] font-semibold uppercase text-muted-foreground tracking-wider">
            Revenue (MRR)
          </p>
          <p className="font-display text-2xl font-bold tabular-nums">
            {mrrDisplay}
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">
            {analyticsData ? "Current Monthly Revenue" : "Loading..."}
          </p>
        </Link>

        <Link href="/dashboard/crm" className="p-5 flex flex-col gap-1 bg-card/60 hover:bg-card/90 transition rounded-sm border border-border/30">
          <p className="text-[10px] font-semibold uppercase text-muted-foreground tracking-wider">
            CRM Contacts
          </p>
          <p className="font-display text-2xl font-bold tabular-nums">
            {contactsDisplay}
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">
            {analyticsData ? "Total Active Contacts" : "Loading..."}
          </p>
        </Link>

        <Link href="/dashboard/approvals" className="p-5 flex flex-col gap-1 bg-card/60 hover:bg-card/90 transition rounded-sm border border-border/30">
          <p className="text-[10px] font-semibold uppercase text-muted-foreground tracking-wider">
            AI Approval Queue
          </p>
          <p className="font-display text-2xl font-bold tabular-nums">
            {pendingApprovalsCount} Pending
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">
            {pendingApprovalsCount > 0 ? "Review required" : "Gatekeeper checks active"}
          </p>
        </Link>

        <Link href="/dashboard/analytics" className="p-5 flex flex-col gap-1 bg-card/60 hover:bg-card/90 transition rounded-sm border border-border/30 group">
          <div className="flex items-center justify-between">
            <p className="text-[10px] font-semibold uppercase text-muted-foreground tracking-wider">
              Analytics
            </p>
            <span className="w-1.5 h-1.5 rounded-xs bg-emerald-500" />
          </div>
          <p className="font-display text-2xl font-bold text-brand group-hover:text-brand-text transition-colors">
            {analyticsData ? "Live" : "Loading"}
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">View Analytics</p>
        </Link>
      </div>

      {/* Two-Column Operating Matrix */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left 8/12: Core Business Modules */}
        <div className="lg:col-span-8 space-y-4">
          <div>
            <h2 className="font-display text-lg font-bold tracking-tight">
              Core Business Modules
            </h2>
            <p className="text-xs text-muted-foreground">
              Select an operational domain to manage your business graph.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {modules.map((mod) => {
              const IconComp = mod.icon;
              return (
                <div
                  key={mod.id}
                  className="bg-card/60 p-5 rounded-sm hover:bg-card transition-all duration-200 flex flex-col justify-between group"
                >
                  <div>
                    <div className="w-9 h-9 rounded-sm bg-muted/40 flex items-center justify-center text-foreground group-hover:text-brand-text transition-colors mb-3">
                      <IconComp size="18" />
                    </div>
                    <h3 className="font-display font-bold text-base tracking-tight mb-1">
                      {mod.title}
                    </h3>
                    <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">
                      {mod.description}
                    </p>
                  </div>

                  <div className="pt-4 mt-4 border-t border-border/40 flex items-center justify-between">
                    <span className="text-[11px] font-mono text-muted-foreground">
                      {mod.meta}
                    </span>
                    {mod.href ? (
                      <Button
                        variant="ghost"
                        size="sm"
                        asChild
                        className="h-7 text-xs gap-1 group-hover:text-foreground cursor-pointer px-2 bg-muted/30 hover:bg-muted/60"
                      >
                        <Link href={mod.href}>
                          <span>{mod.action}</span>
                          <ArrowRight
                            size="12"
                            className="group-hover:translate-x-0.5 transition-transform"
                          />
                        </Link>
                      </Button>
                    ) : (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs gap-1 group-hover:text-foreground cursor-pointer px-2 bg-muted/30 hover:bg-muted/60"
                      >
                        <span>{mod.action}</span>
                        <ArrowRight
                          size="12"
                          className="group-hover:translate-x-0.5 transition-transform"
                        />
                      </Button>
                    )}
                  </div>
                </div>
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
            <p className="text-xs text-muted-foreground">
              Autonomous workflows protected by human verification.
            </p>
          </div>

          <div className="bg-card/60 p-5 rounded-sm space-y-4">
            <div className="flex items-center justify-between pb-2 text-xs">
              <span className="font-semibold text-foreground">Operational Status</span>
              <span className="text-muted-foreground font-medium">Continuous Monitoring</span>
            </div>

            <p className="text-xs text-muted-foreground leading-relaxed">
              The Nexus AI Agent continuously inspects your CRM touchpoints, billing
              events, and marketing funnels. Consequential side effects pause automatically
              for review.
            </p>

            {/* Queue State */}
            {pendingApprovalsCount > 0 ? (
              <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-sm text-center space-y-2">
                <Warning2 size="24" className="mx-auto text-amber-500" />
                <p className="text-xs font-semibold text-amber-500">
                  Action Required: {pendingApprovalsCount} Pending Approval{pendingApprovalsCount === 1 ? "" : "s"}
                </p>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  Consequential operations are paused awaiting human signature.
                </p>
                <div className="pt-1">
                  <Link href="/dashboard/approvals" className="inline-block">
                    <Button variant="primary" size="sm" className="h-7 text-xs px-3 shadow-xs">
                      Review Queue
                    </Button>
                  </Link>
                </div>
              </div>
            ) : (
              <div className="p-4 bg-muted/30 rounded-sm text-center space-y-2">
                <TickCircle size="24" className="mx-auto text-status-success-fg" />
                <p className="text-xs font-semibold text-foreground">
                  All Clear: 0 Pending Approvals
                </p>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  No mass updates, invoice refunds, or email dispatches waiting for signature.
                </p>
              </div>
            )}

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
              <span className="text-muted-foreground font-semibold uppercase text-[10px] tracking-wider">
                Tenant Scope
              </span>
              <span className="text-foreground font-mono text-[10px]">1:1 Bound</span>
            </div>
            <p className="text-muted-foreground text-[11px] leading-relaxed">
              Single-owner account strictly isolated via PostgreSQL Row Level Security.
              Cross-tenant leakage is cryptographically prevented.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
