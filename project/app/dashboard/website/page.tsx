import * as React from "react";
import { Button } from "@/components/ui/button";
import { Global, Add, Eye, Edit2 } from "iconsax-react";

export default function WebsitePage() {
  const pages = [
    { id: "p-1", title: "Home Landing Page", slug: "/", status: "Published", updated: "2 hours ago" },
    { id: "p-2", title: "Enterprise Pricing", slug: "/pricing", status: "Published", updated: "1 day ago" },
    { id: "p-3", title: "Contact Sales", slug: "/contact", status: "Published", updated: "3 days ago" },
    { id: "p-4", title: "Product Features", slug: "/features", status: "Draft", updated: "5 days ago" },
  ];

  return (
    <main className="p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-border/40">
        <div>
          <div className="flex items-center gap-2.5 mb-1">
            <div className="w-8 h-8 rounded-sm bg-brand-subtle flex items-center justify-center text-brand-text">
              <Global size="20" />
            </div>
            <h1 className="font-display text-page-sm md:text-page font-bold tracking-tight text-foreground">
              Visual Website Builder
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Custom landing pages with real-time responsive editing and custom domain hosting
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button variant="primary" size="md" className="gap-2 cursor-pointer shadow-sm">
            <Add size="16" className="text-brand-foreground" />
            <span>Create New Page</span>
          </Button>
        </div>
      </div>

      {/* Pages List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {pages.map((p) => (
          <div key={p.id} className="p-5 bg-card/70 border border-border/40 rounded-sm space-y-4 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="font-mono text-[11px] text-muted-foreground">{p.slug}</span>
                <span
                  className={`px-2 py-0.5 rounded-sm text-[10px] font-semibold ${
                    p.status === "Published" ? "bg-status-success-bg text-status-success-fg" : "bg-muted text-muted-foreground"
                  }`}
                >
                  {p.status}
                </span>
              </div>
              <h3 className="font-display text-base font-bold text-foreground">{p.title}</h3>
              <p className="text-xs text-muted-foreground mt-1">Last edited {p.updated}</p>
            </div>

            <div className="pt-3 border-t border-border/20 flex items-center justify-between">
              <Button variant="outline" size="sm" className="h-7 text-xs gap-1.5 cursor-pointer bg-card">
                <Edit2 size="12" />
                <span>Open Editor</span>
              </Button>
              <button type="button" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground cursor-pointer">
                <Eye size="14" />
                <span>Preview</span>
              </button>
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
