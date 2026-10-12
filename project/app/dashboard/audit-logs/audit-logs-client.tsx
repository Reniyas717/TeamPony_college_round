"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import {
  ShieldSecurity,
  Refresh,
  SearchNormal1,
  Filter,
  TickCircle,
  CloseCircle,
  User,
  Magicpen,
  Setting2,
  Cpu,
  Eye,
} from "iconsax-react";

interface AuditLogRecord {
  id: string;
  business_id: string;
  schema_version: number;
  timestamp: string;
  action: string;
  actor_id: string;
  actor_type: "user" | "ai_agent" | "system" | "integration";
  initiator_id?: string | null;
  initiator_type?: string | null;
  approver_id?: string | null;
  approver_type?: string | null;
  approved_at?: string | null;
  resource_type: string;
  resource_id: string;
  outcome: "success" | "failure";
  error_code?: string | null;
  error_message?: string | null;
  correlation_id?: string | null;
  workflow_id?: string | null;
  request_id?: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

export default function AuditLogsClient() {
  const [logs, setLogs] = React.useState<AuditLogRecord[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [searchTerm, setSearchTerm] = React.useState("");
  const [actionFilter, setActionFilter] = React.useState<string>("all");
  const [outcomeFilter, setOutcomeFilter] = React.useState<string>("all");
  const [actorTypeFilter, setActorTypeFilter] = React.useState<string>("all");
  const [selectedLog, setSelectedLog] = React.useState<AuditLogRecord | null>(null);
  const [totalCount, setTotalCount] = React.useState(0);
  const [page, setPage] = React.useState(0);
  const [refreshToken, setRefreshToken] = React.useState(0);
  const pageSize = 25;

  const triggerRefresh = () => setRefreshToken((r) => r + 1);

  React.useEffect(() => {
    let ignore = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams({
          limit: String(pageSize),
          offset: String(page * pageSize),
        });

        if (actionFilter !== "all") params.set("action", actionFilter);
        if (outcomeFilter !== "all") params.set("outcome", outcomeFilter);
        if (actorTypeFilter !== "all") params.set("actor_type", actorTypeFilter);

        const res = await fetch(`/api/audit?${params.toString()}`);
        const json = await res.json();

        if (ignore) return;
        if (!res.ok) {
          throw new Error(json?.error?.message || "Failed to load audit records");
        }

        setLogs(json.data.events || []);
        setTotalCount(json.data.total ?? json.data.events.length);
      } catch (err: unknown) {
        if (!ignore) {
          setError((err as Error).message || "An unexpected error occurred while fetching audit logs");
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    }

    load();
    return () => {
      ignore = true;
    };
  }, [page, actionFilter, outcomeFilter, actorTypeFilter, refreshToken]);

  // Client-side search filtering across action, resource, actor, and error message
  const filteredLogs = React.useMemo(() => {
    if (!searchTerm.trim()) return logs;
    const term = searchTerm.toLowerCase();
    return logs.filter((log) => {
      return (
        log.action.toLowerCase().includes(term) ||
        log.actor_id.toLowerCase().includes(term) ||
        log.resource_type.toLowerCase().includes(term) ||
        log.resource_id.toLowerCase().includes(term) ||
        (log.error_code && log.error_code.toLowerCase().includes(term)) ||
        (log.error_message && log.error_message.toLowerCase().includes(term))
      );
    });
  }, [logs, searchTerm]);

  const renderActorIcon = (type: string) => {
    switch (type) {
      case "ai_agent":
        return <Magicpen size="14" className="text-brand-text" />;
      case "system":
        return <Setting2 size="14" className="text-muted-foreground" />;
      case "integration":
        return <Cpu size="14" className="text-blue-500" />;
      default:
        return <User size="14" className="text-foreground" />;
    }
  };

  const formatTimestamp = (iso: string) => {
    try {
      const d = new Date(iso);
      return {
        date: d.toLocaleDateString("en-IN", { month: "short", day: "numeric", year: "numeric" }),
        time: d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false }),
      };
    } catch {
      return { date: iso, time: "" };
    }
  };

  return (
    <main className="p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-border/40">
        <div>
          <div className="flex items-center gap-2.5 mb-1">
            <div className="w-8 h-8 rounded-sm bg-brand-subtle flex items-center justify-center text-brand-text">
              <ShieldSecurity size="20" />
            </div>
            <h1 className="font-display text-page-sm md:text-page font-bold tracking-tight text-foreground">
              Central Audit Logs
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Authoritative, append-only operational and security trail • Protected by PostgreSQL Row Level Security
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="outline"
            size="sm"
            onClick={triggerRefresh}
            disabled={loading}
            className="gap-2 cursor-pointer text-xs h-9 bg-card hover:bg-muted/40"
          >
            <Refresh size="14" className={loading ? "animate-spin" : ""} />
            <span>{loading ? "Refreshing..." : "Refresh Logs"}</span>
          </Button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-card/70 p-4 rounded-sm border border-border/40 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        {/* Search Input */}
        <div className="relative flex-1 min-w-[240px]">
          <SearchNormal1 size="16" className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search action, actor, resource, error..."
            className="w-full pl-9 pr-3 py-2 text-xs rounded-sm bg-background border border-border focus:outline-hidden focus:border-brand-text text-foreground placeholder:text-muted-foreground"
          />
        </div>

        {/* Filter Dropdowns */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Action Filter */}
          <div className="flex items-center gap-1.5 bg-background border border-border px-2.5 py-1.5 rounded-sm text-xs">
            <Filter size="14" className="text-muted-foreground" />
            <select
              value={actionFilter}
              onChange={(e) => {
                setActionFilter(e.target.value);
                setPage(0);
              }}
              className="bg-transparent border-none text-foreground text-xs focus:outline-hidden cursor-pointer"
            >
              <option value="all">All Actions</option>
              <option value="auth.login">auth.login</option>
              <option value="auth.logout">auth.logout</option>
              <option value="auth.signup">auth.signup</option>
              <option value="auth.failed_login">auth.failed_login</option>
              <option value="business.created">business.created</option>
              <option value="business.updated">business.updated</option>
              <option value="crm.contact.created">crm.contact.created</option>
              <option value="ai.action.executed">ai.action.executed</option>
            </select>
          </div>

          {/* Outcome Filter */}
          <div className="flex items-center gap-1.5 bg-background border border-border px-2.5 py-1.5 rounded-sm text-xs">
            <select
              value={outcomeFilter}
              onChange={(e) => {
                setOutcomeFilter(e.target.value);
                setPage(0);
              }}
              className="bg-transparent border-none text-foreground text-xs focus:outline-hidden cursor-pointer"
            >
              <option value="all">All Outcomes</option>
              <option value="success">Success</option>
              <option value="failure">Failure</option>
            </select>
          </div>

          {/* Actor Type Filter */}
          <div className="flex items-center gap-1.5 bg-background border border-border px-2.5 py-1.5 rounded-sm text-xs">
            <select
              value={actorTypeFilter}
              onChange={(e) => {
                setActorTypeFilter(e.target.value);
                setPage(0);
              }}
              className="bg-transparent border-none text-foreground text-xs focus:outline-hidden cursor-pointer"
            >
              <option value="all">All Actors</option>
              <option value="user">User</option>
              <option value="ai_agent">AI Agent</option>
              <option value="system">System</option>
              <option value="integration">Integration</option>
            </select>
          </div>
        </div>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="p-4 bg-destructive/10 border border-destructive/30 rounded-sm text-xs text-destructive flex items-center justify-between">
          <span>{error}</span>
          <Button variant="outline" size="sm" onClick={triggerRefresh} className="h-7 text-xs cursor-pointer">
            Retry
          </Button>
        </div>
      )}

      {/* Audit Log Table */}
      <div className="bg-card/70 rounded-sm border border-border/40 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-border/40 bg-muted/20 text-muted-foreground font-semibold uppercase tracking-wider text-[10px]">
                <th className="py-3 px-4">Timestamp (UTC)</th>
                <th className="py-3 px-4">Action</th>
                <th className="py-3 px-4">Actor</th>
                <th className="py-3 px-4">Target Resource</th>
                <th className="py-3 px-4">Outcome</th>
                <th className="py-3 px-4 text-right">Inspection</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/20 text-foreground font-sans">
              {loading && logs.length === 0 ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td className="py-3.5 px-4 font-mono">
                      <div className="h-3.5 w-32 bg-muted/60 rounded-xs" />
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="h-4 w-28 bg-muted/50 rounded-xs font-mono" />
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-1.5">
                        <div className="w-4 h-4 rounded bg-muted/40" />
                        <div className="h-3.5 w-16 bg-muted/40 rounded-xs" />
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="h-3.5 w-24 bg-muted/50 rounded-xs font-mono" />
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="h-5 w-20 bg-muted/40 rounded-full" />
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="h-6 w-16 bg-muted/40 rounded-xs ml-auto" />
                    </td>
                  </tr>
                ))
              ) : filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-muted-foreground">
                    <ShieldSecurity size="28" className="mx-auto mb-2 text-muted-foreground/50" />
                    <p className="font-semibold text-foreground text-sm">No audit records found</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {searchTerm ? "Try adjusting your search criteria or filters." : "Operations performed will appear in this immutable compliance log."}
                    </p>
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => {
                  const ts = formatTimestamp(log.timestamp);
                  const isSuccess = log.outcome === "success";

                  return (
                    <tr
                      key={log.id}
                      onClick={() => setSelectedLog(log)}
                      className="hover:bg-accent/40 transition-colors cursor-pointer group"
                    >
                      {/* Timestamp */}
                      <td className="py-3 px-4 font-mono text-[11px] whitespace-nowrap">
                        <div className="font-medium text-foreground">{ts.time}</div>
                        <div className="text-[10px] text-muted-foreground">{ts.date}</div>
                      </td>

                      {/* Action */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span className="font-mono font-medium text-xs text-brand-text">
                          {log.action}
                        </span>
                      </td>

                      {/* Actor */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <span className="p-1 rounded-sm bg-muted/40 shrink-0">
                            {renderActorIcon(log.actor_type)}
                          </span>
                          <div className="min-w-0">
                            <span className="capitalize font-semibold text-[11px] text-foreground">
                              {log.actor_type}
                            </span>
                            <span className="block font-mono text-[10px] text-muted-foreground truncate max-w-[120px]">
                              {log.actor_id}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Resource */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span className="text-[11px] font-medium text-foreground capitalize">
                          {log.resource_type.replace(/_/g, " ")}
                        </span>
                        <span className="block font-mono text-[10px] text-muted-foreground truncate max-w-[120px]">
                          {log.resource_id}
                        </span>
                      </td>

                      {/* Outcome */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        {isSuccess ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-sm bg-status-success-bg text-status-success-fg text-[11px] font-medium">
                            <TickCircle size="12" />
                            <span>Success</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-sm bg-status-danger-bg text-status-danger-fg text-[11px] font-medium">
                            <CloseCircle size="12" />
                            <span>Failure</span>
                          </span>
                        )}
                      </td>

                      {/* Inspection button */}
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedLog(log);
                          }}
                          className="inline-flex items-center gap-1 text-[11px] text-muted-foreground group-hover:text-foreground hover:underline cursor-pointer"
                        >
                          <Eye size="13" />
                          <span>View JSON</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        <div className="p-3 bg-muted/10 border-t border-border/40 flex items-center justify-between text-xs text-muted-foreground">
          <span>
            Showing <span className="font-semibold text-foreground">{filteredLogs.length}</span> of{" "}
            <span className="font-semibold text-foreground">{totalCount}</span> events
          </span>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page === 0 || loading}
              onClick={() => setPage((p) => Math.max(p - 1, 0))}
              className="h-7 text-xs cursor-pointer px-2.5"
            >
              Previous
            </Button>
            <span className="text-xs font-mono px-2">Page {page + 1}</span>
            <Button
              variant="outline"
              size="sm"
              disabled={(page + 1) * pageSize >= totalCount || loading}
              onClick={() => setPage((p) => p + 1)}
              className="h-7 text-xs cursor-pointer px-2.5"
            >
              Next
            </Button>
          </div>
        </div>
      </div>

      {/* --- DETAIL INSPECTION MODAL / DRAWER --- */}
      {selectedLog && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setSelectedLog(null)}
        >
          <div
            className="bg-card border border-border w-full max-w-2xl rounded-sm shadow-xl overflow-hidden flex flex-col max-h-[85vh]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="p-4 border-b border-border/40 flex items-center justify-between bg-muted/20">
              <div className="flex items-center gap-2">
                <ShieldSecurity size="18" className="text-brand-text" />
                <h3 className="font-display font-bold text-sm text-foreground">
                  Audit Event Details
                </h3>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-sm bg-muted text-muted-foreground">
                  v{selectedLog.schema_version}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setSelectedLog(null)}
                className="p-1 rounded-sm text-muted-foreground hover:text-foreground cursor-pointer"
                aria-label="Close details"
              >
                ✕
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 overflow-y-auto space-y-4 text-xs">
              {/* Event Attributes Grid */}
              <div className="grid grid-cols-2 gap-3 bg-muted/10 p-3.5 rounded-sm border border-border/30">
                <div>
                  <span className="text-[10px] uppercase font-semibold text-muted-foreground block">Event ID</span>
                  <span className="font-mono text-[11px] text-foreground select-all">{selectedLog.id}</span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-semibold text-muted-foreground block">Action</span>
                  <span className="font-mono text-[11px] text-brand-text font-semibold">{selectedLog.action}</span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-semibold text-muted-foreground block">Actor</span>
                  <span className="font-medium text-[11px] text-foreground">
                    {selectedLog.actor_type} • <span className="font-mono text-muted-foreground">{selectedLog.actor_id}</span>
                  </span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-semibold text-muted-foreground block">Outcome</span>
                  <span
                    className={`font-semibold text-[11px] ${
                      selectedLog.outcome === "success" ? "text-status-success-fg" : "text-status-danger-fg"
                    }`}
                  >
                    {selectedLog.outcome.toUpperCase()}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-semibold text-muted-foreground block">Target Resource</span>
                  <span className="font-mono text-[11px] text-foreground">
                    {selectedLog.resource_type}:{selectedLog.resource_id}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-semibold text-muted-foreground block">Timestamp</span>
                  <span className="font-mono text-[11px] text-foreground">{selectedLog.timestamp}</span>
                </div>
              </div>

              {/* Error Details (if failed) */}
              {selectedLog.outcome === "failure" && (
                <div className="p-3 bg-destructive/10 border border-destructive/30 rounded-sm space-y-1">
                  <span className="text-[10px] uppercase font-semibold text-destructive block">Error Information</span>
                  <p className="font-mono text-xs text-destructive font-semibold">
                    {selectedLog.error_code || "UNKNOWN_ERROR"}
                  </p>
                  <p className="text-xs text-muted-foreground">{selectedLog.error_message || "No error message provided."}</p>
                </div>
              )}

              {/* Metadata JSON Viewer */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] uppercase font-semibold text-muted-foreground">
                    Sanitized Payload Metadata
                  </span>
                  <span className="text-[10px] font-mono text-muted-foreground">Never includes credentials</span>
                </div>
                <pre className="p-3 bg-muted/40 rounded-sm font-mono text-[11px] overflow-x-auto text-foreground select-all border border-border/30">
                  {JSON.stringify(selectedLog.metadata, null, 2)}
                </pre>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-3 bg-muted/20 border-t border-border/40 flex items-center justify-between text-[11px] text-muted-foreground">
              <span>Database Immutability: Enforced via PostgreSQL Trigger</span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedLog(null)}
                className="h-7 text-xs cursor-pointer"
              >
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
