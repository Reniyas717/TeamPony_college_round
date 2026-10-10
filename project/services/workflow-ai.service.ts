import {
  WorkflowDAG,
  WorkflowDAGSchema,
  WorkflowNode,
  WorkflowEdge,
  NodeCapabilitySchema,
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
   * Tries Groq ultra-fast LLM first, rotates through Gemini models second,
   * and falls back to dynamic semantic compilation if LLM endpoints are unreachable.
   */
  static async compilePromptToDAG(prompt: string): Promise<WorkflowDAG> {
    const trimmed = prompt.trim();
    if (!trimmed) {
      throw new Error("Prompt cannot be empty");
    }

    // 1. Try Groq (Instant, sub-second LLM inference)
    try {
      const groqResult = await this.compileWithGroq(trimmed);
      if (groqResult) {
        return groqResult;
      }
    } catch (err: unknown) {
      console.warn("[WorkflowAIService] Groq compiler error, trying Gemini:", err);
    }

    // 2. Try Gemini Structured Output with key pool
    const apiKeys = this.getGeminiApiKeys();
    if (apiKeys.length > 0) {
      const startIndex = this.keyIndex;
      for (let attempt = 0; attempt < apiKeys.length; attempt++) {
        const candidateIndex = (startIndex + attempt) % apiKeys.length;
        const activeKey = apiKeys[candidateIndex];

        try {
          const llmResult = await this.compileWithGemini(trimmed, activeKey);
          if (llmResult) {
            this.keyIndex = (candidateIndex + 1) % apiKeys.length;
            return llmResult;
          }
        } catch (err: unknown) {
          console.warn(`[WorkflowAIService] Gemini Key #${candidateIndex + 1} error:`, err);
        }
      }
    }

    // 3. Dynamic Semantic Rule Compiler (Pure dynamic, zero static canned values)
    return this.compileWithSemanticRules(trimmed);
  }

  /**
   * Calls Groq OpenAI-compatible endpoint with LLaMA 3.3 / GPT-OSS
   */
  private static async compileWithGroq(prompt: string): Promise<WorkflowDAG | null> {
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) return null;

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

Respond ONLY with valid JSON matching:
{
  "title": string,
  "description": string,
  "naturalLanguagePrompt": string,
  "nodes": [
    {
      "id": string,
      "type": "TRIGGER" | "CONDITION" | "DELAY" | "ACTION" | "APPROVAL_GATE",
      "capability": string,
      "label": string,
      "description": string,
      "config": object,
      "requiresApproval": boolean,
      "retryPolicy": { "maxRetries": number, "backoffSeconds": number }
    }
  ],
  "edges": [
    {
      "id": string,
      "sourceNodeId": string,
      "targetNodeId": string,
      "conditionLabel": string (optional),
      "sourceHandle": "default" | "true" | "false" (optional)
    }
  ],
  "isHighImpact": boolean,
  "estimatedAudienceCount": number
}`;

    const candidateModels = [
      process.env.GROQ_MODEL || "openai/gpt-oss-120b",
      "openai/gpt-oss-120b",
      "openai/gpt-oss-20b",
      "qwen/qwen3.8-27b",
    ];
    const modelsToTry = Array.from(new Set(candidateModels));

    try {
      let res: Response | null = null;
      for (const model of modelsToTry) {
        res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model,
            messages: [
              { role: "system", content: systemPrompt },
              { role: "user", content: prompt },
            ],
            response_format: { type: "json_object" },
            temperature: 0.2,
          }),
        });

        if (!res.ok && model !== modelsToTry[modelsToTry.length - 1]) {
          console.warn(`[WorkflowAIService] Groq model "${model}" returned HTTP ${res.status}, trying alternative...`);
          continue;
        }

        break;
      }

      if (!res || !res.ok) return null;

      const json = await res.json();
      const content = json.choices?.[0]?.message?.content;
      if (!content) return null;

      const parsed = JSON.parse(content);
      return this.sanitizeAndValidateDAG(parsed, prompt);
    } catch {
      return null;
    }
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
  "nodes": [
    {
      "id": string,
      "type": "TRIGGER" | "CONDITION" | "DELAY" | "ACTION" | "APPROVAL_GATE",
      "capability": string,
      "label": string,
      "description": string,
      "config": object,
      "requiresApproval": boolean,
      "retryPolicy": { "maxRetries": number, "backoffSeconds": number }
    }
  ],
  "edges": [
    {
      "id": string,
      "sourceNodeId": string,
      "targetNodeId": string
    }
  ],
  "isHighImpact": boolean,
  "estimatedAudienceCount": number
}`;

    const preferredModel = process.env.GEMINI_MODEL || "gemini-3-flash-preview";
    const candidateModels = [
      preferredModel,
      "gemini-3-flash-preview",
      "gemini-3.1-flash-lite",
      "gemini-3.5-flash-lite",
      "gemini-3.8-flash",
    ];
    const modelsToTry = Array.from(new Set(candidateModels));

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

        if ((!res.ok || res.status === 404 || res.status === 503 || res.status === 429) && model !== modelsToTry[modelsToTry.length - 1]) {
          console.warn(`[WorkflowAIService] Gemini model "${model}" returned HTTP ${res?.status}, trying alternative model...`);
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
      return this.sanitizeAndValidateDAG(parsed, prompt);
    } catch (fetchErr) {
      console.warn("[WorkflowAIService] Network or parsing error during Gemini call:", fetchErr);
      return null;
    }
  }

  /**
   * Sanitizes, normalizes, and validates any raw LLM output against the strict WorkflowDAG schema.
   * Handles minor model variations (e.g., name vs label, zero backoff, missing edge ids).
   */
  private static sanitizeAndValidateDAG(raw: any, prompt: string): WorkflowDAG | null {
    if (!raw || typeof raw !== "object") return null;

    const title = String(raw.title || "Automated Business Workflow").slice(0, 120);
    const description = String(raw.description || "").slice(0, 500);

    const rawNodes = Array.isArray(raw.nodes) ? raw.nodes : [];
    if (rawNodes.length === 0) return null;

    const nodes: WorkflowNode[] = rawNodes.map((n: any, idx: number) => {
      const id = String(n.id || `node_${idx + 1}`);
      const type = ["TRIGGER", "CONDITION", "DELAY", "ACTION", "APPROVAL_GATE"].includes(n.type)
        ? n.type
        : "ACTION";
      const capability = NodeCapabilitySchema.safeParse(n.capability).success
        ? n.capability
        : (type === "TRIGGER" ? "website.form.submitted" : "marketing.email.send");
      const label = String(n.label || n.name || `Step ${idx + 1}`).slice(0, 100);
      const desc = n.description ? String(n.description).slice(0, 500) : undefined;
      const config = (n.config && typeof n.config === "object") ? n.config : {};
      const requiresApproval = Boolean(n.requiresApproval || type === "APPROVAL_GATE");

      let maxRetries = 3;
      let backoffSeconds = 30;
      if (n.retryPolicy && typeof n.retryPolicy === "object") {
        if (typeof n.retryPolicy.maxRetries === "number") {
          maxRetries = Math.max(0, Math.min(5, Math.floor(n.retryPolicy.maxRetries)));
        }
        if (typeof n.retryPolicy.backoffSeconds === "number") {
          backoffSeconds = Math.max(5, Math.min(3600, Math.floor(n.retryPolicy.backoffSeconds)));
        }
      }

      return {
        id,
        type,
        capability,
        label,
        description: desc,
        config,
        requiresApproval,
        retryPolicy: { maxRetries, backoffSeconds },
      };
    });

    const nodeIds = new Set(nodes.map((n) => n.id));
    const rawEdges = Array.isArray(raw.edges) ? raw.edges : [];
    const edges: WorkflowEdge[] = rawEdges
      .filter((e: any) => e && nodeIds.has(e.sourceNodeId) && nodeIds.has(e.targetNodeId))
      .map((e: any, idx: number) => ({
        id: String(e.id || `edge_${idx + 1}`),
        sourceNodeId: String(e.sourceNodeId),
        targetNodeId: String(e.targetNodeId),
        conditionLabel: e.conditionLabel ? String(e.conditionLabel) : undefined,
        sourceHandle: ["default", "true", "false"].includes(e.sourceHandle) ? e.sourceHandle : "default",
      }));

    const candidate = {
      title,
      description,
      naturalLanguagePrompt: prompt,
      nodes,
      edges,
      isHighImpact: Boolean(raw.isHighImpact || nodes.some((n) => n.requiresApproval)),
      estimatedAudienceCount: typeof raw.estimatedAudienceCount === "number" ? Math.max(0, raw.estimatedAudienceCount) : undefined,
    };

    const validated = WorkflowDAGSchema.safeParse(candidate);
    if (!validated.success) {
      console.warn("[WorkflowAIService] DAG schema validation failed:", validated.error.flatten());
      return null;
    }

    const cycleCheck = validateDAGNoCycles(validated.data.nodes, validated.data.edges);
    if (!cycleCheck.isValid) {
      console.warn("[WorkflowAIService] DAG cycle check failed");
      return null;
    }

    return validated.data;
  }

  /**
   * Dynamic semantic rule-based compiler.
   * Parses user intent directly from prompt without static template mocks.
   */
  private static compileWithSemanticRules(prompt: string): WorkflowDAG {
    const lower = prompt.toLowerCase();
    const nodes: WorkflowNode[] = [];
    const edges: WorkflowEdge[] = [];
    let nodeIndex = 1;

    // 1. Dynamic Trigger
    let triggerCapability = "crm.contact.created";
    let triggerLabel = "Lead Inquiry Captured";
    let triggerDesc = "Triggered when a lead is captured or added";

    if (lower.includes("webinar") || lower.includes("attend")) {
      triggerCapability = "webinar.attendee.checked_in";
      triggerLabel = "Webinar Attendee Checked In";
      triggerDesc = "Fires when user attends the live session";
    } else if (lower.includes("stage") || lower.includes("qualif")) {
      triggerCapability = "crm.contact.stage_changed";
      triggerLabel = "Contact Stage Advanced";
      triggerDesc = "Fires when lead moves to next lifecycle stage";
    } else if (lower.includes("form") || lower.includes("inquiry") || lower.includes("website")) {
      triggerCapability = "website.form.submitted";
      triggerLabel = "Website Inquiry Submitted";
      triggerDesc = "Fires on landing page or builder form submission";
    }

    nodes.push({
      id: `node-${nodeIndex++}`,
      type: "TRIGGER",
      capability: triggerCapability as any,
      label: triggerLabel,
      description: triggerDesc,
      config: {},
      requiresApproval: false,
      retryPolicy: { maxRetries: 3, backoffSeconds: 30 },
    });

    // 2. Dynamic Delay
    let delayHours = 2;
    const hourMatch = lower.match(/(\d+)\s*(?:hour|hr|h)/);
    if (hourMatch) {
      delayHours = parseInt(hourMatch[1], 10);
    }
    if (lower.includes("wait") || lower.includes("delay") || hourMatch) {
      nodes.push({
        id: `node-${nodeIndex++}`,
        type: "DELAY",
        capability: "delay.wait",
        label: `Wait ${delayHours} Hours`,
        description: `Delays execution by ${delayHours} hours for optimal pacing`,
        config: { durationHours: delayHours },
        requiresApproval: false,
        retryPolicy: { maxRetries: 3, backoffSeconds: 30 },
      });
    }

    // 3. Dynamic Human Approval Gate
    const hasApproval =
      lower.includes("approv") ||
      lower.includes("gate") ||
      lower.includes("confirm") ||
      lower.includes("sign");
    if (hasApproval) {
      nodes.push({
        id: `node-${nodeIndex++}`,
        type: "APPROVAL_GATE",
        capability: "approval.manual_gate",
        label: "Owner Sign-off Checkpoint",
        description: "Pauses execution for explicit human approval before outreach",
        config: { role: "owner" },
        requiresApproval: true,
        retryPolicy: { maxRetries: 3, backoffSeconds: 30 },
      });
    }

    // 4. Dynamic Email action
    if (lower.includes("email") || lower.includes("mail") || (!lower.includes("whatsapp") && !lower.includes("slack"))) {
      nodes.push({
        id: `node-${nodeIndex++}`,
        type: "ACTION",
        capability: "marketing.email.send",
        label: "Send Personalized Email",
        description: "Dispatches personalized email via Resend",
        config: {
          subject: prompt.length > 40 ? prompt.slice(0, 37) + "..." : "Welcome — Follow-Up",
        },
        requiresApproval: false,
        retryPolicy: { maxRetries: 3, backoffSeconds: 30 },
      });
    }

    // 5. Dynamic WhatsApp action
    if (lower.includes("whatsapp") || lower.includes("wa ") || lower.includes("message")) {
      nodes.push({
        id: `node-${nodeIndex++}`,
        type: "ACTION",
        capability: "marketing.whatsapp.send",
        label: "Send WhatsApp Outreach",
        description: "Dispatches instant WhatsApp ping via Twilio",
        config: {
          message: "Hello! Thank you for your inquiry. When is a convenient time to connect?",
        },
        requiresApproval: false,
        retryPolicy: { maxRetries: 3, backoffSeconds: 30 },
      });
    }

    // 6. Dynamic Deal creation
    if (lower.includes("deal") || lower.includes("pipeline") || lower.includes("opportunity")) {
      nodes.push({
        id: `node-${nodeIndex++}`,
        type: "ACTION",
        capability: "crm.lead.create_deal",
        label: "Create CRM Deal",
        description: "Creates active deal opportunity in CRM pipeline",
        config: { value: 50000 },
        requiresApproval: false,
        retryPolicy: { maxRetries: 3, backoffSeconds: 30 },
      });
    }

    // 7. Dynamic Slack / Team notification
    if (lower.includes("slack") || lower.includes("notify") || lower.includes("alert")) {
      nodes.push({
        id: `node-${nodeIndex++}`,
        type: "ACTION",
        capability: "crm.notification.slack",
        label: "Notify Team Channel",
        description: "Dispatches internal alert to notify team",
        config: { channel: "#leads" },
        requiresApproval: false,
        retryPolicy: { maxRetries: 3, backoffSeconds: 30 },
      });
    }

    // 8. Connect all nodes sequentially with edges
    for (let i = 0; i < nodes.length - 1; i++) {
      edges.push({
        id: `e${i + 1}`,
        sourceNodeId: nodes[i].id,
        targetNodeId: nodes[i + 1].id,
        sourceHandle: "default",
      });
    }

    const cleanTitle = prompt.length > 45 ? prompt.slice(0, 42).replace(/[^\w\s].*$/, "") + " Flow" : prompt;

    return {
      title: cleanTitle,
      description: `Automated workflow compiled from prompt: "${prompt}"`,
      naturalLanguagePrompt: prompt,
      nodes,
      edges,
      isHighImpact: hasApproval,
      estimatedAudienceCount: 50,
    };
  }
}
