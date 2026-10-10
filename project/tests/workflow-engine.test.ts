import test from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import type { OwnerContext } from "../lib/supabase/owner-context";

const moduleApi = await import("node:module");
const moduleLoader = (moduleApi as unknown as {
  default: { _resolveFilename: (...args: unknown[]) => string };
}).default;
const originalResolveFilename = moduleLoader._resolveFilename;
moduleLoader._resolveFilename = function resolveNexusAlias(request: unknown, ...rest: unknown[]) {
  const resolvedRequest = typeof request === "string" && request.startsWith("@/")
    ? path.join(process.cwd(), request.slice(2))
    : request;
  return originalResolveFilename(resolvedRequest, ...rest);
};
const { WorkflowEngineService } = await import("../services/workflow-engine.service");

const businessId = "11111111-1111-4111-8111-111111111111";
const userId = "22222222-2222-4222-8222-222222222222";

class FakeQuery {
  private operation: "select" | "insert" | "update" | "delete" = "select";
  private values: Record<string, unknown> | Record<string, unknown>[] | null = null;
  private filters: Array<[string, unknown]> = [];
  private sortColumn: string | null = null;
  private ascending = true;
  private maxRows: number | null = null;

  constructor(private readonly database: FakeDatabase, private readonly table: string) {}

  select(): this {
    return this;
  }

  insert(values: Record<string, unknown> | Record<string, unknown>[]): this {
    this.operation = "insert";
    this.values = values;
    return this;
  }

  update(values: Record<string, unknown>): this {
    this.operation = "update";
    this.values = values;
    return this;
  }

  delete(): this {
    this.operation = "delete";
    return this;
  }

  eq(column: string, value: unknown): this {
    this.filters.push([column, value]);
    return this;
  }

  order(column: string, options?: { ascending?: boolean }): this {
    this.sortColumn = column;
    this.ascending = options?.ascending ?? true;
    return this;
  }

  limit(count: number): this {
    this.maxRows = count;
    return this;
  }

  async single(): Promise<{ data: Record<string, unknown> | null; error: Record<string, string> | null }> {
    const result = await this.execute();
    if (result.data.length !== 1) {
      return { data: null, error: { message: "Expected one row", code: "PGRST116" } };
    }
    return { data: result.data[0], error: null };
  }

  async maybeSingle(): Promise<{ data: Record<string, unknown> | null; error: null }> {
    const result = await this.execute();
    return { data: result.data[0] || null, error: null };
  }

  then<TResult1 = { data: Record<string, unknown>[]; error: null }, TResult2 = never>(
    onfulfilled?: ((value: { data: Record<string, unknown>[]; error: null }) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null
  ): Promise<TResult1 | TResult2> {
    return this.execute().then(onfulfilled, onrejected);
  }

  private async execute(): Promise<{ data: Record<string, unknown>[]; error: null }> {
    const rows = this.database.table(this.table);
    const matches = rows.filter((row) => this.filters.every(([column, value]) => row[column] === value));

    if (this.operation === "insert") {
      const inputRows = Array.isArray(this.values) ? this.values : [this.values || {}];
      const inserted = inputRows.map((value) => this.database.insert(this.table, value));
      return { data: inserted, error: null };
    }

    if (this.operation === "update") {
      const patch = (this.values || {}) as Record<string, unknown>;
      matches.forEach((row) => Object.assign(row, patch));
      return { data: matches, error: null };
    }

    if (this.operation === "delete") {
      this.database.remove(this.table, matches);
      return { data: matches, error: null };
    }

    const selected = [...matches];
    if (this.sortColumn) {
      selected.sort((a, b) => {
        const left = String(a[this.sortColumn!] || "");
        const right = String(b[this.sortColumn!] || "");
        return (left.localeCompare(right)) * (this.ascending ? 1 : -1);
      });
    }
    return { data: this.maxRows === null ? selected : selected.slice(0, this.maxRows), error: null };
  }
}

class FakeDatabase {
  private counters = new Map<string, number>();
  private tables = new Map<string, Record<string, unknown>[]>();

  client = {
    from: (table: string) => new FakeQuery(this, table),
    rpc: async (functionName: string, args: Record<string, unknown>) => {
      if (functionName === "record_audit_log_tx" || functionName === "record_owner_audit_log_tx") {
        return { data: "99999999-9999-4999-8999-999999999999", error: null };
      }

      if (functionName === "workflow_create_run_with_audit") {
        const startedAt = String(args.p_started_at);
        const row = this.insert("workflow_runs", {
          workflow_id: args.p_workflow_id,
          business_id: businessId,
          trigger_event_id: args.p_trigger_event_id,
          status: "RUNNING",
          current_node_id: null,
          context_data: {
            ...(args.p_event_payload as Record<string, unknown>),
            _workflow: {
              initiator_id: userId,
              initiator_type: "user",
              execution_mode: "manual",
              initiated_at: startedAt,
            },
          },
          error_details: null,
          started_at: startedAt,
          completed_at: null,
        });
        return { data: row, error: null };
      }

      if (functionName === "workflow_decide_run_with_audit") {
        const row = this.table("workflow_runs").find((item) => item.id === args.p_run_id);
        if (!row) return { data: null, error: { message: "Run not found" } };
        row.status = args.p_approved ? "RUNNING" : "CANCELLED";
        row.context_data = {
          ...(row.context_data as Record<string, unknown>),
          _workflow: {
            ...((row.context_data as Record<string, unknown>)._workflow as Record<string, unknown>),
            approval: {
              approved: args.p_approved,
              approver_id: userId,
              approver_type: "user",
              decided_at: args.p_decided_at,
              reason: args.p_reason || null,
            },
          },
        };
        if (!args.p_approved) row.completed_at = args.p_decided_at;
        return { data: row, error: null };
      }

      if (functionName === "workflow_update_run_with_audit") {
        const row = this.table("workflow_runs").find((item) => item.id === args.p_run_id);
        if (!row) return { data: null, error: { message: "Run not found" } };
        if (typeof args.p_status === "string") row.status = args.p_status;
        if (typeof args.p_current_node_id === "string") row.current_node_id = args.p_current_node_id;
        if (args.p_context_data) row.context_data = args.p_context_data;
        if (args.p_error_details) row.error_details = args.p_error_details;
        if (typeof args.p_completed_at === "string") row.completed_at = args.p_completed_at;
        return { data: row, error: null };
      }

      if (functionName === "workflow_record_step_with_audit") {
        if (args.p_step_id === null) {
          const row = this.insert("workflow_step_logs", {
            run_id: args.p_run_id,
            workflow_id: args.p_workflow_id,
            business_id: businessId,
            node_id: args.p_node_id,
            node_type: args.p_node_type,
            capability: args.p_capability,
            status: args.p_status,
            idempotency_key: args.p_idempotency_key,
            input_payload: args.p_input_payload || {},
            output_payload: args.p_output_payload || {},
            retry_count: 0,
            execution_duration_ms: args.p_execution_duration_ms,
            executed_at: args.p_executed_at,
          });
          return { data: row, error: null };
        }
        const row = this.table("workflow_step_logs").find((item) => item.id === args.p_step_id);
        if (!row) return { data: null, error: { message: "Step not found" } };
        row.status = args.p_status;
        if (args.p_output_payload) row.output_payload = args.p_output_payload;
        if (typeof args.p_execution_duration_ms === "number") row.execution_duration_ms = args.p_execution_duration_ms;
        row.executed_at = args.p_executed_at;
        return { data: row, error: null };
      }

      return { data: null, error: { message: `Unknown RPC ${functionName}` } };
    },
  };

  table(name: string): Record<string, unknown>[] {
    if (!this.tables.has(name)) this.tables.set(name, []);
    return this.tables.get(name)!;
  }

  insert(tableName: string, input: Record<string, unknown>): Record<string, unknown> {
    const row = { ...input };
    if (!row.id) row.id = this.nextUuid(tableName);
    if (tableName === "automation_workflows") {
      row.created_at = row.created_at || new Date().toISOString();
      row.updated_at = row.updated_at || new Date().toISOString();
      row.execution_count = row.execution_count ?? 0;
    }
    this.table(tableName).push(row);
    return row;
  }

  remove(tableName: string, rows: Record<string, unknown>[]): void {
    const removeSet = new Set(rows);
    this.tables.set(tableName, this.table(tableName).filter((row) => !removeSet.has(row)));
  }

  private nextUuid(tableName: string): string {
    const next = (this.counters.get(tableName) || 0) + 1;
    this.counters.set(tableName, next);
    return `00000000-0000-4000-8000-${String(next).padStart(12, "0")}`;
  }
}

function ownerContext(database: FakeDatabase): OwnerContext {
  return {
    client: database.client as never,
    user: { id: userId } as never,
    businessId,
  };
}

function node(id: string, capability: "delay.wait" | "approval.manual_gate" | "billing.subscription.created", type: "DELAY" | "APPROVAL_GATE" | "ACTION") {
  return {
    id,
    type,
    capability,
    label: id,
    config: {},
    requiresApproval: type === "APPROVAL_GATE",
    retryPolicy: { maxRetries: 0, backoffSeconds: 5 },
  } as const;
}

function workflowInput(nodes: ReturnType<typeof node>[]) {
  return {
    title: "Persisted workflow",
    description: "Focused test workflow",
    naturalLanguagePrompt: "Run the test workflow",
    dag: {
      title: "Persisted workflow",
      description: "Focused test workflow",
      naturalLanguagePrompt: "Run the test workflow",
      nodes,
      edges: [],
      isHighImpact: nodes.some((item) => item.type === "APPROVAL_GATE"),
    },
    status: "DRAFT" as const,
  };
}

test("workflow runs and step outcomes survive service re-reads", async () => {
  const database = new FakeDatabase();
  const context = ownerContext(database);
  const workflow = await WorkflowEngineService.createWorkflow(context, workflowInput([node("wait", "delay.wait", "DELAY")]));

  assert.match(workflow.id, /^[0-9a-f-]{36}$/);
  const execution = await WorkflowEngineService.triggerWorkflow(context, workflow.id, {});
  assert.match(execution.run.id, /^[0-9a-f-]{36}$/);
  assert.equal(execution.run.status, "COMPLETED");
  assert.equal(execution.stepLogs[0].output_payload.result_status, "SIMULATED");

  const reloaded = await WorkflowEngineService.getLatestRun(context, workflow.id);
  assert.equal(reloaded?.id, execution.run.id);
  const logs = await WorkflowEngineService.getRunStepLogs(context, execution.run.id);
  assert.equal(logs.length, 1);
  assert.equal(logs[0].status, "SUCCESS");
});

test("approval state persists and unsupported capabilities are explicit", async () => {
  const database = new FakeDatabase();
  const context = ownerContext(database);
  const workflow = await WorkflowEngineService.createWorkflow(
    context,
    workflowInput([
      node("gate", "approval.manual_gate", "APPROVAL_GATE"),
      node("billing", "billing.subscription.created", "ACTION"),
    ])
  );

  const paused = await WorkflowEngineService.triggerWorkflow(context, workflow.id, {});
  assert.equal(paused.run.status, "AWAITING_APPROVAL");
  const persistedPause = await WorkflowEngineService.getLatestRun(context, workflow.id);
  assert.equal(persistedPause?.status, "AWAITING_APPROVAL");

  const approved = await WorkflowEngineService.approveWorkflowRun(context, workflow.id, paused.run.id, true, "Demo approval");
  assert.equal(approved.status, "COMPLETED");
  const logs = await WorkflowEngineService.getRunStepLogs(context, paused.run.id);
  assert.equal(logs.length, 2);
  assert.equal(logs[0].status, "PAUSED_FOR_APPROVAL");
  assert.equal(logs[1].status, "SKIPPED");
  assert.equal(logs[1].output_payload.result_status, "UNSUPPORTED");
});
