import * as React from "react"
import { cn } from "./button"

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "success" | "warning" | "danger" | "info" | "neutral" | "brand";
}

export function Badge({ className, variant = "default", ...props }: BadgeProps) {
  const variantClasses = {
    default: "bg-secondary text-secondary-foreground",
    success: "bg-status-success-bg text-status-success-fg",
    warning: "bg-status-warning-bg text-status-warning-fg",
    danger: "bg-status-danger-bg text-status-danger-fg",
    info: "bg-status-info-bg text-status-info-fg",
    neutral: "bg-status-neutral-bg text-status-neutral-fg",
    brand: "bg-brand text-brand-foreground",
  };

  return (
    <div
      className={cn(
        "inline-flex items-center rounded-xs px-2.5 py-0.5 text-sm font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
        variantClasses[variant],
        className
      )}
      {...props}
    />
  )
}
