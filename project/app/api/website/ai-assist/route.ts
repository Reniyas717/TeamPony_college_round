import { NextResponse } from "next/server";
import { z } from "zod";
import {
  ownerContextErrorResponse,
  requireOwnerContext,
} from "@/lib/supabase/owner-context";

const AiAssistInputSchema = z.object({
  action: z.enum(["refine_heading", "shorten_subtitle", "generate_ctas", "generate_section_copy"]),
  currentText: z.string().optional(),
  sectionType: z.string().optional(),
  vibe: z.enum(["editorial", "saas", "creative", "monochrome"]).default("editorial"),
  topic: z.string().optional(),
});

interface SuggestionItem {
  title?: string;
  subtitle?: string;
  body?: string;
  ctaPrimary?: string;
  ctaSecondary?: string;
}

function getCuratedFallback(
  action: string,
  vibe: string,
  sectionType: string,
  topic?: string
): SuggestionItem[] {
  if (action === "refine_heading") {
    if (vibe === "editorial") {
      return [
        { title: "The Architecture of Enduring Form" },
        { title: "Quiet Spaces Calibrated for Contemplation" },
        { title: "Monolithic Elegance, Generations in the Making" },
      ];
    } else if (vibe === "saas") {
      return [
        { title: "Autonomous Business Operations in Real Time" },
        { title: "The Single Glass Pane for Modern Revenue Teams" },
        { title: "Zero-Latency Workflows with Verifiable Isolation" },
      ];
    } else {
      return [
        { title: "Crafting Visceral Digital Artifacts for Brave Brands" },
        { title: "Spatial Computing Meets Uncompromising Visual Tension" },
        { title: "Bold Digital Monoliths That Refuse Category Convention" },
      ];
    }
  } else if (action === "shorten_subtitle") {
    return [
      { subtitle: "Engineered with single-tenant isolation, automated billing, and live compliance verification." },
      { subtitle: "Crafted to balance natural limestone purity with quiet, light-filled spatial rhythm." },
      { subtitle: "Accelerating modern engineering teams through deterministic execution and auditability." },
    ];
  } else if (action === "generate_ctas") {
    if (vibe === "saas") {
      return [
        { ctaPrimary: "Deploy Free Workspace", ctaSecondary: "Inspect Architecture Spec" },
        { ctaPrimary: "Start 14-Day Sandbox", ctaSecondary: "Read Developer Docs" },
        { ctaPrimary: "Launch Engine v2.4", ctaSecondary: "Schedule Security Review" },
      ];
    } else if (vibe === "editorial") {
      return [
        { ctaPrimary: "Explore 2026 Monograph", ctaSecondary: "Request Private Consultation" },
        { ctaPrimary: "View Atelier Archives", ctaSecondary: "Inquire on Commissions" },
        { ctaPrimary: "Discover Collections", ctaSecondary: "Contact Private Office" },
      ];
    } else {
      return [
        { ctaPrimary: "Explore Selected Works", ctaSecondary: "Initiate Studio Dialogue" },
        { ctaPrimary: "View Spatial Projects", ctaSecondary: "Commission Atelier Brutal" },
        { ctaPrimary: "Inspect Artifact Index", ctaSecondary: "Download Capabilities Deck" },
      ];
    }
  } else {
    const topicContext = topic ? `for ${topic}` : "";
    if (sectionType === "hero") {
      return [
        {
          title: `Bespoke Digital Presence ${topicContext}`.trim(),
          subtitle: "Unifying architectural composition, deliberate hierarchy, and responsive performance.",
          ctaPrimary: "Discover Solutions",
          ctaSecondary: "Get in Touch",
        },
      ];
    } else if (sectionType === "manifesto" || sectionType === "features") {
      return [
        {
          title: "Principles of Precision and Permanence",
          body: "We build digital solutions that reject disposable design fads. Every component is rigorously calibrated for usability, contrast, and lasting performance.",
        },
      ];
    } else {
      return [
        {
          title: "Ready to Transform Your Digital Operations?",
          subtitle: "Begin your project with an architecture designed for generational scale.",
          ctaPrimary: "Start Today",
          ctaSecondary: "Speak with an Expert",
        },
      ];
    }
  }
}

async function callGroqAi(params: {
  action: "refine_heading" | "shorten_subtitle" | "generate_ctas" | "generate_section_copy";
  currentText?: string;
  sectionType: string;
  vibe: string;
  topic?: string;
}): Promise<{ suggestions: SuggestionItem[]; model: string } | null> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) return null;

  // Groq production model verified via Groq Cloud API models endpoint:
  // qwen/qwen3.8-27b provides ~100ms ultra-low latency LPU inference with strict JSON structure
  const primaryModel = "qwen/qwen3.8-27b";

  const systemPrompt = `You are an elite, award-winning website copywriter and creative director for Nexus Studio.
You craft punchy, distinct website copy tailored to high-end digital brands.
Aesthetic Vibe: ${params.vibe.toUpperCase()}
- Editorial: Architectural, sophisticated, timeless, quiet luxury, contemplative tone.
- SaaS: High-conviction, technical precision, velocity, developer-grade clarity.
- Creative: Avant-garde, visceral, raw, artistic, category-defying.
- Monochrome: Minimalist, stark, brutalist, essentialist.

You must respond with valid JSON ONLY conforming strictly to:
{
  "suggestions": [
    {
      "title": "string (optional)",
      "subtitle": "string (optional)",
      "body": "string (optional)",
      "ctaPrimary": "string (optional)",
      "ctaSecondary": "string (optional)"
    }
  ]
}
Do NOT include markdown formatting or reasoning text outside the JSON object.`;

  let userPrompt = `Section Type: ${params.sectionType}\nGoal Action: ${params.action}\n`;
  if (params.topic) userPrompt += `Brand / Industry Focus: ${params.topic}\n`;
  if (params.currentText) userPrompt += `Current Text: "${params.currentText}"\n`;

  if (params.action === "refine_heading") {
    userPrompt += `Task: Generate exactly 3 fresh, compelling headline variations that elevate the existing text. Return in suggestions array with 'title' keys.`;
  } else if (params.action === "shorten_subtitle") {
    userPrompt += `Task: Generate exactly 3 punchy, tighter subtitle alternatives that are clear and impactful. Return in suggestions array with 'subtitle' keys.`;
  } else if (params.action === "generate_ctas") {
    userPrompt += `Task: Generate exactly 3 pairs of high-converting call-to-action buttons matching this brand aesthetic. Return in suggestions array with 'ctaPrimary' and 'ctaSecondary' keys.`;
  } else if (params.action === "generate_section_copy") {
    userPrompt += `Task: Generate 2-3 complete section copy sets (including 'title', 'subtitle', and where applicable 'ctaPrimary' and 'ctaSecondary' or 'body').`;
  }

  try {
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: primaryModel,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        response_format: { type: "json_object" },
        temperature: 0.7,
        max_tokens: 600,
      }),
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) {
      console.error(`Groq API returned ${response.status}: ${await response.text().catch(() => "")}`);
      return null;
    }

    const data = await response.json();
    const rawContent = data.choices?.[0]?.message?.content;
    if (!rawContent) return null;

    const parsedJson = JSON.parse(rawContent);
    if (Array.isArray(parsedJson.suggestions) && parsedJson.suggestions.length > 0) {
      return {
        suggestions: parsedJson.suggestions,
        model: primaryModel,
      };
    }
  } catch (err) {
    console.warn("Groq AI assist call failed, falling back to curated suggestions:", err);
  }

  return null;
}

export async function POST(request: Request) {
  try {
    await requireOwnerContext();

    const json = await request.json().catch(() => null);
    const parsed = AiAssistInputSchema.safeParse(json);

    if (!parsed.success) {
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: "Invalid AI assistant payload" } },
        { status: 400 }
      );
    }

    const { action, vibe, sectionType = "hero", topic, currentText } = parsed.data;

    // First attempt real-time Groq LLM inference
    const groqResult = await callGroqAi({
      action,
      currentText,
      sectionType,
      vibe,
      topic,
    });

    if (groqResult && groqResult.suggestions.length > 0) {
      return NextResponse.json({
        data: {
          action,
          suggestions: groqResult.suggestions,
          model: groqResult.model,
          provider: "groq",
        },
      });
    }

    // Graceful fallback to curated templates
    const fallbackSuggestions = getCuratedFallback(action, vibe, sectionType, topic);

    return NextResponse.json({
      data: {
        action,
        suggestions: fallbackSuggestions,
        model: "curated-template",
        provider: "nexus-engine",
      },
    });
  } catch (error: unknown) {
    const ownerError = ownerContextErrorResponse(error);
    if (ownerError) return ownerError;

    console.error("[WEBSITE_AI_API_ERROR]", error);
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Unable to generate website assistance", details: null } },
      { status: 500 }
    );
  }
}
