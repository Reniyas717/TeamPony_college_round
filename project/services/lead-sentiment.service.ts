if (typeof window !== "undefined") {
  throw new Error("Security Violation: LeadSentimentService must never be imported into browser bundles.");
}

export interface LeadSentimentResult {
  decision: "YES" | "NO";
  isChurned: boolean;
  targetStage: "qualified" | "churned";
  reasoning: string;
  confidence: number;
  engine: "groq" | "gemini" | "deterministic";
}

/**
 * Intelligent Lead Sentiment Decision Engine
 * Uses Groq (ultra-fast sub-second LLM) and Gemini AI to classify inbound customer replies
 * (from Email, WhatsApp, SMS, or portal) into:
 * - YES (Interested / Retain / Qualify)
 * - NO (Declined / Opt-out / Churn)
 * Provides an infallible deterministic fallback if AI endpoints are unreachable.
 */
export class LeadSentimentService {
  /**
   * Evaluates inbound customer reply text using Groq -> Gemini -> Deterministic rules.
   */
  static async evaluateSentiment(responseText: string): Promise<LeadSentimentResult> {
    const text = responseText.trim();
    if (!text) {
      return {
        decision: "NO",
        isChurned: true,
        targetStage: "churned",
        reasoning: "Empty response text received",
        confidence: 1.0,
        engine: "deterministic",
      };
    }

    // 1. Try Groq LLM (High-speed inference, typically < 500ms)
    try {
      const groqResult = await this.evaluateWithGroq(text);
      if (groqResult) {
        return groqResult;
      }
    } catch (err) {
      console.warn("[LeadSentimentService] Groq inference failed, trying Gemini:", err);
    }

    // 2. Try Gemini LLM
    try {
      const geminiResult = await this.evaluateWithGemini(text);
      if (geminiResult) {
        return geminiResult;
      }
    } catch (err) {
      console.warn("[LeadSentimentService] Gemini inference failed, falling back to deterministic:", err);
    }

    // 3. Deterministic Fallback Rules (Guarantees zero downtime and zero failure)
    return this.evaluateWithDeterministicRules(text);
  }

  /**
   * Calls Groq OpenAI-compatible Chat Completion endpoint
   */
  private static async evaluateWithGroq(text: string): Promise<LeadSentimentResult | null> {
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) return null;

    const systemPrompt = `You are an AI Lead Sentiment Analyzer for an enterprise CRM.
Analyze the customer's inbound message to decide if the lead is interested in speaking/buying (YES) or declining/opt-out/churning (NO).
Rules:
- If the customer wants a call, demo, pricing, info, or expresses positive interest (e.g. "yes", "sure", "sounds good", "let's talk tomorrow"), classify as YES.
- If the customer declines, opts out, says not interested, says "not right now", "nah", "stop", or asks to be removed, classify as NO.
Respond ONLY with a valid JSON object matching:
{
  "decision": "YES" | "NO",
  "reasoning": "one concise sentence explaining why",
  "confidence": number between 0.0 and 1.0
}`;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4000);

    try {
      const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "openai/gpt-oss-120b",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: `Customer message: "${text}"` },
          ],
          response_format: { type: "json_object" },
          temperature: 0.1,
          max_tokens: 120,
        }),
        signal: controller.signal,
      });

      if (!response.ok) return null;

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content;
      if (!content) return null;

      const parsed = JSON.parse(content);
      const isYes = String(parsed.decision).toUpperCase() === "YES";

      return {
        decision: isYes ? "YES" : "NO",
        isChurned: !isYes,
        targetStage: isYes ? "qualified" : "churned",
        reasoning: parsed.reasoning || (isYes ? "Customer expressed interest" : "Customer declined outreach"),
        confidence: typeof parsed.confidence === "number" ? parsed.confidence : 0.95,
        engine: "groq",
      };
    } finally {
      clearTimeout(timeout);
    }
  }

  /**
   * Calls Google Gemini AI with key rotation
   */
  private static async evaluateWithGemini(text: string): Promise<LeadSentimentResult | null> {
    const rawKeys = process.env.GEMINI_API_KEYS || process.env.GEMINI_API_KEY || "";
    const keys = rawKeys.split(",").map((k) => k.trim()).filter((k) => k.length > 0);
    if (keys.length === 0) return null;

    const prompt = `You are an AI Lead Sentiment Analyzer.
Analyze this customer reply: "${text}"
Classify as YES (interested in talking/connecting) or NO (declined/not interested/opt-out).
Respond ONLY with valid JSON:
{"decision": "YES" or "NO", "reasoning": "brief explanation", "confidence": 0.95}`;

    for (const key of keys) {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 4000);

      try {
        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent?key=${key}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contents: [{ parts: [{ text: prompt }] }],
              generationConfig: { responseMimeType: "application/json" },
            }),
            signal: controller.signal,
          }
        );

        if (!response.ok) continue;

        const data = await response.json();
        const jsonText = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!jsonText) continue;

        const parsed = JSON.parse(jsonText);
        const isYes = String(parsed.decision).toUpperCase() === "YES";

        return {
          decision: isYes ? "YES" : "NO",
          isChurned: !isYes,
          targetStage: isYes ? "qualified" : "churned",
          reasoning: parsed.reasoning || (isYes ? "Customer expressed interest" : "Customer declined outreach"),
          confidence: typeof parsed.confidence === "number" ? parsed.confidence : 0.9,
          engine: "gemini",
        };
      } catch {
        // Try next key
      } finally {
        clearTimeout(timeout);
      }
    }

    return null;
  }

  /**
   * Deterministic pattern matcher with negative precedence
   */
  private static evaluateWithDeterministicRules(text: string): LeadSentimentResult {
    const textLower = text.toLowerCase().trim();

    const negativeKeywords = [
      /\bno\b/,
      /\bnot interested\b/,
      /\bunsubscribe\b/,
      /\bstop\b/,
      /\bremove\b/,
      /\bcancel\b/,
      /\bdon'?t contact\b/,
      /\bdo not contact\b/,
      /\bnot right now\b/,
      /\bnever\b/,
      /\bpass\b/,
      /\bnot looking\b/,
      /\bopt out\b/,
      /\bopt-out\b/,
      /\bnah\b/,
      /\bnope\b/,
      /\bdo not need\b/,
      /\bdon'?t need\b/,
      /\bdon'?t want\b/,
      /\bdo not want\b/,
      /\bnot anymore\b/,
      /\bnot now\b/,
      /\bno thanks\b/,
      /\bno thank you\b/,
      /\bdecline\b/,
      /\bdeclined\b/,
      /\bdisagree\b/,
      /\bnot buying\b/,
      /\bnot for me\b/,
    ];

    const positiveKeywords = [
      /\byes\b/,
      /\binterested\b/,
      /\bsure\b/,
      /\bsounds good\b/,
      /\blet'?s talk\b/,
      /\blet'?s connect\b/,
      /\blet'?s meet\b/,
      /\bproceed\b/,
      /\byep\b/,
      /\byeah\b/,
      /\bdefinitely\b/,
      /\bcount me in\b/,
      /\bcall me\b/,
      /\bmore info\b/,
      /\bready\b/,
      /\bok\b/,
      /\bokay\b/,
      /\bpricing\b/,
      /\bdemo\b/,
      /\bbook a demo\b/,
      /\bbook demo\b/,
      /\bconnect with\b/,
      /\blook forward\b/,
    ];

    const hasNegative = negativeKeywords.some((r) => r.test(textLower));
    const hasPositive = positiveKeywords.some((r) => r.test(textLower));

    if (hasNegative) {
      return {
        decision: "NO",
        isChurned: true,
        targetStage: "churned",
        reasoning: "Customer explicitly declined outreach (opt-out / negative sentiment)",
        confidence: 0.95,
        engine: "deterministic",
      };
    }

    if (hasPositive) {
      return {
        decision: "YES",
        isChurned: false,
        targetStage: "qualified",
        reasoning: "Customer confirmed interest in discussion (positive sentiment)",
        confidence: 0.95,
        engine: "deterministic",
      };
    }

    return {
      decision: "YES",
      isChurned: false,
      targetStage: "qualified",
      reasoning: "Customer provided general response without opting out",
      confidence: 0.7,
      engine: "deterministic",
    };
  }
}
