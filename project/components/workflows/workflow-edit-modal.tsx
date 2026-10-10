"use client";

import { useState } from "react";
import { AutomationWorkflow, WorkflowDAG, WorkflowStatus } from "@/lib/validations/workflow";
import { useUpdateWorkflow, useGenerateWorkflow } from "@/hooks/use-workflows";

interface WorkflowEditModalProps {
  workflow: AutomationWorkflow;
  isOpen: boolean;
  onClose: () => void;
  onUpdated?: (updated: AutomationWorkflow) => void;
}

export function WorkflowEditModal({
  workflow,
  isOpen,
  onClose,
  onUpdated,
}: WorkflowEditModalProps) {
  const [title, setTitle] = useState(workflow.title);
  const [description, setDescription] = useState(workflow.description || "");
  const [status, setStatus] = useState<WorkflowStatus>(workflow.status);
  const [prompt, setPrompt] = useState(workflow.natural_language_prompt);
  const [updatedDag, setUpdatedDag] = useState<WorkflowDAG | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successNotice, setSuccessNotice] = useState<string | null>(null);

  const updateMutation = useUpdateWorkflow();
  const generateMutation = useGenerateWorkflow();

  if (!isOpen) return null;

  const handleRecompileDAG = async () => {
    if (!prompt.trim()) return;
    setErrorMsg(null);
    setSuccessNotice(null);
    try {
      const compiled = await generateMutation.mutateAsync({ prompt });
      setUpdatedDag(compiled);
      setTitle(compiled.title);
      setDescription(compiled.description || "");
      setSuccessNotice("DAG re-compiled successfully! Save changes to apply.");
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "Failed to recompile prompt with AI");
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setErrorMsg("Title is required");
      return;
    }

    setErrorMsg(null);
    try {
      const updated = await updateMutation.mutateAsync({
        id: workflow.id,
        data: {
          title: title.trim(),
          description: description.trim() || null,
          status,
          naturalLanguagePrompt: prompt.trim(),
          dag: updatedDag || undefined,
        },
      });

      if (onUpdated) {
        onUpdated(updated);
      }
      onClose();
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "Failed to update workflow");
    }
  };

  const activeNodes = updatedDag ? updatedDag.nodes : workflow.dag_definition.nodes;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
      <div
        className="bg-card w-full max-w-2xl rounded-xl shadow-2xl border border-border flex flex-col overflow-hidden max-h-[90vh] animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6 border-b border-border/40 flex items-center justify-between bg-muted/20">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-sm bg-brand-subtle flex items-center justify-center text-brand-text">
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/><path d="m15 5 4 4"/></svg>
            </div>
            <div>
              <h2 className="text-xl font-display font-bold text-foreground">Edit Workflow</h2>
              <p className="text-xs text-muted-foreground">
                Modify automation settings, status, or refine DAG nodes using natural language.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-sm text-muted-foreground hover:text-foreground cursor-pointer"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>

        <form onSubmit={handleSave} className="flex flex-col overflow-hidden flex-1">
          <div className="p-6 overflow-y-auto space-y-4 flex-1">
            {errorMsg && (
              <div className="p-3 rounded bg-status-danger-bg text-status-danger-fg border border-status-danger-border text-xs flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                {errorMsg}
              </div>
            )}

            {successNotice && (
              <div className="p-3 rounded bg-status-success-bg text-status-success-fg border border-status-success-border text-xs flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                {successNotice}
              </div>
            )}

            {/* Title & Status */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-2">
                <label className="text-xs font-semibold text-foreground block mb-1">
                  Workflow Title *
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs rounded-sm bg-background border border-border text-foreground focus:outline-hidden focus:border-brand-text"
                  placeholder="e.g. Lead Inquiry Multi-Channel Followup"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-foreground block mb-1">
                  Status
                </label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as WorkflowStatus)}
                  className="w-full px-2.5 py-1.5 text-xs rounded-sm bg-background border border-border text-foreground font-semibold focus:outline-hidden focus:border-brand-text"
                >
                  <option value="ACTIVE">ACTIVE (Running)</option>
                  <option value="DRAFT">DRAFT (Inactive)</option>
                  <option value="PAUSED">PAUSED (Paused)</option>
                  <option value="ARCHIVED">ARCHIVED (Archived)</option>
                </select>
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="text-xs font-semibold text-foreground block mb-1">
                Description
              </label>
              <textarea
                rows={2}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-3 py-1.5 text-xs rounded-sm bg-background border border-border text-foreground focus:outline-hidden focus:border-brand-text resize-none"
                placeholder="Brief summary of what this automation executes"
              />
            </div>

            {/* Natural Language Prompt & AI Recompile */}
            <div className="pt-2 border-t border-border/40">
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold text-foreground">
                  Natural Language Prompt
                </label>
                <button
                  type="button"
                  onClick={handleRecompileDAG}
                  disabled={generateMutation.isPending || !prompt.trim()}
                  className="text-[11px] font-semibold text-primary hover:underline flex items-center gap-1 cursor-pointer disabled:opacity-50"
                >
                  {generateMutation.isPending ? (
                    <>
                      <svg className="animate-spin h-3 w-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                      Recompiling...
                    </>
                  ) : (
                    <>
                      <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/></svg>
                      Recompile DAG with AI
                    </>
                  )}
                </button>
              </div>
              <textarea
                rows={3}
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                className="w-full px-3 py-1.5 text-xs rounded-sm bg-background border border-border text-foreground focus:outline-hidden focus:border-brand-text font-mono"
                placeholder="e.g. When inquiry submitted, wait 1 hour, require approval, and send email"
              />
            </div>

            {/* DAG Nodes Preview */}
            <div className="pt-2 border-t border-border/40">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground block mb-2">
                Workflow Nodes ({activeNodes.length}) {updatedDag && "(New Pending AI DAG)"}
              </span>
              <div className="flex flex-col gap-2 max-h-48 overflow-y-auto">
                {activeNodes.map((node, i) => (
                  <div
                    key={node.id}
                    className="flex items-center gap-2 p-2 rounded bg-muted/40 border border-border text-xs"
                  >
                    <span className="w-5 h-5 rounded-full bg-background border border-border flex items-center justify-center font-mono font-bold text-[10px] text-muted-foreground shrink-0">
                      {i + 1}
                    </span>
                    <span className="font-semibold text-foreground shrink-0">
                      [{node.type}]
                    </span>
                    <span className="text-foreground truncate flex-1">
                      {node.label}
                    </span>
                    <span className="text-[10px] text-muted-foreground font-mono shrink-0">
                      {node.capability}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="p-4 bg-muted/20 border-t border-border flex justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              disabled={updateMutation.isPending}
              className="h-9 px-4 rounded-sm border border-border bg-card text-foreground hover:bg-accent text-xs font-semibold cursor-pointer transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={updateMutation.isPending || !title.trim()}
              className="h-9 px-4 rounded-sm bg-primary text-primary-foreground hover:bg-primary/90 text-xs font-semibold cursor-pointer transition-colors flex items-center gap-1.5 shadow-xs disabled:opacity-50"
            >
              {updateMutation.isPending ? (
                <>
                  <svg className="animate-spin h-3.5 w-3.5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                  Saving...
                </>
              ) : (
                "Save Changes"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
