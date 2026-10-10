import * as React from "react";
import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { WebsiteService } from "@/services/website.service";
import { SectionRenderer } from "@/components/website-builder/section-renderer";
import { LiveBadge } from "@/components/website-builder/live-badge";

interface PublicSitePageProps {
  params: Promise<{ slug: string }>;
}

// Slug is dynamically resolved at request time to serve published sites
export const instant = false;

export async function generateMetadata({ params }: PublicSitePageProps): Promise<Metadata> {
  const { slug } = await params;
  const website = await WebsiteService.getPublishedWebsiteBySlug(slug);

  if (!website) {
    return {
      title: "Page Not Found — Nexus",
      description: "The requested published website was not found.",
    };
  }

  const document = website.content || {};
  const title = document.seoTitle || website.title;
  const description =
    document.seoDescription ||
    `Official website for ${website.title}. Published with Nexus AI Business Operating Platform.`;

  return {
    title: `${title} | Live Website`,
    description,
    openGraph: {
      title: `${title} | Live Website`,
      description,
      type: "website",
    },
  };
}

export default async function PublicWebsitePage({ params }: PublicSitePageProps) {
  await connection();
  const { slug } = await params;

  const website = await WebsiteService.getPublishedWebsiteBySlug(slug);

  // If website does not exist or is not published, return standard 404
  if (!website || !website.is_published) {
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
  const sections = (document.sections || []).filter((s) => !s.hidden);

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
      {/* Live Public Sections */}
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

      {/* Public Visitor Footer & Nexus Watermark */}
      <footer
        className="py-8 px-4 border-t text-center text-xs flex flex-col sm:flex-row items-center justify-between max-w-7xl mx-auto w-full gap-4"
        style={{ borderColor: theme.borderColor || "rgba(31, 28, 24, 0.12)" }}
      >
        <div className="flex items-center gap-2">
          <span className="font-semibold">{website.title}</span>
          <span className="text-muted-foreground">•</span>
          <span className="text-muted-foreground font-mono">/{website.slug}</span>
        </div>

        <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
          <span>Powered by</span>
          <Link
            href="/"
            className="font-bold text-foreground hover:underline inline-flex items-center gap-1.5"
          >
            <span>Nexus Studio</span>
          </Link>
          <span>•</span>
          <Link href="/login" className="hover:underline">
            Owner Sign In
          </Link>
        </div>
      </footer>

      {/* Floating Dismissible Live Badge */}
      <LiveBadge slug={website.slug} />
    </div>
  );
}
