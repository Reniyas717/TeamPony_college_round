import * as React from "react";
import { Button } from "@/components/ui/button";
import { DirectSend, Add } from "iconsax-react";

export default function MarketingPage() {
  const campaigns = [
    {
      id: "m-1",
      name: "Q4 Product Expansion Announcement",
      audience: "All Active Customers (1,240 recipients)",
      status: "Sent",
      openRate: "48.2%",
      clickRate: "16.5%",
      sentAt: "Yesterday, 10:30",
    },
    {
      id: "m-2",
      name: "Webinar Lead Follow-Up Sequence",
      audience: "Webinar Registrants (430 recipients)",
      status: "Active Flow",
      openRate: "62.1%",
      clickRate: "28.4%",
      sentAt: "Automated trigger",
    },
    {
      id: "m-3",
      name: "Inactive Account Winback Campaign",
      audience: "Dormant Leads (310 recipients)",
      status: "Draft",
      openRate: "—",
      clickRate: "—",
      sentAt: "Unscheduled",
    },
  ];

  return (
    <main className="p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-border/40">
        <div>
          <div className="flex items-center gap-2.5 mb-1">
            <div className="w-8 h-8 rounded-sm bg-brand-subtle flex items-center justify-center text-brand-text">
              <DirectSend size="20" />
            </div>
            <h1 className="font-display text-page-sm md:text-page font-bold tracking-tight text-foreground">
              Marketing & Campaigns
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Automate personalized email campaigns triggered by customer actions, CRM tags, and billing status
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button variant="primary" size="md" className="gap-2 cursor-pointer shadow-sm">
            <Add size="16" className="text-brand-foreground" />
            <span>Create Campaign</span>
          </Button>
        </div>
      </div>

      {/* Campaigns Table */}
      <div className="bg-card/70 rounded-sm border border-border/40 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-border/40 bg-muted/20 text-muted-foreground font-semibold uppercase tracking-wider text-[10px]">
                <th className="py-3 px-4">Campaign Name</th>
                <th className="py-3 px-4">Audience Segment</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Open Rate</th>
                <th className="py-3 px-4">Click Rate</th>
                <th className="py-3 px-4">Delivery Timeline</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/20 text-foreground">
              {campaigns.map((c) => (
                <tr key={c.id} className="hover:bg-accent/40 transition-colors">
                  <td className="py-3 px-4 font-semibold text-foreground">{c.name}</td>
                  <td className="py-3 px-4 text-muted-foreground">{c.audience}</td>
                  <td className="py-3 px-4">
                    <span
                      className={`px-2 py-0.5 rounded-sm text-[11px] font-medium ${
                        c.status === "Sent"
                          ? "bg-status-success-bg text-status-success-fg"
                          : c.status === "Active Flow"
                          ? "bg-brand-subtle text-brand-text"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {c.status}
                    </span>
                  </td>
                  <td className="py-3 px-4 font-mono font-medium">{c.openRate}</td>
                  <td className="py-3 px-4 font-mono font-medium">{c.clickRate}</td>
                  <td className="py-3 px-4 text-muted-foreground font-mono text-[11px]">{c.sentAt}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}
