import * as React from "react";
import { Contact } from "@/lib/validations/crm";
import { Badge } from "@/components/ui/badge";

export function CrmTable({
  contacts,
  onSelectContact
}: {
  contacts: Contact[];
  onSelectContact: (id: string) => void;
}) {
  return (
    <div className="bg-card rounded-lg border border-border overflow-hidden shadow-xs">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/50">
              <th className="px-4 py-3 font-semibold text-muted-foreground w-1/4">Name</th>
              <th className="px-4 py-3 font-semibold text-muted-foreground w-[15%]">Stage</th>
              <th className="px-4 py-3 font-semibold text-muted-foreground w-1/4">Next Action</th>
              <th className="px-4 py-3 font-semibold text-muted-foreground w-[20%] text-right">Outcome</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {contacts.map((contact) => (
              <tr 
                key={contact.id} 
                className="hover:bg-accent/50 transition-colors cursor-pointer"
                onClick={() => onSelectContact(contact.id)}
              >
                <td className="px-4 py-3">
                  <div className="flex flex-col">
                    <span className="font-semibold text-foreground">{contact.first_name} {contact.last_name}</span>
                    <span className="text-xs text-muted-foreground truncate max-w-[200px]">{contact.company || contact.email}</span>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <StageBadge stage={contact.stage} legacyStage={contact.legacy_stage} />
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-col">
                    {contact.next_action_text ? (
                      <>
                        <span className="text-foreground truncate max-w-[250px]">{contact.next_action_text}</span>
                        {contact.next_action_due_at && (
                          <span className={`text-xs ${new Date(contact.next_action_due_at) < new Date() ? 'text-status-danger-fg font-semibold' : 'text-muted-foreground'}`}>
                            {new Date(contact.next_action_due_at).toLocaleDateString()}
                          </span>
                        )}
                      </>
                    ) : (
                      <span className="text-muted-foreground italic">None set</span>
                    )}
                  </div>
                </td>
                <td className="px-4 py-3 text-right">
                  {contact.stage === 'churned' ? (
                    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-semibold bg-status-danger-bg text-status-danger-fg border border-status-danger-border">
                      <span className="w-1.5 h-1.5 rounded-full bg-status-danger-fg" /> Churned (No)
                    </span>
                  ) : ['qualified', 'proposal', 'customer'].includes(contact.stage) ? (
                    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-semibold bg-status-success-bg text-status-success-fg border border-status-success-border">
                      <span className="w-1.5 h-1.5 rounded-full bg-status-success-fg" /> Qualified (Yes)
                    </span>
                  ) : contact.stage === 'contacted' ? (
                    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-medium bg-primary/10 text-primary border border-primary/20">
                      <span className="w-1.5 h-1.5 rounded-full bg-primary" /> Awaiting Reply
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-medium bg-muted text-muted-foreground">
                      <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground" /> New Inquiry
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function StageBadge({ stage, legacyStage }: { stage: Contact['stage']; legacyStage?: string }) {
  const map: Record<Exclude<Contact['stage'], "unknown">, { label: string; variant: "neutral" | "info" | "warning" | "success" | "danger" }> = {
    lead: { label: "Lead", variant: "neutral" },
    contacted: { label: "Contacted", variant: "info" },
    qualified: { label: "Qualified", variant: "info" },
    proposal: { label: "Proposal", variant: "warning" },
    customer: { label: "Customer", variant: "success" },
    churned: { label: "Churned", variant: "danger" },
  };

  if (stage === "unknown") {
    return <Badge variant="warning">Unknown: {legacyStage || "legacy value"}</Badge>;
  }
  const s = map[stage];
  return <Badge variant={s.variant}>{s.label}</Badge>;
}
