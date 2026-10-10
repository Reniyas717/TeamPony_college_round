import * as React from "react";
import { Button } from "@/components/ui/button";
import { SecurityUser, UserAdd, Filter, SearchNormal1, DirectSend, Call, More } from "iconsax-react";

export default function CrmPage() {
  const stages = [
    { id: "lead", name: "New Leads", count: 4, value: "₹84,000" },
    { id: "contacted", name: "Contacted", count: 2, value: "₹45,000" },
    { id: "qualified", name: "Qualified", count: 3, value: "₹1,20,000" },
    { id: "proposal", name: "Proposal Sent", count: 1, value: "₹65,000" },
    { id: "customer", name: "Won Customers", count: 5, value: "₹2,50,000" },
  ];

  const sampleContacts = [
    {
      id: "c-1",
      name: "Rohan Sharma",
      email: "rohan@enterprise.in",
      company: "Apex Tech Solutions",
      stage: "Qualified",
      value: "₹60,000",
      source: "Website Form",
      lastActive: "Today, 14:20",
    },
    {
      id: "c-2",
      name: "Priya Nair",
      email: "priya@nairlogistics.com",
      company: "Nair Logistics",
      stage: "New Leads",
      value: "₹24,000",
      source: "Webinar",
      lastActive: "Yesterday",
    },
    {
      id: "c-3",
      name: "Anand Verma",
      email: "anand@zenithretail.in",
      company: "Zenith Retail Corp",
      stage: "Won Customers",
      value: "₹1,10,000",
      source: "Referral",
      lastActive: "3 days ago",
    },
  ];

  return (
    <main className="p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-border/40">
        <div>
          <div className="flex items-center gap-2.5 mb-1">
            <div className="w-8 h-8 rounded-sm bg-brand-subtle flex items-center justify-center text-brand-text">
              <SecurityUser size="20" />
            </div>
            <h1 className="font-display text-page-sm md:text-page font-bold tracking-tight text-foreground">
              Intelligent CRM
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Customer lifecycle management, deal pipeline tracking, and multi-channel touchpoints
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button variant="primary" size="md" className="gap-2 cursor-pointer shadow-sm">
            <UserAdd size="16" className="text-brand-foreground" />
            <span>Add Contact</span>
          </Button>
        </div>
      </div>

      {/* Stage Summary Pipeline Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {stages.map((stage) => (
          <div key={stage.id} className="p-4 bg-card/70 border border-border/40 rounded-sm flex flex-col justify-between">
            <div>
              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">{stage.name}</p>
              <p className="text-xl font-bold font-display mt-1 text-foreground">{stage.count}</p>
            </div>
            <p className="text-xs font-mono text-brand-text mt-3 pt-2 border-t border-border/20">{stage.value}</p>
          </div>
        ))}
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-card/70 p-3.5 rounded-sm border border-border/40 flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <SearchNormal1 size="16" className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search contacts, company, or email..."
            className="w-full pl-9 pr-3 py-1.5 text-xs rounded-sm bg-background border border-border text-foreground placeholder:text-muted-foreground focus:outline-hidden focus:border-brand-text"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          <Button variant="outline" size="sm" className="gap-1.5 cursor-pointer text-xs h-8 bg-card">
            <Filter size="14" />
            <span>Filter</span>
          </Button>
        </div>
      </div>

      {/* Contacts Table */}
      <div className="bg-card/70 rounded-sm border border-border/40 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-border/40 bg-muted/20 text-muted-foreground font-semibold uppercase tracking-wider text-[10px]">
                <th className="py-3 px-4">Contact</th>
                <th className="py-3 px-4">Company</th>
                <th className="py-3 px-4">Pipeline Stage</th>
                <th className="py-3 px-4">Deal Value</th>
                <th className="py-3 px-4">Source</th>
                <th className="py-3 px-4">Last Activity</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/20 text-foreground">
              {sampleContacts.map((contact) => (
                <tr key={contact.id} className="hover:bg-accent/40 transition-colors">
                  <td className="py-3 px-4">
                    <p className="font-semibold text-foreground">{contact.name}</p>
                    <p className="text-[11px] text-muted-foreground font-mono">{contact.email}</p>
                  </td>
                  <td className="py-3 px-4 text-foreground font-medium">{contact.company}</td>
                  <td className="py-3 px-4">
                    <span className="inline-block px-2 py-0.5 rounded-sm bg-muted text-foreground text-[11px] font-medium">
                      {contact.stage}
                    </span>
                  </td>
                  <td className="py-3 px-4 font-mono font-semibold text-foreground">{contact.value}</td>
                  <td className="py-3 px-4 text-muted-foreground">{contact.source}</td>
                  <td className="py-3 px-4 text-muted-foreground font-mono text-[11px]">{contact.lastActive}</td>
                  <td className="py-3 px-4 text-right">
                    <div className="inline-flex items-center gap-1.5">
                      <button
                        type="button"
                        className="p-1 rounded-sm text-muted-foreground hover:text-foreground cursor-pointer"
                        title="Send email"
                      >
                        <DirectSend size="14" />
                      </button>
                      <button
                        type="button"
                        className="p-1 rounded-sm text-muted-foreground hover:text-foreground cursor-pointer"
                        title="Log call"
                      >
                        <Call size="14" />
                      </button>
                      <button
                        type="button"
                        className="p-1 rounded-sm text-muted-foreground hover:text-foreground cursor-pointer"
                        title="Options"
                      >
                        <More size="14" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}
