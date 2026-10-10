"use client";

import * as React from "react";
import { FunnelStageData } from "@/lib/validations/analytics";
import { ArrowDown2, TickCircle } from "iconsax-react";

interface BklitFunnelChartProps {
  stages: FunnelStageData[];
}

export function BklitFunnelChart({ stages }: BklitFunnelChartProps) {
  if (!stages || stages.length === 0) {
    return (
      <div className="p-6 text-center text-xs text-muted-foreground bg-card border border-border/40 rounded-sm">
        No funnel data available.
      </div>
    );
  }

  const maxCount = Math.max(...stages.map((s) => s.count), 1);

  return (
    <div className="p-5 rounded-sm bg-card/70 border border-border/40 space-y-4 shadow-2xs">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-border/30">
        <div>
          <h3 className="font-display text-sm font-semibold text-foreground">
            Conversion Funnel
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            How visitors move from initial contact to paying customers
          </p>
        </div>
      </div>

      <div className="space-y-3 pt-1">
        {stages.map((stage, idx) => {
          const relativeWidthPct = Math.max(12, Math.round((stage.count / maxCount) * 100));

          return (
            <div key={stage.stageKey} className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-foreground">{stage.stageName}</span>
                </div>
                <div className="flex items-center gap-3 font-mono">
                  <span className="font-bold text-foreground">
                    {stage.count.toLocaleString("en-IN")}
                  </span>
                  <span className="text-[11px] text-brand font-semibold min-w-[42px] text-right">
                    {stage.conversionPct}%
                  </span>
                </div>
              </div>

              {/* Funnel Horizontal Gauge */}
              <div className="w-full bg-muted/30 h-6 rounded-md overflow-hidden flex items-center p-1 relative border border-border/30">
                <div
                  className="h-full rounded-sm bg-gradient-to-r from-brand to-brand/80 transition-all duration-500 flex items-center justify-end px-2"
                  style={{ width: `${relativeWidthPct}%` }}
                >
                  <span className="text-[10px] font-mono font-bold text-white drop-shadow-xs">
                    {stage.count.toLocaleString("en-IN")}
                  </span>
                </div>
              </div>

              {/* Step dropoff indicator */}
              {idx < stages.length - 1 && (
                <div className="flex items-center gap-1 pl-4 text-[10px] font-mono text-muted-foreground">
                  <ArrowDown2 size="10" className="text-muted-foreground/60" />
                  <span>
                    Drop-off:{" "}
                    <strong className="text-destructive font-semibold">
                      {Math.max(0, 100 - stages[idx + 1].conversionPct)}%
                    </strong>
                  </span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
