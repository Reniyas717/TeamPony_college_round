"use client";

import { useDeleteWorkflow } from "@/hooks/use-workflows";
import { useState } from "react";

interface WorkflowDeleteDialogProps {
  workflowId: string;
  workflowTitle: string;
  isOpen: boolean;
  onClose: () => void;
  onDeleted?: () => void;
}

export function WorkflowDeleteDialog({
  workflowId,
  workflowTitle,
  isOpen,
  onClose,
  onDeleted,
}: WorkflowDeleteDialogProps) {
  const deleteMutation = useDeleteWorkflow();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleDelete = async () => {
    setErrorMsg(null);
    try {
      await deleteMutation.mutateAsync(workflowId);
      onClose();
      if (onDeleted) {
        onDeleted();
      }
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "Failed to delete workflow");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
      <div
        className="bg-card w-full max-w-md rounded-xl shadow-2xl border border-border flex flex-col overflow-hidden animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6 border-b border-border/40 flex items-start gap-4">
          <div className="w-10 h-10 rounded-full bg-status-danger-bg text-status-danger-fg border border-status-danger-border flex items-center justify-center shrink-0">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
          </div>
          <div>
            <h3 className="text-lg font-display font-bold text-foreground">Delete Workflow</h3>
            <p className="text-xs text-muted-foreground mt-1">
              Are you sure you want to delete <span className="font-semibold text-foreground">&quot;{workflowTitle}&quot;</span>? This will permanently remove the DAG and all execution history.
            </p>
          </div>
        </div>

        {errorMsg && (
          <div className="mx-6 mt-4 p-3 rounded bg-status-danger-bg text-status-danger-fg border border-status-danger-border text-xs">
            {errorMsg}
          </div>
        )}

        <div className="p-4 bg-muted/20 border-t border-border flex justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            disabled={deleteMutation.isPending}
            className="h-9 px-4 rounded-sm border border-border bg-card text-foreground hover:bg-accent text-xs font-semibold cursor-pointer transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleDelete}
            disabled={deleteMutation.isPending}
            className="h-9 px-4 rounded-sm bg-destructive text-destructive-foreground hover:bg-destructive/90 text-xs font-semibold cursor-pointer transition-colors flex items-center gap-1.5 shadow-xs disabled:opacity-50"
          >
            {deleteMutation.isPending ? (
              <>
                <svg className="animate-spin h-3.5 w-3.5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                Deleting...
              </>
            ) : (
              "Delete Workflow"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
