"use client";

import * as React from "react";
import { useAnalyticsDashboard } from "@/hooks/use-analytics";
import { MetricEvidenceBadge } from "@/components/analytics/metric-evidence-badge";
import { BklitAreaChart } from "@/components/analytics/bklit-area-chart";
import { BklitFunnelChart } from "@/components/analytics/bklit-funnel-chart";
import { BklitChannelBars } from "@/components/analytics/bklit-channel-bars";
import { RemotionVideoPlayer } from "@/components/analytics/remotion-video-player";
import {
  TrendUp,
  TrendDown,
  Refresh,
  DocumentDownload,
  SecuritySafe,
  Clock,
  Chart21,
} from "iconsax-react";

export function AnalyticsClient() {
  const { data, isLoading, error, refetch, isFetching } = useAnalyticsDashboard();
  // Future predictions toggle: Default is strictly OFF as requested
  const [showPredictions, setShowPredictions] = React.useState<boolean>(false);

  if (isLoading) {
    return (
      <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-6">
        <div className="space-y-2">
          <div className="h-8 w-64 bg-muted/30 animate-pulse rounded-md" />
          <div className="h-4 w-96 bg-muted/20 animate-pulse rounded-md" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-32 bg-muted/20 animate-pulse rounded-xl" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="h-72 bg-muted/20 animate-pulse rounded-xl" />
          <div className="h-72 bg-muted/20 animate-pulse rounded-xl" />
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-8 max-w-4xl mx-auto text-center space-y-4">
        <div className="p-4 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive max-w-md mx-auto">
          <p className="font-semibold text-sm">Failed to load analytics engine</p>
          <p className="text-xs text-muted-foreground mt-1">
            {error instanceof Error ? error.message : "Internal service connection error"}
          </p>
        </div>
        <button
          type="button"
          onClick={() => refetch()}
          className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 transition"
        >
          Retry Telemetry Query
        </button>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-8">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-border/40">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="font-display text-2xl font-bold tracking-tight text-foreground">
              Analytics & Performance
            </h1>
            <span className="px-1.5 py-0.5 rounded-xs text-[10px] font-mono font-medium uppercase text-muted-foreground border border-border/60">
              Live
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-1 max-w-2xl">
            Track your revenue, contact growth, funnel conversions, and future performance projections.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Future Predictions Toggle - Default OFF */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-border/60 bg-card shadow-2xs">
            <div className="flex flex-col">
              <span className="text-xs font-medium text-foreground leading-tight">
                Future Predictions
              </span>
              <span className="text-[10px] font-mono text-muted-foreground">
                {showPredictions ? "Predictions ON" : "Predictions OFF"}
              </span>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={showPredictions}
              onClick={() => setShowPredictions((prev) => !prev)}
              className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border transition-colors duration-200 focus:outline-hidden ${
                showPredictions
                  ? "bg-brand border-brand"
                  : "bg-muted/60 border-border"
              }`}
              title="Toggle future predictions"
            >
              <span
                className={`pointer-events-none inline-block h-3.5 w-3.5 m-0.5 rounded-full shadow-xs transition-transform duration-200 ${
                  showPredictions
                    ? "translate-x-4 bg-white"
                    : "translate-x-0.5 bg-muted-foreground/80"
                }`}
              />
            </button>
          </div>

          <button
            type="button"
            onClick={() => refetch()}
            disabled={isFetching}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border/60 bg-card hover:bg-accent text-xs font-medium text-foreground transition disabled:opacity-50"
            title="Refresh data"
          >
            <Refresh
              size="14"
              className={isFetching ? "animate-spin text-brand" : "text-muted-foreground"}
            />
            <span>{isFetching ? "Refreshing..." : "Refresh"}</span>
          </button>

          <button
            type="button"
            onClick={() => window.print()}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border/60 bg-card hover:bg-accent text-xs font-medium text-foreground transition"
          >
            <DocumentDownload size="14" className="text-muted-foreground" />
            <span className="hidden sm:inline">Print</span>
          </button>
        </div>
      </div>

      {/* Summary KPI Strip */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-mono font-bold uppercase tracking-wider text-muted-foreground">
            Overview Metrics
          </h2>
          <span className="text-[11px] text-muted-foreground flex items-center gap-1">
            <Clock size="12" />
            <span>Updated: {new Date(data.lastUpdated).toLocaleTimeString()}</span>
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {(showPredictions
            ? data.summaryMetrics
            : data.summaryMetrics.filter((m) => m.evidenceType !== "STATISTICAL_HYPOTHESIS")
          ).map((metric) => (
            <div
              key={metric.id}
              className="p-5 rounded-xl bg-card border border-border/60 shadow-2xs hover:border-border transition-colors flex flex-col justify-between"
            >
              <div>
                <span className="text-xs font-medium text-muted-foreground block">
                  {metric.label}
                </span>
                <div className="font-display text-2xl font-bold tracking-tight text-foreground mt-1.5">
                  {metric.value}
                </div>
              </div>

              <div className="pt-3 mt-3 border-t border-border/30 flex items-center justify-between text-xs text-muted-foreground">
                <span className="truncate">{metric.changeDescription}</span>
                <span className="text-[10px] font-mono text-muted-foreground/80 shrink-0 ml-2">
                  {metric.evidenceType === "OBSERVED_MEASUREMENT" ? "Verified" : "Forecast"}
                </span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Simplified, Clean Charts with Future Predictions Toggle */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xs font-mono font-bold uppercase tracking-wider text-muted-foreground">
              Performance Trends
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              {showPredictions
                ? "Showing your actual numbers and a 14-day projection."
                : "Showing your actual business activity over time."}
            </p>
          </div>

          {showPredictions && (
            <span className="hidden sm:inline-flex items-center gap-1 text-[11px] font-mono text-brand">
              <Chart21 size="13" />
              <span>Predictions Active</span>
            </span>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Chart 1: Lead Acquisition */}
          <BklitAreaChart
            title="Lead Velocity"
            subtitle={
              showPredictions
                ? `Daily new contacts (Trend: +${data.leadAcquisitionModel.slope.toFixed(2)}/day)`
                : "Daily new contacts added to CRM"
            }
            unit="Leads"
            regressionResult={data.leadAcquisitionModel}
            height={220}
            showPredictions={showPredictions}
          />

          {/* Chart 2: Revenue Run-Rate */}
          <BklitAreaChart
            title="SaaS Revenue"
            subtitle={
              showPredictions
                ? "Monthly recurring revenue and projected run-rate"
                : "Monthly recurring revenue"
            }
            unit="₹"
            regressionResult={data.revenueForecastModel}
            height={220}
            showPredictions={showPredictions}
          />
        </div>
      </section>

      {/* Funnel & Channel Breakdown Grid */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <BklitFunnelChart stages={data.funnelStages} />
        <BklitChannelBars channels={data.channelPerformance} />
      </section>

      {/* Print-Only Header: Displays clean title and timestamp on paper */}
      <div className="hidden print:block pb-4 mb-2 border-b border-border/80">
        <h1 className="text-xl font-bold text-foreground">Nexus Business Intelligence Report</h1>
        <p className="text-xs text-muted-foreground mt-0.5">
          Generated on {new Date().toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
        </p>
      </div>

      {/* Remotion-Inspired Executive Video Briefing Section (Interactive Only, hidden in print) */}
      <section className="space-y-3 print:hidden">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-xs bg-brand" />
            <h2 className="text-xs font-mono font-bold uppercase tracking-wider text-muted-foreground">
              Video Summary
            </h2>
          </div>
          <span className="text-[11px] font-mono text-muted-foreground">
            {data.executiveVideoBriefing.scenes.length} Chapters • Visual Highlights
          </span>
        </div>
        <RemotionVideoPlayer briefing={data.executiveVideoBriefing} />
      </section>

      {/* Clean Data Note */}
      <section className="p-5 rounded-xl bg-card border border-border/50 space-y-3 shadow-2xs">
        <div className="flex items-center gap-2">
          <SecuritySafe size="16" className="text-brand" />
          <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-foreground">
            How this data works
          </h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-muted-foreground">
          <div className="space-y-1">
            <span className="font-semibold text-foreground flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-xs bg-emerald-500" />
              Real Business Data:
            </span>
            <p>
              Metrics are calculated directly from your invoices, contacts, and visitor actions. No fake numbers or mock rates are used.
            </p>
          </div>
          <div className="space-y-1">
            <span className="font-semibold text-foreground flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-xs bg-brand" />
              Projections:
            </span>
            <p>
              When the Future Predictions toggle is enabled, future trends are estimated using linear regression based on your recent growth rate.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
