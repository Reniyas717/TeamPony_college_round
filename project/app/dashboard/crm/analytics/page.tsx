"use client";

import * as React from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Refresh,
  Chart,
  TickCircle,
  Danger,
  Flash,
  DirectSend,
  Building,
  User,
  ShieldTick,
} from "iconsax-react";
import { Button } from "@/components/ui/button";
import { useCrmAnalytics } from "@/hooks/use-crm";

export default function CrmAnalyticsPage() {
  const { data: analytics, isLoading, isRefetching, refetch, error } = useCrmAnalytics();

  const metrics = analytics?.metrics;
  const insights = analytics?.insights;
  const leads = analytics?.leads || [];

  return (
    <main className="p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto space-y-8 animate-in fade-in duration-300">
      {/* Navigation Breadcrumb & Header */}
      <div className="flex flex-col gap-4 pb-4 border-b border-border/60">
        <div>
          <Link
            href="/dashboard/crm"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors mb-2 cursor-pointer group"
          >
            <ArrowLeft size="14" className="group-hover:-translate-x-0.5 transition-transform" />
            <span>Back to Intelligent CRM</span>
          </Link>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-sm bg-brand-subtle flex items-center justify-center text-brand-text">
                  <Chart size="20" />
                </div>
                <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
                  CRM Intelligence & Pipeline Analytics
                </h1>
              </div>
              <p className="text-xs sm:text-sm text-muted-foreground mt-1 max-w-2xl">
                Comprehensive customer lifecycle metrics, stage conversion funnels, and AI strategic advisory bot.
              </p>
            </div>

            <div className="flex items-center gap-2.5">
              <Button
                variant="outline"
                size="sm"
                onClick={() => refetch()}
                disabled={isLoading || isRefetching}
                className="gap-1.5 cursor-pointer text-xs h-9 bg-card border-border shadow-2xs"
                title="Refresh analytics and regenerate insights"
              >
                <Refresh size="14" className={isLoading || isRefetching ? "animate-spin" : ""} />
                <span>{isLoading || isRefetching ? "Analyzing..." : "Re-analyze"}</span>
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Loading Skeleton */}
      {isLoading && (
        <div className="space-y-6 animate-pulse">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-28 rounded-xl bg-card border border-border/60" />
            ))}
          </div>
          <div className="h-64 rounded-2xl bg-card border border-border/60" />
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="h-72 lg:col-span-2 rounded-xl bg-card border border-border/60" />
            <div className="h-72 rounded-xl bg-card border border-border/60" />
          </div>
        </div>
      )}

      {/* Error View */}
      {error && !isLoading && (
        <div className="p-6 rounded-xl bg-destructive/10 border border-destructive/30 text-destructive text-sm flex items-center gap-3">
          <Danger size="20" />
          <div>
            <p className="font-semibold">Failed to load CRM Analytics</p>
            <p className="text-xs opacity-90">{error instanceof Error ? error.message : "Unknown error occurred"}</p>
          </div>
        </div>
      )}

      {analytics && !isLoading && (
        <>
          {/* Top 3 KPI Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* 1. Total Contacts / Leads */}
            <div className="p-5 rounded-xl bg-card border border-border/80 shadow-xs flex flex-col justify-between">
              <div className="flex items-center justify-between text-muted-foreground mb-2">
                <span className="text-xs font-semibold uppercase tracking-wider">Total Accounts</span>
                <div className="w-7 h-7 rounded bg-brand-subtle text-brand-text flex items-center justify-center">
                  <User size="16" />
                </div>
              </div>
              <div>
                <p className="text-2xl sm:text-3xl font-display font-bold text-foreground">
                  {metrics?.totalContacts || 0}
                </p>
                <p className="text-xs text-muted-foreground mt-1 font-mono">
                  <span>{metrics?.stageCounts?.qualified || 0} Qualified Interest</span>
                </p>
              </div>
            </div>

            {/* 2. Lead Qualification Rate */}
            <div className="p-5 rounded-xl bg-card border border-border/80 shadow-xs flex flex-col justify-between">
              <div className="flex items-center justify-between text-muted-foreground mb-2">
                <span className="text-xs font-semibold uppercase tracking-wider">Qualification Rate</span>
                <div className="w-7 h-7 rounded bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                  <Flash size="16" />
                </div>
              </div>
              <div>
                <p className="text-2xl sm:text-3xl font-display font-bold text-foreground">
                  {metrics?.conversionRate || 0}%
                </p>
                <div className="w-full bg-muted rounded-full h-1.5 mt-2 overflow-hidden">
                  <div
                    className="bg-emerald-500 h-1.5 rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(100, metrics?.conversionRate || 0)}%` }}
                  />
                </div>
              </div>
            </div>

            {/* 3. Churn / Opt-out Rate */}
            <div className="p-5 rounded-xl bg-card border border-border/80 shadow-xs flex flex-col justify-between">
              <div className="flex items-center justify-between text-muted-foreground mb-2">
                <span className="text-xs font-semibold uppercase tracking-wider">Churn Risk</span>
                <div className="w-7 h-7 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                  <ShieldTick size="16" />
                </div>
              </div>
              <div>
                <p className="text-2xl sm:text-3xl font-display font-bold text-foreground">
                  {metrics?.churnRate || 0}%
                </p>
                <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1 font-mono">
                  <span>{metrics?.stageCounts?.churned || 0} Opt-outs Recorded</span>
                </p>
              </div>
            </div>
          </div>

          {/* GOOGLE GEMINI STRATEGIC AI ADVISORY CARD */}
          {insights && (
            <div className="relative rounded-2xl border border-primary/30 bg-gradient-to-br from-card via-card to-primary/5 p-6 sm:p-8 shadow-sm overflow-hidden">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-border/60">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shadow-xs">
                    <Flash size="22" />
                  </div>
                  <div>
                    <div>
                      <h2 className="text-lg sm:text-xl font-display font-bold text-foreground">
                        AI Strategic Advisory Bot
                      </h2>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Context-aware autonomous pipeline reasoning trained on live CRM telemetry
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3 self-start md:self-auto">
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-card border border-border/70 text-xs shadow-2xs font-mono">
                    <span className="text-muted-foreground">Pipeline Health Score:</span>
                    <span className="font-bold text-foreground text-sm">{insights.healthScore}/100</span>
                  </div>
                  <div
                    className={`px-2.5 py-1 rounded-md text-xs font-semibold uppercase tracking-wider font-mono ${
                      insights.sentiment === "bullish"
                        ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30"
                        : "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/30"
                    }`}
                  >
                    {insights.sentiment}
                  </div>
                </div>
              </div>

              {/* Executive Summary */}
              <div className="py-6 border-b border-border/60">
                <p className="text-sm sm:text-base text-foreground leading-relaxed font-sans font-medium">
                  &ldquo;{insights.summary}&rdquo;
                </p>
              </div>

              {/* 3-Column AI Diagnostics Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-6">
                {/* 1. Key Observations */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-xs font-semibold text-foreground uppercase tracking-wider">
                    <TickCircle size="16" className="text-emerald-500" />
                    <span>Key Strengths & Observations</span>
                  </div>
                  <ul className="space-y-2 text-xs text-muted-foreground">
                    {insights.keyObservations.map((obs, i) => (
                      <li key={i} className="flex items-start gap-2 bg-muted/30 p-2.5 rounded-lg border border-border/40">
                        <span className="text-foreground font-bold font-mono">0{i + 1}.</span>
                        <span className="leading-relaxed">{obs}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* 2. Churn Risks & Bottlenecks */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-xs font-semibold text-foreground uppercase tracking-wider">
                    <Danger size="16" className="text-amber-500" />
                    <span>Identified Risks & Gaps</span>
                  </div>
                  <ul className="space-y-2 text-xs text-muted-foreground">
                    {insights.churnRisks.map((risk, i) => (
                      <li key={i} className="flex items-start gap-2 bg-amber-500/5 p-2.5 rounded-lg border border-amber-500/20 text-foreground">
                        <span className="text-amber-500 font-bold font-mono">!</span>
                        <span className="leading-relaxed text-xs">{risk}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* 3. Tactical Action Plan */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-xs font-semibold text-foreground uppercase tracking-wider">
                    <DirectSend size="16" className="text-primary" />
                    <span>Prioritized Next Actions</span>
                  </div>
                  <ul className="space-y-2">
                    {insights.strategicRecommendations.map((rec, i) => (
                      <li key={i} className="bg-card p-3 rounded-lg border border-border/80 shadow-2xs space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-foreground">{rec.title}</span>
                          <span
                            className={`text-[9px] font-mono px-1.5 py-0.5 rounded font-bold uppercase ${
                              rec.impact === "HIGH"
                                ? "bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20"
                                : "bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20"
                            }`}
                          >
                            {rec.impact} Priority
                          </span>
                        </div>
                        <p className="text-[11px] text-muted-foreground leading-relaxed">{rec.action}</p>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* PIPELINE FUNNEL & SOURCE DISTRIBUTION */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Visual Conversion Funnel (2 Cols) */}
            <div className="lg:col-span-2 p-6 rounded-xl bg-card border border-border/80 shadow-xs space-y-5">
              <div className="flex items-center justify-between pb-3 border-b border-border/60">
                <div>
                  <h3 className="font-semibold text-foreground text-sm">Pipeline Stage Funnel</h3>
                  <p className="text-xs text-muted-foreground">Conversion distribution across active customer touchpoints</p>
                </div>
                <span className="text-xs font-mono font-bold text-muted-foreground">
                  {metrics?.totalContacts || 0} Leads Tracked
                </span>
              </div>

              <div className="space-y-3.5">
                {[
                  { label: "New Inquiries (Lead)", count: metrics?.stageCounts?.lead || 0, color: "bg-zinc-500" },
                  { label: "Outreach Contacted", count: metrics?.stageCounts?.contacted || 0, color: "bg-blue-500" },
                  { label: "Qualified (Confirmed YES)", count: metrics?.stageCounts?.qualified || 0, color: "bg-emerald-500" },
                  { label: "Proposal Sent", count: metrics?.stageCounts?.proposal || 0, color: "bg-purple-500" },
                  { label: "Won Customers", count: metrics?.stageCounts?.customer || 0, color: "bg-brand" },
                  { label: "Churned / Declined", count: metrics?.stageCounts?.churned || 0, color: "bg-red-500" },
                ].map((stage, idx) => {
                  const total = metrics?.totalContacts || 1;
                  const pct = Math.round((stage.count / total) * 100);
                  return (
                    <div key={idx} className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs font-medium">
                        <span className="text-foreground">{stage.label}</span>
                        <span className="text-muted-foreground font-mono">
                          {stage.count} ({pct}%)
                        </span>
                      </div>
                      <div className="w-full bg-muted/60 rounded-full h-2 overflow-hidden">
                        <div
                          className={`h-2 rounded-full transition-all duration-500 ${stage.color}`}
                          style={{ width: `${Math.max(stage.count > 0 ? 5 : 0, pct)}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Inbound Sources (1 Col) */}
            <div className="p-6 rounded-xl bg-card border border-border/80 shadow-xs space-y-5">
              <div className="pb-3 border-b border-border/60">
                <h3 className="font-semibold text-foreground text-sm">Acquisition Channels</h3>
                <p className="text-xs text-muted-foreground">Source attribution of customer records</p>
              </div>

              <div className="space-y-3">
                {(metrics?.sourceBreakdown || []).map((src, i) => (
                  <div key={i} className="p-3 rounded-lg bg-muted/30 border border-border/40 flex items-center justify-between">
                    <span className="text-xs font-medium text-foreground">{src.source}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-foreground font-mono">{src.count}</span>
                      <span className="text-[10px] text-muted-foreground font-mono">({src.percentage}%)</span>
                    </div>
                  </div>
                ))}
                {(!metrics?.sourceBreakdown || metrics.sourceBreakdown.length === 0) && (
                  <p className="text-xs text-muted-foreground italic">No acquisition source data recorded yet.</p>
                )}
              </div>
            </div>
          </div>

          {/* RECENT HIGH-VELOCITY LEADS TABLE */}
          <div className="rounded-xl border border-border/80 bg-card overflow-hidden shadow-xs">
            <div className="p-5 border-b border-border/60 flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-foreground text-sm">High-Velocity & Qualified Accounts</h3>
                <p className="text-xs text-muted-foreground">Active leads tracked in the current analytics window</p>
              </div>
              <Link
                href="/dashboard/crm"
                className="text-xs font-semibold text-primary hover:underline"
              >
                View all in CRM &rarr;
              </Link>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-border/60 bg-muted/20 text-muted-foreground font-semibold uppercase tracking-wider">
                    <th className="py-3 px-4">Contact</th>
                    <th className="py-3 px-4">Company</th>
                    <th className="py-3 px-4">Pipeline Stage</th>
                    <th className="py-3 px-4">Tags</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40">
                  {leads.map((lead) => {
                    const isQualified = ["qualified", "proposal", "customer"].includes(lead.stage.toLowerCase());
                    return (
                      <tr key={lead.id} className="hover:bg-muted/20 transition-colors">
                        <td className="py-3 px-4">
                          <div className="font-semibold text-foreground">{lead.name}</div>
                          <div className="text-[11px] text-muted-foreground">{lead.email}</div>
                        </td>
                        <td className="py-3 px-4 text-muted-foreground font-medium">
                          {lead.company || "—"}
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase font-mono tracking-wider ${
                              isQualified
                                ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30"
                                : lead.stage === "churned"
                                ? "bg-red-500/15 text-red-700 dark:text-red-400 border border-red-500/30"
                                : "bg-muted text-muted-foreground border border-border"
                            }`}
                          >
                            {lead.stage}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex flex-wrap gap-1">
                            {lead.tags.map((tag, tIdx) => (
                              <span key={tIdx} className="px-1.5 py-0.2 rounded text-[9px] bg-muted text-muted-foreground font-mono">
                                {tag}
                              </span>
                            ))}
                            {lead.tags.length === 0 && <span className="text-muted-foreground text-[10px]">—</span>}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </main>
  );
}
