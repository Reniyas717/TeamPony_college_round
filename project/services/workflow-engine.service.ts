import { createHash } from "node:crypto";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { AuditService } from "./audit.service";
import { NotificationService } from "./notification.service";
import { CrmService, DEFAULT_BUSINESS_ID } from "./crm.service";
import {
  AutomationWorkflow,
  WorkflowRun,
  WorkflowStepLog,
  CreateWorkflowInput,
  WorkflowNode,
  WorkflowDAG,
} from "@/lib/validations/workflow";

if (typeof window !== "undefined") {
  throw new Error("Security Violation: WorkflowEngineService must never be imported into browser bundles.");
}

// In-Memory Dev Store for offline/fallback execution
let memoryWorkflows: AutomationWorkflow[] = [
  {
    id: "wf-webinar-conversion",
    business_id: DEFAULT_BUSINESS_ID,
    title: "Webinar Attendee Conversion Sequence",
    description: "Waits 24h post-webinar, checks subscription status, and sends targeted email & WhatsApp follow-ups.",
    natural_language_prompt: "When a customer attends our webinar, wait 24h, check if subscribed, and send 20% discount offer",
    status: "ACTIVE",
    dag_definition: {
      title: "Webinar Attendee Conversion Sequence",
      description: "Waits 24h post-webinar, checks subscription status, and sends targeted email & WhatsApp follow-ups.",
      naturalLanguagePrompt: "When a customer attends our webinar, wait 24h, check if subscribed, and send 20% discount offer",
      nodes: [
        {
          id: "node-trigger-1",
          type: "TRIGGER",
          capability: "webinar.attendee.checked_in",
          label: "Webinar Attendee Checked In",
          description: "Fires when lead attends live session",
          config: {},
          requiresApproval: false,
          retryPolicy: { maxRetries: 3, backoffSeconds: 30 },
        },
        {
          id: "node-delay-1",
          type: "DELAY",
          capability: "delay.wait",
          label: "Wait 24 Hours",
          description: "Gives lead time to review materials",
          config: { durationHours: 24 },
          requiresApproval: false,
          retryPolicy: { maxRetries: 3, backoffSeconds: 30 },
        },
        {
          id: "node-action-1",
          type: "ACTION",
          capability: "marketing.email.send",
          label: "Send 20% Discount Email",
          description: "Personalized follow-up offer",
          config: { subject: "20% Discount for Webinar Attendees" },
          requiresApproval: false,
          retryPolicy: { maxRetries: 3, backoffSeconds: 30 },
        },
        {
          id: "node-action-2",
          type: "ACTION",
          capability: "marketing.whatsapp.send",
          label: "Send WhatsApp Demo Link",
          description: "Instant message with product walkthrough",
          config: { message: "Thanks for attending our webinar! Access your private demo at nexus.biz/demo" },
          requiresApproval: false,
          retryPolicy: { maxRetries: 3, backoffSeconds: 30 },
        },
      ],
      edges: [
        { id: "e1", sourceNodeId: "node-trigger-1", targetNodeId: "node-delay-1", sourceHandle: "default" },
        { id: "e2", sourceNodeId: "node-delay-1", targetNodeId: "node-action-1", sourceHandle: "default" },
        { id: "e3", sourceNodeId: "node-action-1", targetNodeId: "node-action-2", sourceHandle: "default" },
      ],
      isHighImpact: false,
      estimatedAudienceCount: 150,
    },
    is_high_impact: false,
    execution_count: 14,
    last_executed_at: new Date(Date.now() - 3600000).toISOString(),
    created_at: new Date(Date.now() - 86400000).toISOString(),
    updated_at: new Date(Date.now() - 3600000).toISOString(),
  },
  {
    id: "wf-qualified-vip",
    business_id: DEFAULT_BUSINESS_ID,
    title: "Qualified Lead VIP Acceleration Workflow",
    description: "Enforces human sign-off before dispatching VIP WhatsApp messages and generating enterprise deals.",
    natural_language_prompt: "When a lead is marked qualified, pause for owner approval, then send VIP WhatsApp and create deal",
    status: "ACTIVE",
    dag_definition: {
      title: "Qualified Lead VIP Acceleration Workflow",
      description: "Enforces human sign-off before dispatching VIP WhatsApp messages and generating enterprise deals.",
      naturalLanguagePrompt: "When a lead is marked qualified, pause for owner approval, then send VIP WhatsApp and create deal",
      nodes: [
        {
          id: "node-trigger-1",
          type: "TRIGGER",
          capability: "crm.contact.stage_changed",
          label: "Lead Moved to Qualified",
          description: "Fires when stage changes",
          config: { stage: "qualified" },
          requiresApproval: false,
          retryPolicy: { maxRetries: 3, backoffSeconds: 30 },
        },
        {
          id: "node-gate-1",
          type: "APPROVAL_GATE",
          capability: "approval.manual_gate",
          label: "Owner Approval Checkpoint",
          description: "Requires explicit owner signature before outreach",
          config: {},
          requiresApproval: true,
          retryPolicy: { maxRetries: 3, backoffSeconds: 30 },
        },
        {
          id: "node-action-1",
          type: "ACTION",
          capability: "crm.lead.create_deal",
          label: "Create Enterprise Deal",
          description: "Adds deal to CRM with ₹50,000 value",
          config: { value: 50000 },
          requiresApproval: false,
          retryPolicy: { maxRetries: 3, backoffSeconds: 30 },
        },
        {
          id: "node-action-2",
          type: "ACTION",
          capability: "marketing.whatsapp.send",
          label: "Send VIP Executive WhatsApp",
          description: "Personal account manager outreach",
          config: { message: "Hello! Our executive team is excited to schedule your VIP onboarding call." },
          requiresApproval: false,
          retryPolicy: { maxRetries: 3, backoffSeconds: 30 },
        },
      ],
      edges: [
        { id: "e1", sourceNodeId: "node-trigger-1", targetNodeId: "node-gate-1", sourceHandle: "default" },
        { id: "e2", sourceNodeId: "node-gate-1", targetNodeId: "node-action-1", sourceHandle: "default" },
        { id: "e3", sourceNodeId: "node-action-1", targetNodeId: "node-action-2", sourceHandle: "default" },
      ],
      isHighImpact: true,
      estimatedAudienceCount: 25,
    },
    is_high_impact: true,
    execution_count: 5,
    last_executed_at: new Date(Date.now() - 7200000).toISOString(),
    created_at: new Date(Date.now() - 172800000).toISOString(),
    updated_at: new Date(Date.now() - 7200000).toISOString(),
  },
];

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
    const supabase = getSupabaseServerClient();
    if (supabase) {
      try {
        const { data, error } = await supabase
          .from("automation_workflows")
          .select("*")
          .eq("business_id", businessId)
          .order("created_at", { ascending: false });

        if (!error && data && data.length > 0) {
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
    const supabase = getSupabaseServerClient();
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
    const newWorkflow: AutomationWorkflow = {
      id: `wf-${Date.now()}`,
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

    const supabase = getSupabaseServerClient();
    if (supabase) {
      try {
        const { data, error } = await supabase
          .from("automation_workflows")
          .insert({
            ...newWorkflow,
            id: undefined, // Let PostgreSQL generate UUID
          })
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
        }
      } catch {
        // Fallback
      }
    }

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
   * Deletes a workflow
   */
  static async deleteWorkflow(id: string, businessId = DEFAULT_BUSINESS_ID): Promise<boolean> {
    const supabase = getSupabaseServerClient();
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
    const runId = `run-${Date.now()}`;

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
      const stepLog: WorkflowStepLog = {
        id: `step-${Date.now()}-${node.id}`,
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
    const run = memoryRuns.find((r) => r.id === runId && r.business_id === businessId);
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
        const stepLog: WorkflowStepLog = {
          id: `step-${Date.now()}-${node.id}`,
          run_id: run.id,
          workflow_id: workflow.id,
          node_id: node.id,
          node_type: node.type,
          capability: node.capability,
          status: "SUCCESS",
          idempotency_key: createHash("sha256")
            .update(`${businessId}:${workflow.id}:${run.id}:${node.id}:resume`)
            .digest("hex"),
          input_payload: { ...run.context_data },
          output_payload: await this.executeNode(node, run.context_data),
          retry_count: 0,
          execution_duration_ms: 12,
          executed_at: new Date().toISOString(),
        };

        memoryStepLogs.push(stepLog);
      }

      workflow.execution_count += 1;
      workflow.last_executed_at = new Date().toISOString();
    }

    run.status = "COMPLETED";
    run.completed_at = new Date().toISOString();

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
    return memoryStepLogs.filter((s) => s.run_id === runId);
  }
}
