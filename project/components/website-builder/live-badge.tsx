"use client";

import * as React from "react";
import { CloseCircle } from "iconsax-react";

interface LiveBadgeProps {
  slug: string;
}

export function LiveBadge({ slug }: LiveBadgeProps) {
  const [visible, setVisible] = React.useState(true);

  if (!visible) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 animate-in fade-in slide-in-from-bottom-2 duration-300">
      <div className="bg-black/90 text-white text-[11px] font-mono pl-3 pr-2 py-1.5 rounded-full backdrop-blur-md shadow-lg flex items-center gap-2 border border-white/10 hover:border-white/20 transition-all">
        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
        <span className="font-semibold tracking-wide">Live Site</span>
        <span className="text-zinc-400 hidden sm:inline">/{slug}</span>
        <button
          type="button"
          onClick={() => setVisible(false)}
          className="ml-1 text-zinc-400 hover:text-white p-0.5 rounded-full transition-colors cursor-pointer"
          title="Dismiss badge"
          aria-label="Dismiss badge"
        >
          <CloseCircle size={14} />
        </button>
      </div>
    </div>
  );
}
