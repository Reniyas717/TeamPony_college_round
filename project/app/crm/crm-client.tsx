"use client";

import * as React from "react";
import { useState } from "react";
import { useContacts, useCrmStats } from "@/hooks/use-crm";
import { ContactFilters } from "@/lib/validations/crm";
import { CrmToolbar } from "@/components/crm/crm-toolbar";
import { CrmTable } from "@/components/crm/crm-table";
import { CrmPipeline } from "@/components/crm/crm-pipeline";
import { FunnelBanner } from "@/components/crm/funnel-banner";
import { CreateContactDrawer } from "@/components/crm/create-contact-drawer";
import { ContactDetailDrawer } from "@/components/crm/contact-detail-drawer";
import { Button } from "@/components/ui/button";

export default function CrmClient() {
  const [view, setView] = useState<"list" | "board">("list");
  const [filters, setFilters] = useState<ContactFilters>({ limit: 50, offset: 0 });
  
  const [selectedContactId, setSelectedContactId] = useState<string | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  const { data: contacts, isLoading, isError, refetch } = useContacts(filters);
  const { data: stats } = useCrmStats();

  return (
    <div className="flex h-[calc(100vh-64px)] overflow-hidden">
      <div className="flex-1 overflow-auto bg-background">
        <div className="max-w-[1440px] mx-auto px-4 md:px-6 lg:px-8 py-6 flex flex-col gap-8">
          
          <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h1 className="font-display text-page font-semibold tracking-tight text-foreground">CRM Contacts</h1>
              <p className="text-base text-muted-foreground max-w-[68ch]">
                Manage your business pipeline, leads, and customer relationships.
              </p>
            </div>
            <div className="flex gap-2">
              <Button variant={view === "list" ? "primary" : "outline"} onClick={() => setView("list")} size="sm">
                List
              </Button>
              <Button variant={view === "board" ? "primary" : "outline"} onClick={() => setView("board")} size="sm">
                Pipeline
              </Button>
            </div>
          </header>

          <FunnelBanner stats={stats} />

          <section className="flex flex-col gap-4">
            <CrmToolbar 
              filters={filters} 
              onFiltersChange={setFilters} 
              onAddClick={() => setIsCreateOpen(true)} 
            />

            {isLoading ? (
              <div className="py-12 flex justify-center">
                <span className="animate-pulse text-muted-foreground text-sm font-semibold">Loading contacts...</span>
              </div>
            ) : isError ? (
              <div className="p-4 rounded-lg border border-destructive bg-status-danger-bg text-status-danger-fg">
                <p className="text-sm font-semibold">We couldn&apos;t load contacts. Check your connection and try again.</p>
                <Button variant="outline" size="sm" onClick={() => refetch()} className="mt-2">Retry</Button>
              </div>
            ) : contacts && contacts.length > 0 ? (
              view === "list" ? (
                <CrmTable contacts={contacts} onSelectContact={(id) => setSelectedContactId(id)} />
              ) : (
                <CrmPipeline contacts={contacts} onSelectContact={(id) => setSelectedContactId(id)} />
              )
            ) : (
              <div className="p-8 text-center bg-card rounded-lg border border-border">
                <p className="text-base text-foreground font-semibold mb-2">No contacts found</p>
                <p className="text-sm text-muted-foreground mb-4">You haven&apos;t added any contacts yet, or none match your filters.</p>
                <Button onClick={() => setIsCreateOpen(true)}>Add your first contact</Button>
              </div>
            )}
          </section>
        </div>
      </div>

      <CreateContactDrawer 
        isOpen={isCreateOpen} 
        onClose={() => setIsCreateOpen(false)} 
      />

      <ContactDetailDrawer 
        contactId={selectedContactId} 
        onClose={() => setSelectedContactId(null)} 
      />
    </div>
  );
}
