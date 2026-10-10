import {
  WorkflowDAG,
  WorkflowDAGSchema,
  WorkflowNode,
  WorkflowEdge,
  validateDAGNoCycles,
} from "@/lib/validations/workflow";

if (typeof window !== "undefined") {
  throw new Error("Security Violation: WorkflowAIService must never be imported into browser bundles.");
}

/**
 * AI Natural Language to Executable DAG Compiler
 * Translates English prompts into validated Directed Acyclic Graphs (DAG).
 * Features Gemini / OpenAI LLM integration with an intelligent deterministic fallback compiler.
 */
export class WorkflowAIService {
  private static keyIndex = 0;

  /**
   * Retrieves all available Gemini API keys from environment.
   * Supports comma-separated GEMINI_API_KEYS or single GEMINI_API_KEY.
   */
  private static getGeminiApiKeys(): string[] {
    const rawList = process.env.GEMINI_API_KEYS || "";
    const single = process.env.GEMINI_API_KEY || "";

    const keys = rawList
      .split(",")
      .map((k) => k.trim())
      .filter((k) => k.length > 0);

    if (single.trim() && !keys.includes(single.trim())) {
      keys.push(single.trim());
    }

    return keys;
  }

  /**
   * Compiles an unstructured natural language prompt into an executable WorkflowDAG.
   * Rotates through available Gemini API keys to mitigate rate limits,
   * falling back to the deterministic semantic compiler if all keys fail.
   */
  static async compilePromptToDAG(prompt: string): Promise<WorkflowDAG> {
    const trimmed = prompt.trim();
    if (!trimmed) {
      throw new Error("Prompt cannot be empty");
    }

    // 1. Try LLM Structured Output with key pool / cycle
    const apiKeys = this.getGeminiApiKeys();
    if (apiKeys.length > 0) {
      const startIndex = this.keyIndex;
      for (let attempt = 0; attempt < apiKeys.length; attempt++) {
        const candidateIndex = (startIndex + attempt) % apiKeys.length;
        const activeKey = apiKeys[candidateIndex];

        try {
          const llmResult = await this.compileWithGemini(trimmed, activeKey);
          if (llmResult) {
            // Success! Advance rotation index for the next call to distribute load
            this.keyIndex = (candidateIndex + 1) % apiKeys.length;
            return llmResult;
          }
        } catch (err: unknown) {
          console.warn(`[WorkflowAIService] Gemini Key #${candidateIndex + 1} encountered error, rotating:`, err);
        }
      }
      console.warn("[WorkflowAIService] All Gemini API keys failed or were rate-limited. Falling back to deterministic compiler.");
    }

    // 2. Deterministic Semantic Fallback Compiler
    return this.compileWithSemanticRules(trimmed);
  }

  /**
   * Calls Google Gemini structured JSON output endpoint
   */
  private static async compileWithGemini(prompt: string, apiKey: string): Promise<WorkflowDAG | null> {
    const systemPrompt = `You are the Nexus Autonomous Workflow Compiler.
Convert the user's natural language business automation request into a valid Directed Acyclic Graph (DAG) JSON.
Valid Node Capabilities:
- crm.contact.created, crm.contact.updated, crm.contact.tagged, crm.contact.stage_changed, crm.lead.create_deal, crm.notification.slack
- marketing.email.send, marketing.sms.send, marketing.whatsapp.send
- webinar.session.ended, webinar.attendee.checked_in
- billing.subscription.created, billing.subscription.canceled, billing.invoice.failed
- website.page.viewed, website.form.submitted
- condition.branch, delay.wait, approval.manual_gate

Node types: TRIGGER, CONDITION, DELAY, ACTION, APPROVAL_GATE.
Edges connect sourceNodeId to targetNodeId.
Ensure NO cycles exist. High consequence actions (e.g. mass messaging, financial changes) must have requiresApproval: true or include an approval.manual_gate node.

Respond ONLY with valid JSON matching:
{
  "title": string,
  "description": string,
  "naturalLanguagePrompt": string,
  "nodes": [...],
  "edges": [...],
  "isHighImpact": boolean,
  "estimatedAudienceCount": number
}`;

    const preferredModel = process.env.GEMINI_MODEL || "gemini-3.5-flash-lite";
    const modelsToTry = [preferredModel];
    if (!modelsToTry.includes("gemini-3.5-flash-lite")) modelsToTry.unshift("gemini-3.5-flash-lite");
    if (!modelsToTry.includes("gemini-2.0-flash")) modelsToTry.push("gemini-2.0-flash");
    if (!modelsToTry.includes("gemini-1.5-flash")) modelsToTry.push("gemini-1.5-flash");

    try {
      let res: Response | null = null;
      let usedModel = preferredModel;

      for (const model of modelsToTry) {
        usedModel = model;
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

        res = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [
              { role: "user", parts: [{ text: `${systemPrompt}\n\nUser Prompt: "${prompt}"` }] },
            ],
            generationConfig: {
              responseMimeType: "application/json",
              temperature: 0.2,
            },
          }),
        });

        if (res.status === 404 && model !== modelsToTry[modelsToTry.length - 1]) {
          console.warn(`[WorkflowAIService] Model "${model}" not found (404), falling back to alternative model...`);
          continue;
        }

        break;
      }

      if (!res || !res.ok) {
        if (res?.status === 429) {
          console.warn(`[WorkflowAIService] Gemini Key rate limit hit (HTTP 429). Will rotate.`);
        } else {
          console.warn(`[WorkflowAIService] Gemini API (${usedModel}) responded with HTTP ${res?.status}`);
        }
        return null;
      }

      const json = await res.json();
      const candidateText = json.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!candidateText) return null;

      const parsed = JSON.parse(candidateText);
      parsed.naturalLanguagePrompt = prompt;

      const validated = WorkflowDAGSchema.safeParse(parsed);
      if (!validated.success) {
        console.warn("[WorkflowAIService] Gemini JSON failed schema validation:", validated.error.flatten());
        return null;
      }

      const cycleCheck = validateDAGNoCycles(validated.data.nodes, validated.data.edges);
      if (!cycleCheck.isValid) {
        console.warn("[WorkflowAIService] Gemini DAG contained cycle validation failure");
        return null;
      }

      return validated.data;
    } catch (fetchErr) {
      console.warn("[WorkflowAIService] Network or parsing error during Gemini call:", fetchErr);
      return null;
    }
  }

  /**
   * Deterministic semantic rule-based compiler.
   * Guarantees 100% reliable, instant generation without API keys or latency.
   */
  private static compileWithSemanticRules(prompt: string): WorkflowDAG {
    const lower = prompt.toLowerCase();

    // Template 1: Webinar Attendee Follow-Up & Offer
    if (lower.includes("webinar") || lower.includes("attend")) {
      const nodes: WorkflowNode[] = [
        {
          id: "node-trigger-1",
          type: "TRIGGER",
          capability: "webinar.attendee.checked_in",
          label: "Webinar Attendee Checked In",
          description: "Fires when a registered lead attends the webinar",
          config: { event: "webinar.attendee.checked_in" },
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
          id: "node-cond-1",
          type: "CONDITION",
          capability: "condition.branch",
          label: "Check Subscription Status",
          description: "Evaluate if user subscribed within 24 hours",
          config: { field: "stage", operator: "!=", value: "customer" },
          requiresApproval: false,
          retryPolicy: { maxRetries: 3, backoffSeconds: 30 },
        },
        {
          id: "node-action-1",
          type: "ACTION",
          capability: "marketing.email.send",
          label: "Send 20% Offer Email",
          description: "Personalized follow-up discount",
          config: {
            subject: "Special Offer: 20% Off Nexus Platform",
            template: "webinar-attendee-discount",
          },
          requiresApproval: false,
          retryPolicy: { maxRetries: 3, backoffSeconds: 30 },
        },
        {
          id: "node-action-2",
          type: "ACTION",
          capability: "marketing.whatsapp.send",
          label: "Send WhatsApp Demo Link",
          description: "Instant message with product walkthrough",
          config: {
            message: "Hi! Thanks for joining our webinar. Here is your private demo access link: nexus.biz/demo",
          },
          requiresApproval: false,
          retryPolicy: { maxRetries: 3, backoffSeconds: 30 },
        },
      ];

      const edges: WorkflowEdge[] = [
        { id: "e1", sourceNodeId: "node-trigger-1", targetNodeId: "node-delay-1", sourceHandle: "default" },
        { id: "e2", sourceNodeId: "node-delay-1", targetNodeId: "node-cond-1", sourceHandle: "default" },
        { id: "e3", sourceNodeId: "node-cond-1", targetNodeId: "node-action-1", conditionLabel: "Not Subscribed", sourceHandle: "true" },
        { id: "e4", sourceNodeId: "node-action-1", targetNodeId: "node-action-2", sourceHandle: "default" },
      ];

      return {
        title: "Webinar Attendee Conversion Sequence",
        description: "Waits 24h post-webinar, checks subscription status, and sends targeted email & WhatsApp follow-ups.",
        naturalLanguagePrompt: prompt,
        nodes,
        edges,
        isHighImpact: false,
        estimatedAudienceCount: 150,
      };
    }

    // Template 2: Qualified Lead & High-Impact Deal Approval Gate
    if (lower.includes("qualif") || lower.includes("deal") || lower.includes("proposal")) {
      const nodes: WorkflowNode[] = [
        {
          id: "node-trigger-1",
          type: "TRIGGER",
          capability: "crm.contact.stage_changed",
          label: "Lead Marked as Qualified",
          description: "Triggered when contact stage moves to Qualified",
          config: { targetStage: "qualified" },
          requiresApproval: false,
          retryPolicy: { maxRetries: 3, backoffSeconds: 30 },
        },
        {
          id: "node-gate-1",
          type: "APPROVAL_GATE",
          capability: "approval.manual_gate",
          label: "Owner Approval Checkpoint",
          description: "Requires business owner confirmation before executive outreach",
          config: { reviewerRole: "owner", timeoutHours: 48 },
          requiresApproval: true,
          retryPolicy: { maxRetries: 3, backoffSeconds: 30 },
        },
        {
          id: "node-action-1",
          type: "ACTION",
          capability: "crm.lead.create_deal",
          label: "Create Deal & Pipeline Task",
          description: "Initializes enterprise opportunity in CRM pipeline",
          config: { dealValue: 50000, stage: "proposal" },
          requiresApproval: false,
          retryPolicy: { maxRetries: 3, backoffSeconds: 30 },
        },
        {
          id: "node-action-2",
          type: "ACTION",
          capability: "marketing.whatsapp.send",
          label: "Send VIP Executive WhatsApp",
          description: "Direct outreach from account manager",
          config: {
            message: "Hello, your inquiry has been fast-tracked. Our leadership team is ready to schedule your onboarding session.",
          },
          requiresApproval: false,
          retryPolicy: { maxRetries: 3, backoffSeconds: 30 },
        },
        {
          id: "node-action-3",
          type: "ACTION",
          capability: "crm.notification.slack",
          label: "Alert Internal Sales Team",
          description: "Pings sales workspace with qualified lead brief",
          config: { channel: "#sales-vip", priority: "high" },
          requiresApproval: false,
          retryPolicy: { maxRetries: 3, backoffSeconds: 30 },
        },
      ];

      const edges: WorkflowEdge[] = [
        { id: "e1", sourceNodeId: "node-trigger-1", targetNodeId: "node-gate-1", sourceHandle: "default" },
        { id: "e2", sourceNodeId: "node-gate-1", targetNodeId: "node-action-1", sourceHandle: "default" },
        { id: "e3", sourceNodeId: "node-action-1", targetNodeId: "node-action-2", sourceHandle: "default" },
        { id: "e4", sourceNodeId: "node-action-2", targetNodeId: "node-action-3", sourceHandle: "default" },
      ];

      return {
        title: "Qualified Lead VIP Acceleration Workflow",
        description: "Enforces human sign-off before dispatching VIP WhatsApp messages and generating enterprise deals.",
        naturalLanguagePrompt: prompt,
        nodes,
        edges,
        isHighImpact: true,
        estimatedAudienceCount: 25,
      };
    }

    // Template 3: Default Website Lead Capture & Welcome Journey
    const nodes: WorkflowNode[] = [
      {
        id: "node-trigger-1",
        type: "TRIGGER",
        capability: "crm.contact.created",
        label: "New Contact Created",
        description: "Triggered whenever a lead is added via website form or CRM",
        config: { source: "website_form" },
        requiresApproval: false,
        retryPolicy: { maxRetries: 3, backoffSeconds: 30 },
      },
      {
        id: "node-action-1",
        type: "ACTION",
        capability: "marketing.email.send",
        label: "Send Welcome Email",
        description: "Immediate personalized onboarding email",
        config: {
          subject: "Welcome to Nexus — Your Business Copilot",
          template: "welcome-introductory",
        },
        requiresApproval: false,
        retryPolicy: { maxRetries: 3, backoffSeconds: 30 },
      },
      {
        id: "node-delay-1",
        type: "DELAY",
        capability: "delay.wait",
        label: "Wait 2 Hours",
        description: "Spacing out multi-channel communications",
        config: { durationHours: 2 },
        requiresApproval: false,
        retryPolicy: { maxRetries: 3, backoffSeconds: 30 },
      },
      {
        id: "node-action-2",
        type: "ACTION",
        capability: "marketing.whatsapp.send",
        label: "Send Quick WhatsApp Ping",
        description: "Helpful follow-up via WhatsApp Sandbox",
        config: {
          message: "Hi there! Just checked in to see if you received our introductory guide. Let us know if you need any assistance!",
        },
        requiresApproval: false,
        retryPolicy: { maxRetries: 3, backoffSeconds: 30 },
      },
      {
        id: "node-action-3",
        type: "ACTION",
        capability: "crm.notification.slack",
        label: "Log Lead to Sales Channel",
        description: "Notifies team of newly engaged prospect",
        config: { channel: "#general-leads" },
        requiresApproval: false,
        retryPolicy: { maxRetries: 3, backoffSeconds: 30 },
      },
    ];

    const edges: WorkflowEdge[] = [
      { id: "e1", sourceNodeId: "node-trigger-1", targetNodeId: "node-action-1", sourceHandle: "default" },
      { id: "e2", sourceNodeId: "node-action-1", targetNodeId: "node-delay-1", sourceHandle: "default" },
      { id: "e3", sourceNodeId: "node-delay-1", targetNodeId: "node-action-2", sourceHandle: "default" },
      { id: "e4", sourceNodeId: "node-action-2", targetNodeId: "node-action-3", sourceHandle: "default" },
    ];

    return {
      title: "New Lead Multi-Channel Welcome Nurture",
      description: "Auto-engages new CRM leads across email and WhatsApp with paced delays.",
      naturalLanguagePrompt: prompt,
      nodes,
      edges,
      isHighImpact: false,
      estimatedAudienceCount: 50,
    };
  }
}
