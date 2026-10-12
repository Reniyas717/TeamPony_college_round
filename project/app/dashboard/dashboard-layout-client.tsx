"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import {
  Global,
  SecurityUser,
  Card as CardIcon,
  DirectSend,
  VideoPlay,
  LogoutCurve,
  Activity,
  ShieldSecurity,
  Routing,
  TrendUp,
  Chart21,
} from "iconsax-react";

interface DashboardLayoutClientProps {
  user: {
    id: string;
    email: string | undefined;
    username: string;
    workspaceName?: string;
  };
  children: React.ReactNode;
}

export default function DashboardLayoutClient({
  user,
  children,
}: DashboardLayoutClientProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [loggingOut, setLoggingOut] = React.useState(false);
  const [sidebarOpen, setSidebarOpen] = React.useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);

  const handleNavigate = () => {
    setMobileMenuOpen(false);
  };

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await fetch("/api/auth/session", { method: "POST" });
    } catch {
      // Ignore network errors on logout to allow clean redirect
    } finally {
      window.location.href = "/login";
    }
  };

  const navGroups = [
    {
      label: "Workspace",
      items: [
        { href: "/dashboard", label: "Overview", icon: Activity },
        { href: "/dashboard/crm", label: "Intelligent CRM", icon: SecurityUser },
        { href: "/dashboard/billing", label: "Billing & Plans", icon: CardIcon },
      ]
    },
    {
      label: "Growth",
      items: [
        { href: "/dashboard/website", label: "Website Builder", icon: Global },
        { href: "/dashboard/marketing", label: "Campaigns", icon: DirectSend },
        { href: "/dashboard/webinars", label: "Webinars", icon: VideoPlay },
        { href: "/dashboard/intelligence", label: "Customer Journey", icon: TrendUp },
      ]
    },
    {
      label: "Intelligence",
      items: [
        { href: "/dashboard/analytics", label: "Analytics & ML", icon: Chart21 },
        { href: "/dashboard/workflows", label: "AI Workflows", icon: Routing },
      ]
    },
    {
      label: "System",
      items: [
        { href: "/dashboard/audit-logs", label: "Audit Logs", icon: ShieldSecurity },
      ]
    }
  ];

  // Derive current section label for breadcrumb
  const currentItem = navGroups.flatMap(g => g.items).find((item) =>
    item.href === "/dashboard"
      ? pathname === "/dashboard"
      : pathname.startsWith(item.href)
  );
  const sectionLabel = currentItem?.label || "Workspace";

  return (
    <div className="h-screen w-screen flex bg-background text-foreground overflow-hidden">

      {/* Mobile Drawer Backdrop */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-xs lg:hidden cursor-pointer"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* --- COLLAPSIBLE APP SIDEBAR (Fixed/Locked, never scrolls up) --- */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex flex-col bg-sidebar border-r border-border/40 transition-all duration-300 ease-in-out lg:static lg:h-full shrink-0 ${
          mobileMenuOpen ? "translate-x-0 w-64" : "-translate-x-full lg:translate-x-0"
        } ${sidebarOpen ? "lg:w-64" : "lg:w-16"}`}
      >
        {/* Sidebar Header Brand */}
        <div
          className={`h-16 flex items-center bg-sidebar shrink-0 px-4 border-b border-border/40 ${
            sidebarOpen ? "justify-between" : "justify-center px-0"
          }`}
        >
          <Link href="/dashboard" className="flex items-center gap-2.5 overflow-hidden cursor-pointer">
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


        {/* Navigation Items (Distinct routes with instant loading feedback) */}
        <nav className="flex-1 overflow-y-auto py-4 px-2 space-y-5 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
          {navGroups.map((group, groupIdx) => (
            <div key={groupIdx} className="space-y-1">
              {sidebarOpen && (
                <p className="px-3 text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-2">
                  {group.label}
                </p>
              )}
              {group.items.map((item) => {
                const IconComp = item.icon;
                const isActive =
                  item.href === "/dashboard"
                    ? pathname === "/dashboard"
                    : pathname.startsWith(item.href);

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={handleNavigate}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-sm text-xs font-medium transition-colors cursor-pointer ${
                      isActive
                        ? "bg-accent text-foreground font-semibold shadow-xs"
                        : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
                    } ${!sidebarOpen ? "justify-center px-0" : ""}`}
                    title={item.label}
                  >
                    <IconComp
                      size="18"
                      className={isActive ? "text-brand" : "text-muted-foreground"}
                    />
                    {sidebarOpen && (
                      <span className="truncate">{item.label}</span>
                    )}
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>

        {/* Sidebar Footer User Info & Sign Out (Permanently pinned at bottom) */}
        <div className="p-3 bg-sidebar border-t border-border/40 shrink-0 flex flex-col gap-2 mt-auto">
          {sidebarOpen ? (
            <div className="flex items-center justify-between gap-2 p-2 rounded-sm bg-muted/20 border border-border/30">
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold truncate text-foreground">{user.username}</p>
                <p className="text-[10px] text-muted-foreground truncate font-mono">{user.email || "Active User"}</p>
              </div>
              <button
                type="button"
                onClick={handleLogout}
                disabled={loggingOut}
                className="inline-flex items-center gap-1 px-2 py-1 rounded-sm text-[11px] font-medium text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors cursor-pointer shrink-0"
                title="Sign out"
                aria-label="Sign out"
              >
                <LogoutCurve size="14" />
                <span>{loggingOut ? "..." : "Sign out"}</span>
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={handleLogout}
              disabled={loggingOut}
              className="w-full flex items-center justify-center p-2 rounded-sm hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors cursor-pointer"
              title="Sign out"
              aria-label="Sign out"
            >
              <LogoutCurve size="18" />
            </button>
          )}
        </div>
      </aside>

      {/* --- MAIN APPLICATION CANVAS (Independent scroll container) --- */}
      <div className="flex-1 flex flex-col h-full min-w-0 overflow-hidden">
        {/* Top 64px Application Header */}
        <header className="shrink-0 h-16 bg-background/95 backdrop-blur-sm flex items-center justify-between px-4 sm:px-6 lg:px-8 border-b border-border/40 z-20">
          <div className="flex items-center gap-3">
            {/* Sidebar Collapse / Mobile Toggle */}
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
              <Link href="/dashboard" className="text-muted-foreground hover:text-foreground cursor-pointer">
                Nexus
              </Link>
              <span>/</span>
              <span className="text-foreground font-semibold">{sectionLabel}</span>
            </div>
          </div>

          {/* Right Header Utilities */}
          <div className="flex items-center gap-3">
            <ThemeToggle />
          </div>
        </header>

        {/* Dynamic Route Canvas - Smooth internal scrolling */}
        <main className="flex-1 min-w-0 overflow-y-auto relative">
          {children}
        </main>
      </div>
    </div>
  );
}
