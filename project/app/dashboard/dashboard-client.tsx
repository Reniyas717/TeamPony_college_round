"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
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
  Activity,
  ChartSquare
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

  const modules = [
    {
      title: "Visual Website Builder",
      description: "Create and customize responsive pages with real-time preview.",
      icon: Global,
      badge: "Ready",
      badgeColor: "status-success",
      link: "#builder",
    },
    {
      title: "Intelligent CRM",
      description: "Manage leads, track customer lifecycle, and analyze touchpoints.",
      icon: SecurityUser,
      badge: "Active",
      badgeColor: "status-success",
      link: "#crm",
    },
    {
      title: "SaaS Billing & Subscriptions",
      description: "Manage recurring plans, usage-based metering, and customer invoices.",
      icon: CardIcon,
      badge: "Synced",
      badgeColor: "status-info",
      link: "#billing",
    },
    {
      title: "Marketing Automation",
      description: "Design automated campaigns and segment customers dynamically.",
      icon: DirectSend,
      badge: "Operational",
      badgeColor: "status-success",
      link: "#marketing",
    },
    {
      title: "Webinar Management",
      description: "Host live interactive events, track attendance, and trigger follow-ups.",
      icon: VideoPlay,
      badge: "Ready",
      badgeColor: "status-info",
      link: "#webinars",
    },
    {
      title: "AI Business Agent",
      description: "Execute autonomous multi-step operations with human approval checkpoints.",
      icon: Magicpen,
      badge: "Standing by",
      badgeColor: "brand",
      link: "#ai-agent",
    },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      {/* Authenticated Top Navbar */}
      <nav className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Link href="/" className="flex items-center gap-2">
              <div className="w-8 h-8 bg-brand rounded-sm flex items-center justify-center">
                <span className="text-brand-foreground font-display font-bold text-xl leading-none">N</span>
              </div>
              <span className="font-display font-semibold text-lg tracking-tight">Nexus</span>
            </Link>
            <div className="h-4 w-px bg-border hidden sm:block" />
            <div className="text-xs font-semibold px-2.5 py-1 rounded bg-secondary text-foreground hidden sm:inline-block">
              {user.username}&apos;s Workspace
            </div>
          </div>

          <div className="flex items-center gap-3">
            <ThemeToggle />
            <Button
              variant="outline"
              size="sm"
              onClick={handleLogout}
              disabled={loggingOut}
              className="gap-1.5"
            >
              <LogoutCurve size="16" />
              <span>{loggingOut ? "Signing out..." : "Sign out"}</span>
            </Button>
          </div>
        </div>
      </nav>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 md:px-6 lg:px-8 py-8 space-y-8">
        {/* Welcome Banner */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border pb-6">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h1 className="font-display text-page-sm md:text-page font-bold tracking-tight">
                Welcome back, {user.username}
              </h1>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-status-success-bg text-status-success-fg border border-status-success-border">
                <TickCircle size="12" /> Authenticated
              </span>
            </div>
            <p className="text-sm text-muted-foreground">
              Single-Tenant Business Operating Platform • Active Account: {user.email || user.username}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Button variant="primary" size="md" className="gap-2">
              <Magicpen size="18" className="text-brand-foreground" />
              <span>Prompt AI Agent</span>
            </Button>
          </div>
        </div>

        {/* Real-time Status Card */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="p-4 flex flex-col gap-1">
            <div className="flex items-center justify-between text-muted-foreground text-xs font-semibold uppercase tracking-wider">
              <span>Platform Tenant</span>
              <Activity size="16" className="text-brand-text" />
            </div>
            <p className="font-display text-xl font-bold">Single-Owner</p>
            <p className="text-xs text-status-success-fg">Isolated DB Scope (RLS Active)</p>
          </Card>

          <Card className="p-4 flex flex-col gap-1">
            <div className="flex items-center justify-between text-muted-foreground text-xs font-semibold uppercase tracking-wider">
              <span>CRM Leads</span>
              <SecurityUser size="16" className="text-brand-text" />
            </div>
            <p className="font-display text-xl font-bold tabular-nums">0 Leads</p>
            <p className="text-xs text-muted-foreground">Ready to capture traffic</p>
          </Card>

          <Card className="p-4 flex flex-col gap-1">
            <div className="flex items-center justify-between text-muted-foreground text-xs font-semibold uppercase tracking-wider">
              <span>MRR / Subscriptions</span>
              <CardIcon size="16" className="text-brand-text" />
            </div>
            <p className="font-display text-xl font-bold tabular-nums">$0.00</p>
            <p className="text-xs text-muted-foreground">Stripe sync active</p>
          </Card>

          <Card className="p-4 flex flex-col gap-1">
            <div className="flex items-center justify-between text-muted-foreground text-xs font-semibold uppercase tracking-wider">
              <span>AI Action Queue</span>
              <ChartSquare size="16" className="text-brand-text" />
            </div>
            <p className="font-display text-xl font-bold">0 Pending</p>
            <p className="text-xs text-muted-foreground">Zero unreviewed actions</p>
          </Card>
        </div>

        {/* Modules Matrix */}
        <div className="space-y-4">
          <div>
            <h2 className="font-display text-xl font-bold tracking-tight">Platform Core Modules</h2>
            <p className="text-sm text-muted-foreground">Select a module to begin managing your operations.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {modules.map((mod, i) => {
              const IconComp = mod.icon;
              return (
                <Card key={i} className="hover:border-border-strong transition-all duration-200 group flex flex-col justify-between">
                  <CardHeader>
                    <div className="flex items-center justify-between mb-2">
                      <div className="w-10 h-10 rounded-sm bg-secondary flex items-center justify-center text-foreground group-hover:bg-brand-subtle group-hover:text-brand-text transition-colors">
                        <IconComp size="20" />
                      </div>
                      <span className="text-xs font-semibold px-2 py-0.5 rounded-xs bg-secondary text-muted-foreground">
                        {mod.badge}
                      </span>
                    </div>
                    <CardTitle className="text-lg">{mod.title}</CardTitle>
                    <CardDescription>{mod.description}</CardDescription>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <Button variant="outline" size="sm" className="w-full justify-between group-hover:bg-accent">
                      <span>Open Module</span>
                      <ArrowRight size="14" />
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </main>
    </div>
  );
}
