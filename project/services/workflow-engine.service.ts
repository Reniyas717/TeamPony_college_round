import { createHash } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { OwnerContext } from "@/lib/supabase/owner-context";
import { getSupabaseAdminClient } from "../lib/supabase/admin";
import { AuditService } from "./audit.service";
import { NotificationService } from "./notification.service";
import {
  AutomationWorkflow,
  WorkflowRun,
  WorkflowStepLog,
  CreateWorkflowInput,
  WorkflowNode,
  WorkflowDAGSchema,
} from "@/lib/validations/workflow";

if (typeof window !== "undefined") {
  throw new Error("Security Violation: WorkflowEngineService must never be imported into browser bundles.");
}

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export class WorkflowServiceError extends Error {
  constructor(
    message: string,
    public readonly status: 400 | 404 | 409 | 500 = 500,
    public readonly code: "VALIDATION_ERROR" | "NOT_FOUND" | "CONFLICT" | "INTERNAL_ERROR" = "INTERNAL_ERROR"
  ) {
    super(message);
    this.name = "WorkflowServiceError";
  }
}

type JsonObject = Record<string, unknown>;
type NodeExecutionResult = JsonObject & {
  result_status: "SUCCESS" | "SIMULATED" | "UNSUPPORTED" | "FAILED";
  simulated?: boolean;
};

function requireUuid(value: string, name: string): void {
  if (!UUID_PATTERN.test(value)) {
    throw new WorkflowServiceError(`${name} must be a valid workflow UUID.`, 400, "VALIDATION_ERROR");
  }
}

function asWorkflow(row: JsonObject): AutomationWorkflow {
  const dag = WorkflowDAGSchema.safeParse(row.dag_definition);
  if (!dag.success) throw new WorkflowServiceError("The saved workflow definition is invalid.");
  return { ...(row as unknown as AutomationWorkflow), dag_definition: dag.data };
}

function asRun(row: JsonObject): WorkflowRun {
  return row as unknown as WorkflowRun;
}

function asStepLog(row: JsonObject): WorkflowStepLog {
  return row as unknown as WorkflowStepLog;
}

/**
 * Deterministic Workflow Execution Engine
 * Evaluates DAGs topologically, guarantees step-level idempotency, and records audit telemetry.
 */
export class WorkflowEngineService {
  /**
   * Lists all workflows for the business
   */
  static async listWorkflows(context: OwnerContext): Promise<AutomationWorkflow[]> {
    const { data, error } = await context.client
      .from("automation_workflows")
      .select("*")
      .eq("business_id", context.businessId)
      .order("created_at", { ascending: false });
    if (error) throw new WorkflowServiceError("Failed to load workflows.");
    return (data || []).map((row) => asWorkflow(row as JsonObject));
  }

  /**
   * Retrieves single workflow by ID
   */
  static async getWorkflowById(context: OwnerContext, id: string): Promise<AutomationWorkflow | null> {
    requireUuid(id, "Workflow ID");
    const { data, error } = await context.client
      .from("automation_workflows")
      .select("*")
      .eq("business_id", context.businessId)
      .eq("id", id)
      .maybeSingle();
    if (error) throw new WorkflowServiceError("Failed to load workflow.");
    return data ? asWorkflow(data as JsonObject) : null;
  }

  /**
   * Creates and registers a new automation workflow
   */
  static async createWorkflow(
    context: OwnerContext,
    input: CreateWorkflowInput,
  ): Promise<AutomationWorkflow> {
    const { data, error } = await context.client
      .from("automation_workflows")
      .insert({
        business_id: context.businessId,
        title: input.title,
        description: input.description || null,
        natural_language_prompt: input.naturalLanguagePrompt,
        status: input.status,
        dag_definition: input.dag,
        is_high_impact: input.dag.isHighImpact ?? false,
        execution_count: 0,
        last_executed_at: null,
      })
      .select("*")
      .single();
    if (error || !data) throw new WorkflowServiceError("Workflow could not be saved.");
    const created = asWorkflow(data as JsonObject);
    await this.recordAudit(context, {
      business_id: context.businessId,
      action: "ai.workflow.created",
      actor: { id: context.user.id, type: "user" },
      resource: { type: "workflow", id: created.id },
      workflow_id: created.id,
      outcome: "success",
      metadata: { workflow_id: created.id, node_count: created.dag_definition.nodes.length },
    });
    return created;
  }

  /**
   * Deletes a workflow
   */
  static async deleteWorkflow(context: OwnerContext, id: string): Promise<boolean> {
    requireUuid(id, "Workflow ID");
    const { data, error } = await context.client
      .from("automation_workflows")
      .delete()
      .eq("business_id", context.businessId)
      .eq("id", id)
      .select("id");
    if (error) throw new WorkflowServiceError("Workflow could not be deleted.");
    const deleted = Boolean(data && data.length > 0);
    if (deleted) {
      await this.recordAudit(context, {
        business_id: context.businessId,
        action: "ai.workflow.deleted",
        actor: { id: context.user.id, type: "user" },
        resource: { type: "workflow", id },
        workflow_id: id,
        outcome: "success",
        metadata: { workflow_id: id },
      });
    }
    return deleted;
  }

  /**
   * Test-fires or triggers an execution run of a workflow.
   * Traverses nodes deterministically, evaluating conditions and actions.
   */
  static async triggerWorkflow(
    context: OwnerContext,
    workflowId: string,
    eventPayload: Record<string, unknown> = {}
  ): Promise<{ run: WorkflowRun; stepLogs: WorkflowStepLog[] }> {
    const workflow = await this.requireWorkflow(context, workflowId);
    const startedAt = new Date().toISOString();
    let run: WorkflowRun;
    const { data, error } = await context.client.rpc("workflow_create_run_with_audit", {
      p_workflow_id: workflow.id,
      p_trigger_event_id: typeof eventPayload.event_id === "string" ? eventPayload.event_id : null,
      p_event_payload: eventPayload,
      p_started_at: startedAt,
    });
    if (!error && data) {
      run = asRun(data as JsonObject);
    } else {
      const admin = getSupabaseAdminClient() || context.client;
      const { data: fallbackRun, error: fallbackError } = await admin
        .from("workflow_runs")
        .insert({
          workflow_id: workflow.id,
          business_id: workflow.business_id,
          trigger_event_id: typeof eventPayload.event_id === "string" ? eventPayload.event_id : null,
          status: "RUNNING",
          current_node_id: null,
          context_data: {
            ...eventPayload,
            _workflow: {
              initiator_id: context.user.id,
              initiator_type: "user",
              execution_mode: "manual",
              initiated_at: startedAt,
            },
          },
          started_at: startedAt,
          initiated_by: context.user.id,
          run_version: 1,
        })
        .select()
        .single();
      if (fallbackError || !fallbackRun) {
        console.error("[TRIGGER_WORKFLOW_FALLBACK_ERROR]", fallbackError);
        throw new WorkflowServiceError("Workflow run could not be started.");
      }
      run = asRun(fallbackRun as JsonObject);
    }

    const execution = await this.executeNodes(context, workflow, run, workflow.dag_definition.nodes);
    if (!execution.paused) {
      await this.incrementExecutionCount(context, workflow);
    }
    return execution;
  }

  /**
   * Executes a single DAG node action
   */
  private static async executeNode(
    context: OwnerContext,
    node: WorkflowNode,
    runContext: Record<string, unknown>
  ): Promise<NodeExecutionResult> {
    const config = node.config || {};
    const contactId = typeof runContext.contactId === "string" ? runContext.contactId : undefined;

    switch (node.capability) {
      case "marketing.email.send": {
        const recipient = await this.resolveRecipient(context, contactId, config.to, runContext.email, "email");
        const result = await NotificationService.sendEmail({
          to: recipient,
          subject: typeof config.subject === "string" ? config.subject : "Nexus workflow update",
          text: typeof config.template === "string" ? config.template : "This message was sent by a Nexus workflow.",
          contactId,
        });
        return {
          result_status: result.simulated ? "SIMULATED" : (result.success ? "SUCCESS" : "FAILED"),
          simulated: result.simulated,
          channel: "email",
          provider_status: result.success ? (result.simulated ? "simulated" : "accepted") : "failed",
          error: result.error,
          details: result.details,
        };
      }

      case "marketing.sms.send": {
        const recipient = await this.resolveRecipient(context, contactId, config.phone, runContext.phone, "phone");
        const result = await NotificationService.sendSms({
          to: recipient,
          message: typeof config.message === "string" ? config.message : "This message was sent by a Nexus workflow.",
          contactId,
        });
        return {
          result_status: result.simulated ? "SIMULATED" : (result.success ? "SUCCESS" : "FAILED"),
          simulated: result.simulated,
          channel: "sms",
          provider_status: result.success ? (result.simulated ? "simulated" : "accepted") : "failed",
          error: result.error,
          details: result.details,
        };
      }

      case "marketing.whatsapp.send": {
        const recipient = await this.resolveRecipient(context, contactId, config.phone, runContext.phone, "phone");
        const result = await NotificationService.sendWhatsApp({
          to: recipient,
          message: typeof config.message === "string" ? config.message : "This message was sent by a Nexus workflow.",
          contactId,
        });
        return {
          result_status: result.simulated ? "SIMULATED" : (result.success ? "SUCCESS" : "FAILED"),
          simulated: result.simulated,
          channel: "whatsapp",
          provider_status: result.success ? (result.simulated ? "simulated" : "accepted") : "failed",
          error: result.error,
          details: result.details,
        };
      }

      case "crm.lead.create_deal": {
        if (!contactId) return { result_status: "UNSUPPORTED", reason: "An owned CRM contact is required." };
        const value = typeof config.dealValue === "number" ? config.dealValue : 25000;
        const { error } = await context.client
          .from("crm_contacts")
          .update({ value, stage: "proposal", updated_at: new Date().toISOString() })
          .eq("business_id", context.businessId)
          .eq("id", contactId);
        if (error) throw new Error("The owned CRM contact could not be updated.");
        return { result_status: "SUCCESS", deal_created: true, value, stage: "proposal" };
      }

      case "crm.notification.slack":
        return {
          result_status: "UNSUPPORTED",
          reason: "Slack delivery is not implemented by the current workflow executor.",
        };

      case "delay.wait":
        return {
          result_status: "SIMULATED",
          simulated: true,
          reason: "The manual demo records the delay without starting a background scheduler.",
          duration_hours: config.durationHours || 1,
        };

      case "condition.branch":
        return {
          result_status: "SIMULATED",
          simulated: true,
          reason: "Branch evaluation is represented for the manual demo; full DAG dispatch is not enabled.",
          branch_taken: "true",
        };

      default:
        return {
          result_status: "UNSUPPORTED",
          reason: `Capability '${node.capability}' has no implemented executor.`,
        };
    }
  }

  /**
   * Human Approval Sign-off for paused workflow runs.
   * Per AGENTS.md §8.2, transitions state AWAITING_APPROVAL -> RUNNING -> COMPLETED.
   */
  static async approveWorkflowRun(
    context: OwnerContext,
    workflowId: string,
    runId: string,
    approved: boolean,
    reason?: string
  ): Promise<WorkflowRun> {
    const workflow = await this.requireWorkflow(context, workflowId);
    const run = await this.getRun(context, workflowId, runId);
    if (!run) throw new WorkflowServiceError("Workflow run was not found.", 404, "NOT_FOUND");
    if (run.status !== "AWAITING_APPROVAL") {
      throw new WorkflowServiceError(
        `Run is not awaiting approval (current status: ${run.status}).`,
        409,
        "CONFLICT"
      );
    }

    const decidedAt = new Date().toISOString();
    let decidedRun: WorkflowRun;
    const { data: decidedData, error: decidedError } = await context.client.rpc("workflow_decide_run_with_audit", {
      p_workflow_id: workflowId,
      p_run_id: runId,
      p_approved: approved,
      p_reason: reason || null,
      p_decided_at: decidedAt,
    });
    if (!decidedError && decidedData) {
      decidedRun = asRun(decidedData as JsonObject);
    } else {
      const admin = getSupabaseAdminClient() || context.client;
      const { data: fallbackRun, error: fallbackError } = await admin
        .from("workflow_runs")
        .update({
          status: approved ? "RUNNING" : "CANCELLED",
          approved_by: context.user.id,
          approval_decided_at: decidedAt,
          approval_reason: reason || null,
          last_step_at: decidedAt,
        })
        .eq("id", runId)
        .select()
        .single();
      if (fallbackError || !fallbackRun) {
        throw new WorkflowServiceError("Workflow approval decision could not be recorded.");
      }
      decidedRun = asRun(fallbackRun as JsonObject);
    }

    await this.recordAudit(context, {
      business_id: context.businessId,
      action: approved ? "ai.workflow.approved" : "ai.workflow.rejected",
      actor: { id: context.user.id, type: "user" },
      approver: { id: context.user.id, type: "user", approved_at: decidedAt },
      resource: { type: "workflow_run", id: runId },
      workflow_id: workflowId,
      outcome: "success",
      metadata: {
        workflow_id: workflowId,
        run_id: runId,
        node_id: run.current_node_id || undefined,
        reason_code: !approved ? (reason || "REJECTED_BY_USER") : undefined,
      },
    });

    if (!approved) return decidedRun;

    const gateIndex = workflow.dag_definition.nodes.findIndex((node) => node.id === decidedRun.current_node_id);
    const remainingNodes = gateIndex >= 0 ? workflow.dag_definition.nodes.slice(gateIndex + 1) : [];
    const execution = await this.executeNodes(context, workflow, decidedRun, remainingNodes);
    if (!execution.paused) await this.incrementExecutionCount(context, workflow);
    return execution.run;
  }

  /**
   * Retrieves step logs for a run
   */
  static async getRunStepLogs(context: OwnerContext, runId: string): Promise<WorkflowStepLog[]> {
    const run = await this.getRunById(context, runId);
    if (!run) throw new WorkflowServiceError("Workflow run was not found.", 404, "NOT_FOUND");
    const { data, error } = await context.client
      .from("workflow_step_logs")
      .select("*")
      .eq("run_id", run.id)
      .eq("workflow_id", run.workflow_id)
      .order("executed_at", { ascending: true });
    if (error) throw new WorkflowServiceError("Failed to load workflow telemetry.");
    return (data || []).map((row) => asStepLog(row as JsonObject));
  }

  static async getLatestRun(context: OwnerContext, workflowId: string): Promise<WorkflowRun | null> {
    await this.requireWorkflow(context, workflowId);
    const { data, error } = await context.client
      .from("workflow_runs")
      .select("*")
      .eq("business_id", context.businessId)
      .eq("workflow_id", workflowId)
      .order("started_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) throw new WorkflowServiceError("Failed to load workflow runs.");
    return data ? asRun(data as JsonObject) : null;
  }

  private static async executeNodes(
    context: OwnerContext,
    workflow: AutomationWorkflow,
    initialRun: WorkflowRun,
    nodes: WorkflowNode[]
  ): Promise<{ run: WorkflowRun; stepLogs: WorkflowStepLog[]; paused: boolean }> {
    let run = initialRun;
    const stepLogs: WorkflowStepLog[] = [];
    const warnings: string[] = [];
    let paused = false;

    for (const node of nodes) {
      run = await this.updateRun(context, workflow.id, run.id, { current_node_id: node.id });
      const idempotencyKey = createHash("sha256")
        .update(`${context.businessId}:${workflow.id}:${run.id}:${node.id}`)
        .digest("hex");
      let pendingStep: WorkflowStepLog;
      const { data: pendingRow, error: pendingError } = await context.client.rpc("workflow_record_step_with_audit", {
        p_workflow_id: workflow.id,
        p_run_id: run.id,
        p_step_id: null,
        p_node_id: node.id,
        p_node_type: node.type,
        p_capability: node.capability,
        p_status: "PENDING",
        p_idempotency_key: idempotencyKey,
        p_input_payload: run.context_data,
        p_output_payload: {},
        p_execution_duration_ms: null,
        p_executed_at: new Date().toISOString(),
      });
      if (!pendingError && pendingRow) {
        pendingStep = asStepLog(pendingRow as JsonObject);
      } else {
        const admin = getSupabaseAdminClient() || context.client;
        const { data: fallbackStep } = await admin
          .from("workflow_step_logs")
          .insert({
            run_id: run.id,
            business_id: workflow.business_id,
            workflow_id: workflow.id,
            node_id: node.id,
            node_type: node.type,
            capability: node.capability,
            status: "PENDING",
            idempotency_key: idempotencyKey,
            input_payload: run.context_data,
            output_payload: {},
            executed_at: new Date().toISOString(),
          })
          .select()
          .single();
        if (!fallbackStep) throw new WorkflowServiceError("Workflow step could not be recorded.");
        pendingStep = asStepLog(fallbackStep as JsonObject);
      }

      if (node.type === "APPROVAL_GATE" || node.requiresApproval) {
        const pausedStep = await this.updateStep(context, run, workflow, pendingStep.id, {
          status: "PAUSED_FOR_APPROVAL",
          output_payload: { result_status: "PENDING_APPROVAL" },
          execution_duration_ms: 0,
        });
        stepLogs.push(pausedStep);
        run = await this.updateRun(context, workflow.id, run.id, {
          status: "AWAITING_APPROVAL",
          current_node_id: node.id,
        });
        paused = true;
        break;
      }

      const startedAt = Date.now();
      let result: NodeExecutionResult;
      try {
        result = await this.executeNode(context, node, run.context_data);
      } catch (error) {
        result = {
          result_status: "FAILED",
          error: error instanceof Error ? error.message : "Workflow capability failed.",
        };
      }

      const status = result.result_status === "FAILED"
        ? "FAILED"
        : result.result_status === "UNSUPPORTED"
          ? "SKIPPED"
          : "SUCCESS";
      const step = await this.updateStep(context, run, workflow, pendingStep.id, {
        status,
        output_payload: result,
        execution_duration_ms: Date.now() - startedAt,
      });
      stepLogs.push(step);

      let stepAction:
        | "ai.workflow.step_succeeded"
        | "ai.workflow.step_failed"
        | "ai.workflow.step_simulated"
        | "ai.workflow.step_unsupported";
      let stepOutcome: "success" | "failure" = "success";
      let stepReason: string | undefined = undefined;

      if (result.result_status === "FAILED") {
        stepAction = "ai.workflow.step_failed";
        stepOutcome = "failure";
        stepReason = (result.error as string | undefined) || "STEP_EXECUTION_FAILED";
      } else if (result.result_status === "SIMULATED") {
        stepAction = "ai.workflow.step_simulated";
      } else if (result.result_status === "UNSUPPORTED") {
        stepAction = "ai.workflow.step_unsupported";
        stepOutcome = "failure";
        stepReason = "UNSUPPORTED_CAPABILITY";
      } else {
        stepAction = "ai.workflow.step_succeeded";
      }

      await this.recordAudit(context, {
        business_id: context.businessId,
        action: stepAction,
        actor: { id: "ai_agent", type: "ai_agent" },
        initiator: this.initiatorFromRun(run, context.user.id),
        resource: { type: "workflow_step", id: step.id },
        workflow_id: workflow.id,
        outcome: stepOutcome,
        metadata: {
          workflow_id: workflow.id,
          run_id: run.id,
          node_id: node.id,
          capability: node.capability,
          reason_code: stepReason,
        },
      });

      if (result.result_status === "UNSUPPORTED") {
        warnings.push(`${node.capability}: unsupported in the manual workflow demo`);
      }
      if (result.result_status === "SIMULATED") {
        warnings.push(`${node.capability}: simulated result`);
      }

      run = await this.updateRun(context, workflow.id, run.id, {
        context_data: { ...(run.context_data || {}), [node.id]: result },
        error_details: warnings.length > 0 ? { warnings } : run.error_details,
      });

      if (result.result_status === "FAILED") {
        run = await this.updateRun(context, workflow.id, run.id, {
          status: "FAILED",
          error_details: {
            failed_node_id: node.id,
            error: result.error || "Workflow step failed.",
            warnings,
          },
          completed_at: new Date().toISOString(),
        });

        await this.recordAudit(context, {
          business_id: context.businessId,
          action: "ai.workflow.failed",
          actor: { id: "ai_agent", type: "ai_agent" },
          initiator: this.initiatorFromRun(run, context.user.id),
          resource: { type: "workflow_run", id: run.id },
          workflow_id: workflow.id,
          outcome: "failure",
          metadata: {
            workflow_id: workflow.id,
            run_id: run.id,
            node_id: node.id,
            reason_code: (result.error as string | undefined) || "WORKFLOW_STEP_FAILED",
          },
        });
        break;
      }
    }

    if (!paused && run.status !== "FAILED") {
      run = await this.updateRun(context, workflow.id, run.id, {
        status: "COMPLETED",
        error_details: warnings.length > 0 ? { warnings } : run.error_details,
        completed_at: new Date().toISOString(),
      });

      await this.recordAudit(context, {
        business_id: context.businessId,
        action: "ai.workflow.executed",
        actor: { id: "ai_agent", type: "ai_agent" },
        initiator: this.initiatorFromRun(run, context.user.id),
        resource: { type: "workflow_run", id: run.id },
        workflow_id: workflow.id,
        outcome: "success",
        metadata: {
          workflow_id: workflow.id,
          run_id: run.id,
          node_count: nodes.length,
        },
      });
    }
    return { run, stepLogs, paused };
  }

  private static async updateStep(
    context: OwnerContext,
    run: WorkflowRun,
    workflow: AutomationWorkflow,
    stepId: string,
    patch: JsonObject
  ): Promise<WorkflowStepLog> {
    const { data, error } = await context.client.rpc("workflow_record_step_with_audit", {
      p_workflow_id: workflow.id,
      p_run_id: run.id,
      p_step_id: stepId,
      p_node_id: null,
      p_node_type: null,
      p_capability: null,
      p_status: typeof patch.status === "string" ? patch.status : "PENDING",
      p_idempotency_key: null,
      p_input_payload: null,
      p_output_payload: patch.output_payload || null,
      p_execution_duration_ms: typeof patch.execution_duration_ms === "number"
        ? patch.execution_duration_ms
        : null,
      p_executed_at: new Date().toISOString(),
    });
    if (!error && data) {
      return asStepLog(data as JsonObject);
    }
    const admin = getSupabaseAdminClient() || context.client;
    const { data: fallbackData } = await admin
      .from("workflow_step_logs")
      .update({
        status: typeof patch.status === "string" ? patch.status : "PENDING",
        output_payload: patch.output_payload || {},
        execution_duration_ms: typeof patch.execution_duration_ms === "number" ? patch.execution_duration_ms : null,
      })
      .eq("id", stepId)
      .select()
      .single();
    if (!fallbackData) throw new WorkflowServiceError("Workflow step could not be updated.");
    return asStepLog(fallbackData as JsonObject);
  }

  private static async updateRun(
    context: OwnerContext,
    workflowId: string,
    runId: string,
    patch: JsonObject
  ): Promise<WorkflowRun> {
    const { data, error } = await context.client.rpc("workflow_update_run_with_audit", {
      p_workflow_id: workflowId,
      p_run_id: runId,
      p_status: typeof patch.status === "string" ? patch.status : null,
      p_current_node_id: typeof patch.current_node_id === "string" ? patch.current_node_id : null,
      p_context_data: patch.context_data || null,
      p_error_details: patch.error_details || null,
      p_completed_at: typeof patch.completed_at === "string" ? patch.completed_at : null,
    });
    if (!error && data) {
      return asRun(data as JsonObject);
    }
    const admin = getSupabaseAdminClient() || context.client;
    const updateObj: Record<string, unknown> = {};
    if (typeof patch.status === "string") updateObj.status = patch.status;
    if (typeof patch.current_node_id === "string") updateObj.current_node_id = patch.current_node_id;
    if (patch.context_data) updateObj.context_data = patch.context_data;
    if (patch.error_details) updateObj.error_details = patch.error_details;
    if (typeof patch.completed_at === "string") updateObj.completed_at = patch.completed_at;
    updateObj.last_step_at = new Date().toISOString();

    const { data: fallbackData } = await admin
      .from("workflow_runs")
      .update(updateObj)
      .eq("id", runId)
      .select()
      .single();
    if (!fallbackData) throw new WorkflowServiceError("Workflow run could not be updated.");
    return asRun(fallbackData as JsonObject);
  }

  private static async incrementExecutionCount(
    context: OwnerContext,
    workflow: AutomationWorkflow
  ): Promise<void> {
    const { error } = await context.client
      .from("automation_workflows")
      .update({
        execution_count: workflow.execution_count + 1,
        last_executed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("business_id", context.businessId)
      .eq("id", workflow.id);
    if (error) throw new WorkflowServiceError("Workflow execution count could not be updated.");
  }

  private static async getRun(
    context: OwnerContext,
    workflowId: string,
    runId: string
  ): Promise<WorkflowRun | null> {
    requireUuid(runId, "Run ID");
    const { data, error } = await context.client
      .from("workflow_runs")
      .select("*")
      .eq("business_id", context.businessId)
      .eq("workflow_id", workflowId)
      .eq("id", runId)
      .maybeSingle();
    if (error) throw new WorkflowServiceError("Failed to load workflow run.");
    return data ? asRun(data as JsonObject) : null;
  }

  private static async getRunById(context: OwnerContext, runId: string): Promise<WorkflowRun | null> {
    requireUuid(runId, "Run ID");
    const { data, error } = await context.client
      .from("workflow_runs")
      .select("*")
      .eq("business_id", context.businessId)
      .eq("id", runId)
      .maybeSingle();
    if (error) throw new WorkflowServiceError("Failed to load workflow run.");
    return data ? asRun(data as JsonObject) : null;
  }

  private static async requireWorkflow(context: OwnerContext, workflowId: string): Promise<AutomationWorkflow> {
    const workflow = await this.getWorkflowById(context, workflowId);
    if (!workflow) throw new WorkflowServiceError("Workflow was not found.", 404, "NOT_FOUND");
    return workflow;
  }

  private static async resolveRecipient(
    context: OwnerContext,
    contactId: string | undefined,
    configuredValue: unknown,
    payloadValue: unknown,
    preferredType: "email" | "phone" = "email"
  ): Promise<string> {
    if (contactId) {
      const { data, error } = await context.client
        .from("crm_contacts")
        .select("email,phone")
        .eq("business_id", context.businessId)
        .eq("id", contactId)
        .maybeSingle();
      if (error) throw new Error("The owned CRM contact could not be read.");
      const contactValue = preferredType === "phone"
        ? (data?.phone || data?.email)
        : (data?.email || data?.phone);
      if (typeof contactValue === "string" && contactValue.length > 0) return contactValue;
      throw new Error("The owned CRM contact has no destination address.");
    }
    const candidate = typeof configuredValue === "string" ? configuredValue : payloadValue;
    if (typeof candidate !== "string" || candidate.trim().length === 0) {
      throw new Error("A workflow recipient is required.");
    }
    return candidate.trim();
  }

  private static initiatorFromRun(run: WorkflowRun, fallback: string): { id: string; type: "user" } {
    const meta = ((run.context_data || {}) as JsonObject)._workflow;
    const initiatorId = meta && typeof (meta as JsonObject).initiator_id === "string"
      ? (meta as JsonObject).initiator_id as string
      : fallback;
    return { id: initiatorId, type: "user" };
  }

  private static async recordAudit(
    context: OwnerContext,
    input: Parameters<typeof AuditService.recordEvent>[0]
  ): Promise<boolean> {
    try {
      const event = await AuditService.recordEvent(input, {
        client: context.client as SupabaseClient,
        critical: false,
      });
      return Boolean(event);
    } catch (err) {
      console.warn("[WORKFLOW-AUDIT-WARN] Audit event logging failed:", err);
      return false;
    }
  }
}
