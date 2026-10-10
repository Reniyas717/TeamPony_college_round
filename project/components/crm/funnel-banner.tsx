import * as React from "react";
import { CrmStats } from "@/lib/validations/crm";

export function FunnelBanner({ stats }: { stats?: CrmStats }) {
  if (!stats) return null;

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <StatCard label="Total Contacts" value={stats.totalContacts} />
      <StatCard
        label="Qualified Leads"
        value={stats.conversionRate.qualifiedOfTotal.count}
        rate={`${stats.conversionRate.qualifiedOfTotal.percentage.toFixed(1)}%`}
        denominator={`of ${stats.conversionRate.qualifiedOfTotal.total}`}
      />
      <StatCard
        label="Churned Leads"
        value={stats.stageCounts?.churned || 0}
      />
      <StatCard
        label="Customers (Total)"
        value={stats.conversionRate.customersOfTotal.count}
      />
    </div>
  );
}

function StatCard({ label, value, rate, denominator }: { label: string; value: number | string; rate?: string; denominator?: string }) {
  return (
    <div className="bg-card border border-border p-5 rounded-lg flex flex-col gap-1 shadow-sm">
      <span className="text-sm font-semibold text-muted-foreground">{label}</span>
      <div className="flex items-baseline gap-2">
        <span className="font-display text-page font-semibold tracking-tight text-foreground tabular-nums">
          {value}
        </span>
      </div>
      {rate && (
        <span className="text-xs text-muted-foreground font-medium mt-1">
          <span className="text-foreground font-semibold tabular-nums">{rate}</span> {denominator}
        </span>
      )}
    </div>
  );
}
