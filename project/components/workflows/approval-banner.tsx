import { useState } from "react";
import { WorkflowRun } from "@/lib/validations/workflow";
import { useApproveWorkflowRun } from "@/hooks/use-workflows";

interface ApprovalBannerProps {
  run: WorkflowRun;
}

export function ApprovalBanner({ run }: ApprovalBannerProps) {
  const [reason, setReason] = useState("");
  const approveMutation = useApproveWorkflowRun();

  if (run.status !== "AWAITING_APPROVAL") {
    return null;
  }

  const handleDecision = async (approved: boolean) => {
    try {
      await approveMutation.mutateAsync({
        workflowId: run.workflow_id,
        payload: {
          runId: run.id,
          approved,
          reason,
        }
      });
    } catch (err) {
      console.error("Failed to submit approval", err);
    }
  };

  return (
    <div className="bg-brand-subtle border-l-4 border-brand rounded-r-lg p-6 mb-8 flex flex-col gap-4">
      <div className="flex gap-4">
        <div className="mt-1 text-brand-text">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
        </div>
        <div className="flex-1">
          <h3 className="text-lg font-display font-semibold text-foreground mb-1">Owner Approval Required</h3>
          <p className="text-sm text-foreground/80 max-w-[68ch]">
            This workflow run has paused at a human approval checkpoint because it executes high-impact actions (e.g. mass marketing, CRM updates).
            Review the telemetry and decide how to proceed.
          </p>
        </div>
      </div>
      
      <div className="flex flex-col gap-2 bg-background p-4 rounded-md border border-border mt-2">
        <label htmlFor="reason" className="text-sm font-medium text-foreground">
          Reason / Signature (Optional)
        </label>
        <input 
          id="reason"
          type="text" 
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="e.g. Approved for summer campaign" 
          className="w-full bg-card border border-input rounded-sm px-3 py-2 text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        />
        
        <div className="flex gap-3 mt-4">
          <button 
            onClick={() => handleDecision(false)}
            disabled={approveMutation.isPending}
            className="h-10 px-4 bg-transparent border border-input hover:bg-secondary text-foreground font-sans font-semibold rounded-sm text-sm transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring flex-1"
          >
            Reject & Cancel Run
          </button>
          <button 
            onClick={() => handleDecision(true)}
            disabled={approveMutation.isPending}
            className="h-10 px-4 bg-brand text-brand-foreground hover:bg-brand/90 font-sans font-semibold rounded-sm text-sm transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring flex-1 shadow-sm"
          >
            {approveMutation.isPending ? "Processing..." : "Approve & Resume"}
          </button>
        </div>
      </div>
    </div>
  );
}
