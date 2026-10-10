"use client";

import * as React from "react";
import { DataEvidenceType } from "@/lib/validations/analytics";

interface MetricEvidenceBadgeProps {
  type: DataEvidenceType;
  sourceText?: string;
  confidenceScore?: number;
}

export function MetricEvidenceBadge({
  type,
  sourceText,
  confidenceScore,
}: MetricEvidenceBadgeProps) {
  const isObserved = type === "OBSERVED_MEASUREMENT";

  return (
    <div className="flex items-center gap-2 text-[11px] font-mono text-muted-foreground flex-wrap">
      <div className="flex items-center gap-1.5">
        <span
          className={`w-1.5 h-1.5 rounded-xs ${
            isObserved ? "bg-emerald-500" : "bg-brand"
          }`}
        />
        <span className="text-foreground font-medium">
          {isObserved
            ? "Verified"
            : `Forecast ${confidenceScore ? `(${Math.round(confidenceScore * 100)}% fit)` : ""}`}
        </span>
      </div>

      {sourceText && (
        <span
          className="text-muted-foreground/60 truncate max-w-[220px]"
          title={sourceText}
        >
          {sourceText}
        </span>
      )}
    </div>
  );
}
