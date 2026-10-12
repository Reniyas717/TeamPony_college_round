import * as React from "react";
import { cn } from "@/components/ui/button";

/* -------------------------------------------------------------------------------------------------
 * Base Skeleton Primitive
 *
 * Skeletons use `muted` with a gentle opacity pulse or shimmer, strictly adhering to DESIGN.md §13.1
 * and §20.3 (removed under motion-reduce).
 * -----------------------------------------------------------------------------------------------*/

export interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  shimmer?: boolean;
}

export function Skeleton({
  className,
  shimmer = false,
  ...props
}: SkeletonProps) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        "rounded-sm bg-muted/60 relative overflow-hidden",
        shimmer
          ? "before:absolute before:inset-0 before:-translate-x-full before:animate-[shimmer_2s_infinite] before:bg-gradient-to-r before:from-transparent before:via-foreground/5 before:to-transparent motion-reduce:before:hidden"
          : "animate-pulse motion-reduce:animate-none",
        className
      )}
      {...props}
    />
  );
}

/* -------------------------------------------------------------------------------------------------
 * Brand Spinner / Circular Loader
 *
 * Micro-loaders adhering to DESIGN.md §20.3 (continuous rotation, linear, accessible live region).
 * -----------------------------------------------------------------------------------------------*/

export interface SpinnerProps extends React.SVGAttributes<SVGSVGElement> {
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  variant?: "brand" | "primary" | "muted" | "foreground";
  label?: string;
}

const SPINNER_SIZES = {
  xs: "w-3 h-3",
  sm: "w-4 h-4",
  md: "w-5 h-5",
  lg: "w-7 h-7",
  xl: "w-10 h-10",
};

const SPINNER_VARIANTS = {
  brand: "text-brand-text",
  primary: "text-primary",
  muted: "text-muted-foreground",
  foreground: "text-foreground",
};

export function Spinner({
  size = "md",
  variant = "brand",
  label = "Loading...",
  className,
  ...props
}: SpinnerProps) {
  return (
    <span className="inline-flex items-center justify-center" role="status" aria-label={label}>
      <svg
        className={cn(
          "animate-spin motion-reduce:animate-none",
          SPINNER_SIZES[size],
          SPINNER_VARIANTS[variant],
          className
        )}
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        {...props}
      >
        <circle
          className="opacity-20"
          cx="12"
          cy="12"
          r="10"
          stroke="currentColor"
          strokeWidth="3"
        />
        <path
          className="opacity-90"
          fill="currentColor"
          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
        />
      </svg>
      <span className="sr-only">{label}</span>
    </span>
  );
}

/* -------------------------------------------------------------------------------------------------
 * Full-Page / Shell Loading Screen
 *
 * Branded workspace loader with authoritative design tokens (DESIGN.md §3, §13).
 * -----------------------------------------------------------------------------------------------*/

export interface PageLoaderProps {
  title?: string;
  subtitle?: string;
  className?: string;
}

export function PageLoader({
  title = "Loading Nexus...",
  subtitle = "Synchronizing business workspace and verified telemetry",
  className,
}: PageLoaderProps) {
  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        "min-h-[60vh] w-full flex flex-col items-center justify-center p-6 text-center select-none",
        className
      )}
    >
      <div className="relative mb-5">
        {/* Subtle decorative glow ring */}
        <div className="w-16 h-16 rounded-lg bg-brand/10 border border-brand/20 flex items-center justify-center shadow-xs">
          <Spinner size="lg" variant="brand" label={title} />
        </div>
        <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-card border border-border flex items-center justify-center shadow-2xs">
          <span className="w-2 h-2 rounded-full bg-brand animate-pulse" />
        </div>
      </div>

      <h3 className="font-display text-lg font-semibold tracking-tight text-foreground">
        {title}
      </h3>
      {subtitle && (
        <p className="text-xs text-muted-foreground mt-1 max-w-sm leading-relaxed">
          {subtitle}
        </p>
      )}

      {/* Subtle micro progress rail */}
      <div className="w-48 h-1 bg-muted/60 rounded-full mt-6 overflow-hidden">
        <div className="h-full bg-brand-text rounded-full w-2/5 animate-[indeterminate_1.8s_ease-in-out_infinite] motion-reduce:hidden" />
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------------------------------
 * Domain Skeleton Layout Patterns (DESIGN.md §13.1, §14.1)
 *
 * High-fidelity skeletons matching exact destination layout dimensions to eliminate layout shifts.
 * -----------------------------------------------------------------------------------------------*/

/**
 * KPI Metric Strip Skeleton (Used across Dashboard, Webinars, Analytics, Marketing)
 */
export function MetricCardsSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 w-full" aria-hidden="true">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="p-4 sm:p-5 rounded-sm bg-card border border-border/70 space-y-3 shadow-2xs"
        >
          <div className="flex items-center justify-between">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-6 w-6 rounded-xs" />
          </div>
          <div className="space-y-1.5">
            <Skeleton className="h-7 w-28" />
            <Skeleton className="h-3 w-16" />
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * Data Table Skeleton (Used across CRM, Marketing Campaigns, Webinars, Audit Logs)
 */
export function TableSkeleton({
  rows = 5,
  columns = 6,
  showHeader = true,
}: {
  rows?: number;
  columns?: number;
  showHeader?: boolean;
}) {
  return (
    <div className="w-full rounded-sm border border-border/60 bg-card overflow-hidden shadow-2xs" aria-hidden="true">
      {showHeader && (
        <div className="p-4 border-b border-border/40 flex items-center justify-between gap-4">
          <Skeleton className="h-8 w-64 rounded-sm" />
          <div className="flex items-center gap-2">
            <Skeleton className="h-8 w-24 rounded-sm" />
            <Skeleton className="h-8 w-28 rounded-sm" />
          </div>
        </div>
      )}

      <div className="overflow-x-auto">
        <div className="min-w-full divide-y divide-border/30">
          {/* Table Header Row */}
          <div className="bg-muted/20 px-4 py-3 grid grid-flow-col auto-cols-fr gap-4">
            {Array.from({ length: columns }).map((_, idx) => (
              <Skeleton key={idx} className="h-3.5 w-3/4" />
            ))}
          </div>

          {/* Table Body Rows */}
          {Array.from({ length: rows }).map((_, rowIdx) => (
            <div key={rowIdx} className="px-4 py-3.5 grid grid-flow-col auto-cols-fr gap-4 items-center">
              {Array.from({ length: columns }).map((_, colIdx) => (
                <div key={colIdx} className="space-y-1">
                  <Skeleton
                    className={cn(
                      "h-3.5",
                      colIdx === 0 ? "w-4/5" : colIdx === columns - 1 ? "w-16 ml-auto" : "w-3/5"
                    )}
                  />
                  {colIdx === 0 && <Skeleton className="h-2.5 w-2/5" />}
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/**
 * Full Workspace / Module Header Skeleton
 */
export function PageHeaderSkeleton({
  hasAction = true,
}: {
  hasAction?: boolean;
}) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border/40 w-full" aria-hidden="true">
      <div className="space-y-2">
        <div className="flex items-center gap-2.5">
          <Skeleton className="w-8 h-8 rounded-sm" />
          <Skeleton className="h-7 w-52 sm:w-64" />
          <Skeleton className="h-4 w-20 rounded-xs hidden sm:block" />
        </div>
        <Skeleton className="h-4 w-72 sm:w-96 max-w-full" />
      </div>

      {hasAction && (
        <div className="flex items-center gap-2.5 shrink-0">
          <Skeleton className="h-9 w-24 rounded-sm" />
          <Skeleton className="h-9 w-32 rounded-sm" />
        </div>
      )}
    </div>
  );
}

/**
 * Full Dashboard / Module Page Skeleton
 */
export function WorkspaceSkeleton() {
  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6 w-full animate-in fade-in duration-200" aria-hidden="true">
      <PageHeaderSkeleton />
      <MetricCardsSkeleton count={4} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <TableSkeleton rows={4} columns={5} />
        </div>
        <div className="space-y-4">
          <div className="rounded-sm border border-border/60 bg-card p-5 space-y-4">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-48 w-full rounded-sm" />
            <div className="space-y-2">
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-3 w-4/5" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Full Shell Skeleton (Matches DashboardLayoutClient: 256px sidebar + 64px header + content)
 * Eliminates the plain full-screen "Loading Nexus Workspace..." text flash.
 */
export function FullShellSkeleton() {
  return (
    <div className="flex h-screen w-full bg-background overflow-hidden text-foreground antialiased" aria-hidden="true">
      {/* Skeleton Sidebar - Desktop (256px fixed per DESIGN.md §6.2) */}
      <aside className="hidden lg:flex w-64 border-r border-border/40 bg-sidebar flex-col shrink-0">
        {/* Workspace Brand / Header */}
        <div className="h-16 px-4 flex items-center justify-between border-b border-border/40">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-sm bg-brand/20 border border-brand/30 flex items-center justify-center font-display font-black text-brand-text text-sm shadow-xs">
              N
            </div>
            <div className="space-y-1">
              <Skeleton className="h-3.5 w-20" />
              <Skeleton className="h-2.5 w-16" />
            </div>
          </div>
          <Skeleton className="w-6 h-6 rounded-xs" />
        </div>

        {/* Navigation Sections */}
        <div className="flex-1 px-3 py-4 space-y-6 overflow-hidden">
          {/* Section 1 */}
          <div className="space-y-1.5">
            <Skeleton className="h-2.5 w-16 ml-2 mb-2" />
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 px-3 py-2 rounded-sm bg-muted/20">
                <Skeleton className="w-4 h-4 rounded-xs shrink-0" />
                <Skeleton className="h-3.5 w-28" />
              </div>
            ))}
          </div>

          {/* Section 2 */}
          <div className="space-y-1.5">
            <Skeleton className="h-2.5 w-14 ml-2 mb-2" />
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 px-3 py-2 rounded-sm bg-muted/20">
                <Skeleton className="w-4 h-4 rounded-xs shrink-0" />
                <Skeleton className="h-3.5 w-24" />
              </div>
            ))}
          </div>

          {/* Section 3 */}
          <div className="space-y-1.5">
            <Skeleton className="h-2.5 w-16 ml-2 mb-2" />
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 px-3 py-2 rounded-sm bg-muted/20">
                <Skeleton className="w-4 h-4 rounded-xs shrink-0" />
                <Skeleton className="h-3.5 w-32" />
              </div>
            ))}
          </div>
        </div>

        {/* Sidebar Footer User Info */}
        <div className="p-3 bg-sidebar border-t border-border/40 mt-auto">
          <div className="flex items-center justify-between p-2 rounded-sm bg-muted/20 border border-border/30">
            <div className="space-y-1">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-2.5 w-28" />
            </div>
            <Skeleton className="w-6 h-6 rounded-xs" />
          </div>
        </div>
      </aside>

      {/* Main Canvas Canvas */}
      <div className="flex-1 flex flex-col h-full min-w-0 overflow-hidden">
        {/* Top 64px Header */}
        <header className="h-16 shrink-0 bg-background/95 border-b border-border/40 flex items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <Skeleton className="w-8 h-8 rounded-sm" />
            <div className="h-4 w-px bg-muted/40" />
            <div className="flex items-center gap-2">
              <Skeleton className="h-3.5 w-12" />
              <span className="text-muted-foreground/40 text-xs">/</span>
              <Skeleton className="h-3.5 w-20" />
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Skeleton className="w-8 h-8 rounded-sm" />
          </div>
        </header>

        {/* Canvas Body with WorkspaceSkeleton */}
        <main className="flex-1 min-w-0 overflow-y-auto p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto space-y-6">
          <PageHeaderSkeleton hasAction={true} />
          <MetricCardsSkeleton count={4} />
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-4">
              <TableSkeleton rows={4} columns={4} />
            </div>
            <div className="space-y-4">
              <div className="rounded-sm border border-border/60 bg-card p-5 space-y-4">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-48 w-full rounded-sm" />
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

