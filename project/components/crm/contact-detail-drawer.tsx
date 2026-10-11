import * as React from "react";
import { useState } from "react";
import {
  useContact,
  useContactActivities,
  useUpdateContact,
  useAddActivity,
  useSendMessage,
} from "@/hooks/use-crm";
import { Contact, ContactStageSchema } from "@/lib/validations/crm";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export function ContactDetailDrawer({ contactId, onClose }: { contactId: string | null; onClose: () => void }) {
  const { data: contact, isLoading: isLoadingContact } = useContact(contactId);
  const { data: activities, isLoading: isLoadingActivities } = useContactActivities(contactId);
  const { mutateAsync: updateContact } = useUpdateContact();
  const { mutateAsync: addActivity, isPending: isAddingActivity } = useAddActivity();
  const { mutateAsync: sendMessage, isPending: isSendingMessage } = useSendMessage();

  const [noteText, setNoteText] = useState("");
  const [activeTab, setActiveTab] = useState<"overview" | "timeline">("overview");
  const [outreachStatus, setOutreachStatus] = useState<string | null>(null);
  const [customMsg, setCustomMsg] = useState("");

  if (!contactId) return null;

  const handleStageChange = async (newStage: Contact['stage']) => {
    const parsedStage = ContactStageSchema.safeParse(newStage);
    if (!contact || !parsedStage.success) return;
    await updateContact({ id: contact.id, data: { stage: parsedStage.data } });
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

  const handleSendOutreach = async (channel: "email" | "whatsapp") => {
    if (!contact) return;
    try {
      setOutreachStatus(`Dispatching ${channel === 'email' ? 'Email via Resend' : 'WhatsApp'}...`);
      const defaultSubject = `Welcome to Nexus — Regarding your inquiry`;
      const defaultText = customMsg.trim() || (channel === "email"
        ? `Hi ${contact.first_name}, thank you for reaching out via our website! We reviewed your submission and are excited to assist you.`
        : `Hello ${contact.first_name}! We received your inquiry on Nexus. When is a good time to connect?`);

      await sendMessage({
        contactId: contact.id,
        channel,
        subject: defaultSubject,
        message: defaultText,
      });

      // Automatically advance contact to contacted stage
      await updateContact({ id: contact.id, data: { stage: "contacted" } });

      setOutreachStatus(`Dispatched ${channel.toUpperCase()}! Contact moved to Contacted.`);
      setCustomMsg("");
      setTimeout(() => setOutreachStatus(null), 5000);
    } catch (err: unknown) {
      setOutreachStatus(`Failed to send: ${err instanceof Error ? err.message : String(err)}`);
    }
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
                  onChange={(e) => handleStageChange(e.target.value as Contact['stage'])}
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

          <button onClick={onClose} className="p-2 text-muted-foreground hover:text-foreground rounded-full hover:bg-muted transition-colors cursor-pointer" aria-label="Close drawer">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
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

              {/* Engagement Status Banner */}
              <div className={`p-4 rounded-lg border flex items-center justify-between ${
                contact.stage === 'churned'
                  ? 'bg-status-danger-bg/20 border-status-danger-border text-status-danger-fg'
                  : ['qualified', 'proposal', 'customer'].includes(contact.stage)
                    ? 'bg-status-success-bg/20 border-status-success-border text-status-success-fg'
                    : contact.stage === 'contacted'
                      ? 'bg-primary/10 border-primary/20 text-primary'
                      : 'bg-muted/30 border-border text-foreground'
              }`}>
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                    contact.stage === 'churned'
                      ? 'bg-status-danger-bg text-status-danger-fg'
                      : ['qualified', 'proposal', 'customer'].includes(contact.stage)
                        ? 'bg-status-success-bg text-status-success-fg'
                        : contact.stage === 'contacted'
                          ? 'bg-primary/20 text-primary'
                          : 'bg-muted text-muted-foreground'
                  }`}>
                    {contact.stage === 'churned' ? (
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                    ) : ['qualified', 'proposal', 'customer'].includes(contact.stage) ? (
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                    ) : contact.stage === 'contacted' ? (
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                    ) : (
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 16 12 14 15 10 15 8 12 2 12"/><path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"/></svg>
                    )}
                  </div>
                  <div>
                    <h4 className="font-semibold text-sm">
                      {contact.stage === 'churned'
                        ? 'Lead Churned (Opted Out / Declined)'
                        : ['qualified', 'proposal', 'customer'].includes(contact.stage)
                          ? 'Lead Qualified (Said Yes / Interested)'
                          : contact.stage === 'contacted'
                            ? 'Awaiting Customer Response'
                            : 'New Website Inquiry'}
                    </h4>
                    <p className="text-xs opacity-90 mt-0.5">
                      {contact.stage === 'churned'
                        ? 'Customer declined outreach or replied with No. Automated outreach stopped.'
                        : ['qualified', 'proposal', 'customer'].includes(contact.stage)
                          ? 'Customer confirmed interest in discussion. Retained in active pipeline.'
                          : contact.stage === 'contacted'
                            ? 'Email / WhatsApp dispatched. Waiting for Yes / No reply.'
                            : 'Inquiry captured from website builder form.'}
                    </p>
                  </div>
                </div>
                <Badge variant={contact.stage === 'churned' ? 'danger' : ['qualified', 'proposal', 'customer'].includes(contact.stage) ? 'success' : 'neutral'}>
                  {contact.stage.toUpperCase()}
                </Badge>
              </div>

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
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Response Outcome</span>
                  <span className={`text-sm font-semibold ${
                    contact.stage === 'churned'
                      ? 'text-status-danger-fg'
                      : ['qualified', 'proposal', 'customer'].includes(contact.stage)
                        ? 'text-status-success-fg'
                        : 'text-muted-foreground'
                  }`}>
                    {contact.stage === 'churned' ? 'Churned (Said No)' : ['qualified', 'proposal', 'customer'].includes(contact.stage) ? 'Interested (Said Yes)' : 'Awaiting Reply'}
                  </span>
                </div>
                <div className="bg-card p-4 rounded-lg border border-border flex flex-col gap-1">
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Source</span>
                  <span className="text-sm font-medium capitalize">{contact.source}</span>
                </div>
              </div>

              {/* Direct Outreach & Customer Communication */}
              <div className="bg-card p-5 rounded-lg border border-border flex flex-col gap-4 shadow-xs">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold text-base text-foreground">Direct Outreach (Email &amp; WhatsApp)</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Send initial message via Email (Resend) or WhatsApp (Twilio) to {contact.first_name}.
                    </p>
                  </div>
                  <Badge variant="brand" className="text-xs">Outbound</Badge>
                </div>

                <div className="flex flex-col gap-2">
                  <textarea
                    className="w-full min-h-[70px] p-3 text-sm rounded-sm border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring resize-none"
                    placeholder={`Write custom message to ${contact.first_name} (optional)...`}
                    value={customMsg}
                    onChange={(e) => setCustomMsg(e.target.value)}
                  />
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <Button
                    variant="primary"
                    size="sm"
                    disabled={isSendingMessage}
                    onClick={() => handleSendOutreach("email")}
                    className="cursor-pointer gap-1.5"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>
                    <span>{isSendingMessage ? "Dispatching..." : "Send Email via Resend"}</span>
                  </Button>

                  <Button
                    variant="outline"
                    size="sm"
                    disabled={isSendingMessage}
                    onClick={() => handleSendOutreach("whatsapp")}
                    className="cursor-pointer gap-1.5"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z"/></svg>
                    <span>{isSendingMessage ? "Dispatching..." : "Send WhatsApp"}</span>
                  </Button>

                  <button
                    type="button"
                    onClick={() => setActiveTab("timeline")}
                    className="text-xs text-primary hover:underline ml-auto font-semibold"
                  >
                    View Timeline &rarr;
                  </button>
                </div>

                {outreachStatus && (
                  <div className={`p-2.5 rounded-sm text-xs font-semibold ${
                    outreachStatus.toLowerCase().includes("churned") || outreachStatus.startsWith("Failed")
                      ? "bg-status-danger-bg text-status-danger-fg border border-status-danger-border"
                      : "bg-status-success-bg text-status-success-fg border border-status-success-border"
                  }`}>
                    {outreachStatus}
                  </div>
                )}
              </div>

              {/* Latest Action / Note */}
              {contact.next_action_text && (
                <div className="bg-card p-4 rounded-lg border border-border">
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Latest Communication Log</h4>
                  <p className="text-sm font-medium text-foreground">{contact.next_action_text}</p>
                </div>
              )}
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
