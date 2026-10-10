import * as React from "react";
import { useState } from "react";
import { useCreateContact } from "@/hooks/use-crm";
import { Button } from "@/components/ui/button";

export function CreateContactDrawer({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const { mutateAsync: createContact, isPending } = useCreateContact();
  const [error, setError] = useState("");
  
  // Basic form state
  const [formData, setFormData] = useState({
    first_name: "",
    last_name: "",
    email: "",
    phone: "",
    company: "",
    value: "0"
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    try {
      await createContact({
        first_name: formData.first_name,
        last_name: formData.last_name,
        email: formData.email || "",
        phone: formData.phone || undefined,
        company: formData.company || undefined,
        value: Number(formData.value) || 0,
        source: "manual",
        stage: "lead",
        tags: []
      });
      onClose();
      // Reset form
      setFormData({ first_name: "", last_name: "", email: "", phone: "", company: "", value: "0" });
    } catch (err: unknown) {
      setError((err as Error).message || "Failed to create contact");
    }
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 bg-foreground/20 backdrop-blur-sm z-40 transition-opacity" onClick={onClose} />
      <div className="fixed inset-y-0 right-0 w-full md:w-[500px] bg-card border-l border-border shadow-xl z-50 flex flex-col animate-in slide-in-from-right duration-300 ease-out">
        
        <div className="flex items-center justify-between p-6 border-b border-border">
          <h2 className="text-xl font-display font-semibold text-foreground">Add Contact</h2>
          <button onClick={onClose} className="p-2 text-muted-foreground hover:text-foreground rounded-full hover:bg-muted transition-colors">
            ✕
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {error && (
            <div className="mb-4 p-3 bg-status-danger-bg border border-status-danger-border text-status-danger-fg text-sm rounded-md">
              {error}
            </div>
          )}
          
          <form id="create-contact-form" onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-semibold text-foreground">First Name *</label>
                <input required type="text" className="h-10 px-3 rounded-sm border border-input bg-background focus:ring-2 focus:ring-ring focus:outline-none" value={formData.first_name} onChange={e => setFormData({...formData, first_name: e.target.value})} />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-semibold text-foreground">Last Name *</label>
                <input required type="text" className="h-10 px-3 rounded-sm border border-input bg-background focus:ring-2 focus:ring-ring focus:outline-none" value={formData.last_name} onChange={e => setFormData({...formData, last_name: e.target.value})} />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-semibold text-foreground">Email</label>
              <input type="email" className="h-10 px-3 rounded-sm border border-input bg-background focus:ring-2 focus:ring-ring focus:outline-none" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-semibold text-foreground">Phone</label>
              <input type="tel" className="h-10 px-3 rounded-sm border border-input bg-background focus:ring-2 focus:ring-ring focus:outline-none" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-semibold text-foreground">Company</label>
              <input type="text" className="h-10 px-3 rounded-sm border border-input bg-background focus:ring-2 focus:ring-ring focus:outline-none" value={formData.company} onChange={e => setFormData({...formData, company: e.target.value})} />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-semibold text-foreground">Deal Value (₹)</label>
              <input type="number" min="0" className="h-10 px-3 rounded-sm border border-input bg-background focus:ring-2 focus:ring-ring focus:outline-none tabular-nums" value={formData.value} onChange={e => setFormData({...formData, value: e.target.value})} />
            </div>
          </form>
        </div>

        <div className="p-6 border-t border-border bg-card flex justify-end gap-3 sticky bottom-0">
          <Button variant="outline" onClick={onClose} type="button">Cancel</Button>
          <Button type="submit" form="create-contact-form" disabled={isPending}>
            {isPending ? "Adding..." : "Add Contact"}
          </Button>
        </div>

      </div>
    </>
  );
}
