"use client";

import { useState } from "react";
import Link from "next/link";
import { useWorkflows } from "@/hooks/use-workflows";
import { WorkflowEditModal } from "@/components/workflows/workflow-edit-modal";
import { WorkflowDeleteDialog } from "@/components/workflows/workflow-delete-dialog";
import { AutomationWorkflow } from "@/lib/validations/workflow";

export function WorkflowList() {
  const { data: workflows, isLoading, error } = useWorkflows();
  const [editingWorkflow, setEditingWorkflow] = useState<AutomationWorkflow | null>(null);
  const [deletingWorkflow, setDeletingWorkflow] = useState<AutomationWorkflow | null>(null);

  if (isLoading) {
    return (
      <div className="w-full flex flex-col gap-4 animate-pulse">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-32 bg-muted rounded-lg w-full" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 rounded-lg bg-destructive/10 text-destructive text-sm border border-destructive/20">
        Failed to load workflows. Please try again.
      </div>
    );
  }

  if (!workflows || workflows.length === 0) {
    return (
      <div className="w-full py-16 px-6 bg-card rounded-lg border border-border flex flex-col items-center justify-center text-center">
        <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" className="text-muted-foreground mb-4 opacity-50"><path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z"/><path d="m9 12 2 2 4-4"/></svg>
        <h3 className="text-2xl font-display font-semibold text-foreground tracking-tight">No Workflows Yet</h3>
        <p className="text-base text-muted-foreground mt-2 max-w-[40ch]">
          You haven&apos;t created any business automations. Use the creator above to prompt a new workflow.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {workflows.map((workflow) => (
        <Link 
          key={workflow.id} 
          href={`/dashboard/workflows/${workflow.id}`}
          className="group flex flex-col bg-card rounded-lg border border-border p-5 hover:border-primary/30 hover:shadow-md transition-all cursor-pointer"
        >
          <div className="flex justify-between items-start mb-3">
            <div className="flex items-center gap-2">
              <span className={`inline-flex items-center px-2 py-0.5 rounded-xs text-xs font-semibold uppercase tracking-wider ${
                workflow.status === "ACTIVE" 
                  ? "bg-status-success-bg text-status-success-fg border border-status-success-border" 
                  : workflow.status === "DRAFT"
                    ? "bg-secondary text-foreground border border-border"
                    : "bg-status-neutral-bg text-status-neutral-fg border border-status-neutral-border"
              }`}>
                {workflow.status}
              </span>
              {workflow.is_high_impact && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-xs text-xs font-semibold bg-status-danger-bg text-status-danger-fg border border-status-danger-border">
                  <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg>
                  High Impact
                </span>
              )}
            </div>
            
            <div className="flex items-center gap-1 opacity-90 sm:opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setEditingWorkflow(workflow);
                }}
                className="p-1 rounded-sm text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
                title="Edit workflow"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/><path d="m15 5 4 4"/></svg>
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setDeletingWorkflow(workflow);
                }}
                className="p-1 rounded-sm text-muted-foreground hover:text-status-danger-fg hover:bg-status-danger-bg/20 transition-colors cursor-pointer"
                title="Delete workflow"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
              </button>
              <div className="text-muted-foreground pl-0.5">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
              </div>
            </div>
          </div>
          
          <h3 className="text-lg font-sans font-semibold text-foreground leading-tight mb-2 line-clamp-2">
            {workflow.title}
          </h3>
          
          <p className="text-sm text-muted-foreground line-clamp-3 mb-6 flex-grow">
            {workflow.description || workflow.natural_language_prompt}
          </p>
          
          <div className="pt-4 mt-auto border-t border-border flex items-center justify-between text-xs text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
              {workflow.last_executed_at 
                ? new Date(workflow.last_executed_at).toLocaleDateString()
                : "Never run"}
            </div>
            <div className="flex items-center gap-1.5 font-medium">
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
              {workflow.execution_count} runs
            </div>
          </div>
        </Link>
      ))}

      {editingWorkflow && (
        <WorkflowEditModal
          workflow={editingWorkflow}
          isOpen={Boolean(editingWorkflow)}
          onClose={() => setEditingWorkflow(null)}
        />
      )}

      {deletingWorkflow && (
        <WorkflowDeleteDialog
          workflowId={deletingWorkflow.id}
          workflowTitle={deletingWorkflow.title}
          isOpen={Boolean(deletingWorkflow)}
          onClose={() => setDeletingWorkflow(null)}
        />
      )}
    </div>
  );
}
