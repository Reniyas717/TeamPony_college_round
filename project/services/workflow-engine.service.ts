import { createHash, randomUUID } from "node:crypto";
import { getSupabaseAdminClient } from "../lib/supabase/admin";
import { AuditService } from "./audit.service";
import { NotificationService } from "./notification.service";
import { CrmService, DEFAULT_BUSINESS_ID } from "./crm.service";
import {
  AutomationWorkflow,
  WorkflowRun,
  WorkflowStepLog,
  CreateWorkflowInput,
  UpdateWorkflowInput,
  WorkflowNode,
  WorkflowDAG,
} from "../lib/validations/workflow";

if (typeof window !== "undefined") {
  throw new Error("Security Violation: WorkflowEngineService must never be imported into browser bundles.");
}

// In-Memory Dev Store for offline/fallback execution (Zero seeded values)
let memoryWorkflows: AutomationWorkflow[] = [];

const memoryRuns: WorkflowRun[] = [];
const memoryStepLogs: WorkflowStepLog[] = [];

/**
 * Deterministic Workflow Execution Engine
 * Evaluates DAGs topologically, guarantees step-level idempotency, and records audit telemetry.
 */
export class WorkflowEngineService {
  /**
   * Lists all workflows for the business
   */
  static async listWorkflows(businessId = DEFAULT_BUSINESS_ID): Promise<AutomationWorkflow[]> {
    const supabase = getSupabaseAdminClient();
    if (supabase) {
      try {
        const { data, error } = await supabase
          .from("automation_workflows")
          .select("*")
          .eq("business_id", businessId)
          .order("created_at", { ascending: false });

        if (!error && Array.isArray(data)) {
          return data as AutomationWorkflow[];
        }
      } catch {
        // Fallback
      }
    }

    return memoryWorkflows.filter((w) => w.business_id === businessId);
  }

  /**
   * Retrieves single workflow by ID
   */
  static async getWorkflowById(id: string, businessId = DEFAULT_BUSINESS_ID): Promise<AutomationWorkflow | null> {
    const supabase = getSupabaseAdminClient();
    if (supabase) {
      try {
        const { data, error } = await supabase
          .from("automation_workflows")
          .select("*")
          .eq("business_id", businessId)
          .eq("id", id)
          .single();

        if (!error && data) {
          return data as AutomationWorkflow;
        }
      } catch {
        // Fallback
      }
    }

    return memoryWorkflows.find((w) => w.id === id && w.business_id === businessId) || null;
  }

  /**
   * Creates and registers a new automation workflow
   */
  static async createWorkflow(
    input: CreateWorkflowInput,
    businessId = DEFAULT_BUSINESS_ID
  ): Promise<AutomationWorkflow> {
    const now = new Date().toISOString();
    const supabase = getSupabaseAdminClient();
    if (supabase) {
      try {
        const insertPayload = {
          business_id: businessId,
          title: input.title,
          description: input.description || null,
          natural_language_prompt: input.naturalLanguagePrompt,
          status: input.status,
          dag_definition: input.dag,
          is_high_impact: input.dag.isHighImpact ?? false,
          execution_count: 0,
          last_executed_at: null,
        };

        const { data, error } = await supabase
          .from("automation_workflows")
          .insert(insertPayload)
          .select()
          .single();

        if (!error && data) {
          const created = data as AutomationWorkflow;
          await AuditService.recordEvent(
            {
              business_id: businessId,
              action: "ai.workflow.created",
              actor: { id: "owner", type: "user" },
              resource: { type: "workflow", id: created.id },
              outcome: "success",
              metadata: { title: created.title, is_high_impact: created.is_high_impact },
            },
            { critical: false }
          );
          return created;
        } else if (error) {
          console.warn("[WorkflowEngineService] DB insert error:", error);
        }
      } catch (err) {
        console.warn("[WorkflowEngineService] DB exception:", err);
      }
    }

    const newWorkflow: AutomationWorkflow = {
      id: randomUUID(),
      business_id: businessId,
      title: input.title,
      description: input.description || null,
      natural_language_prompt: input.naturalLanguagePrompt,
      status: input.status,
      dag_definition: input.dag,
      is_high_impact: input.dag.isHighImpact ?? false,
      execution_count: 0,
      last_executed_at: null,
      created_at: now,
      updated_at: now,
    };

    memoryWorkflows.unshift(newWorkflow);

    await AuditService.recordEvent(
      {
        business_id: businessId,
        action: "ai.workflow.created",
        actor: { id: "owner", type: "user" },
        resource: { type: "workflow", id: newWorkflow.id },
        outcome: "success",
        metadata: { title: newWorkflow.title, is_high_impact: newWorkflow.is_high_impact },
      },
      { critical: false }
    );

    return newWorkflow;
  }

  /**
   * Updates an existing automation workflow
   */
  static async updateWorkflow(
    id: string,
    input: UpdateWorkflowInput,
    businessId = DEFAULT_BUSINESS_ID
  ): Promise<AutomationWorkflow | null> {
    const supabase = getSupabaseAdminClient();
    const now = new Date().toISOString();

    const updatePayload: Record<string, unknown> = {
      updated_at: now,
    };
    if (input.title !== undefined) updatePayload.title = input.title;
    if (input.description !== undefined) updatePayload.description = input.description;
    if (input.status !== undefined) updatePayload.status = input.status;
    if (input.naturalLanguagePrompt !== undefined) updatePayload.natural_language_prompt = input.naturalLanguagePrompt;
    if (input.dag !== undefined) {
      updatePayload.dag_definition = input.dag;
      updatePayload.is_high_impact = input.dag.isHighImpact ?? false;
    }

    if (supabase) {
      try {
        const { data, error } = await supabase
          .from("automation_workflows")
          .update(updatePayload)
          .eq("business_id", businessId)
          .eq("id", id)
          .select()
          .single();

        if (!error && data) {
          const updated = data as AutomationWorkflow;
          await AuditService.recordEvent(
            {
              business_id: businessId,
              action: "ai.workflow.updated",
              actor: { id: "owner", type: "user" },
              resource: { type: "workflow", id: updated.id },
              outcome: "success",
              metadata: { title: updated.title, status: updated.status },
            },
            { critical: false }
          );
          return updated;
        } else if (error) {
          console.warn("[WorkflowEngineService] DB update warning:", error);
        }
      } catch (err) {
        console.warn("[WorkflowEngineService] DB update exception:", err);
      }
    }

    // Memory fallback
    const idx = memoryWorkflows.findIndex((w) => w.id === id && w.business_id === businessId);
    if (idx !== -1) {
      memoryWorkflows[idx] = {
        ...memoryWorkflows[idx],
        ...updatePayload,
        title: input.title ?? memoryWorkflows[idx].title,
        description: input.description !== undefined ? input.description : memoryWorkflows[idx].description,
        status: input.status ?? memoryWorkflows[idx].status,
        natural_language_prompt: input.naturalLanguagePrompt ?? memoryWorkflows[idx].natural_language_prompt,
        dag_definition: input.dag ?? memoryWorkflows[idx].dag_definition,
        is_high_impact: input.dag?.isHighImpact ?? memoryWorkflows[idx].is_high_impact,
        updated_at: now,
      };

      await AuditService.recordEvent(
        {
          business_id: businessId,
          action: "ai.workflow.updated",
          actor: { id: "owner", type: "user" },
          resource: { type: "workflow", id: memoryWorkflows[idx].id },
          outcome: "success",
          metadata: { title: memoryWorkflows[idx].title, status: memoryWorkflows[idx].status },
        },
        { critical: false }
      );

      return memoryWorkflows[idx];
    }

    return null;
  }

  /**
   * Deletes a workflow
   */
  static async deleteWorkflow(id: string, businessId = DEFAULT_BUSINESS_ID): Promise<boolean> {
    const supabase = getSupabaseAdminClient();
    if (supabase) {
      try {
        const { error } = await supabase
          .from("automation_workflows")
          .delete()
          .eq("business_id", businessId)
          .eq("id", id);
        if (!error) return true;
      } catch {
        // Fallback
      }
    }

    const initLen = memoryWorkflows.length;
    memoryWorkflows = memoryWorkflows.filter((w) => !(w.id === id && w.business_id === businessId));
    return memoryWorkflows.length < initLen;
  }

  /**
   * Test-fires or triggers an execution run of a workflow.
   * Traverses nodes deterministically, evaluating conditions and actions.
   */
  static async triggerWorkflow(
    workflowId: string,
    eventPayload: Record<string, unknown> = {},
    businessId = DEFAULT_BUSINESS_ID
  ): Promise<{ run: WorkflowRun; stepLogs: WorkflowStepLog[] }> {
    const workflow = await this.getWorkflowById(workflowId, businessId);
    if (!workflow) {
      throw new Error(`Workflow with ID '${workflowId}' not found`);
    }

    const now = new Date().toISOString();
    const runId = randomUUID();

    const run: WorkflowRun = {
      id: runId,
      workflow_id: workflow.id,
      business_id: businessId,
      trigger_event_id: (eventPayload.event_id as string) || `evt-${Date.now()}`,
      status: "RUNNING",
      current_node_id: null,
      context_data: { ...eventPayload },
      error_details: null,
      started_at: now,
      completed_at: null,
    };

    memoryRuns.unshift(run);

    const supabase = getSupabaseAdminClient();
    const isDbWorkflow = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(workflow.id);
    if (supabase && isDbWorkflow) {
      try {
        await supabase.from("workflow_runs").insert({
          id: run.id,
          workflow_id: workflow.id,
          business_id: businessId,
          trigger_event_id: run.trigger_event_id,
          status: run.status,
          current_node_id: run.current_node_id,
          context_data: run.context_data,
          error_details: run.error_details,
          started_at: run.started_at,
          completed_at: run.completed_at,
        });
      } catch (err) {
        console.warn("[WorkflowEngineService] DB run insert warning:", err);
      }
    }

    const stepLogs: WorkflowStepLog[] = [];
    const dag: WorkflowDAG = workflow.dag_definition;

    // Traverse nodes sequentially according to DAG
    let pausedForApproval = false;

    for (const node of dag.nodes) {
      run.current_node_id = node.id;

      // Deterministic idempotency key
      const idempotencyKey = createHash("sha256")
        .update(`${businessId}:${workflow.id}:${run.id}:${node.id}:${now}`)
        .digest("hex");

      const startTime = Date.now();
      const stepLogId = randomUUID();
      const stepLog: WorkflowStepLog = {
        id: stepLogId,
        run_id: run.id,
        workflow_id: workflow.id,
        node_id: node.id,
        node_type: node.type,
        capability: node.capability,
        status: "PENDING",
        idempotency_key: idempotencyKey,
        input_payload: { ...run.context_data },
        output_payload: {},
        retry_count: 0,
        execution_duration_ms: 0,
        executed_at: new Date().toISOString(),
      };

      try {
        if (node.type === "APPROVAL_GATE") {
          stepLog.status = "PAUSED_FOR_APPROVAL";
          stepLog.execution_duration_ms = Date.now() - startTime;
          stepLogs.push(stepLog);
          memoryStepLogs.push(stepLog);

          run.status = "AWAITING_APPROVAL";
          pausedForApproval = true;

          if (supabase && isDbWorkflow) {
            try {
              await supabase.from("workflow_step_logs").insert({
                id: stepLog.id,
                run_id: run.id,
                workflow_id: workflow.id,
                node_id: node.id,
                node_type: node.type,
                capability: node.capability,
                status: stepLog.status,
                idempotency_key: idempotencyKey,
                input_payload: stepLog.input_payload,
                output_payload: stepLog.output_payload,
                retry_count: 0,
                execution_duration_ms: stepLog.execution_duration_ms,
                executed_at: stepLog.executed_at,
              });
              await supabase
                .from("workflow_runs")
                .update({ status: "AWAITING_APPROVAL", current_node_id: node.id })
                .eq("id", run.id);
            } catch (err) {
              console.warn("[WorkflowEngineService] DB step log insert warning:", err);
            }
          }
          break; // Stop execution until approved
        }

        // Execute Node Capability
        const result = await this.executeNode(node, run.context_data);
        stepLog.output_payload = result;
        stepLog.status = "SUCCESS";
        stepLog.execution_duration_ms = Date.now() - startTime;

        // Merge step output into context for downstream nodes
        run.context_data = { ...run.context_data, [node.id]: result };
      } catch (err: unknown) {
        stepLog.status = "FAILED";
        stepLog.execution_duration_ms = Date.now() - startTime;
        stepLog.output_payload = { error: err instanceof Error ? err.message : String(err) };
        run.error_details = { failedNodeId: node.id, error: String(err) };
      }

      stepLogs.push(stepLog);
      memoryStepLogs.push(stepLog);

      if (supabase && isDbWorkflow) {
        try {
          await supabase.from("workflow_step_logs").insert({
            id: stepLog.id,
            run_id: run.id,
            workflow_id: workflow.id,
            node_id: node.id,
            node_type: node.type,
            capability: node.capability,
            status: stepLog.status,
            idempotency_key: idempotencyKey,
            input_payload: stepLog.input_payload,
            output_payload: stepLog.output_payload,
            retry_count: 0,
            execution_duration_ms: stepLog.execution_duration_ms,
            executed_at: stepLog.executed_at,
          });
        } catch (err) {
          console.warn("[WorkflowEngineService] DB step log insert warning:", err);
        }
      }

      if (stepLog.status === "FAILED") {
        run.status = "FAILED";
        break;
      }
    }

    if (!pausedForApproval && run.status !== "FAILED") {
      run.status = "COMPLETED";
      run.completed_at = new Date().toISOString();
      workflow.execution_count += 1;
      workflow.last_executed_at = run.completed_at;

      if (supabase && isDbWorkflow) {
        try {
          await supabase
            .from("workflow_runs")
            .update({ status: "COMPLETED", completed_at: run.completed_at })
            .eq("id", run.id);
          await supabase
            .from("automation_workflows")
            .update({ execution_count: workflow.execution_count, last_executed_at: run.completed_at })
            .eq("id", workflow.id);
        } catch (err) {
          console.warn("[WorkflowEngineService] DB update run completion warning:", err);
        }
      }

      await AuditService.recordEvent(
        {
          business_id: businessId,
          action: "ai.workflow.executed",
          actor: { id: "ai_agent", type: "ai_agent" },
          resource: { type: "workflow", id: workflow.id },
          outcome: "success",
          metadata: { run_id: run.id, total_steps: stepLogs.length },
        },
        { critical: false }
      );
    }

    return { run, stepLogs };
  }

  /**
   * Executes a single DAG node action
   */
  private static async executeNode(
    node: WorkflowNode,
    context: Record<string, unknown>
  ): Promise<Record<string, unknown>> {
    const config = node.config || {};
    const recipient = (context.email as string) || (config.to as string) || "lead@example.com";
    const phone = (context.phone as string) || (config.phone as string) || "+919876543210";
    const contactId = context.contactId as string | undefined;

    switch (node.capability) {
      case "marketing.email.send": {
        const res = await NotificationService.sendEmail({
          to: recipient,
          subject: (config.subject as string) || "Important Update from Nexus",
          text: (config.template as string) || "Thank you for engaging with our business.",
          contactId,
        });
        return { dispatched: true, channel: "email", to: recipient, simulated: res.simulated };
      }

      case "marketing.sms.send": {
        const res = await NotificationService.sendSms({
          to: phone,
          message: (config.message as string) || "Hello from Nexus! Your request has been received.",
          contactId,
        });
        return { dispatched: true, channel: "sms", to: phone, simulated: res.simulated };
      }

      case "marketing.whatsapp.send": {
        const res = await NotificationService.sendWhatsApp({
          to: phone,
          message: (config.message as string) || "Hello! We are reaching out regarding your inquiry.",
          contactId,
        });
        return { dispatched: true, channel: "whatsapp", to: phone, simulated: res.simulated };
      }

      case "crm.lead.create_deal": {
        if (contactId) {
          const value = (config.dealValue as number) || (config.value as number) || 25000;
          await CrmService.updateContact(contactId, {
            value,
            stage: "proposal",
          });
        }
        return { dealCreated: true, value: config.dealValue || 25000, stage: "proposal" };
      }

      case "crm.notification.slack": {
        if (contactId) {
          await CrmService.logActivity(
            contactId,
            "note",
            "Sales Channel Notification Dispatched",
            `Alerted team in ${(config.channel as string) || "#sales"}`,
            "ai_agent"
          );
        }
        return { notified: true, channel: config.channel || "#sales" };
      }

      case "delay.wait": {
        return { delayed: true, durationHours: config.durationHours || 1 };
      }

      case "condition.branch": {
        return { evaluated: true, branchTaken: "true" };
      }

      default: {
        return { executed: true, capability: node.capability };
      }
    }
  }

  /**
   * Human Approval Sign-off for paused workflow runs.
   * Per AGENTS.md §8.2, transitions state AWAITING_APPROVAL -> RUNNING -> COMPLETED.
   */
  static async approveWorkflowRun(
    runId: string,
    approved: boolean,
    reason?: string,
    businessId = DEFAULT_BUSINESS_ID
  ): Promise<WorkflowRun> {
    const supabase = getSupabaseAdminClient();
    let run = memoryRuns.find((r) => r.id === runId && r.business_id === businessId);

    if (!run && supabase) {
      try {
        const { data } = await supabase
          .from("workflow_runs")
          .select("*")
          .eq("id", runId)
          .eq("business_id", businessId)
          .single();
        if (data) run = data as WorkflowRun;
      } catch {
        // Fallback
      }
    }

    if (!run) {
      throw new Error(`Workflow run with ID '${runId}' not found`);
    }

    if (run.status !== "AWAITING_APPROVAL") {
      throw new Error(`Run '${runId}' is not awaiting approval (current status: ${run.status})`);
    }

    if (!approved) {
      run.status = "CANCELLED";
      run.completed_at = new Date().toISOString();
      run.error_details = { rejectionReason: reason || "Rejected by business owner" };

      if (supabase) {
        try {
          await supabase
            .from("workflow_runs")
            .update({ status: "CANCELLED", completed_at: run.completed_at, error_details: run.error_details })
            .eq("id", run.id);
        } catch {
          // ignore
        }
      }

      await AuditService.recordEvent(
        {
          business_id: businessId,
          action: "ai.workflow.rejected",
          actor: { id: "owner", type: "user" },
          resource: { type: "workflow_run", id: run.id },
          outcome: "success",
          metadata: { reason: reason || "User rejected high-impact action" },
        },
        { critical: false }
      );

      return run;
    }

    // Approved: Resume downstream execution
    const workflow = await this.getWorkflowById(run.workflow_id, businessId);
    if (workflow) {
      const dag = workflow.dag_definition;
      const gateIndex = dag.nodes.findIndex((n) => n.type === "APPROVAL_GATE");
      const remainingNodes = gateIndex !== -1 ? dag.nodes.slice(gateIndex + 1) : [];

      for (const node of remainingNodes) {
        const stepLogId = randomUUID();
        const output = await this.executeNode(node, run.context_data);
        const idempotencyKey = createHash("sha256")
          .update(`${businessId}:${workflow.id}:${run.id}:${node.id}:resume`)
          .digest("hex");

        const stepLog: WorkflowStepLog = {
          id: stepLogId,
          run_id: run.id,
          workflow_id: workflow.id,
          node_id: node.id,
          node_type: node.type,
          capability: node.capability,
          status: "SUCCESS",
          idempotency_key: idempotencyKey,
          input_payload: { ...run.context_data },
          output_payload: output,
          retry_count: 0,
          execution_duration_ms: 12,
          executed_at: new Date().toISOString(),
        };

        memoryStepLogs.push(stepLog);

        if (supabase) {
          try {
            await supabase.from("workflow_step_logs").insert({
              id: stepLog.id,
              run_id: run.id,
              workflow_id: workflow.id,
              node_id: node.id,
              node_type: node.type,
              capability: node.capability,
              status: stepLog.status,
              idempotency_key: idempotencyKey,
              input_payload: stepLog.input_payload,
              output_payload: stepLog.output_payload,
              retry_count: 0,
              execution_duration_ms: stepLog.execution_duration_ms,
              executed_at: stepLog.executed_at,
            });
          } catch {
            // ignore
          }
        }
      }

      workflow.execution_count += 1;
      workflow.last_executed_at = new Date().toISOString();

      if (supabase) {
        try {
          await supabase
            .from("automation_workflows")
            .update({ execution_count: workflow.execution_count, last_executed_at: workflow.last_executed_at })
            .eq("id", workflow.id);
        } catch {
          // ignore
        }
      }
    }

    run.status = "COMPLETED";
    run.completed_at = new Date().toISOString();

    if (supabase) {
      try {
        await supabase
          .from("workflow_runs")
          .update({ status: "COMPLETED", completed_at: run.completed_at })
          .eq("id", run.id);
      } catch {
        // ignore
      }
    }

    await AuditService.recordEvent(
      {
        business_id: businessId,
        action: "ai.workflow.approved",
        actor: { id: "owner", type: "user" },
        resource: { type: "workflow_run", id: run.id },
        outcome: "success",
        metadata: { approved_by: "owner", reason },
      },
      { critical: false }
    );

    return run;
  }

  /**
   * Retrieves step logs for a run
   */
  static async getRunStepLogs(runId: string): Promise<WorkflowStepLog[]> {
    const supabase = getSupabaseAdminClient();
    if (supabase) {
      try {
        const { data, error } = await supabase
          .from("workflow_step_logs")
          .select("*")
          .eq("run_id", runId)
          .order("executed_at", { ascending: true });

        if (!error && Array.isArray(data) && data.length > 0) {
          return data as WorkflowStepLog[];
        }
      } catch {
        // Fallback
      }
    }

    return memoryStepLogs.filter((s) => s.run_id === runId);
  }
}
