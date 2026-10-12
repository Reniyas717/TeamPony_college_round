"use client";

import * as React from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { SecurityUser, UserAdd, Filter, SearchNormal1, DirectSend, Call, More, CloseCircle, Refresh, Chart } from "iconsax-react";
import { useContacts, useCreateContact } from "@/hooks/use-crm";
import { ContactStage } from "@/lib/validations/crm";
import { ContactDetailDrawer } from "@/components/crm/contact-detail-drawer";

function formatRelativeTime(isoString: string): string {
  try {
    const date = new Date(isoString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 5) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24 && date.getDate() === now.getDate()) {
      return `Today, ${date.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: false })}`;
    }
    if (diffDays === 1 || (diffHours < 48 && date.getDate() === now.getDate() - 1)) {
      return "Yesterday";
    }
    if (diffDays < 7) return `${diffDays} days ago`;
    return date.toLocaleDateString("en-IN", { month: "short", day: "numeric" });
  } catch {
    return "Recently";
  }
}

const STAGE_LABELS: Record<ContactStage, string> = {
  lead: "New Leads",
  contacted: "Contacted",
  qualified: "Qualified",
  proposal: "Proposal Sent",
  customer: "Won Customers",
  churned: "Churned",
};

export default function CrmPage() {
  const { data: contactsData, isLoading, refetch } = useContacts();
  const createContactMutation = useCreateContact();

  const [searchQuery, setSearchQuery] = React.useState("");
  const [selectedStageFilter, setSelectedStageFilter] = React.useState<string | null>(null);
  const [isAddOpen, setIsAddOpen] = React.useState(false);
  const [selectedContactId, setSelectedContactId] = React.useState<string | null>(null);

  // Form states for manual Add Contact modal
  const [newFirstName, setNewFirstName] = React.useState("");
  const [newLastName, setNewLastName] = React.useState("");
  const [newEmail, setNewEmail] = React.useState("");
  const [newCompany, setNewCompany] = React.useState("");
  const [newStage, setNewStage] = React.useState<ContactStage>("lead");
  const [formError, setFormError] = React.useState<string | null>(null);

  const contacts = React.useMemo(() => contactsData || [], [contactsData]);

  // Filter contacts by search query and stage
  const filteredContacts = React.useMemo(() => {
    return contacts.filter((c) => {
      const matchesSearch =
        searchQuery === "" ||
        `${c.first_name} ${c.last_name}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (c.company && c.company.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesStage = !selectedStageFilter || c.stage === selectedStageFilter;

      return matchesSearch && matchesStage;
    });
  }, [contacts, searchQuery, selectedStageFilter]);

  // Compute lead engagement & churn statistics
  const stageStats = [
    {
      id: "lead",
      name: "New Inquiries",
      count: contacts.filter((c) => c.stage === "lead").length,
      desc: "Awaiting outreach",
    },
    {
      id: "contacted",
      name: "Contacted",
      count: contacts.filter((c) => c.stage === "contacted").length,
      desc: "Awaiting reply (Yes/No)",
    },
    {
      id: "qualified",
      name: "Qualified (Said Yes)",
      count: contacts.filter((c) => ["qualified", "proposal", "customer"].includes(c.stage)).length,
      desc: "Confirmed interest",
    },
    {
      id: "churned",
      name: "Churned (Said No)",
      count: contacts.filter((c) => c.stage === "churned").length,
      desc: "Declined or opted out",
    },
  ];

  const handleCreateContact = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFirstName.trim() || !newLastName.trim() || !newEmail.trim()) {
      setFormError("First name, last name, and email are required.");
      return;
    }
    setFormError(null);
    try {
      await createContactMutation.mutateAsync({
        first_name: newFirstName.trim(),
        last_name: newLastName.trim(),
        email: newEmail.trim(),
        company: newCompany.trim() || undefined,
        stage: newStage,
        value: 0,
        source: "manual",
        tags: [],
      });

      setIsAddOpen(false);
      setNewFirstName("");
      setNewLastName("");
      setNewEmail("");
      setNewCompany("");
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : "Failed to create contact");
    }
  };

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
            <span className="hidden sm:inline-flex items-center gap-1.5 px-2 py-0.5 rounded-xs bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 text-[10px] font-mono font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Live Ingestion Active
            </span>
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Customer lifecycle management, deal pipeline tracking, and multi-channel touchpoints
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            className="gap-1.5 cursor-pointer text-xs h-9 bg-card"
            title="Refresh contacts"
          >
            <Refresh size="14" className={isLoading ? "animate-spin" : ""} />
            <span>Refresh</span>
          </Button>
          <Button
            variant="primary"
            size="md"
            onClick={() => setIsAddOpen(true)}
            className="gap-2 cursor-pointer shadow-sm"
          >
            <UserAdd size="16" className="text-brand-foreground" />
            <span>Add Contact</span>
          </Button>
          <Button
            variant="outline"
            size="md"
            asChild
            className="gap-2 cursor-pointer bg-card hover:bg-muted/50 border border-border shadow-xs"
          >
            <Link href="/dashboard/crm/analytics">
              <Chart size="16" className="text-foreground" />
              <span>View CRM Analytics</span>
            </Link>
          </Button>
        </div>
      </div>

      {/* Stage Summary Pipeline Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {stageStats.map((stage) => {
          const isSelected = selectedStageFilter === stage.id;
          return (
            <div
              key={stage.id}
              onClick={() => setSelectedStageFilter(isSelected ? null : stage.id)}
              className={`p-4 bg-card/70 border rounded-sm flex flex-col justify-between cursor-pointer transition-all ${
                isSelected
                  ? "border-brand-text bg-accent/30 shadow-xs ring-1 ring-brand-text"
                  : "border-border/40 hover:border-border hover:bg-card"
              }`}
            >
              <div>
                <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                  {stage.name}
                </p>
                <p className="text-xl font-bold font-display mt-1 text-foreground">{stage.count}</p>
              </div>
              <p className="text-[11px] text-muted-foreground mt-3 pt-2 border-t border-border/20">
                {stage.desc}
              </p>
            </div>
          );
        })}
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-card/70 p-3.5 rounded-sm border border-border/40 flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <SearchNormal1 size="16" className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search contacts, company, or email..."
            className="w-full pl-9 pr-3 py-1.5 text-xs rounded-sm bg-background border border-border text-foreground placeholder:text-muted-foreground focus:outline-hidden focus:border-brand-text"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          {selectedStageFilter && (
            <button
              type="button"
              onClick={() => setSelectedStageFilter(null)}
              className="text-[11px] font-medium text-muted-foreground hover:text-foreground underline cursor-pointer"
            >
              Clear stage filter
            </button>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setSelectedStageFilter(null)}
            className="gap-1.5 cursor-pointer text-xs h-8 bg-card"
          >
            <Filter size="14" />
            <span>{selectedStageFilter ? `Filtered: ${STAGE_LABELS[selectedStageFilter as ContactStage] || selectedStageFilter}` : "All Stages"}</span>
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
                <th className="py-3 px-4">Response / Churn Decision</th>
                <th className="py-3 px-4">Source</th>
                <th className="py-3 px-4">Last Activity</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/20 text-foreground">
              {isLoading && contacts.length === 0 ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td className="py-3 px-4">
                      <div className="h-4 w-32 bg-muted/60 rounded-xs mb-1" />
                      <div className="h-3 w-40 bg-muted/30 rounded-xs" />
                    </td>
                    <td className="py-3 px-4">
                      <div className="h-3.5 w-24 bg-muted/50 rounded-xs" />
                    </td>
                    <td className="py-3 px-4">
                      <div className="h-5 w-20 bg-muted/40 rounded-sm" />
                    </td>
                    <td className="py-3 px-4">
                      <div className="h-5 w-28 bg-muted/30 rounded-sm" />
                    </td>
                    <td className="py-3 px-4">
                      <div className="h-3.5 w-16 bg-muted/40 rounded-xs" />
                    </td>
                    <td className="py-3 px-4">
                      <div className="h-3 w-20 bg-muted/30 rounded-xs font-mono" />
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="h-6 w-16 bg-muted/40 rounded-xs ml-auto" />
                    </td>
                  </tr>
                ))
              ) : filteredContacts.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-muted-foreground">
                    <p className="text-sm font-semibold text-foreground">No contacts found</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {searchQuery
                        ? "No contacts match your search query."
                        : "Submissions from your website contact forms will appear here automatically."}
                    </p>
                  </td>
                </tr>
              ) : (
                filteredContacts.map((contact) => (
                  <tr
                    key={contact.id}
                    onClick={() => setSelectedContactId(contact.id)}
                    className="hover:bg-accent/40 transition-colors cursor-pointer group"
                  >
                    <td className="py-3 px-4">
                      <p className="font-semibold text-foreground group-hover:text-primary transition-colors">
                        {contact.first_name} {contact.last_name}
                      </p>
                      <p className="text-[11px] text-muted-foreground font-mono">{contact.email}</p>
                    </td>
                    <td className="py-3 px-4 text-foreground font-medium">
                      {contact.company || "—"}
                    </td>
                    <td className="py-3 px-4">
                      <span className="inline-block px-2 py-0.5 rounded-sm bg-muted text-foreground text-[11px] font-medium">
                        {contact.stage === "unknown" ? "Unknown" : STAGE_LABELS[contact.stage]}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      {contact.stage === "churned" ? (
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-sm bg-status-danger-bg/20 text-status-danger-fg border border-status-danger-border text-[11px] font-semibold">
                          <span className="w-1.5 h-1.5 rounded-full bg-status-danger-fg" /> Churned (Said No)
                        </span>
                      ) : ["qualified", "proposal", "customer"].includes(contact.stage) ? (
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-sm bg-status-success-bg/20 text-status-success-fg border border-status-success-border text-[11px] font-semibold">
                          <span className="w-1.5 h-1.5 rounded-full bg-status-success-fg" /> Qualified (Said Yes)
                        </span>
                      ) : contact.stage === "contacted" ? (
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-sm bg-primary/10 text-primary border border-primary/20 text-[11px] font-medium">
                          <span className="w-1.5 h-1.5 rounded-full bg-primary" /> Awaiting Reply
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-sm bg-muted text-muted-foreground text-[11px] font-medium">
                          <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground" /> New Inquiry
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      {contact.source === "website_form" ? (
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-sm bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 font-medium text-[11px]">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                          Website Form
                        </span>
                      ) : contact.source === "webinar" ? (
                        <span className="inline-block px-2 py-0.5 rounded-sm bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 text-[11px]">
                          Webinar
                        </span>
                      ) : (
                        <span className="text-muted-foreground capitalize">
                          {contact.source.replace("_", " ")}
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-muted-foreground font-mono text-[11px]">
                      {formatRelativeTime(contact.last_activity_at || contact.created_at)}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="inline-flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedContactId(contact.id);
                          }}
                          className="p-1 rounded-sm text-muted-foreground hover:text-foreground cursor-pointer hover:bg-muted"
                          title="Open contact & send message"
                        >
                          <DirectSend size="14" />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedContactId(contact.id);
                          }}
                          className="p-1 rounded-sm text-muted-foreground hover:text-foreground cursor-pointer hover:bg-muted"
                          title="Log call & view timeline"
                        >
                          <Call size="14" />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedContactId(contact.id);
                          }}
                          className="p-1 rounded-sm text-muted-foreground hover:text-foreground cursor-pointer hover:bg-muted"
                          title="Contact details & actions"
                        >
                          <More size="14" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Manual Add Contact Modal */}
      {isAddOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-card border border-border rounded-sm shadow-2xl max-w-md w-full flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-4 border-b border-border/40 flex items-center justify-between bg-muted/20">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-sm bg-brand-subtle flex items-center justify-center text-brand-text">
                  <UserAdd size="16" />
                </div>
                <h3 className="font-display text-sm font-bold text-foreground">Add New CRM Contact</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsAddOpen(false)}
                className="p-1 rounded-sm text-muted-foreground hover:text-foreground cursor-pointer"
              >
                <CloseCircle size="18" />
              </button>
            </div>

            <form onSubmit={handleCreateContact} className="p-4 space-y-3 text-xs">
              {formError && (
                <div className="p-2 rounded-sm bg-destructive/10 text-destructive text-[11px]">
                  {formError}
                </div>
              )}

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] font-semibold uppercase text-muted-foreground block mb-1">
                    First Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={newFirstName}
                    onChange={(e) => setNewFirstName(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-sm border bg-background text-foreground text-xs"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-semibold uppercase text-muted-foreground block mb-1">
                    Last Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={newLastName}
                    onChange={(e) => setNewLastName(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-sm border bg-background text-foreground text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-semibold uppercase text-muted-foreground block mb-1">
                  Email *
                </label>
                <input
                  type="email"
                  required
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded-sm border bg-background text-foreground text-xs"
                />
              </div>

              <div>
                <label className="text-[10px] font-semibold uppercase text-muted-foreground block mb-1">
                  Company
                </label>
                <input
                  type="text"
                  value={newCompany}
                  onChange={(e) => setNewCompany(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded-sm border bg-background text-foreground text-xs"
                />
              </div>

              <div>
                <label className="text-[10px] font-semibold uppercase text-muted-foreground block mb-1">
                  Stage
                </label>
                <select
                  value={newStage}
                  onChange={(e) => setNewStage(e.target.value as ContactStage)}
                  className="w-full px-2.5 py-1.5 rounded-sm border bg-background text-foreground text-xs"
                >
                  <option value="lead">New Leads</option>
                  <option value="contacted">Contacted</option>
                  <option value="qualified">Qualified</option>
                  <option value="proposal">Proposal Sent</option>
                  <option value="customer">Won Customers</option>
                  <option value="churned">Churned</option>
                </select>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsAddOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  disabled={createContactMutation.isPending}
                >
                  {createContactMutation.isPending ? "Creating..." : "Save Contact"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Contact Detail & Messaging Drawer */}
      {selectedContactId && (
        <ContactDetailDrawer
          contactId={selectedContactId}
          onClose={() => setSelectedContactId(null)}
        />
      )}
    </main>
  );
}
