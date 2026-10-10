import * as React from "react";
import { connection } from "next/server";
import { redirect, notFound } from "next/navigation";
import { AuthService } from "@/services/auth.service";
import { createClient } from "@/lib/supabase/server";
import { WebsiteService } from "@/services/website.service";
import { SectionRenderer } from "@/components/website-builder/section-renderer";

interface PreviewPageProps {
  params: Promise<{ id: string }>;
}

export default async function WebsitePreviewPage({ params }: PreviewPageProps) {
  await connection();
  const { id } = await params;
  const user = await AuthService.getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  const supabase = await createClient();
  const { data: business } = await supabase
    .from("businesses")
    .select("id")
    .eq("owner_id", user.id)
    .maybeSingle();

  if (!business?.id) {
    notFound();
  }

  const website = await WebsiteService.getWebsite(business.id, id);
  if (!website) {
    notFound();
  }

  const document = website.content || {};
  const theme = document.theme || {
    canvasBg: "#FDFBF7",
    surfaceBg: "#F4EFE6",
    textPrimary: "#1F1C18",
    textMuted: "#797268",
    borderColor: "rgba(31, 28, 24, 0.12)",
    accentColor: "#C85A32",
    fontHeading: "display" as const,
    fontBody: "sans" as const,
  };
  const sections = document.sections || [];

  const bodyFontClass =
    theme.fontBody === "serif"
      ? "font-serif"
      : "font-sans";

  return (
    <div
      style={{
        backgroundColor: theme.canvasBg || "#FDFBF7",
        color: theme.textPrimary || "#1F1C18",
      }}
      className={`min-h-screen flex flex-col ${bodyFontClass} selection:bg-brand selection:text-brand-foreground`}
    >
      {/* Visitor-facing Render of all active sections */}
      <main className="flex-1">
        {sections.map((section) => (
          <SectionRenderer
            key={section.id}
            section={section}
            theme={theme}
            isEditorMode={false}
          />
        ))}
      </main>

      {/* Understated Preview Watermark Pill */}
      <aside className="fixed bottom-4 right-4 z-50 bg-black/80 text-white text-[11px] font-mono px-3 py-1.5 rounded-full backdrop-blur-md shadow-lg flex items-center gap-2 border border-white/10">
        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
        <span>Nexus Studio Live Preview</span>
        <a
          href="/dashboard/website"
          className="ml-1 text-zinc-300 hover:text-white underline cursor-pointer"
        >
          Editor
        </a>
      </aside>
    </div>
  );
}
