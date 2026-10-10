import { WorkflowDAG, WorkflowStepLog } from "@/lib/validations/workflow";
import { NodeCard } from "./node-card";

interface DagCanvasProps {
  dag: WorkflowDAG;
  stepLogs?: WorkflowStepLog[];
  activeNodeId?: string | null;
}

export function DagCanvas({ dag, stepLogs = [], activeNodeId }: DagCanvasProps) {
  // Our generated DAGs are linear/sequential for MVP purposes
  // So we can safely just render them in order with connecting lines
  
  return (
    <div className="flex flex-col items-center py-8 w-full max-w-3xl mx-auto">
      {dag.nodes.map((node, index) => {
        const stepLog = stepLogs.find(s => s.node_id === node.id);
        const isActive = activeNodeId === node.id || stepLog?.status === "EXECUTING" || stepLog?.status === "PAUSED_FOR_APPROVAL";
        
        return (
          <div key={node.id} className="flex flex-col items-center">
            {/* Edge line from previous node */}
            {index > 0 && (
              <div className="w-0.5 h-12 bg-border relative">
                {/* Arrow head */}
                <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-0 h-0 border-l-[4px] border-r-[4px] border-t-[6px] border-transparent border-t-border" />
              </div>
            )}
            
            <NodeCard 
              node={node} 
              status={stepLog?.status}
              isActive={isActive}
            />
          </div>
        );
      })}
    </div>
  );
}
