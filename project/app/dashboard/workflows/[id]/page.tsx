"use client";

import { use, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useWorkflow, useTriggerWorkflow } from "@/hooks/use-workflows";
import { useContacts } from "@/hooks/use-crm";
import { DagCanvas } from "@/components/workflows/dag-canvas";
import { ApprovalBanner } from "@/components/workflows/approval-banner";
import { RunInspector } from "@/components/workflows/run-inspector";
import { WorkflowEditModal } from "@/components/workflows/workflow-edit-modal";
import { WorkflowDeleteDialog } from "@/components/workflows/workflow-delete-dialog";
import { WorkflowRun, WorkflowStepLog } from "@/lib/validations/workflow";

export default function WorkflowDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { data: workflow, isLoading, error } = useWorkflow(id);
  const { data: contacts } = useContacts();
  const triggerMutation = useTriggerWorkflow();
  
  const [activeRun, setActiveRun] = useState<WorkflowRun | null>(null);
  const [stepLogs, setStepLogs] = useState<WorkflowStepLog[]>([]);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);

  if (isLoading) {
    return (
      <div className="flex flex-col gap-6 max-w-5xl mx-auto px-4 py-8 w-full animate-pulse">
        <div className="h-10 bg-muted rounded w-1/3" />
        <div className="h-6 bg-muted rounded w-1/2" />
        <div className="h-64 bg-muted rounded w-full mt-8" />
      </div>
    );
  }

  if (error || !workflow) {
    return (
      <div className="flex flex-col gap-4 max-w-5xl mx-auto px-4 py-8 w-full">
        <div className="p-4 rounded-lg bg-destructive/10 text-destructive border border-destructive/20">
          Workflow not found or failed to load.
        </div>
        <Link href="/dashboard/workflows" className="text-primary hover:underline text-sm font-semibold">
          &larr; Back to Workflows
        </Link>
      </div>
    );
  }

  const handleTestFire = async () => {
    try {
      const primaryLead = contacts && contacts.length > 0 ? contacts[0] : null;
      const targetEmail = primaryLead?.email || "gitgud1211@gmail.com";
      const targetPhone = primaryLead?.phone || "9082565845";
      const targetContactId = primaryLead?.id;

      const result = await triggerMutation.mutateAsync({
        id,
        payload: {
          payload: {
            event_id: `evt-test-${Date.now()}`,
            email: targetEmail,
            phone: targetPhone,
            contactId: targetContactId,
          },
        },
      });
      setActiveRun(result.run);
      setStepLogs(result.stepLogs || []);
    } catch (err) {
      console.error("Test fire failed", err);
    }
  };

  return (
    <div className="flex flex-col max-w-5xl mx-auto px-4 md:px-6 py-8 w-full min-h-screen">
      <div className="mb-6">
        <Link href="/dashboard/workflows" className="text-muted-foreground hover:text-foreground text-sm font-semibold inline-flex items-center gap-1 transition-colors">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
          Back to Workflows
        </Link>
      </div>

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-page font-display text-foreground tracking-tight">{workflow.title}</h1>
            <span className={`inline-flex items-center px-2 py-0.5 rounded-xs text-xs font-semibold uppercase tracking-wider ${
              workflow.status === "ACTIVE" 
                ? "bg-status-success-bg text-status-success-fg border border-status-success-border" 
                : workflow.status === "DRAFT"
                  ? "bg-secondary text-foreground border border-border"
                  : "bg-status-neutral-bg text-status-neutral-fg border border-status-neutral-border"
            }`}>
              {workflow.status}
            </span>
          </div>
          <p className="text-base text-muted-foreground max-w-[68ch]">
            {workflow.description || "Generated via natural language prompt."}
          </p>
        </div>
        
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2.5">
          {contacts && contacts[0] && (
            <div className="text-xs text-muted-foreground bg-muted/30 px-3 py-1.5 rounded border border-border/50">
              Target Lead: <span className="font-semibold text-foreground">{contacts[0].first_name} {contacts[0].last_name}</span>
            </div>
          )}
          <button 
            type="button"
            onClick={() => setIsEditOpen(true)}
            className="h-10 px-3.5 bg-card border border-border text-foreground font-sans font-semibold rounded-sm text-sm transition-colors hover:bg-accent focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring flex items-center gap-1.5 cursor-pointer shadow-2xs"
            title="Edit workflow settings or re-prompt with AI"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/><path d="m15 5 4 4"/></svg>
            Edit
          </button>
          <button 
            type="button"
            onClick={() => setIsDeleteOpen(true)}
            className="h-10 px-3.5 bg-card border border-border text-status-danger-fg hover:bg-status-danger-bg/20 font-sans font-semibold rounded-sm text-sm transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring flex items-center gap-1.5 cursor-pointer shadow-2xs"
            title="Delete this workflow"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
            Delete
          </button>
          <button 
            type="button"
            onClick={handleTestFire}
            disabled={triggerMutation.isPending}
            className="h-10 px-4 bg-primary text-primary-foreground font-sans font-semibold rounded-sm text-base transition-colors hover:bg-primary/90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:opacity-50 flex items-center gap-2 cursor-pointer shadow-sm"
          >
            {triggerMutation.isPending ? "Executing DAG..." : "Test Fire Event"}
          </button>
        </div>
      </div>

      {activeRun && (
        <ApprovalBanner
          run={activeRun}
          onDecision={(updatedRun) => {
            setActiveRun(updatedRun);
            if (activeRun.id) {
              fetch(`/api/workflows/runs/${activeRun.id}`)
                .then((r) => r.json())
                .then((d) => {
                  if (d.data) setStepLogs(d.data);
                })
                .catch(() => {});
            }
          }}
        />
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-muted/10 border border-border rounded-xl p-4 md:p-8 min-h-[600px] overflow-hidden flex justify-center bg-[url('/grid-bg.svg')]">
          <DagCanvas 
            dag={workflow.dag_definition} 
            stepLogs={stepLogs}
            activeNodeId={activeRun?.current_node_id}
          />
        </div>
        
        <div className="flex flex-col gap-6">
          <div className="bg-card border border-border rounded-lg p-5">
            <h3 className="font-semibold text-foreground mb-4">Workflow Metadata</h3>
            
            <div className="flex flex-col gap-3 text-sm">
              <div>
                <span className="text-muted-foreground block mb-1">Prompt Source</span>
                <div className="p-3 bg-muted/50 rounded-sm italic border border-border/50 text-foreground">
                  &quot;{workflow.natural_language_prompt}&quot;
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4 mt-2">
                <div>
                  <span className="text-muted-foreground block mb-0.5">Created</span>
                  <span className="font-medium text-foreground">{new Date(workflow.created_at).toLocaleDateString()}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block mb-0.5">Executions</span>
                  <span className="font-medium text-foreground">{workflow.execution_count}</span>
                </div>
              </div>
            </div>
          </div>
          
          {activeRun && (
            <RunInspector runId={activeRun.id} />
          )}
        </div>
      </div>

      {isEditOpen && (
        <WorkflowEditModal
          workflow={workflow}
          isOpen={isEditOpen}
          onClose={() => setIsEditOpen(false)}
        />
      )}

      {isDeleteOpen && (
        <WorkflowDeleteDialog
          workflowId={workflow.id}
          workflowTitle={workflow.title}
          isOpen={isDeleteOpen}
          onClose={() => setIsDeleteOpen(false)}
          onDeleted={() => router.push("/dashboard/workflows")}
        />
      )}
    </div>
  );
}
