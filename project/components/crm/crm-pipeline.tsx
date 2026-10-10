import * as React from "react";
import { Contact } from "@/lib/validations/crm";

const STAGES: Contact['stage'][] = ["lead", "contacted", "qualified", "proposal", "customer", "churned"];

export function CrmPipeline({
  contacts,
  onSelectContact
}: {
  contacts: Contact[];
  onSelectContact: (id: string) => void;
}) {
  const grouped = STAGES.reduce((acc, stage) => {
    acc[stage] = contacts.filter((c) => c.stage === stage);
    return acc;
  }, {} as Record<Contact['stage'], Contact[]>);

  return (
    <div className="flex gap-4 overflow-x-auto pb-4 snap-x">
      {STAGES.map((stage) => (
        <div key={stage} className="flex-none w-72 md:w-80 flex flex-col gap-3 snap-start">
          <div className="flex items-center justify-between px-1">
            <h3 className="font-semibold text-foreground capitalize">{stage}</h3>
            <span className="text-sm font-semibold text-muted-foreground bg-muted px-2 py-0.5 rounded-xs">
              {grouped[stage].length}
            </span>
          </div>
          
          <div className="flex flex-col gap-3 min-h-[500px] bg-secondary/30 rounded-lg p-2 border border-border/50">
            {grouped[stage].map((contact) => (
              <div 
                key={contact.id} 
                onClick={() => onSelectContact(contact.id)}
                className="bg-card p-3 rounded-md border border-border shadow-xs hover:shadow-sm hover:border-border-strong transition-all cursor-pointer flex flex-col gap-2"
              >
                <div>
                  <h4 className="font-semibold text-foreground text-sm line-clamp-1">
                    {contact.first_name} {contact.last_name}
                  </h4>
                  <p className="text-xs text-muted-foreground line-clamp-1">{contact.company || contact.email}</p>
                </div>
                
                {contact.value > 0 && (
                  <div className="text-sm font-semibold text-foreground tabular-nums">
                    {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(contact.value)}
                  </div>
                )}
                
                {contact.next_action_text && (
                  <div className="mt-1 flex items-start gap-1.5 pt-2 border-t border-border/50">
                    <div className={`w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0 ${new Date(contact.next_action_due_at || '') < new Date() ? 'bg-status-danger-fg' : 'bg-status-info-fg'}`} />
                    <span className="text-xs text-muted-foreground line-clamp-2 leading-tight">
                      {contact.next_action_text}
                    </span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
