"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import {
  Global,
  SecurityUser,
  Card as CardIcon,
  DirectSend,
  VideoPlay,
  Magicpen,
  LogoutCurve,
  ArrowRight,
  TickCircle,
  Activity
} from "iconsax-react";

interface DashboardClientProps {
  user: {
    id: string;
    email: string | undefined;
    username: string;
  };
}

export default function DashboardClient({ user }: DashboardClientProps) {
  const router = useRouter();
  const [loggingOut, setLoggingOut] = React.useState(false);
  const [sidebarOpen, setSidebarOpen] = React.useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);
  const [activeTab, setActiveTab] = React.useState("overview");

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await fetch("/api/auth/session", { method: "POST" });
      router.push("/login");
      router.refresh();
    } catch {
      setLoggingOut(false);
    }
  };

  const navItems = [
    { id: "overview", label: "Overview", icon: Activity, badge: null },
    { id: "crm", label: "Intelligent CRM", icon: SecurityUser, badge: null },
    { id: "billing", label: "Billing & Plans", icon: CardIcon, badge: null },
    { id: "website", label: "Website Builder", icon: Global, badge: null },
    { id: "marketing", label: "Campaigns", icon: DirectSend, badge: null },
    { id: "webinars", label: "Webinars", icon: VideoPlay, badge: null },
    { id: "agent", label: "AI Business Agent", icon: Magicpen, badge: "Live" },
    { id: "approvals", label: "Approval Queue", icon: TickCircle, badge: "0" },
  ];

  const modules = [
    {
      id: "crm",
      title: "Intelligent CRM",
      description: "Manage leads, track touchpoints, and sync contacts with billing records.",
      icon: SecurityUser,
      status: "Active",
      statusColor: "status-success",
      metric: "0 Leads",
      action: "Manage CRM",
    },
    {
      id: "billing",
      title: "SaaS Billing & Subscriptions",
      description: "Automated recurring plans, usage metering, and Stripe customer invoicing.",
      icon: CardIcon,
      status: "Synced",
      statusColor: "status-info",
      metric: "₹0.00 MRR",
      action: "View Invoices",
    },
    {
      id: "website",
      title: "Visual Website Builder",
      description: "Customize responsive public landing pages with instant live previews.",
      icon: Global,
      status: "Ready",
      statusColor: "status-success",
      metric: "1 Live Domain",
      action: "Open Studio",
    },
    {
      id: "marketing",
      title: "Marketing Automation",
      description: "Targeted customer segments triggered by real-time billing and usage data.",
      icon: DirectSend,
      status: "Operational",
      statusColor: "status-success",
      metric: "0 Active Flows",
      action: "Build Flow",
    },
    {
      id: "webinars",
      title: "Webinar Management",
      description: "Host live business events with attendance tracking and auto follow-ups.",
      icon: VideoPlay,
      status: "Ready",
      statusColor: "status-info",
      metric: "0 Scheduled",
      action: "Create Event",
    },
    {
      id: "agent",
      title: "AI Business Agent",
      description: "Autonomous multi-step operations with mandatory human approval gates.",
      icon: Magicpen,
      status: "Standing by",
      statusColor: "brand",
      metric: "Semantic Graph Active",
      action: "Configure Agent",
    },
  ];

  return (
    <div className="min-h-screen flex bg-background text-foreground overflow-x-hidden">
      {/* Mobile Backdrop */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-xs lg:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* --- COLLAPSIBLE APP SIDEBAR --- */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex flex-col bg-sidebar border-r border-border transition-all duration-300 ease-in-out lg:static ${
          mobileMenuOpen ? "translate-x-0 w-64" : "-translate-x-full lg:translate-x-0"
        } ${sidebarOpen ? "lg:w-64" : "lg:w-18"}`}
      >
        {/* Sidebar Header / Workspace Brand */}
        <div className="h-16 flex items-center justify-between px-4 border-b border-border bg-sidebar shrink-0">
          <Link href="/" className="flex items-center gap-2.5 overflow-hidden">
            <div className="w-8 h-8 bg-brand rounded-sm flex items-center justify-center shrink-0">
              <span className="text-brand-foreground font-display font-bold text-lg leading-none">N</span>
            </div>
            {(sidebarOpen || mobileMenuOpen) && (
              <div className="flex flex-col min-w-0">
                <span className="font-display font-bold text-base tracking-tight leading-none">Nexus</span>
                <span className="text-[10px] text-muted-foreground uppercase tracking-wider truncate mt-0.5 font-medium">
                  Workspace
                </span>
              </div>
            )}
          </Link>

          {/* Desktop Collapse / Expand Toggle Button */}
          <button
            type="button"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="hidden lg:flex p-1.5 rounded-sm hover:bg-accent text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
            title={sidebarOpen ? "Collapse sidebar" : "Expand sidebar"}
            aria-label="Toggle sidebar"
          >
            <svg
              className={`w-4 h-4 transition-transform duration-200 ${sidebarOpen ? "" : "rotate-180"}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
            </svg>
          </button>

          {/* Mobile Close Button */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen(false)}
            className="lg:hidden p-1.5 rounded-sm text-muted-foreground hover:text-foreground cursor-pointer"
            aria-label="Close navigation"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Workspace Identity Bar */}
        {(sidebarOpen || mobileMenuOpen) && (
          <div className="px-4 py-3 border-b border-border bg-muted/20 flex items-center gap-2 shrink-0">
            <div className="w-2 h-2 rounded-none bg-status-success-fg shrink-0" />
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold truncate text-foreground">{user.username}&apos;s Workspace</p>
              <p className="text-[10px] text-muted-foreground truncate uppercase tracking-wider font-mono">
                Single-Tenant DB
              </p>
            </div>
          </div>
        )}

        {/* Navigation Items */}
        <div className="flex-1 overflow-y-auto py-4 px-2 space-y-1">
          {navItems.map((item) => {
            const IconComp = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  setActiveTab(item.id);
                  setMobileMenuOpen(false);
                }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-sm text-xs font-medium transition-colors cursor-pointer ${
                  isActive
                    ? "bg-accent text-foreground font-semibold shadow-xs"
                    : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
                } ${!sidebarOpen && !mobileMenuOpen ? "justify-center px-0" : ""}`}
                title={item.label}
              >
                <IconComp size="18" className={isActive ? "text-brand-text" : "text-muted-foreground"} />
                {(sidebarOpen || mobileMenuOpen) && (
                  <span className="truncate flex-1 text-left">{item.label}</span>
                )}
                {(sidebarOpen || mobileMenuOpen) && item.badge && (
                  <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-xs bg-muted border border-border text-muted-foreground">
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Sidebar Footer User & Controls */}
        <div className="p-3 border-t border-border bg-sidebar shrink-0 flex flex-col gap-2">
          {(sidebarOpen || mobileMenuOpen) ? (
            <div className="flex items-center justify-between p-2 rounded-sm bg-muted/20 border border-border">
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold truncate text-foreground">{user.username}</p>
                <p className="text-[10px] text-muted-foreground truncate">{user.email || "Active User"}</p>
              </div>
              <button
                type="button"
                onClick={handleLogout}
                disabled={loggingOut}
                className="p-1.5 text-muted-foreground hover:text-destructive transition-colors cursor-pointer"
                title="Sign out"
                aria-label="Sign out"
              >
                <LogoutCurve size="16" />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={handleLogout}
              disabled={loggingOut}
              className="w-full flex items-center justify-center p-2 rounded-sm hover:bg-accent text-muted-foreground hover:text-destructive transition-colors cursor-pointer"
              title="Sign out"
              aria-label="Sign out"
            >
              <LogoutCurve size="18" />
            </button>
          )}
        </div>
      </aside>

      {/* --- MAIN APPLICATION CANVAS --- */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top 60px Sticky Application Bar */}
        <header className="sticky top-0 z-30 h-16 border-b border-border bg-background/95 backdrop-blur-sm flex items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            {/* Mobile Sidebar Hamburger Toggle */}
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              className="lg:hidden p-2 rounded-sm text-muted-foreground hover:text-foreground cursor-pointer"
              aria-label="Open navigation menu"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>

            {/* Breadcrumb Path */}
            <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
              <span className="text-foreground font-semibold">{user.username}</span>
              <span>/</span>
              <span className="capitalize">{activeTab}</span>
            </div>
          </div>

          {/* Right Header Utilities */}
          <div className="flex items-center gap-3">
            <div className="hidden md:flex items-center gap-2 px-3 py-1 bg-muted/20 border border-border rounded-sm text-xs text-muted-foreground">
              <span className="w-2 h-2 rounded-none bg-status-success-fg" />
              <span className="font-medium text-[11px] uppercase tracking-wider">Tenant Scope Active</span>
            </div>
            <ThemeToggle />
            <Button
              variant="outline"
              size="sm"
              onClick={handleLogout}
              disabled={loggingOut}
              className="hidden sm:inline-flex gap-1.5 cursor-pointer text-xs h-8"
            >
              <LogoutCurve size="14" />
              <span>{loggingOut ? "Signing out..." : "Sign out"}</span>
            </Button>
          </div>
        </header>

        {/* Dashboard Operational Stage */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto space-y-8">
          {/* Welcome Action Banner */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border pb-6">
            <div>
              <h1 className="font-display text-page-sm md:text-page font-bold tracking-tight text-foreground">
                Workspace Operations
              </h1>
              <p className="text-sm text-muted-foreground mt-1">
                Nexus Unified Operating Platform • Active Account: <span className="text-foreground font-medium">{user.email || user.username}</span>
              </p>
            </div>

            <div className="flex items-center gap-3">
              <Button variant="primary" size="md" className="gap-2 cursor-pointer shadow-sm">
                <Magicpen size="16" className="text-brand-foreground" />
                <span>Prompt AI Agent</span>
              </Button>
            </div>
          </div>

          {/* Architectural Metric Strip (Fine-lined, unboxed) */}
          <div className="grid grid-cols-2 lg:grid-cols-4 divide-y lg:divide-y-0 lg:divide-x divide-border border border-border bg-card">
            <div className="p-5 flex flex-col gap-1">
              <p className="text-[10px] font-semibold uppercase text-muted-foreground tracking-wider">Revenue (MRR)</p>
              <p className="font-display text-2xl font-bold tabular-nums">₹0.00</p>
              <p className="text-xs text-muted-foreground mt-0.5">Stripe sync active</p>
            </div>

            <div className="p-5 flex flex-col gap-1">
              <p className="text-[10px] font-semibold uppercase text-muted-foreground tracking-wider">CRM Contacts</p>
              <p className="font-display text-2xl font-bold tabular-nums">0 Leads</p>
              <p className="text-xs text-status-success-fg mt-0.5">Ready to ingest</p>
            </div>

            <div className="p-5 flex flex-col gap-1">
              <p className="text-[10px] font-semibold uppercase text-muted-foreground tracking-wider">AI Approval Queue</p>
              <p className="font-display text-2xl font-bold tabular-nums">0 Pending</p>
              <p className="text-xs text-muted-foreground mt-0.5">Zero unreviewed tasks</p>
            </div>

            <div className="p-5 flex flex-col gap-1">
              <p className="text-[10px] font-semibold uppercase text-muted-foreground tracking-wider">Tenant Isolation</p>
              <p className="font-display text-2xl font-bold">Single-Owner</p>
              <p className="text-xs text-status-success-fg mt-0.5">Row Level Security</p>
            </div>
          </div>

          {/* Two-Column Operating Matrix */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Left 8/12: Modular Control Center */}
            <div className="lg:col-span-8 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="font-display text-lg font-bold tracking-tight">Core Business Modules</h2>
                  <p className="text-xs text-muted-foreground">Select an operational domain to manage your business graph.</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {modules.map((mod) => {
                  const IconComp = mod.icon;
                  return (
                    <div
                      key={mod.id}
                      className="border border-border bg-card p-5 hover:border-border-strong transition-all duration-200 flex flex-col justify-between group shadow-2xs"
                    >
                      <div>
                        <div className="flex items-center justify-between mb-3">
                          <div className="w-9 h-9 rounded-sm bg-muted/40 border border-border flex items-center justify-center text-foreground group-hover:text-brand-text transition-colors">
                            <IconComp size="18" />
                          </div>
                          <span
                            className={`text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-sm border ${
                              mod.statusColor === "status-success"
                                ? "bg-status-success-bg text-status-success-fg border-status-success-border"
                                : mod.statusColor === "status-info"
                                ? "bg-status-info-bg text-status-info-fg border-status-info-border"
                                : "bg-brand/10 text-brand-text border-brand/20"
                            }`}
                          >
                            {mod.status}
                          </span>
                        </div>
                        <h3 className="font-display font-bold text-base tracking-tight mb-1">{mod.title}</h3>
                        <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">{mod.description}</p>
                      </div>

                      <div className="pt-4 mt-4 border-t border-border flex items-center justify-between">
                        <span className="text-[11px] font-mono text-muted-foreground">{mod.metric}</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 text-xs gap-1 group-hover:text-foreground cursor-pointer px-2"
                        >
                          <span>{mod.action}</span>
                          <ArrowRight size="12" className="group-hover:translate-x-0.5 transition-transform" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Right 4/12: AI Business Agent Stream & Approval System */}
            <div className="lg:col-span-4 space-y-4">
              <div>
                <h2 className="font-display text-lg font-bold tracking-tight flex items-center gap-2">
                  <Magicpen size="18" className="text-brand-text" />
                  <span>Agent Action Guard</span>
                </h2>
                <p className="text-xs text-muted-foreground">Autonomous workflows protected by human verification.</p>
              </div>

              <div className="border border-border bg-card p-5 space-y-4 shadow-2xs">
                <div className="flex items-center justify-between pb-3 border-b border-border">
                  <span className="text-xs font-semibold text-foreground">Operational Status</span>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-status-success-fg flex items-center gap-1">
                    <span className="w-1.5 h-1.5 bg-status-success-fg rounded-none" />
                    Active Guard
                  </span>
                </div>

                <p className="text-xs text-muted-foreground leading-relaxed">
                  The Nexus AI Agent continuously inspects your CRM touchpoints, billing events, and marketing funnels. High-consequence side effects pause automatically for review.
                </p>

                {/* Empty State / Safe Queue */}
                <div className="p-4 bg-muted/20 border border-border text-center space-y-2">
                  <TickCircle size="24" className="mx-auto text-status-success-fg" />
                  <p className="text-xs font-semibold text-foreground">All Clear: 0 Pending Approvals</p>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    No mass updates, invoice refunds, or email dispatches waiting for signature.
                  </p>
                </div>

                <div className="pt-2">
                  <Button variant="outline" size="sm" className="w-full text-xs h-9 cursor-pointer justify-between">
                    <span>Inspect Agent Audit Log</span>
                    <ArrowRight size="12" />
                  </Button>
                </div>
              </div>

              {/* Quick Tenant Info */}
              <div className="border border-border bg-sidebar p-4 text-xs space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground font-semibold uppercase text-[10px] tracking-wider">Tenant Architecture</span>
                  <span className="text-foreground font-mono text-[10px]">1:1 Bound</span>
                </div>
                <p className="text-muted-foreground text-[11px] leading-relaxed">
                  Single-owner account strictly isolated via PostgreSQL Row Level Security. Cross-tenant leakage is cryptographically prevented.
                </p>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
