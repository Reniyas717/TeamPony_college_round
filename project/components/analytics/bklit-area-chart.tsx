"use client";

import * as React from "react";
import { LinearRegressionResult, ProjectedPoint } from "@/lib/analytics/linear-regression";

interface BklitAreaChartProps {
  title: string;
  subtitle: string;
  unit: string;
  regressionResult: LinearRegressionResult;
  height?: number;
  showPredictions?: boolean;
}

export function BklitAreaChart({
  title,
  subtitle,
  unit,
  regressionResult,
  height = 220,
  showPredictions = false,
}: BklitAreaChartProps) {
  const [hoveredPoint, setHoveredPoint] = React.useState<ProjectedPoint | null>(null);

  const allPoints = regressionResult.points || [];
  // When predictions are off, only display measured observed points
  const points = showPredictions
    ? allPoints
    : allPoints.filter((p) => !p.isProjected);

  if (points.length === 0) {
    return (
      <div className="p-6 rounded-xl bg-card border border-border/40 text-center text-xs text-muted-foreground">
        No recorded data available.
      </div>
    );
  }

  // Layout boundaries with comfortable padding for axis labels
  const padding = { top: 18, right: 24, bottom: 36, left: 52 };
  const width = 600;
  const plotWidth = width - padding.left - padding.right;
  const plotHeight = height - padding.top - padding.bottom;

  const yValues = points.flatMap((p) => [
    p.y,
    showPredictions && p.confidenceHigh ? p.confidenceHigh : p.y,
  ]);
  const rawMax = Math.max(...yValues, 1);

  // Compute clean rounded maxY step
  const computeCleanMax = (val: number, isCurrency: boolean) => {
    if (isCurrency) {
      if (val <= 1000) return 1000;
      if (val <= 2500) return 2500;
      if (val <= 5000) return 5000;
      if (val <= 10000) return 10000;
      return Math.ceil(val / 2000) * 2000;
    }
    if (val <= 5) return 5;
    if (val <= 10) return 10;
    if (val <= 20) return 20;
    if (val <= 50) return 50;
    return Math.ceil(val / 10) * 10;
  };

  const isCurrency = unit === "₹" || unit === "INR";
  const maxY = computeCleanMax(rawMax, isCurrency);
  const minY = 0;

  const scaleX = (index: number) =>
    padding.left + (index / (points.length - 1 || 1)) * plotWidth;
  const scaleY = (val: number) =>
    padding.top + plotHeight - ((val - minY) / (maxY - minY || 1)) * plotHeight;

  // Split observed vs projected
  const observedPoints = points.filter((p) => !p.isProjected);
  const firstProjectedIndex = points.findIndex((p) => p.isProjected);

  // Observed line path
  const observedPath = observedPoints
    .map((p, idx) => `${idx === 0 ? "M" : "L"} ${scaleX(idx)} ${scaleY(p.y)}`)
    .join(" ");

  // Observed area fill (closed polygon)
  const observedArea =
    observedPoints.length > 0
      ? `${observedPath} L ${scaleX(observedPoints.length - 1)} ${scaleY(0)} L ${scaleX(
          0
        )} ${scaleY(0)} Z`
      : "";

  // Projected trend path (when toggle is on)
  const projectedPath =
    showPredictions && firstProjectedIndex !== -1
      ? points
          .slice(Math.max(0, firstProjectedIndex - 1))
          .map(
            (p, idx) =>
              `${idx === 0 ? "M" : "L"} ${scaleX(
                Math.max(0, firstProjectedIndex - 1) + idx
              )} ${scaleY(p.y)}`
          )
          .join(" ")
      : "";

  // 3 Clean Y-axis grid ticks (Min, Mid, Max)
  const yTicks = [0, Math.round(maxY / 2), maxY];

  const formatYTick = (val: number) => {
    if (isCurrency) {
      if (val === 0) return "₹0";
      if (val >= 1000) {
        const kVal = val / 1000;
        return `₹${kVal % 1 === 0 ? kVal.toFixed(0) : kVal.toFixed(1)}k`;
      }
      return `₹${val}`;
    }
    return `${val}`;
  };

  return (
    <div className="p-5 rounded-xl bg-card border border-border/60 space-y-3 shadow-2xs hover:border-border transition-colors">
      {/* Clean Header */}
      <div className="flex items-start justify-between gap-2 pb-1 border-b border-border/30">
        <div>
          <h3 className="font-display text-sm font-semibold text-foreground tracking-tight">
            {title}
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>
        </div>

        {showPredictions && (
          <span className="px-1.5 py-0.5 rounded-xs text-[10px] font-mono font-medium text-muted-foreground border border-border/60">
            R² {(regressionResult.rSquared * 100).toFixed(0)}% fit
          </span>
        )}
      </div>

      {/* SVG Canvas */}
      <div className="relative w-full overflow-hidden">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-auto select-none"
        >
          <defs>
            <linearGradient id={`grad-${title.replace(/\s+/g, "")}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--brand, #2563EB)" stopOpacity="0.18" />
              <stop offset="100%" stopColor="var(--brand, #2563EB)" stopOpacity="0.01" />
            </linearGradient>
          </defs>

          {/* Minimal Grid Lines & Y Ticks */}
          {yTicks.map((tickVal, idx) => {
            const yPos = scaleY(tickVal);
            return (
              <g key={idx}>
                <line
                  x1={padding.left}
                  y1={yPos}
                  x2={width - padding.right}
                  y2={yPos}
                  stroke="currentColor"
                  strokeOpacity={idx === 0 ? "0.15" : "0.06"}
                  strokeDasharray={idx === 0 ? undefined : "3 3"}
                />
                <text
                  x={padding.left - 8}
                  y={yPos + 3.5}
                  textAnchor="end"
                  className="text-[10px] fill-muted-foreground font-mono"
                >
                  {formatYTick(tickVal)}
                </text>
              </g>
            );
          })}

          {/* Observed Area Fill (stroke="none" prevents ugly black perimeter box) */}
          {observedArea && (
            <path
              d={observedArea}
              fill={`url(#grad-${title.replace(/\s+/g, "")})`}
              stroke="none"
            />
          )}

          {/* Observed Line (Solid) */}
          {observedPath && (
            <path
              d={observedPath}
              fill="none"
              stroke="var(--brand, #2563EB)"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}

          {/* Projected Future Line (Dashed) - Only when toggled ON */}
          {showPredictions && projectedPath && (
            <path
              d={projectedPath}
              fill="none"
              stroke="var(--brand, #2563EB)"
              strokeWidth="2"
              strokeDasharray="4 4"
              opacity="0.8"
            />
          )}

          {/* Data Points and X-Axis Labels */}
          {points.map((pt, idx) => {
            const cx = scaleX(idx);
            const cy = scaleY(pt.y);
            const isHovered = hoveredPoint?.label === pt.label;

            // Display every 2nd or 3rd label if many points, otherwise all labels
            const showLabel = points.length <= 5 || idx % 2 === 0 || idx === points.length - 1;

            return (
              <g
                key={idx}
                className="cursor-pointer"
                onMouseEnter={() => setHoveredPoint(pt)}
                onMouseLeave={() => setHoveredPoint(null)}
              >
                {/* Hit area */}
                <circle cx={cx} cy={cy} r="12" fill="transparent" />

                {/* Point */}
                <circle
                  cx={cx}
                  cy={cy}
                  r={isHovered ? 4.5 : pt.isProjected ? 3 : 3}
                  fill={pt.isProjected ? "transparent" : "var(--brand, #2563EB)"}
                  stroke="var(--brand, #2563EB)"
                  strokeWidth="1.5"
                  className="transition-all"
                />

                {/* X Axis Label */}
                {showLabel && (
                  <text
                    x={cx}
                    y={height - 12}
                    textAnchor="middle"
                    className={`text-[10px] font-mono ${
                      pt.isProjected ? "fill-brand font-semibold" : "fill-muted-foreground"
                    }`}
                  >
                    {pt.label}
                  </text>
                )}
              </g>
            );
          })}
        </svg>

        {/* Floating Tooltip */}
        {hoveredPoint && (
          <div className="absolute top-2 right-2 px-2.5 py-1.5 rounded-lg bg-popover border border-border shadow-md text-xs font-mono pointer-events-none">
            <div className="flex items-center gap-1.5 font-semibold text-foreground">
              <span>{hoveredPoint.label}</span>
              {hoveredPoint.isProjected && (
                <span className="text-[9px] px-1 rounded-sm bg-brand/15 text-brand uppercase font-bold">
                  Forecast
                </span>
              )}
            </div>
            <div className="text-muted-foreground mt-0.5">
              <span className="text-foreground font-bold">{hoveredPoint.y}</span> {unit}
            </div>
          </div>
        )}
      </div>

      {/* Simplified Legend */}
      <div className="pt-2 border-t border-border/30 flex items-center justify-between text-[11px] text-muted-foreground font-mono">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-0.5 bg-brand rounded-xs" />
            <span className="text-foreground">Observed History</span>
          </div>
          {showPredictions && (
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-0.5 border-t border-dashed border-brand" />
              <span>Projected</span>
            </div>
          )}
        </div>

        <span className="text-[10px]">
          {showPredictions ? "Linear regression enabled" : "Showing measured records"}
        </span>
      </div>
    </div>
  );
}
