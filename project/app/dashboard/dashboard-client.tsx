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
    { id: "overview", label: "Overview", icon: Activity },
    { id: "crm", label: "Intelligent CRM", icon: SecurityUser },
    { id: "billing", label: "Billing & Plans", icon: CardIcon },
    { id: "website", label: "Website Builder", icon: Global },
    { id: "marketing", label: "Campaigns", icon: DirectSend },
    { id: "webinars", label: "Webinars", icon: VideoPlay },
    { id: "agent", label: "AI Business Agent", icon: Magicpen },
    { id: "approvals", label: "Approval Queue", icon: TickCircle },
  ];

  const modules = [
    {
      id: "crm",
      title: "Intelligent CRM",
      description: "Manage customer lifecycles, track touchpoints, and sync contacts with billing records.",
      icon: SecurityUser,
      meta: "0 Contacts recorded",
      action: "Manage CRM",
    },
    {
      id: "billing",
      title: "SaaS Billing & Subscriptions",
      description: "Automated recurring plans, usage-based metering, and Stripe customer invoicing.",
      icon: CardIcon,
      meta: "₹0.00 Current MRR",
      action: "View Invoices",
    },
    {
      id: "website",
      title: "Visual Website Builder",
      description: "Customize and deploy responsive landing pages with instant live previews.",
      icon: Global,
      meta: "1 Active public site",
      action: "Open Studio",
    },
    {
      id: "marketing",
      title: "Marketing Automation",
      description: "Automate dynamic customer segments triggered by real-time billing and product usage.",
      icon: DirectSend,
      meta: "0 Active campaigns",
      action: "Build Flow",
    },
    {
      id: "webinars",
      title: "Webinar Management",
      description: "Host live interactive events with attendance analytics and auto follow-up workflows.",
      icon: VideoPlay,
      meta: "0 Upcoming events",
      action: "Create Event",
    },
    {
      id: "agent",
      title: "AI Business Agent",
      description: "Autonomous multi-step business operations with mandatory human approval checkpoints.",
      icon: Magicpen,
      meta: "Semantic graph linked",
      action: "Configure Agent",
    },
  ];

  return (
    <div className="min-h-screen flex bg-background text-foreground overflow-x-hidden">
      {/* Mobile Drawer Backdrop */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-xs lg:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* --- COLLAPSIBLE APP SIDEBAR --- */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex flex-col bg-sidebar transition-all duration-300 ease-in-out lg:static shrink-0 ${
          mobileMenuOpen ? "translate-x-0 w-64" : "-translate-x-full lg:translate-x-0"
        } ${sidebarOpen ? "lg:w-64" : "lg:w-16"}`}
      >
        {/* Sidebar Header Brand (Clean, no cramped button collisions) */}
        <div
          className={`h-16 flex items-center bg-sidebar shrink-0 px-4 ${
            sidebarOpen ? "justify-between" : "justify-center px-0"
          }`}
        >
          <Link href="/" className="flex items-center gap-2.5 overflow-hidden">
            <div className="w-8 h-8 bg-brand rounded-sm flex items-center justify-center shrink-0">
              <span className="text-brand-foreground font-display font-bold text-lg leading-none">N</span>
            </div>
            {sidebarOpen && (
              <div className="flex flex-col min-w-0">
                <span className="font-display font-bold text-base tracking-tight leading-none">Nexus</span>
                <span className="text-[10px] text-muted-foreground uppercase tracking-wider truncate mt-0.5 font-medium">
                  Workspace
                </span>
              </div>
            )}
          </Link>

          {/* Mobile-only close button */}
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

        {/* Workspace Identity Bar (Only visible when expanded) */}
        {sidebarOpen && (
          <div className="px-4 py-3 bg-muted/10 flex items-center justify-between shrink-0 mb-2">
            <div className="min-w-0">
              <p className="text-xs font-semibold truncate text-foreground">{user.username}&apos;s Workspace</p>
              <p className="text-[10px] text-muted-foreground truncate font-mono">Single-Tenant DB</p>
            </div>
          </div>
        )}

        {/* Navigation Items (Clean, zero filler pills) */}
        <div className="flex-1 overflow-y-auto py-3 px-2 space-y-1">
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
                } ${!sidebarOpen ? "justify-center px-0" : ""}`}
                title={item.label}
              >
                <IconComp size="18" className={isActive ? "text-brand-text" : "text-muted-foreground"} />
                {sidebarOpen && <span className="truncate flex-1 text-left">{item.label}</span>}
              </button>
            );
          })}
        </div>

        {/* Sidebar Footer User Info & Sign Out */}
        <div className="p-3 bg-sidebar shrink-0 flex flex-col gap-2">
          {sidebarOpen ? (
            <div className="flex items-center justify-between p-2 rounded-sm bg-muted/20">
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
        {/* Top 64px Application Header */}
        <header className="sticky top-0 z-30 h-16 bg-background/95 backdrop-blur-sm flex items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            {/* Dedicated Sidebar Toggle (Clean, standard icon, never collides with brand logo) */}
            <button
              type="button"
              onClick={() => {
                if (window.innerWidth >= 1024) {
                  setSidebarOpen(!sidebarOpen);
                } else {
                  setMobileMenuOpen(!mobileMenuOpen);
                }
              }}
              className="p-2 rounded-sm text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors cursor-pointer"
              title={sidebarOpen ? "Collapse sidebar" : "Expand sidebar"}
              aria-label="Toggle sidebar"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <rect x="3" y="3" width="18" height="18" rx="2" strokeWidth="2" />
                <path d="M9 3v18" strokeWidth="2" />
              </svg>
            </button>

            <div className="h-4 w-px bg-muted/40" />

            {/* Breadcrumb Path */}
            <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
              <span className="text-foreground font-semibold">{user.username}</span>
              <span>/</span>
              <span className="capitalize">{activeTab}</span>
            </div>
          </div>

          {/* Right Header Utilities (Zero decorative pills) */}
          <div className="flex items-center gap-3">
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
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2">
            <div>
              <h1 className="font-display text-page-sm md:text-page font-bold tracking-tight text-foreground">
                Workspace Operations
              </h1>
              <p className="text-sm text-muted-foreground mt-1">
                Nexus Unified Operating Platform • Account: <span className="text-foreground font-medium">{user.email || user.username}</span>
              </p>
            </div>

            <div className="flex items-center gap-3">
              <Button variant="primary" size="md" className="gap-2 cursor-pointer shadow-sm">
                <Magicpen size="16" className="text-brand-foreground" />
                <span>Prompt AI Agent</span>
              </Button>
            </div>
          </div>

          {/* Architectural Metric Strip (Pure data, zero filler pills) */}
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
            {/* Left 8/12: Core Business Modules (Authoritative, no filler pills) */}
            <div className="lg:col-span-8 space-y-4">
              <div>
                <h2 className="font-display text-lg font-bold tracking-tight">Core Business Modules</h2>
                <p className="text-xs text-muted-foreground">Select an operational domain to manage your business graph.</p>
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
                        <h3 className="font-display font-bold text-base tracking-tight mb-1">{mod.title}</h3>
                        <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">{mod.description}</p>
                      </div>

                      <div className="pt-4 mt-4 flex items-center justify-between">
                        <span className="text-[11px] font-mono text-muted-foreground">{mod.meta}</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 text-xs gap-1 group-hover:text-foreground cursor-pointer px-2 bg-muted/30 hover:bg-muted/60"
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
                  The Nexus AI Agent continuously inspects your CRM touchpoints, billing events, and marketing funnels. Consequential side effects pause automatically for review.
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
                  <Button variant="secondary" size="sm" className="w-full text-xs h-9 cursor-pointer justify-between bg-muted/40 hover:bg-muted/60">
                    <span>Inspect Agent Audit Log</span>
                    <ArrowRight size="12" />
                  </Button>
                </div>
              </div>

              {/* Tenant Isolation Info */}
              <div className="bg-sidebar/60 p-4 rounded-sm text-xs space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground font-semibold uppercase text-[10px] tracking-wider">Tenant Scope</span>
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
