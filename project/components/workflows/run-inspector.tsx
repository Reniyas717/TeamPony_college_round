import { useRunStepLogs } from "@/hooks/use-workflows";

interface RunInspectorProps {
  runId: string;
}

export function RunInspector({ runId }: RunInspectorProps) {
  const { data: stepLogs, isLoading, error } = useRunStepLogs(runId);

  if (isLoading) {
    return <div className="p-4 text-sm text-muted-foreground animate-pulse">Loading telemetry...</div>;
  }

  if (error || !stepLogs) {
    return <div className="p-4 text-sm text-destructive">Failed to load run telemetry.</div>;
  }

  if (stepLogs.length === 0) {
    return <div className="p-4 text-sm text-muted-foreground">No execution logs available for this run.</div>;
  }

  return (
    <div className="flex flex-col border border-border rounded-lg bg-card overflow-hidden">
      <div className="px-4 py-3 bg-muted/50 border-b border-border flex justify-between items-center">
        <h3 className="font-semibold text-sm text-foreground">Execution Telemetry</h3>
        <span className="text-xs text-muted-foreground font-mono">{runId}</span>
      </div>
      
      <div className="flex flex-col max-h-[400px] overflow-y-auto p-0">
        {stepLogs.map((log, index) => (
          <div key={log.id} className={`p-4 border-b border-border flex gap-4 ${index % 2 === 0 ? 'bg-background' : 'bg-muted/20'}`}>
            <div className="flex flex-col items-center pt-1">
              <div className={`w-2.5 h-2.5 rounded-full ${
                log.status === 'SUCCESS' ? 'bg-status-success-fg' :
                log.status === 'FAILED' ? 'bg-status-danger-fg' :
                log.status === 'PAUSED_FOR_APPROVAL' ? 'bg-brand' :
                'bg-status-info-fg'
              }`} />
              {index < stepLogs.length - 1 && (
                <div className="w-[1px] h-full bg-border mt-2" />
              )}
            </div>
            
            <div className="flex-1 min-w-0">
              <div className="flex justify-between items-start mb-1">
                <span className="font-mono text-xs font-semibold text-foreground truncate">
                  {log.capability}
                </span>
                <span className="text-xs text-muted-foreground whitespace-nowrap ml-2">
                  {log.execution_duration_ms ? `${log.execution_duration_ms}ms` : ''}
                </span>
              </div>
              
              <div className="text-xs text-muted-foreground font-mono flex items-center gap-2 mb-2">
                <span>{new Date(log.executed_at).toLocaleTimeString()}</span>
                <span className={`px-1.5 py-0.5 rounded-xs uppercase tracking-wider text-[10px] font-bold ${
                  log.status === 'SUCCESS' ? 'bg-status-success-bg text-status-success-fg' :
                  log.status === 'FAILED' ? 'bg-status-danger-bg text-status-danger-fg' :
                  log.status === 'PAUSED_FOR_APPROVAL' ? 'bg-brand text-brand-foreground' :
                  'bg-muted text-muted-foreground'
                }`}>
                  {log.status}
                </span>
              </div>
              
              {log.output_payload && Object.keys(log.output_payload).length > 0 && (
                <div className="mt-2 p-2 bg-muted/50 rounded-sm border border-border/50 overflow-x-auto">
                  <pre className="text-[11px] font-mono text-muted-foreground m-0">
                    {JSON.stringify(log.output_payload, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
