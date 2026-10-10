"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import {
  CustomerJourneyMap,
  JourneyMapStage,
  NexusTelemetry,
  StageEmotion,
} from "@/lib/validations/journey-map";
import {
  TrendUp,
  Danger,
  Flash,
  Activity,
  ArrowRight,
  TickCircle,
  CloseCircle,
  Global,
  VideoPlay,
  Card as CardIcon,
  DirectSend,
  SecurityUser,
  Magicpen,
  LogoutCurve,
  Refresh,
  Edit2,
  Trash,
  Add,
  InfoCircle,
  Hierarchy,
  Diagram,
  Code,
  Copy,
} from "iconsax-react";

interface IntelligenceClientProps {
  initialJourneyMaps: CustomerJourneyMap[];
  initialTelemetry: NexusTelemetry;
  user: {
    username: string;
    email?: string;
    workspaceName?: string;
  };
}

interface StrategyPlaybook {
  id: string;
  title: string;
  subtitle: string;
  prompt: string;
  stagesCount: number;
  expectedImpact: string;
  targetModules: string[];
  icon: React.ComponentType<{ size?: string | number; className?: string }>;
}

export default function IntelligenceClient({
  initialJourneyMaps,
  initialTelemetry,
  user,
}: IntelligenceClientProps) {
  const router = useRouter();
  const [loggingOut, setLoggingOut] = React.useState(false);
  const [sidebarOpen, setSidebarOpen] = React.useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);

  // Journeys State
  const [maps, setMaps] = React.useState<CustomerJourneyMap[]>(initialJourneyMaps);
  const [selectedMapId, setSelectedMapId] = React.useState<string>(
    initialJourneyMaps[0]?.id || ""
  );

  // Active Map & Active Stage
  const currentMap = maps.find((m) => m.id === selectedMapId) || maps[0] || null;
  const [selectedStageId, setSelectedStageId] = React.useState<string | null>(
    initialJourneyMaps[0]?.stages[0]?.id || null
  );

  const handleSelectMap = (id: string) => {
    setSelectedMapId(id);
    const target = maps.find((m) => m.id === id);
    if (target?.stages[0]) {
      setSelectedStageId(target.stages[0].id);
    }
  };

  // View Mode: 'pipeline' (Interactive Funnel), 'mermaid' (Rendered Mermaid Visualization), 'grid' (Stage Matrix)
  const [viewMode, setViewMode] = React.useState<"pipeline" | "mermaid" | "grid">("pipeline");

  // Mermaid Rendered SVG State & Code View Toggle
  const [mermaidSvg, setMermaidSvg] = React.useState<string>("");
  const [mermaidRendering, setMermaidRendering] = React.useState<boolean>(false);
  const [showMermaidRawCode, setShowMermaidRawCode] = React.useState<boolean>(false);
  const [copiedMermaid, setCopiedMermaid] = React.useState(false);

  // Telemetry from live Nexus environment
  const [telemetry] = React.useState<NexusTelemetry>(initialTelemetry);

  // Natural Language Input State
  const [objectiveInput, setObjectiveInput] = React.useState("");
  const [generating, setGenerating] = React.useState(false);
  const [showNewGoalForm, setShowNewGoalForm] = React.useState(
    initialJourneyMaps.length === 0
  );
  const [selectedPlaybookId, setSelectedPlaybookId] = React.useState<string | null>(null);

  // Stage Inspector / Detailed Editing State
  const [isEditingStage, setIsEditingStage] = React.useState(false);
  const [editStageName, setEditStageName] = React.useState("");
  const [editObjective, setEditObjective] = React.useState("");
  const [editEmotion, setEditEmotion] = React.useState<StageEmotion>("neutral");
  const [editFrictions, setEditFrictions] = React.useState<string[]>([]);
  const [editOpportunities, setEditOpportunities] = React.useState<string[]>([]);
  const [newFrictionInput, setNewFrictionInput] = React.useState("");
  const [newOpportunityInput, setNewOpportunityInput] = React.useState("");
  const [actionProcessingId, setActionProcessingId] = React.useState<string | null>(null);

  const activeStage = currentMap?.stages.find((s) => s.id === selectedStageId) || currentMap?.stages[0] || null;

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
    { id: "overview", label: "Overview", icon: Activity, href: "/dashboard" },
    { id: "intelligence", label: "Customer Journey", icon: TrendUp, href: "/dashboard/intelligence" },
    { id: "crm", label: "Intelligent CRM", icon: SecurityUser, href: "/crm" },
    { id: "billing", label: "Billing & Plans", icon: CardIcon },
    { id: "website", label: "Website Builder", icon: Global },
    { id: "marketing", label: "Campaigns", icon: DirectSend },
    { id: "webinars", label: "Webinars", icon: VideoPlay },
    { id: "agent", label: "AI Business Agent", icon: Magicpen },
    { id: "approvals", label: "Approval Queue", icon: TickCircle },
  ];

  // Curated Strategic Playbooks for Executive Generation
  const strategyPlaybooks: StrategyPlaybook[] = [
    {
      id: "conversion",
      title: "SaaS Paid Conversion Funnel",
      subtitle: "Landing Page → Pricing Consideration → Checkout conversion acceleration.",
      prompt: "I want to increase paid subscriptions for my SaaS business.",
      stagesCount: 6,
      expectedImpact: "+24% Paid Conversion Lift",
      targetModules: ["website", "crm"],
      icon: TrendUp,
    },
    {
      id: "activation",
      title: "Trial Onboarding & Aha! Milestone",
      subtitle: "Guide newly registered signups to their core value metric in under 4.5 minutes.",
      prompt: "Help me onboard new customers more effectively.",
      stagesCount: 5,
      expectedImpact: "+38% Day-1 Activation Velocity",
      targetModules: ["campaign", "website"],
      icon: Flash,
    },
    {
      id: "retention",
      title: "Proactive Churn Recovery & Retention",
      subtitle: "Detect usage deceleration and automated grace flows before cancellation.",
      prompt: "Reduce customer churn and retain inactive users.",
      stagesCount: 4,
      expectedImpact: "-45% Preventable Churn",
      targetModules: ["crm", "website"],
      icon: Danger,
    },
    {
      id: "expansion",
      title: "Subscription Renewal & Enterprise Upsell",
      subtitle: "Trigger capacity notifications at 85% quota and route high-value expansion deals.",
      prompt: "Increase subscription renewals and upsells.",
      stagesCount: 4,
      expectedImpact: "+30% Annual Tier Expansion",
      targetModules: ["crm", "website"],
      icon: CardIcon,
    },
    {
      id: "support",
      title: "Customer Support & Service Recovery",
      subtitle: "Instant AI diagnostic triage with automated 48-hour satisfaction verification.",
      prompt: "Improve customer support and complaint resolution.",
      stagesCount: 3,
      expectedImpact: "Instant Diagnostic SLA",
      targetModules: ["crm", "campaign"],
      icon: SecurityUser,
    },
    {
      id: "webinar",
      title: "High-Intent Webinar Funnel",
      subtitle: "Convert stalled consideration prospects with live interactive product masterclasses.",
      prompt: "Convert stalled pricing page visitors into paying subscribers with live webinar demos.",
      stagesCount: 5,
      expectedImpact: "+28% Consideration Velocity",
      targetModules: ["webinar", "crm"],
      icon: VideoPlay,
    },
  ];

  // Generate Mermaid Flowchart Syntax
  const generateMermaidCode = React.useCallback(() => {
    if (!currentMap || currentMap.stages.length === 0) return "";
    let code = "graph LR\n";
    code += `  %% Customer Journey Flow: ${currentMap.title}\n`;

    currentMap.stages.forEach((stg, idx) => {
      const nodeId = `S${idx + 1}`;
      const safeName = stg.stage_name.replace(/["()]/g, "");
      code += `  ${nodeId}["Step 0${idx + 1}: ${safeName}"]\n`;

      if (idx < currentMap.stages.length - 1) {
        const nextId = `S${idx + 2}`;
        const frictionLabel = stg.friction_points[0]
          ? stg.friction_points[0].slice(0, 32).replace(/["()]/g, "") + "..."
          : "Next Stage";
        code += `  ${nodeId} -->|"${frictionLabel}"| ${nextId}\n`;
      }
    });

    code += "\n  %% Styling conforming to Nexus Design System\n";
    code += "  classDef stepNode fill:#FDFBF7,stroke:#C25E38,stroke-width:2px,color:#18181B,rx:6,ry:6;\n";
    currentMap.stages.forEach((_, idx) => {
      code += `  class S${idx + 1} stepNode;\n`;
    });

    return code;
  }, [currentMap]);

  // Render Mermaid Visually in the Browser via dynamic import
  React.useEffect(() => {
    if (!currentMap || currentMap.stages.length === 0) return;
    let isMounted = true;

    async function renderMermaid() {
      setMermaidRendering(true);
      try {
        const mermaid = (await import("mermaid")).default;
        const isDark = typeof document !== "undefined" && document.documentElement.classList.contains("dark");

        mermaid.initialize({
          startOnLoad: false,
          securityLevel: "loose",
          theme: isDark ? "dark" : "neutral",
          fontFamily: "var(--font-sans), sans-serif",
        });

        const code = generateMermaidCode();
        const renderId = `mermaid-canvas-${Date.now()}`;
        const { svg } = await mermaid.render(renderId, code);
        if (isMounted) {
          setMermaidSvg(svg);
        }
      } catch (err) {
        console.error("Mermaid client render error:", err);
      } finally {
        if (isMounted) setMermaidRendering(false);
      }
    }

    renderMermaid();

    return () => {
      isMounted = false;
    };
  }, [currentMap, generateMermaidCode, viewMode]);

  // Generate Journey from Natural Language Input
  const handleGenerateJourney = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const prompt = objectiveInput.trim();
    if (!prompt) return;

    setGenerating(true);
    try {
      const res = await fetch("/api/journey-maps/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ objective: prompt }),
      });
      const json = await res.json();
      if (res.ok && json.data) {
        setMaps((prev) => [json.data, ...prev]);
        setSelectedMapId(json.data.id);
        setShowNewGoalForm(false);
        setSelectedStageId(json.data.stages[0]?.id || null);
        setObjectiveInput("");
        setSelectedPlaybookId(null);
      }
    } catch {
      // ignore
    } finally {
      setGenerating(false);
    }
  };

  // Stage Action Review & Execution Dispatch
  const handleActionApproval = async (
    mapId: string,
    actionId: string,
    decision: "approve" | "dismiss"
  ) => {
    setActionProcessingId(actionId);
    try {
      const res = await fetch(`/api/journey-maps/${mapId}/actions/${actionId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ decision }),
      });
      const json = await res.json();
      if (res.ok && json.data) {
        setMaps((prev) =>
          prev.map((m) => {
            if (m.id !== mapId) return m;
            return {
              ...m,
              stages: m.stages.map((stg) => ({
                ...stg,
                actions: stg.actions.map((act) =>
                  act.id === actionId
                    ? {
                        ...act,
                        status: json.data.status,
                        executed_at: json.data.executed_at,
                        execution_result: json.data.execution_result,
                      }
                    : act
                ),
              })),
            };
          })
        );
      }
    } catch {
      // ignore
    } finally {
      setActionProcessingId(null);
    }
  };

  // Open Edit Stage
  const handleOpenEditStage = (stage: JourneyMapStage) => {
    setSelectedStageId(stage.id);
    setEditStageName(stage.stage_name);
    setEditObjective(stage.objective);
    setEditEmotion(stage.emotion);
    setEditFrictions([...stage.friction_points]);
    setEditOpportunities([...stage.opportunities]);
    setNewFrictionInput("");
    setNewOpportunityInput("");
    setIsEditingStage(true);
  };

  // Save Stage Edits
  const handleSaveStageEdits = () => {
    if (!currentMap || !selectedStageId) return;

    setMaps((prev) =>
      prev.map((m) => {
        if (m.id !== currentMap.id) return m;
        return {
          ...m,
          stages: m.stages.map((stg) => {
            if (stg.id !== selectedStageId) return stg;
            return {
              ...stg,
              stage_name: editStageName.trim() || stg.stage_name,
              objective: editObjective.trim() || stg.objective,
              emotion: editEmotion,
              friction_points: editFrictions.length > 0 ? editFrictions : stg.friction_points,
              opportunities: editOpportunities.length > 0 ? editOpportunities : stg.opportunities,
            };
          }),
        };
      })
    );
    setIsEditingStage(false);
  };

  // Delete a Stage
  const handleDeleteStage = (stageId: string) => {
    if (!currentMap) return;
    if (currentMap.stages.length <= 1) return;

    setMaps((prev) =>
      prev.map((m) => {
        if (m.id !== currentMap.id) return m;
        const filtered = m.stages.filter((s) => s.id !== stageId);
        filtered.forEach((s, idx) => {
          s.order_index = idx + 1;
        });
        return { ...m, stages: filtered };
      })
    );
    if (selectedStageId === stageId) {
      setSelectedStageId(currentMap.stages[0]?.id || null);
    }
  };

  // Add a New Stage
  const handleAddNewStage = () => {
    if (!currentMap) return;
    const newIdx = currentMap.stages.length + 1;
    const newStageId = `stg-${currentMap.id}-${Date.now()}`;
    const newStage: JourneyMapStage = {
      id: newStageId,
      journey_map_id: currentMap.id,
      order_index: newIdx,
      stage_key: `stage_${newIdx}`,
      stage_name: `0${newIdx}. New Milestone`,
      objective: "Define core business milestone and expected customer reaction",
      customer_actions: ["Interacts with platform touchpoint"],
      touchpoints: ["Website"],
      customer_needs: ["Fast resolution and transparent expectations"],
      customer_thoughts: ["Is this tool the fastest way to achieve my desired business outcome?"],
      emotion: "neutral",
      friction_points: ["Bottleneck causing drop-off or hesitation"],
      opportunities: ["Tactical lever to accelerate customer progression"],
      findings_type: "hypothesis",
      actions: [],
    };

    setMaps((prev) =>
      prev.map((m) => {
        if (m.id !== currentMap.id) return m;
        return { ...m, stages: [...m.stages, newStage] };
      })
    );
    setSelectedStageId(newStageId);
    handleOpenEditStage(newStage);
  };

  const getModuleBadge = (mod: string) => {
    switch (mod) {
      case "website":
        return (
          <span className="inline-flex items-center gap-1 text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-brand/10 text-brand-text">
            <Global size="11" /> Website Studio
          </span>
        );
      case "campaign":
        return (
          <span className="inline-flex items-center gap-1 text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-status-success-subtle text-status-success-fg">
            <DirectSend size="11" /> Marketing Campaigns
          </span>
        );
      case "webinar":
        return (
          <span className="inline-flex items-center gap-1 text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-status-info-subtle text-status-info-fg">
            <VideoPlay size="11" /> Webinar Hub
          </span>
        );
      case "crm":
        return (
          <span className="inline-flex items-center gap-1 text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-secondary text-foreground">
            <SecurityUser size="11" /> Intelligent CRM
          </span>
        );
      default:
        return (
          <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-muted text-muted-foreground">
            {mod}
          </span>
        );
    }
  };

  const getEmotionBadge = (emotion: string) => {
    switch (emotion) {
      case "delighted":
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> High Delight
          </span>
        );
      case "positive":
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded bg-sky-500/10 text-sky-600 dark:text-sky-400">
            <span className="w-1.5 h-1.5 rounded-full bg-sky-500" /> Positive Sentiment
          </span>
        );
      case "confused":
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" /> Hesitation Risk
          </span>
        );
      case "frustrated":
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded bg-rose-500/10 text-rose-600 dark:text-rose-400">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500" /> Severe Friction
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded bg-slate-500/10 text-slate-600 dark:text-slate-400">
            <span className="w-1.5 h-1.5 rounded-full bg-slate-500" /> Neutral Sentiment
          </span>
        );
    }
  };

  const handleCopyMermaid = () => {
    const code = generateMermaidCode();
    if (navigator.clipboard) {
      navigator.clipboard.writeText(code);
      setCopiedMermaid(true);
      setTimeout(() => setCopiedMermaid(false), 2000);
    }
  };

  const getStageDropoffRate = (idx: number) => {
    if (idx === 0) return { stepRetention: "100%", dropoff: "35% Bounce Rate" };
    if (idx === 1) return { stepRetention: "65%", dropoff: "42% Consideration Drop" };
    if (idx === 2) return { stepRetention: "38%", dropoff: "55% Form Abandonment" };
    if (idx === 3) return { stepRetention: "17%", dropoff: "40% Activation Lag" };
    if (idx === 4) return { stepRetention: "10.2%", dropoff: "28% Billing Hesitation" };
    return { stepRetention: `${Math.max(4, 10 - idx * 1.5).toFixed(1)}%`, dropoff: "12% Churn Risk" };
  };

  return (
    <div className="h-screen flex bg-background text-foreground overflow-hidden">
      {/* Mobile Drawer Backdrop */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-xs lg:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* --- SIDEBAR --- */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex flex-col bg-sidebar transition-all duration-300 ease-in-out lg:static shrink-0 ${
          mobileMenuOpen ? "translate-x-0 w-64" : "-translate-x-full lg:translate-x-0"
        } ${sidebarOpen ? "lg:w-64" : "lg:w-16"}`}
      >
        <div
          className={`h-14 flex items-center bg-sidebar shrink-0 px-4 ${
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

          <button
            type="button"
            onClick={() => setMobileMenuOpen(false)}
            className="lg:hidden p-1.5 rounded-sm text-muted-foreground hover:text-foreground cursor-pointer"
            aria-label="Close navigation"
          >
            <CloseCircle size="18" />
          </button>
        </div>

        {sidebarOpen && (
          <div className="px-4 py-2 bg-muted/10 flex items-center justify-between shrink-0 mb-1 border-b border-border/40">
            <div className="min-w-0">
              <p className="text-xs font-semibold truncate text-foreground">{user.workspaceName || `${user.username}'s Workspace`}</p>
              <p className="text-[10px] text-muted-foreground truncate font-mono">Single-Tenant DB</p>
            </div>
          </div>
        )}

        <div className="flex-1 overflow-y-auto no-scrollbar py-2 px-2 space-y-1">
          {navItems.map((item) => {
            const IconComp = item.icon;
            const isActive = item.id === "intelligence";
            if (item.href) {
              return (
                <Link
                  key={item.id}
                  href={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-sm text-xs font-medium transition-colors cursor-pointer ${
                    isActive
                      ? "bg-accent text-foreground font-semibold shadow-xs"
                      : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
                  } ${!sidebarOpen ? "justify-center px-0" : ""}`}
                  title={item.label}
                >
                  <IconComp size="18" className={isActive ? "text-brand-text" : "text-muted-foreground"} />
                  {sidebarOpen && <span className="truncate flex-1 text-left">{item.label}</span>}
                </Link>
              );
            }
            return (
              <button
                key={item.id}
                type="button"
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-sm text-xs font-medium transition-colors cursor-pointer ${
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

        <div className="p-2.5 bg-sidebar shrink-0 border-t border-border/40">
          {sidebarOpen ? (
            <div className="flex items-center justify-between p-1.5 rounded-sm bg-muted/20">
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold truncate text-foreground">{user.username}</p>
                <p className="text-[10px] text-muted-foreground truncate">{user.email || "Active User"}</p>
              </div>
              <button
                type="button"
                onClick={handleLogout}
                disabled={loggingOut}
                className="p-1 text-muted-foreground hover:text-destructive transition-colors cursor-pointer"
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
              className="w-full flex items-center justify-center p-1.5 rounded-sm hover:bg-accent text-muted-foreground hover:text-destructive transition-colors cursor-pointer"
              title="Sign out"
              aria-label="Sign out"
            >
              <LogoutCurve size="18" />
            </button>
          )}
        </div>
      </aside>

      {/* --- WORKSTATION MAIN VIEWPORT --- */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        {/* Compact Workspace Header */}
        <header className="shrink-0 h-14 bg-background/95 backdrop-blur-sm flex items-center justify-between px-4 sm:px-6 border-b border-border/40">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => {
                if (window.innerWidth >= 1024) {
                  setSidebarOpen(!sidebarOpen);
                } else {
                  setMobileMenuOpen(!mobileMenuOpen);
                }
              }}
              className="p-1.5 rounded-sm text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors cursor-pointer"
              title={sidebarOpen ? "Collapse sidebar" : "Expand sidebar"}
              aria-label="Toggle sidebar"
            >
              <Hierarchy size="18" />
            </button>

            <div className="h-4 w-px bg-muted/40" />

            <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
              <span className="text-foreground font-semibold">{user.username}</span>
              <span>/</span>
              <span className="capitalize">Customer Journey Studio</span>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <ThemeToggle />
            <Button variant="outline" size="sm" asChild className="text-xs h-8">
              <Link href="/dashboard">Return to Hub</Link>
            </Button>
          </div>
        </header>

        {/* WORKSPACE TOOLBAR & TELEMETRY STRIP */}
        <div className="shrink-0 bg-card/60 border-b border-border px-4 sm:px-6 py-2.5 flex flex-wrap items-center justify-between gap-3">
          {/* Left: Journey Title & Switcher */}
          <div className="flex items-center gap-3 min-w-0">
            {currentMap && !showNewGoalForm ? (
              <div className="flex items-center gap-2 min-w-0">
                <span className="font-display font-bold text-sm text-foreground truncate">
                  {currentMap.title}
                </span>
                <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-brand/10 text-brand-text shrink-0">
                  {currentMap.journey_type}
                </span>

                {maps.length > 1 && (
                  <select
                    value={selectedMapId}
                    onChange={(e) => handleSelectMap(e.target.value)}
                    aria-label="Switch active journey map"
                    className="text-xs bg-secondary text-foreground px-2 py-1 rounded border border-border cursor-pointer focus:outline-hidden"
                  >
                    {maps.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.title}
                      </option>
                    ))}
                  </select>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <span className="font-display font-bold text-sm text-foreground">
                  Customer Journey Intelligence
                </span>
                <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-brand/10 text-brand-text">
                  Bayesian Funnel Modeler
                </span>
              </div>
            )}
          </div>

          {/* Right: View Mode Tabs & New Journey Button */}
          <div className="flex items-center gap-2">
            {currentMap && !showNewGoalForm && (
              <div className="flex items-center p-0.5 rounded bg-secondary border border-border/60">
                <button
                  type="button"
                  onClick={() => setViewMode("pipeline")}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-semibold transition-colors cursor-pointer ${
                    viewMode === "pipeline"
                      ? "bg-background text-foreground shadow-xs"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Diagram size="13" />
                  <span>Funnel Flow</span>
                </button>

                <button
                  type="button"
                  onClick={() => setViewMode("mermaid")}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-semibold transition-colors cursor-pointer ${
                    viewMode === "mermaid"
                      ? "bg-background text-foreground shadow-xs"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Code size="13" />
                  <span>Mermaid Visual</span>
                </button>

                <button
                  type="button"
                  onClick={() => setViewMode("grid")}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-semibold transition-colors cursor-pointer ${
                    viewMode === "grid"
                      ? "bg-background text-foreground shadow-xs"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Hierarchy size="13" />
                  <span>Stage Matrix</span>
                </button>
              </div>
            )}

            {currentMap && !showNewGoalForm ? (
              <Button
                variant="primary"
                size="sm"
                onClick={() => setShowNewGoalForm(true)}
                className="gap-1.5 cursor-pointer text-xs h-7 shadow-xs"
              >
                <Magicpen size="13" />
                <span>New Journey</span>
              </Button>
            ) : (
              currentMap && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowNewGoalForm(false)}
                  className="gap-1 cursor-pointer text-xs h-7"
                >
                  <span>View Current Map</span>
                  <ArrowRight size="12" />
                </Button>
              )
            )}
          </div>
        </div>

        {/* COMPACT CROSS-NEXUS TELEMETRY STRIP */}
        <div className="shrink-0 bg-muted/20 border-b border-border/50 px-4 sm:px-6 py-1.5 flex flex-wrap items-center justify-between text-[11px] text-muted-foreground gap-2">
          <div className="flex items-center gap-4 overflow-x-auto no-scrollbar whitespace-nowrap">
            <span className="flex items-center gap-1 text-foreground font-semibold">
              <Activity size="13" className="text-brand-text" /> Signals:
            </span>
            <span className="flex items-center gap-1">
              <SecurityUser size="12" /> CRM: <strong className="text-foreground">{telemetry.crmContactsCount} Contacts</strong>
            </span>
            <span className="flex items-center gap-1">
              <CardIcon size="12" /> MRR: <strong className="text-foreground">₹{telemetry.billingMrr.toFixed(2)}</strong>
            </span>
            <span className="flex items-center gap-1">
              <Global size="12" /> Sites: <strong className="text-foreground">{telemetry.activeWebsites} Live</strong>
            </span>
            <span className="flex items-center gap-1">
              <DirectSend size="12" /> Campaigns: <strong className="text-foreground">{telemetry.activeCampaigns} Active</strong>
            </span>
          </div>
          <span className="text-[10px] font-mono text-muted-foreground hidden md:inline">
            Unit Economics Grounded
          </span>
        </div>

        {/* WORKSPACE DYNAMIC SPLIT LAYOUT */}
        <div className="flex-1 overflow-hidden p-4 sm:p-5">
          {/* ========================================================= */}
          {/* 1. STUDIO COMMAND CENTER & PLAYBOOK CONSOLE (NO EMPTY SPACE) */}
          {/* ========================================================= */}
          {(showNewGoalForm || !currentMap) ? (
            <div className="h-full grid grid-cols-1 lg:grid-cols-12 gap-5 overflow-hidden">
              {/* LEFT COLUMN: NATURAL LANGUAGE CONSOLE & PLAYBOOK MATRIX (7 cols) */}
              <div className="lg:col-span-7 flex flex-col h-full overflow-hidden bg-card/60 rounded border border-border p-4 sm:p-5 space-y-4">
                <div className="shrink-0 space-y-1">
                  <div className="flex items-center gap-2">
                    <h2 className="font-display text-base sm:text-lg font-bold text-foreground flex items-center gap-2">
                      <Magicpen size="20" className="text-brand-text" />
                      <span>Synthesize Customer Journey from Business Goal</span>
                    </h2>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Nexus synthesizes your natural-language outcome with live CRM contacts, billing data, and website traffic to identify exact stage drop-offs and generate executable module actions.
                  </p>
                </div>

                {/* Natural Language Input Box */}
                <form onSubmit={handleGenerateJourney} className="shrink-0 space-y-3">
                  <div className="relative">
                    <textarea
                      rows={3}
                      value={objectiveInput}
                      onChange={(e) => {
                        setObjectiveInput(e.target.value);
                        setSelectedPlaybookId(null);
                      }}
                      placeholder="Describe your business objective (e.g. I want to increase paid subscriptions for my SaaS business, or onboard trial users in under 5 minutes)..."
                      className="w-full text-xs sm:text-sm bg-background text-foreground p-3.5 rounded-sm border border-border focus:border-brand focus:ring-1 focus:ring-brand focus:outline-hidden placeholder:text-muted-foreground/60 leading-relaxed"
                    />
                    <div className="absolute right-2.5 bottom-2.5 text-[10px] font-mono text-muted-foreground/70">
                      {objectiveInput.length} chars
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="text-[11px] text-muted-foreground flex items-center gap-1.5">
                      <InfoCircle size="13" className="text-brand-text shrink-0" />
                      <span>Select a playbook below or write your custom outcome above.</span>
                    </div>

                    <Button
                      type="submit"
                      variant="primary"
                      size="md"
                      disabled={generating || !objectiveInput.trim()}
                      className="gap-2 cursor-pointer shadow-xs text-xs h-8 px-4"
                    >
                      {generating ? (
                        <>
                          <Refresh size="14" className="animate-spin" />
                          <span>Synthesizing Journey...</span>
                        </>
                      ) : (
                        <>
                          <Magicpen size="14" />
                          <span>Generate Journey Strategy</span>
                        </>
                      )}
                    </Button>
                  </div>
                </form>

                {/* Rich Strategic Playbooks Grid */}
                <div className="flex-1 flex flex-col overflow-hidden space-y-2 pt-2 border-t border-border/60">
                  <div className="shrink-0 flex items-center justify-between text-xs">
                    <span className="font-semibold text-foreground">
                      Curated Strategic Playbooks ({strategyPlaybooks.length} Available)
                    </span>
                    <span className="text-[11px] text-muted-foreground">Click to populate</span>
                  </div>

                  <div className="flex-1 overflow-y-auto no-scrollbar pr-1">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {strategyPlaybooks.map((pb) => {
                        const IconComponent = pb.icon;
                        const isSelected = selectedPlaybookId === pb.id || objectiveInput === pb.prompt;

                        return (
                          <div
                            key={pb.id}
                            onClick={() => {
                              setObjectiveInput(pb.prompt);
                              setSelectedPlaybookId(pb.id);
                            }}
                            className={`p-3 rounded border transition-all cursor-pointer flex flex-col justify-between space-y-2 ${
                              isSelected
                                ? "border-brand ring-1 ring-brand bg-card shadow-xs"
                                : "border-border hover:border-brand/40 bg-card/80 hover:bg-card"
                            }`}
                          >
                            <div className="space-y-1">
                              <div className="flex items-center justify-between">
                                <div className="w-6 h-6 rounded bg-brand/10 text-brand-text flex items-center justify-center shrink-0">
                                  <IconComponent size="13" />
                                </div>
                                <span className="text-[10px] font-mono font-semibold text-status-success-fg">
                                  {pb.expectedImpact}
                                </span>
                              </div>
                              <h3 className="font-display font-bold text-xs text-foreground leading-snug">
                                {pb.title}
                              </h3>
                              <p className="text-[11px] text-muted-foreground leading-relaxed line-clamp-2">
                                {pb.subtitle}
                              </p>
                            </div>

                            <div className="pt-2 border-t border-border/40 flex items-center justify-between text-[10px]">
                              <span className="font-mono text-muted-foreground">
                                {pb.stagesCount} Stages
                              </span>
                              <div className="flex items-center gap-1">
                                {pb.targetModules.map((m, i) => (
                                  <span key={i} className="uppercase px-1 py-0.2 rounded bg-muted text-muted-foreground font-semibold">
                                    {m}
                                  </span>
                                ))}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>

              {/* RIGHT COLUMN: BLUEPRINT SCHEMATIC & TELEMETRY GROUNDING (5 cols) */}
              <div className="lg:col-span-5 flex flex-col h-full overflow-hidden bg-card/60 rounded border border-border p-4 sm:p-5 space-y-4">
                <div className="shrink-0 space-y-1 border-b border-border/60 pb-3">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-bold text-muted-foreground uppercase flex items-center gap-1.5">
                      <Activity size="14" className="text-brand-text" /> Intelligence Grounding
                    </span>
                    <span className="text-[10px] font-mono text-status-success-fg font-semibold">
                      Live Telemetry Synced
                    </span>
                  </div>
                  <h3 className="font-display font-bold text-xs text-foreground">
                    How Nexus Orchestrates Your Customer Journey
                  </h3>
                </div>

                <div className="flex-1 overflow-y-auto no-scrollbar space-y-3.5 pr-1 text-xs">
                  {/* Telemetry Breakdown Cards */}
                  <div className="p-3 rounded bg-muted/20 border border-border/60 space-y-2">
                    <span className="text-[10px] uppercase font-bold text-foreground block">
                      Active Business Baseline
                    </span>
                    <div className="grid grid-cols-2 gap-2 text-[11px]">
                      <div className="bg-background p-2 rounded border border-border/50">
                        <span className="text-muted-foreground block text-[10px]">CRM Contacts</span>
                        <strong className="text-foreground">{telemetry.crmContactsCount} Detected</strong>
                        <p className="text-[10px] text-muted-foreground mt-0.5 leading-tight">
                          {telemetry.crmContactsCount === 0 ? "Cold-Start Acquisition Mode" : "Pipeline Retention Grounded"}
                        </p>
                      </div>

                      <div className="bg-background p-2 rounded border border-border/50">
                        <span className="text-muted-foreground block text-[10px]">Recorded MRR</span>
                        <strong className="text-foreground">₹{telemetry.billingMrr.toFixed(2)}</strong>
                        <p className="text-[10px] text-muted-foreground mt-0.5 leading-tight">
                          Stripe Test Handshake Active
                        </p>
                      </div>

                      <div className="bg-background p-2 rounded border border-border/50">
                        <span className="text-muted-foreground block text-[10px]">Website Builder</span>
                        <strong className="text-foreground">{telemetry.activeWebsites} Live Public Site</strong>
                        <p className="text-[10px] text-muted-foreground mt-0.5 leading-tight">
                          Landing Page /site/default
                        </p>
                      </div>

                      <div className="bg-background p-2 rounded border border-border/50">
                        <span className="text-muted-foreground block text-[10px]">Campaigns</span>
                        <strong className="text-foreground">{telemetry.activeCampaigns} Sequences</strong>
                        <p className="text-[10px] text-muted-foreground mt-0.5 leading-tight">
                          Automated Drips Ready
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* 4-Phase Execution Pipeline Schematic */}
                  <div className="p-3 rounded bg-background border border-border/70 space-y-2.5">
                    <span className="text-[10px] uppercase font-bold text-brand-text block">
                      4-Phase Autonomous Execution Loop
                    </span>

                    <div className="space-y-2">
                      <div className="flex items-start gap-2.5">
                        <div className="w-5 h-5 rounded-full bg-brand/10 text-brand-text font-mono font-bold text-[10px] flex items-center justify-center shrink-0 mt-0.5">
                          1
                        </div>
                        <div className="space-y-0.5 min-w-0">
                          <p className="font-semibold text-foreground text-[11px]">Objective Ingestion & Classification</p>
                          <p className="text-[10px] text-muted-foreground leading-snug">
                            Classifies business intent into Acquisition, Onboarding, Retention, Renewal, or Resolution.
                          </p>
                        </div>
                      </div>

                      <div className="flex items-start gap-2.5">
                        <div className="w-5 h-5 rounded-full bg-brand/10 text-brand-text font-mono font-bold text-[10px] flex items-center justify-center shrink-0 mt-0.5">
                          2
                        </div>
                        <div className="space-y-0.5 min-w-0">
                          <p className="font-semibold text-foreground text-[11px]">Predictive Drop-off Modeling</p>
                          <p className="text-[10px] text-muted-foreground leading-snug">
                            Calculates retention probabilities and drop-offs across customer touchpoints.
                          </p>
                        </div>
                      </div>

                      <div className="flex items-start gap-2.5">
                        <div className="w-5 h-5 rounded-full bg-brand/10 text-brand-text font-mono font-bold text-[10px] flex items-center justify-center shrink-0 mt-0.5">
                          3
                        </div>
                        <div className="space-y-0.5 min-w-0">
                          <p className="font-semibold text-foreground text-[11px]">Next-Best Action Formulation</p>
                          <p className="text-[10px] text-muted-foreground leading-snug">
                            Pairs identified drop-off bottlenecks with concrete strategic levers in Nexus modules.
                          </p>
                        </div>
                      </div>

                      <div className="flex items-start gap-2.5">
                        <div className="w-5 h-5 rounded-full bg-brand/10 text-brand-text font-mono font-bold text-[10px] flex items-center justify-center shrink-0 mt-0.5">
                          4
                        </div>
                        <div className="space-y-0.5 min-w-0">
                          <p className="font-semibold text-foreground text-[11px]">Human-in-the-Loop Module Dispatch</p>
                          <p className="text-[10px] text-muted-foreground leading-snug">
                            One-click approval updates Website Studio, queues email drips, or tags CRM leads.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Existing Saved Maps Quick Jump */}
                  {maps.length > 0 && (
                    <div className="p-3 rounded bg-secondary/40 border border-border/50 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] uppercase font-bold text-muted-foreground">
                          Existing Saved Journeys
                        </span>
                        <span className="text-[10px] font-mono text-muted-foreground">{maps.length} Saved</span>
                      </div>
                      <div className="space-y-1.5">
                        {maps.map((m) => (
                          <div
                            key={m.id}
                            onClick={() => {
                              handleSelectMap(m.id);
                              setShowNewGoalForm(false);
                            }}
                            className="p-2 rounded bg-background hover:bg-muted/40 transition-colors cursor-pointer border border-border/40 flex items-center justify-between text-[11px]"
                          >
                            <span className="font-medium text-foreground truncate max-w-[220px]">
                              {m.title}
                            </span>
                            <ArrowRight size="12" className="text-brand-text shrink-0" />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            /* ========================================================= */
            /* 2. ACTIVE JOURNEY WORKSTATION (2 COLUMNS: Canvas & Inspector) */
            /* ========================================================= */
            <div className="h-full grid grid-cols-1 lg:grid-cols-12 gap-4 overflow-hidden">
              {/* LEFT COLUMN: Funnel Flow / Mermaid Visual / Stage Matrix (7 cols) */}
              <div className="lg:col-span-7 flex flex-col h-full overflow-hidden bg-card/40 rounded border border-border p-3.5 space-y-3">
                {/* Strategic Analysis summary banner */}
                <div className="shrink-0 p-2.5 bg-muted/20 border border-border/60 rounded text-xs text-muted-foreground flex items-start gap-2">
                  <InfoCircle size="14" className="text-brand-text shrink-0 mt-0.5" />
                  <p className="leading-snug line-clamp-2">
                    <strong className="text-foreground">Analysis: </strong>
                    {currentMap.summary}
                  </p>
                </div>

                {/* VIEW 1: INTERACTIVE FUNNEL FLOW */}
                {viewMode === "pipeline" && (
                  <div className="flex-1 overflow-y-auto no-scrollbar space-y-2.5 pr-1">
                    <div className="flex items-center justify-between text-xs text-muted-foreground pb-1">
                      <span className="font-semibold text-foreground">
                        Sequential Funnel Pipeline ({currentMap.stages.length} Stages)
                      </span>
                      <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                        <InfoCircle size="12" /> Select step to inspect
                      </span>
                    </div>

                    <div className="space-y-2.5">
                      {currentMap.stages.map((stage, idx) => {
                        const isSelected = selectedStageId === stage.id;
                        const dropoffInfo = getStageDropoffRate(idx);

                        return (
                          <div
                            key={stage.id}
                            onClick={() => setSelectedStageId(stage.id)}
                            className={`p-3 rounded border transition-all cursor-pointer ${
                              isSelected
                                ? "border-brand ring-1 ring-brand shadow-sm bg-card"
                                : "border-border hover:border-brand/40 bg-card/70"
                            }`}
                          >
                            <div className="flex items-center justify-between gap-2 border-b border-border/40 pb-2">
                              <div className="flex items-center gap-2">
                                <span className="font-mono text-[10px] font-bold text-muted-foreground uppercase px-1.5 py-0.5 bg-muted rounded">
                                  0{idx + 1}
                                </span>
                                <h3 className="font-display font-bold text-xs text-foreground">
                                  {stage.stage_name}
                                </h3>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-[10px] font-mono font-bold text-foreground">
                                  {dropoffInfo.stepRetention}
                                </span>
                                {getEmotionBadge(stage.emotion)}
                              </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2 text-xs">
                              <div className="space-y-1">
                                <span className="text-[10px] uppercase font-bold text-status-error-fg flex items-center gap-1">
                                  <Danger size="11" /> Drop-off Friction
                                </span>
                                <p className="text-[11px] text-foreground leading-tight line-clamp-2">
                                  {stage.friction_points[0] || "Bottleneck identified"}
                                </p>
                              </div>

                              <div className="space-y-1">
                                <span className="text-[10px] uppercase font-bold text-brand-text flex items-center gap-1">
                                  <Flash size="11" /> Strategic Opportunity
                                </span>
                                <p className="text-[11px] text-foreground leading-tight line-clamp-2">
                                  {stage.opportunities[0] || "Growth intervention"}
                                </p>
                              </div>
                            </div>

                            {/* Connected Action Snippet */}
                            {stage.actions && stage.actions[0] && (
                              <div className="mt-2 pt-2 border-t border-border/40 flex items-center justify-between text-[11px]">
                                {getModuleBadge(stage.actions[0].module_target)}
                                <span className="text-muted-foreground truncate max-w-[200px]">
                                  {stage.actions[0].title}
                                </span>
                                <span className="font-mono font-semibold text-[10px] text-status-success-fg">
                                  {stage.actions[0].status}
                                </span>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* VIEW 2: VISUAL MERMAID FLOWCHART (RENDERED SVG ON SCREEN) */}
                {viewMode === "mermaid" && (
                  <div className="flex-1 flex flex-col overflow-hidden space-y-2">
                    <div className="flex items-center justify-between text-xs pb-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-foreground">Visual Mermaid Architecture</span>
                        {mermaidRendering && (
                          <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                            <Refresh size="11" className="animate-spin" /> Rendering SVG...
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setShowMermaidRawCode(!showMermaidRawCode)}
                          className="text-[11px] text-brand-text hover:underline cursor-pointer"
                        >
                          {showMermaidRawCode ? "Show Visual Diagram" : "View Mermaid Code"}
                        </button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleCopyMermaid}
                          className="text-xs h-6 gap-1 cursor-pointer"
                        >
                          {copiedMermaid ? (
                            <>
                              <TickCircle size="12" className="text-status-success-fg" />
                              <span>Copied</span>
                            </>
                          ) : (
                            <>
                              <Copy size="12" />
                              <span>Copy Code</span>
                            </>
                          )}
                        </Button>
                      </div>
                    </div>

                    {showMermaidRawCode ? (
                      <div className="flex-1 overflow-auto no-scrollbar bg-muted/40 p-3 rounded border border-border font-mono text-xs text-foreground">
                        <pre className="whitespace-pre leading-relaxed">{generateMermaidCode()}</pre>
                      </div>
                    ) : (
                      /* RENDERED VISUAL MERMAID SVG */
                      <div className="flex-1 overflow-auto no-scrollbar bg-card/80 p-4 rounded border border-border flex items-center justify-center">
                        {mermaidSvg ? (
                          <div
                            dangerouslySetInnerHTML={{ __html: mermaidSvg }}
                            className="w-full flex justify-center [&_svg]:max-w-full [&_svg]:h-auto"
                          />
                        ) : (
                          <p className="text-xs text-muted-foreground animate-pulse">
                            Rendering visual flowchart diagram...
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* VIEW 3: STAGE MATRIX GRID */}
                {viewMode === "grid" && (
                  <div className="flex-1 overflow-y-auto no-scrollbar space-y-2.5 pr-1">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {currentMap.stages.map((stage) => {
                        const isSelected = selectedStageId === stage.id;
                        return (
                          <div
                            key={stage.id}
                            onClick={() => setSelectedStageId(stage.id)}
                            className={`p-3 rounded border transition-all cursor-pointer space-y-2 ${
                              isSelected
                                ? "border-brand ring-1 ring-brand bg-card shadow-xs"
                                : "border-border hover:border-brand/40 bg-card/70"
                            }`}
                          >
                            <div className="flex items-center justify-between border-b border-border/40 pb-1.5">
                              <span className="font-mono text-[10px] font-bold text-muted-foreground">
                                Stage 0{stage.order_index}
                              </span>
                              {getEmotionBadge(stage.emotion)}
                            </div>

                            <h4 className="font-display font-bold text-xs text-foreground leading-snug">
                              {stage.stage_name}
                            </h4>

                            <div className="space-y-1 text-[11px]">
                              <p className="text-muted-foreground line-clamp-2">
                                {stage.objective}
                              </p>
                              <div className="flex flex-wrap gap-1 pt-1">
                                {stage.touchpoints.map((tp, i) => (
                                  <span key={i} className="text-[10px] px-1.5 py-0.2 rounded bg-secondary text-foreground">
                                    {tp}
                                  </span>
                                ))}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Bottom stage actions bar */}
                <div className="shrink-0 pt-2 border-t border-border/50 flex items-center justify-between text-xs">
                  <span className="text-[11px] text-muted-foreground">
                    Total {currentMap.stages.length} Milestones Configured
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleAddNewStage}
                    className="text-xs h-7 gap-1 cursor-pointer"
                  >
                    <Add size="13" />
                    <span>Add New Stage</span>
                  </Button>
                </div>
              </div>

              {/* RIGHT COLUMN: DOCKED STAGE INSPECTOR & ACTION HUB (5 cols) */}
              <div className="lg:col-span-5 flex flex-col h-full overflow-hidden bg-card/60 rounded border border-border p-3.5 space-y-3">
                {activeStage ? (
                  <>
                    {/* Inspector Header */}
                    <div className="shrink-0 flex items-center justify-between border-b border-border/60 pb-2.5">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-[10px] font-bold text-muted-foreground uppercase px-1.5 py-0.5 bg-muted rounded">
                            0{activeStage.order_index}
                          </span>
                          <h3 className="font-display font-bold text-xs text-foreground truncate">
                            {activeStage.stage_name}
                          </h3>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => handleOpenEditStage(activeStage)}
                          className="text-xs h-6 gap-1 cursor-pointer"
                        >
                          <Edit2 size="11" />
                          <span>Edit</span>
                        </Button>
                        {currentMap.stages.length > 1 && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteStage(activeStage.id)}
                            className="text-xs h-6 p-1 text-destructive hover:bg-destructive/10 cursor-pointer"
                            title="Delete milestone"
                          >
                            <Trash size="12" />
                          </Button>
                        )}
                      </div>
                    </div>

                    {/* Scrollable Stage Body */}
                    <div className="flex-1 overflow-y-auto no-scrollbar space-y-3 pr-1">
                      {/* INLINE EDIT MODE IF ACTIVE */}
                      {isEditingStage ? (
                        <div className="p-3 bg-muted/20 rounded border border-border space-y-3 text-xs">
                          <div className="flex items-center justify-between font-bold text-foreground">
                            <span>Edit Stage Details</span>
                            <span className="text-[10px] text-muted-foreground">Changes save to session</span>
                          </div>

                          <div className="space-y-1">
                            <label className="text-[11px] font-semibold text-muted-foreground">Stage Name</label>
                            <input
                              type="text"
                              value={editStageName}
                              onChange={(e) => setEditStageName(e.target.value)}
                              className="w-full text-xs bg-background text-foreground p-2 rounded border border-border"
                            />
                          </div>

                          <div className="space-y-1">
                            <label className="text-[11px] font-semibold text-muted-foreground">Objective</label>
                            <textarea
                              rows={2}
                              value={editObjective}
                              onChange={(e) => setEditObjective(e.target.value)}
                              className="w-full text-xs bg-background text-foreground p-2 rounded border border-border"
                            />
                          </div>

                          {/* Sentiment Selector */}
                          <div className="space-y-1">
                            <label className="text-[11px] font-semibold text-muted-foreground">Sentiment Risk</label>
                            <div className="flex flex-wrap gap-1.5">
                              {(["delighted", "positive", "neutral", "confused", "frustrated"] as StageEmotion[]).map((emo) => (
                                <button
                                  key={emo}
                                  type="button"
                                  onClick={() => setEditEmotion(emo)}
                                  className={`text-[10px] px-2 py-1 rounded cursor-pointer transition-colors ${
                                    editEmotion === emo
                                      ? "bg-brand text-brand-foreground font-bold"
                                      : "bg-secondary text-foreground hover:bg-secondary/80"
                                  }`}
                                >
                                  {emo}
                                </button>
                              ))}
                            </div>
                          </div>

                          {/* Friction Management */}
                          <div className="space-y-1.5">
                            <label className="text-[11px] font-semibold text-muted-foreground flex items-center justify-between">
                              <span>Friction Points (Drop-offs)</span>
                              <span className="text-[10px] font-mono">{editFrictions.length} items</span>
                            </label>
                            <div className="space-y-1">
                              {editFrictions.map((f, i) => (
                                <div key={i} className="flex items-center gap-1.5 bg-background p-1.5 rounded border border-border/70">
                                  <input
                                    type="text"
                                    value={f}
                                    onChange={(e) => {
                                      const next = [...editFrictions];
                                      next[i] = e.target.value;
                                      setEditFrictions(next);
                                    }}
                                    className="flex-1 text-[11px] bg-transparent focus:outline-hidden"
                                  />
                                  <button
                                    type="button"
                                    onClick={() => setEditFrictions(editFrictions.filter((_, idx) => idx !== i))}
                                    className="text-muted-foreground hover:text-destructive p-0.5"
                                  >
                                    <Trash size="11" />
                                  </button>
                                </div>
                              ))}
                              <div className="flex items-center gap-1 pt-1">
                                <input
                                  type="text"
                                  placeholder="Add friction point..."
                                  value={newFrictionInput}
                                  onChange={(e) => setNewFrictionInput(e.target.value)}
                                  className="flex-1 text-[11px] bg-background p-1.5 rounded border border-border"
                                />
                                <Button
                                  type="button"
                                  variant="secondary"
                                  size="sm"
                                  onClick={() => {
                                    if (newFrictionInput.trim()) {
                                      setEditFrictions([...editFrictions, newFrictionInput.trim()]);
                                      setNewFrictionInput("");
                                    }
                                  }}
                                  className="text-xs h-7"
                                >
                                  Add
                                </Button>
                              </div>
                            </div>
                          </div>

                          {/* Opportunities Management */}
                          <div className="space-y-1.5">
                            <label className="text-[11px] font-semibold text-muted-foreground flex items-center justify-between">
                              <span>Strategic Opportunities</span>
                              <span className="text-[10px] font-mono">{editOpportunities.length} items</span>
                            </label>
                            <div className="space-y-1">
                              {editOpportunities.map((op, i) => (
                                <div key={i} className="flex items-center gap-1.5 bg-background p-1.5 rounded border border-border/70">
                                  <input
                                    type="text"
                                    value={op}
                                    onChange={(e) => {
                                      const next = [...editOpportunities];
                                      next[i] = e.target.value;
                                      setEditOpportunities(next);
                                    }}
                                    className="flex-1 text-[11px] bg-transparent focus:outline-hidden"
                                  />
                                  <button
                                    type="button"
                                    onClick={() => setEditOpportunities(editOpportunities.filter((_, idx) => idx !== i))}
                                    className="text-muted-foreground hover:text-destructive p-0.5"
                                  >
                                    <Trash size="11" />
                                  </button>
                                </div>
                              ))}
                              <div className="flex items-center gap-1 pt-1">
                                <input
                                  type="text"
                                  placeholder="Add improvement opportunity..."
                                  value={newOpportunityInput}
                                  onChange={(e) => setNewOpportunityInput(e.target.value)}
                                  className="flex-1 text-[11px] bg-background p-1.5 rounded border border-border"
                                />
                                <Button
                                  type="button"
                                  variant="secondary"
                                  size="sm"
                                  onClick={() => {
                                    if (newOpportunityInput.trim()) {
                                      setEditOpportunities([...editOpportunities, newOpportunityInput.trim()]);
                                      setNewOpportunityInput("");
                                    }
                                  }}
                                  className="text-xs h-7"
                                >
                                  Add
                                </Button>
                              </div>
                            </div>
                          </div>

                          <div className="flex justify-end gap-2 pt-2 border-t border-border/60">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setIsEditingStage(false)}
                              className="text-xs h-7 cursor-pointer"
                            >
                              Cancel
                            </Button>
                            <Button
                              variant="primary"
                              size="sm"
                              onClick={handleSaveStageEdits}
                              className="text-xs h-7 cursor-pointer"
                            >
                              Save Changes
                            </Button>
                          </div>
                        </div>
                      ) : (
                        /* STANDARD STAGE DETAIL VIEW */
                        <>
                          <div className="space-y-1">
                            <span className="text-[10px] uppercase font-bold text-muted-foreground">
                              Objective & Customer Expectation
                            </span>
                            <p className="text-xs text-foreground leading-relaxed">
                              {activeStage.objective}
                            </p>
                          </div>

                          {/* Sentiment & Touchpoints */}
                          <div className="flex flex-wrap items-center justify-between gap-2 p-2 rounded bg-muted/20 border border-border/60">
                            <div className="space-y-0.5">
                              <span className="text-[9px] uppercase font-bold text-muted-foreground block">
                                Sentiment Assessment
                              </span>
                              {getEmotionBadge(activeStage.emotion)}
                            </div>
                            <div className="space-y-0.5 text-right">
                              <span className="text-[9px] uppercase font-bold text-muted-foreground block">
                                Core Touchpoints
                              </span>
                              <div className="flex flex-wrap gap-1 justify-end">
                                {activeStage.touchpoints.map((tp, i) => (
                                  <span key={i} className="text-[10px] px-1.5 py-0.2 rounded bg-secondary text-foreground">
                                    {tp}
                                  </span>
                                ))}
                              </div>
                            </div>
                          </div>

                          {/* Identified Friction Points */}
                          <div className="p-2.5 rounded bg-status-error-subtle/20 border border-status-error/30 space-y-1.5">
                            <span className="text-[10px] uppercase font-bold text-status-error-fg flex items-center gap-1.5">
                              <Danger size="12" /> Drop-off Friction Bottlenecks
                            </span>
                            <ul className="space-y-1 text-xs text-foreground">
                              {activeStage.friction_points.map((fp, i) => (
                                <li key={i} className="flex items-start gap-1.5 leading-snug">
                                  <span className="text-status-error-fg shrink-0 mt-0.5">•</span>
                                  <span>{fp}</span>
                                </li>
                              ))}
                            </ul>
                          </div>

                          {/* Strategic Improvement Opportunities */}
                          <div className="p-2.5 rounded bg-brand-subtle/20 border border-brand/30 space-y-1.5">
                            <span className="text-[10px] uppercase font-bold text-brand-text flex items-center gap-1.5">
                              <Flash size="12" /> Strategic Levers & Opportunities
                            </span>
                            <ul className="space-y-1 text-xs text-foreground">
                              {activeStage.opportunities.map((op, i) => (
                                <li key={i} className="flex items-start gap-1.5 leading-snug">
                                  <span className="text-brand-text shrink-0 mt-0.5">•</span>
                                  <span>{op}</span>
                                </li>
                              ))}
                            </ul>
                          </div>

                          {/* Customer Perspective Quotes */}
                          {activeStage.customer_thoughts.length > 0 && (
                            <div className="p-2 rounded bg-secondary/30 border border-border/40 space-y-0.5">
                              <span className="text-[9px] uppercase font-bold text-muted-foreground block">
                                Customer Thoughts
                              </span>
                              <p className="text-xs italic text-muted-foreground">
                                &ldquo;{activeStage.customer_thoughts[0]}&rdquo;
                              </p>
                            </div>
                          )}

                          {/* RECOMMENDED NEXUS MODULE ACTIONS & DISPATCH */}
                          <div className="space-y-2 pt-1 border-t border-border/60">
                            <span className="text-[10px] uppercase font-bold text-foreground flex items-center gap-1">
                              <DirectSend size="12" className="text-brand-text" /> Nexus Module Execution
                            </span>

                            {activeStage.actions.map((act) => {
                              const isApproved = act.status === "APPROVED";
                              const result = act.execution_result;

                              return (
                                <div
                                  key={act.id}
                                  className="p-3 rounded bg-card border border-border shadow-xs space-y-2"
                                >
                                  <div className="flex items-center justify-between">
                                    {getModuleBadge(act.module_target)}
                                    <span className="text-[10px] font-mono font-bold text-foreground">
                                      {act.status}
                                    </span>
                                  </div>

                                  <p className="text-xs font-bold text-foreground leading-snug">
                                    {act.title}
                                  </p>
                                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                                    {act.description}
                                  </p>

                                  <div className="bg-muted/20 p-2 rounded text-[11px] text-foreground/90 space-y-0.5">
                                    <span className="font-semibold text-muted-foreground">Rationale: </span>
                                    <span>{act.why_it_helps}</span>
                                  </div>

                                  {/* IF APPROVED: SHOW CONCRETE MODULE CONNECTION RESULT */}
                                  {isApproved && result && (
                                    <div className="p-2 rounded bg-status-success-subtle/30 border border-status-success-fg/30 space-y-1.5 text-xs">
                                      <div className="flex items-center gap-1 font-semibold text-status-success-fg">
                                        <TickCircle size="13" />
                                        <span>Active in {result.target_module.toUpperCase()}</span>
                                      </div>
                                      <p className="text-[11px] text-foreground leading-snug">
                                        {result.message}
                                      </p>
                                      {result.link && (
                                        <Link
                                          href={result.link}
                                          className="inline-flex items-center gap-1 text-[11px] font-semibold text-brand-text hover:underline pt-0.5"
                                        >
                                          <span>Open in {act.module_target.toUpperCase()}</span>
                                          <ArrowRight size="11" />
                                        </Link>
                                      )}
                                    </div>
                                  )}

                                  {/* ACTION APPROVE CONTROLS */}
                                  <div className="pt-1 flex items-center justify-between">
                                    <span className="text-[10px] font-mono text-status-success-fg font-semibold">
                                      {act.expected_impact}
                                    </span>

                                    {!isApproved && (
                                      <Button
                                        variant="primary"
                                        size="sm"
                                        disabled={actionProcessingId === act.id}
                                        onClick={() =>
                                          handleActionApproval(currentMap.id, act.id, "approve")
                                        }
                                        className="text-xs h-7 gap-1 cursor-pointer"
                                      >
                                        <span>
                                          {actionProcessingId === act.id ? "Connecting..." : "Approve & Deploy"}
                                        </span>
                                        <ArrowRight size="11" />
                                      </Button>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </>
                      )}
                    </div>
                  </>
                ) : (
                  <div className="flex-1 flex items-center justify-center text-xs text-muted-foreground">
                    Select a stage node from the left to inspect
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
