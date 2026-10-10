"use client";

import * as React from "react";
import { ChannelBreakdownData } from "@/lib/validations/analytics";
import { DirectSend, Global, VideoPlay, UserAdd } from "iconsax-react";

interface BklitChannelBarsProps {
  channels: ChannelBreakdownData[];
}

export function BklitChannelBars({ channels }: BklitChannelBarsProps) {
  const getChannelIcon = (ch: string) => {
    switch (ch) {
      case "website_form":
        return Global;
      case "webinar":
        return VideoPlay;
      case "manual":
        return UserAdd;
      default:
        return DirectSend;
    }
  };

  const totalLeads = channels.reduce((acc, c) => acc + c.leadsCount, 0) || 1;

  return (
    <div className="p-5 rounded-sm bg-card/70 border border-border/40 space-y-4 shadow-2xs">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-border/30">
        <div>
          <h3 className="font-display text-sm font-semibold text-foreground">
            Lead Sources
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Where your contacts are coming from
          </p>
        </div>
      </div>

      <div className="space-y-4 pt-1">
        {channels.map((item) => {
          const IconComp = getChannelIcon(item.channel);
          const sharePct = Math.round((item.leadsCount / totalLeads) * 100);

          return (
            <div key={item.channel} className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <div className="p-1 rounded-xs bg-muted/40 text-muted-foreground">
                    <IconComp size="13" />
                  </div>
                  <span className="font-medium text-foreground">{item.label}</span>
                </div>
                <div className="flex items-center gap-3 font-mono text-xs">
                  <span className="text-muted-foreground">{item.leadsCount} leads</span>
                  <span className="text-foreground font-semibold">
                    {item.customersCount} customers
                  </span>
                  <span className="text-emerald-500 font-bold min-w-[36px] text-right">
                    {item.conversionRate}%
                  </span>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="w-full bg-muted/30 h-2 rounded-full overflow-hidden">
                <div
                  className="bg-brand h-full rounded-full transition-all duration-500"
                  style={{ width: `${Math.max(item.leadsCount > 0 ? 3 : 0, sharePct)}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>

      <div className="pt-2 border-t border-border/20 flex items-center justify-between text-xs text-muted-foreground">
        <span>Total tracked contacts: {totalLeads}</span>
      </div>
    </div>
  );
}
