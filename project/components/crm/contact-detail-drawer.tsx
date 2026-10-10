import * as React from "react";
import { useState } from "react";
import { useContact, useContactActivities, useUpdateContact, useAddActivity } from "@/hooks/use-crm";
import { Contact } from "@/lib/validations/crm";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export function ContactDetailDrawer({ contactId, onClose }: { contactId: string | null; onClose: () => void }) {
  const { data: contact, isLoading: isLoadingContact } = useContact(contactId);
  const { data: activities, isLoading: isLoadingActivities } = useContactActivities(contactId);
  const { mutateAsync: updateContact } = useUpdateContact();
  const { mutateAsync: addActivity, isPending: isAddingActivity } = useAddActivity();

  const [noteText, setNoteText] = useState("");
  const [activeTab, setActiveTab] = useState<"overview" | "timeline">("overview");

  if (!contactId) return null;

  const handleStageChange = async (newStage: Contact['stage']) => {
    if (!contact) return;
    await updateContact({ id: contact.id, data: { stage: newStage } });
  };

  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!noteText.trim()) return;
    await addActivity({
      contactId,
      title: "Added a note",
      description: noteText,
      type: "note"
    });
    setNoteText("");
  };

  return (
    <>
      <div className="fixed inset-0 bg-foreground/20 backdrop-blur-sm z-40 transition-opacity" onClick={onClose} />
      <div className="fixed inset-y-0 right-0 w-full md:w-[600px] xl:w-[800px] bg-card border-l border-border shadow-xl z-50 flex flex-col animate-in slide-in-from-right duration-300 ease-out">
        
        {/* Header */}
        <div className="flex items-start justify-between p-6 border-b border-border bg-muted/20">
          {isLoadingContact ? (
            <div className="animate-pulse space-y-2">
              <div className="h-6 w-48 bg-muted rounded"></div>
              <div className="h-4 w-32 bg-muted rounded"></div>
            </div>
          ) : contact ? (
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-3">
                <h2 className="text-2xl font-display font-semibold text-foreground">
                  {contact.first_name} {contact.last_name}
                </h2>
                <select 
                  className="h-8 px-2 py-1 text-sm rounded-sm border border-input bg-background font-semibold"
                  value={contact.stage}
                  onChange={(e) => handleStageChange(e.target.value)}
                >
                  <option value="lead">Lead</option>
                  <option value="contacted">Contacted</option>
                  <option value="qualified">Qualified</option>
                  <option value="proposal">Proposal</option>
                  <option value="customer">Customer</option>
                  <option value="churned">Churned</option>
                </select>
              </div>
              <p className="text-sm text-muted-foreground">{contact.company || contact.email}</p>
            </div>
          ) : (
            <p className="text-status-danger-fg">Contact not found</p>
          )}

          <button onClick={onClose} className="p-2 text-muted-foreground hover:text-foreground rounded-full hover:bg-muted transition-colors">
            ✕
          </button>
        </div>

        {/* Tabs */}
        <div className="flex px-6 border-b border-border bg-card">
          <button 
            className={`px-4 py-3 text-sm font-semibold border-b-2 transition-colors ${activeTab === 'overview' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
            onClick={() => setActiveTab('overview')}
          >
            Overview
          </button>
          <button 
            className={`px-4 py-3 text-sm font-semibold border-b-2 transition-colors ${activeTab === 'timeline' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
            onClick={() => setActiveTab('timeline')}
          >
            Activity Timeline
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 bg-background">
          {activeTab === 'overview' && contact && (
            <div className="flex flex-col gap-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-card p-4 rounded-lg border border-border flex flex-col gap-1">
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Email</span>
                  <span className="text-sm font-medium">{contact.email || '-'}</span>
                </div>
                <div className="bg-card p-4 rounded-lg border border-border flex flex-col gap-1">
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Phone</span>
                  <span className="text-sm font-medium">{contact.phone || '-'}</span>
                </div>
                <div className="bg-card p-4 rounded-lg border border-border flex flex-col gap-1">
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Deal Value</span>
                  <span className="text-sm font-medium tabular-nums font-semibold">
                    {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(contact.value)}
                  </span>
                </div>
                <div className="bg-card p-4 rounded-lg border border-border flex flex-col gap-1">
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Source</span>
                  <span className="text-sm font-medium capitalize">{contact.source}</span>
                </div>
              </div>

              {/* Next Action */}
              <div className="bg-card p-5 rounded-lg border border-border">
                <h3 className="font-semibold text-base mb-3">Next Action</h3>
                {contact.next_action_text ? (
                  <div className="flex flex-col gap-1">
                    <p className="text-sm">{contact.next_action_text}</p>
                    {contact.next_action_due_at && (
                      <span className={`text-xs ${new Date(contact.next_action_due_at) < new Date() ? 'text-status-danger-fg font-semibold' : 'text-muted-foreground'}`}>
                        Due: {new Date(contact.next_action_due_at).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No next action scheduled.</p>
                )}
              </div>
            </div>
          )}

          {activeTab === 'timeline' && (
            <div className="flex flex-col gap-6">
              {/* Note composer */}
              <div className="bg-card p-4 rounded-lg border border-border">
                <form onSubmit={handleAddNote} className="flex flex-col gap-3">
                  <textarea 
                    className="w-full min-h-[80px] p-3 text-sm rounded-sm border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring resize-none"
                    placeholder="Write a note..."
                    value={noteText}
                    onChange={(e) => setNoteText(e.target.value)}
                  />
                  <div className="flex justify-end">
                    <Button type="submit" size="sm" disabled={!noteText.trim() || isAddingActivity}>
                      {isAddingActivity ? "Saving..." : "Add Note"}
                    </Button>
                  </div>
                </form>
              </div>

              {/* Timeline list */}
              <div className="flex flex-col gap-4">
                {isLoadingActivities ? (
                  <div className="animate-pulse space-y-4">
                    <div className="h-20 bg-muted rounded-lg"></div>
                    <div className="h-20 bg-muted rounded-lg"></div>
                  </div>
                ) : activities && activities.length > 0 ? (
                  <div className="relative border-l border-border ml-3 pl-5 space-y-6">
                    {activities.map((activity) => (
                      <div key={activity.id} className="relative">
                        {/* Timeline dot */}
                        <div className="absolute -left-[25px] mt-1.5 w-2.5 h-2.5 rounded-full bg-border ring-4 ring-background" />
                        
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-sm">{activity.title}</span>
                            <span className="text-xs text-muted-foreground">
                              {new Date(activity.created_at).toLocaleString()}
                            </span>
                            {activity.actor === 'ai_agent' && (
                              <Badge variant="brand" className="text-[10px] px-1.5 py-0">Nexus Agent</Badge>
                            )}
                          </div>
                          {activity.description && (
                            <div className="mt-1 text-sm bg-card border border-border p-3 rounded-md text-foreground/90 whitespace-pre-wrap">
                              {activity.description}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground text-sm">
                    No activity recorded yet.
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
