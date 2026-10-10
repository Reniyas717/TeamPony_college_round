import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";

const AiAssistInputSchema = z.object({
  action: z.enum(["refine_heading", "shorten_subtitle", "generate_ctas", "generate_section_copy"]),
  currentText: z.string().optional(),
  sectionType: z.string().optional(),
  vibe: z.enum(["editorial", "saas", "creative", "monochrome"]).default("editorial"),
  topic: z.string().optional(),
});

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: { code: "UNAUTHORIZED", message: "Authentication required" } },
        { status: 401 }
      );
    }

    const json = await request.json().catch(() => null);
    const parsed = AiAssistInputSchema.safeParse(json);

    if (!parsed.success) {
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: "Invalid AI assistant payload" } },
        { status: 400 }
      );
    }

    const { action, vibe, sectionType = "hero", topic } = parsed.data;

    let suggestions: { title?: string; subtitle?: string; body?: string; ctaPrimary?: string; ctaSecondary?: string }[] = [];

    if (action === "refine_heading") {
      if (vibe === "editorial") {
        suggestions = [
          { title: "The Architecture of Enduring Form" },
          { title: "Quiet Spaces Calibrated for Contemplation" },
          { title: "Monolithic Elegance, Generations in the Making" },
        ];
      } else if (vibe === "saas") {
        suggestions = [
          { title: "Autonomous Business Operations in Real Time" },
          { title: "The Single Glass Pane for Modern Revenue Teams" },
          { title: "Zero-Latency Workflows with Verifiable Isolation" },
        ];
      } else {
        suggestions = [
          { title: "Crafting Visceral Digital Artifacts for Brave Brands" },
          { title: "Spatial Computing Meets Uncompromising Visual Tension" },
          { title: "Bold Digital Monoliths That Refuse Category Convention" },
        ];
      }
    } else if (action === "shorten_subtitle") {
      suggestions = [
        { subtitle: "Engineered with single-tenant isolation, automated billing, and live compliance verification." },
        { subtitle: "Crafted to balance natural limestone purity with quiet, light-filled spatial rhythm." },
        { subtitle: "Accelerating modern engineering teams through deterministic execution and auditability." },
      ];
    } else if (action === "generate_ctas") {
      if (vibe === "saas") {
        suggestions = [
          { ctaPrimary: "Deploy Free Workspace", ctaSecondary: "Inspect Architecture Spec" },
          { ctaPrimary: "Start 14-Day Sandbox", ctaSecondary: "Read Developer Docs" },
          { ctaPrimary: "Launch Engine v2.4", ctaSecondary: "Schedule Security Review" },
        ];
      } else if (vibe === "editorial") {
        suggestions = [
          { ctaPrimary: "Explore 2026 Monograph", ctaSecondary: "Request Private Consultation" },
          { ctaPrimary: "View Atelier Archives", ctaSecondary: "Inquire on Commissions" },
          { ctaPrimary: "Discover Collections", ctaSecondary: "Contact Private Office" },
        ];
      } else {
        suggestions = [
          { ctaPrimary: "Explore Selected Works", ctaSecondary: "Initiate Studio Dialogue" },
          { ctaPrimary: "View Spatial Projects", ctaSecondary: "Commission Atelier Brutal" },
          { ctaPrimary: "Inspect Artifact Index", ctaSecondary: "Download Capabilities Deck" },
        ];
      }
    } else if (action === "generate_section_copy") {
      const topicContext = topic ? `for ${topic}` : "";
      if (sectionType === "hero") {
        suggestions = [
          {
            title: `Bespoke Digital Presence ${topicContext}`.trim(),
            subtitle: "Unifying architectural composition, deliberate hierarchy, and responsive performance.",
            ctaPrimary: "Discover Solutions",
            ctaSecondary: "Get in Touch",
          },
        ];
      } else if (sectionType === "manifesto" || sectionType === "features") {
        suggestions = [
          {
            title: "Principles of Precision and Permanence",
            body: "We build digital solutions that reject disposable design fads. Every component is rigorously calibrated for usability, contrast, and lasting performance.",
          },
        ];
      } else {
        suggestions = [
          {
            title: "Ready to Transform Your Digital Operations?",
            subtitle: "Begin your project with an architecture designed for generational scale.",
            ctaPrimary: "Start Today",
            ctaSecondary: "Speak with an Expert",
          },
        ];
      }
    }

    return NextResponse.json({
      data: {
        action,
        suggestions,
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message } },
      { status: 500 }
    );
  }
}
