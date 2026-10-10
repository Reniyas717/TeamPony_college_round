import { WorkflowNode } from "@/lib/validations/workflow";

interface NodeCardProps {
  node: WorkflowNode;
  status?: "PENDING" | "EXECUTING" | "SUCCESS" | "FAILED" | "SKIPPED" | "PAUSED_FOR_APPROVAL";
  isActive?: boolean;
}

export function NodeCard({ node, status, isActive }: NodeCardProps) {
  const isGate = node.type === "APPROVAL_GATE";
  const isTrigger = node.type === "TRIGGER";
  const isAction = node.type === "ACTION";
  
  let icon = null;
  let colorClass = "border-border bg-card text-foreground";
  
  if (isTrigger) {
    icon = <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>;
    colorClass = "border-primary/20 bg-primary/5";
  } else if (isGate) {
    icon = <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>;
    colorClass = "border-brand-subtle bg-brand-subtle/20";
  } else if (isAction) {
    icon = <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><line x1="9" y1="3" x2="9" y2="21"/></svg>;
  } else {
    icon = <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>;
  }

  // Status overrides
  if (status === "SUCCESS") {
    colorClass = "border-status-success-border bg-status-success-bg/20";
  } else if (status === "FAILED") {
    colorClass = "border-status-danger-border bg-status-danger-bg/20";
  } else if (status === "PAUSED_FOR_APPROVAL") {
    colorClass = "border-brand bg-brand-subtle";
  } else if (status === "EXECUTING" || isActive) {
    colorClass = "border-primary bg-primary/10 shadow-md ring-2 ring-primary/20";
  }

  return (
    <div className={`relative w-[280px] min-h-[80px] p-4 rounded-lg border-2 flex flex-col gap-2 transition-all ${colorClass}`}>
      <div className="flex items-start gap-3">
        <div className={`mt-0.5 p-1.5 rounded-sm bg-background border border-border text-muted-foreground ${status === 'SUCCESS' ? 'text-status-success-fg border-status-success-border' : ''}`}>
          {status === "SUCCESS" ? (
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
          ) : status === "FAILED" ? (
             <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          ) : (
            icon
          )}
        </div>
        <div className="flex flex-col min-w-0 flex-1">
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-0.5 line-clamp-1 truncate">
            {node.type}
          </span>
          <h4 className="text-sm font-semibold text-foreground leading-tight">
            {node.label}
          </h4>
        </div>
      </div>
      
      {node.description && (
        <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
          {node.description}
        </p>
      )}
    </div>
  );
}
