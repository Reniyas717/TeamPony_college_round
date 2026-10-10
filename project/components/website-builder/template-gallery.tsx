/* eslint-disable @next/next/no-img-element */
"use client";

import * as React from "react";
import { WebsiteRecord } from "@/lib/validations/website";
import { TEMPLATES, TemplateDefinition } from "@/lib/templates/website-templates";
import { SectionRenderer } from "./section-renderer";
import {
  Global,
  Add,
  Eye,
  Edit2,
  Trash,
  Magicpen,
  DocumentCopy,
  TickCircle,
  CloseCircle,
  ArrowRight,
  Refresh,
} from "iconsax-react";

interface TemplateGalleryProps {
  websites: WebsiteRecord[];
  creatingTemplate?: string | null;
  openingWebsiteId?: string | null;
  onSelectTemplate: (templateId: "editorial-luxury" | "modern-saas" | "creative-studio" | "blank") => void;
  onOpenWebsite: (website: WebsiteRecord) => void;
  onDeleteWebsite: (id: string) => void;
  onStartBlank: () => void;
  onStartAiAssist: () => void;
}

export function TemplateGallery({
  websites,
  creatingTemplate,
  openingWebsiteId,
  onSelectTemplate,
  onOpenWebsite,
  onDeleteWebsite,
  onStartBlank,
  onStartAiAssist,
}: TemplateGalleryProps) {
  const [previewTemplate, setPreviewTemplate] = React.useState<TemplateDefinition | null>(null);
  const [selectedCategory, setSelectedCategory] = React.useState<string>("All");
  const [searchQuery, setSearchQuery] = React.useState<string>("");

  const allTemplates = [
    TEMPLATES["editorial-luxury"],
    TEMPLATES["modern-saas"],
    TEMPLATES["creative-studio"],
  ];

  const categories = ["All", "Architecture & Atelier", "Software & Technology", "Brutalism & Direction"];

  const filteredTemplates = allTemplates.filter((tpl) => {
    const matchesCategory = selectedCategory === "All" || tpl.category === selectedCategory;
    const matchesSearch =
      !searchQuery.trim() ||
      tpl.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tpl.tagline.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tpl.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tpl.category.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 space-y-12">
      {/* 1. Header Banner */}
      <div className="space-y-3 pb-6 border-b border-border/40">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-sm bg-brand-subtle flex items-center justify-center text-brand-text">
            <Global size="22" />
          </div>
          <div>
            <span className="text-[10px] font-mono font-semibold uppercase tracking-wider text-brand-text">
              Nexus Studio
            </span>
            <h1 className="font-display text-page-sm md:text-page font-bold tracking-tight text-foreground">
              Website Builder
            </h1>
          </div>
        </div>
        <p className="text-sm text-muted-foreground max-w-2xl leading-relaxed">
          Design, customize, and publish high-performance websites. Choose from three art-directed templates, start with a clean document, or edit your existing workspaces.
        </p>

        {creatingTemplate && (
          <div className="p-3 bg-brand/10 border border-brand/30 rounded-sm flex items-center justify-between animate-in fade-in slide-in-from-top-1 duration-200">
            <div className="flex items-center gap-2.5">
              <Refresh size="15" className="animate-spin text-brand-text" />
              <span className="text-xs font-semibold text-brand-text">
                Creating workspace for &ldquo;{creatingTemplate}&rdquo;... Preparing section layout &amp; design tokens.
              </span>
            </div>
            <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider">Please wait</span>
          </div>
        )}
      </div>

      {/* 2. Three Distinct Creation Pathways */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Pathway 1: Browse Templates (Featured) */}
        <div className="p-6 bg-card/70 border-2 border-brand-text/30 rounded-sm space-y-4 flex flex-col justify-between relative shadow-xs">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-brand-subtle text-brand-text uppercase">
                Recommended
              </span>
              <DocumentCopy size="16" className="text-brand-text" />
            </div>
            <h3 className="font-display text-lg font-bold text-foreground">Choose a Template</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Start with one of three complete, pre-composed architectural website directions with full section layouts and sample content.
            </p>
          </div>
          <a
            href="#templates-section"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-brand-text hover:underline pt-2 cursor-pointer"
          >
            <span>Explore 3 Templates Below</span>
            <ArrowRight size="13" />
          </a>
        </div>

        {/* Pathway 2: Blank Page */}
        <div className="p-6 bg-card/60 border border-border/40 hover:border-border rounded-sm space-y-4 flex flex-col justify-between shadow-xs transition-colors">
          <div className="space-y-2">
            <div className="w-8 h-8 rounded-sm bg-muted/40 flex items-center justify-center text-foreground">
              <Add size="16" />
            </div>
            <h3 className="font-display text-lg font-bold text-foreground">Start from Blank</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              A clean document with minimal structural scaffolding. Ideal if you already have custom design guidelines in mind.
            </p>
          </div>
          <button
            type="button"
            disabled={Boolean(creatingTemplate)}
            onClick={onStartBlank}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-foreground hover:text-brand-text disabled:opacity-50 pt-2 cursor-pointer disabled:cursor-not-allowed transition-colors"
          >
            {creatingTemplate === "blank" ? (
              <>
                <Refresh size="13" className="animate-spin text-brand-text" />
                <span className="text-brand-text font-bold">Creating Blank Canvas...</span>
              </>
            ) : (
              <>
                <span>Create Blank Website</span>
                <ArrowRight size="13" />
              </>
            )}
          </button>
        </div>

        {/* Pathway 3: AI Copy Guided Setup */}
        <div className="p-6 bg-card/60 border border-border/40 hover:border-border rounded-sm space-y-4 flex flex-col justify-between shadow-xs transition-colors">
          <div className="space-y-2">
            <div className="w-8 h-8 rounded-sm bg-brand-subtle flex items-center justify-center text-brand-text">
              <Magicpen size="16" />
            </div>
            <h3 className="font-display text-lg font-bold text-foreground">AI Guided Setup</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Enter your industry or offering to pre-generate targeted copy and headline options before launching the editor.
            </p>
          </div>
          <button
            type="button"
            onClick={onStartAiAssist}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-brand-text hover:underline pt-2 cursor-pointer"
          >
            <span>Configure with AI Assist</span>
            <ArrowRight size="13" />
          </button>
        </div>
      </div>

      {/* 3. Existing Created Websites (if any) */}
      {websites.length > 0 && (
        <div className="space-y-4 pt-4">
          <div className="flex items-center justify-between pb-2 border-b border-border/40">
            <div>
              <h2 className="font-display text-lg font-bold text-foreground">Your Websites ({websites.length})</h2>
              <p className="text-xs text-muted-foreground">Manage active landing pages and drafts in this workspace.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {websites.map((w) => (
              <div
                key={w.id}
                className="p-5 bg-card/70 border border-border/40 rounded-sm flex flex-col justify-between space-y-4 shadow-xs"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-mono text-[11px] text-muted-foreground">/{w.slug}</span>
                    <span
                      className={`px-2 py-0.5 rounded-sm text-[10px] font-mono font-semibold ${
                        w.is_published
                          ? "bg-status-success-bg text-status-success-fg"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {w.is_published ? "Live" : "Draft"}
                    </span>
                  </div>
                  <h3 className="font-display text-base font-bold text-foreground truncate">{w.title}</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {w.content?.sections?.length || 0} sections • Template:{" "}
                    <span className="font-mono">{w.content?.templateId || "custom"}</span>
                  </p>
                </div>

                <div className="pt-3 border-t border-border/20 flex items-center justify-between text-xs">
                  <button
                    type="button"
                    disabled={openingWebsiteId === w.id}
                    onClick={() => onOpenWebsite(w)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-sm bg-card border border-border hover:bg-muted font-semibold cursor-pointer shadow-xs disabled:opacity-60 transition-opacity"
                  >
                    {openingWebsiteId === w.id ? (
                      <>
                        <Refresh size="13" className="animate-spin text-brand-text" />
                        <span>Opening...</span>
                      </>
                    ) : (
                      <>
                        <Edit2 size="13" />
                        <span>Open Editor</span>
                      </>
                    )}
                  </button>

                  <div className="flex items-center gap-2">
                    <a
                      href={`/dashboard/website/preview/${w.id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground cursor-pointer"
                      title="Open Live Preview"
                    >
                      <Eye size="14" />
                      <span>Preview</span>
                    </a>
                    <button
                      type="button"
                      onClick={() => onDeleteWebsite(w.id)}
                      className="p-1 text-muted-foreground hover:text-destructive cursor-pointer"
                      title="Delete website"
                    >
                      <Trash size="14" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 4. Substantial Visual Template Gallery */}
      <div id="templates-section" className="space-y-6 pt-6">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <span className="text-xs font-mono font-semibold uppercase text-brand-text tracking-wider">
              Template Architecture
            </span>
            <h2 className="font-display text-2xl font-bold tracking-tight text-foreground mt-0.5">
              Dynamic Art-Directed Starting Points
            </h2>
            <p className="text-xs sm:text-sm text-muted-foreground max-w-2xl mt-1">
              Select, filter, or customize any template with custom assets stored on Supabase Storage.
            </p>
          </div>

          {/* Search input */}
          <div className="w-full md:w-64">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search templates or styles..."
              className="w-full px-3 py-1.5 rounded-sm border border-border/60 bg-card text-foreground text-xs focus:ring-1 focus:ring-brand-text"
            />
          </div>
        </div>

        {/* Dynamic Category Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          {categories.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap cursor-pointer transition-colors ${
                selectedCategory === cat
                  ? "bg-brand text-brand-foreground shadow-xs"
                  : "bg-muted/60 text-muted-foreground hover:text-foreground hover:bg-muted"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {filteredTemplates.length === 0 ? (
          <div className="p-8 text-center border border-dashed rounded-sm text-muted-foreground text-xs">
            No templates match your search &ldquo;{searchQuery}&rdquo;. Try another filter or create a blank website.
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {filteredTemplates.map((tpl) => (
              <div
                key={tpl.id}
                className="bg-card/70 border border-border/50 rounded-sm overflow-hidden flex flex-col justify-between group shadow-sm hover:shadow-md transition-all duration-200"
              >
                {/* Preview Image with Hover Overlay */}
                <div className="relative h-64 sm:h-72 w-full overflow-hidden bg-muted">
                  <img
                    src={tpl.previewImage}
                    alt={tpl.name}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-linear-to-t from-black/80 via-black/20 to-transparent flex flex-col justify-end p-5 text-white">
                    <span className="text-[10px] font-mono uppercase tracking-widest text-zinc-300">
                      {tpl.category}
                    </span>
                    <h3 className="font-display text-xl font-bold">{tpl.name}</h3>
                    <p className="text-xs text-zinc-300 italic mt-0.5">{tpl.tagline}</p>
                  </div>
                </div>

                {/* Template Body */}
                <div className="p-6 space-y-4 flex-1 flex flex-col justify-between">
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {tpl.description}
                  </p>

                  <div className="space-y-2 pt-2 border-t border-border/30">
                    <div className="flex items-center justify-between text-[11px] font-mono text-muted-foreground">
                      <span>Accent Tone</span>
                      <div className="flex items-center gap-1.5">
                        <span className="w-3 h-3 rounded-full" style={{ backgroundColor: tpl.accentColor }} />
                        <span>{tpl.accentColor}</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-[11px] font-mono text-muted-foreground">
                      <span>Included Sections</span>
                      <span>{(tpl.initialDocument.sections || []).length} Sections</span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="pt-2 grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setPreviewTemplate(tpl)}
                      className="py-2 px-3 rounded-sm border border-border bg-card hover:bg-muted text-foreground text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer shadow-xs transition-colors"
                    >
                      <Eye size="14" />
                      <span>Preview</span>
                    </button>

                    <button
                      type="button"
                      disabled={Boolean(creatingTemplate)}
                      onClick={() => onSelectTemplate(tpl.id)}
                      className="py-2 px-3 rounded-sm bg-brand text-brand-foreground hover:opacity-90 disabled:opacity-50 text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer disabled:cursor-not-allowed shadow-xs transition-opacity"
                    >
                      {creatingTemplate === tpl.id ? (
                        <>
                          <Refresh size="14" className="animate-spin" />
                          <span>Creating...</span>
                        </>
                      ) : (
                        <>
                          <TickCircle size="14" />
                          <span>Use Template</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 5. Fullscreen Template Inspection Modal */}
      {previewTemplate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-background border border-border rounded-sm shadow-2xl max-w-5xl w-full max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="p-4 border-b border-border/40 flex items-center justify-between bg-card/80 shrink-0">
              <div className="flex items-center gap-3">
                <span className="w-3 h-3 rounded-full" style={{ backgroundColor: previewTemplate.accentColor }} />
                <div>
                  <h3 className="font-display text-base font-bold text-foreground">
                    Template Preview: {previewTemplate.name}
                  </h3>
                  <p className="text-xs text-muted-foreground">{previewTemplate.tagline}</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const chosen = previewTemplate.id;
                    setPreviewTemplate(null);
                    onSelectTemplate(chosen);
                  }}
                  className="px-4 py-1.5 rounded-sm bg-brand text-brand-foreground text-xs font-semibold hover:opacity-90 cursor-pointer shadow-xs"
                >
                  Create Website with this Template
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewTemplate(null)}
                  className="p-1 rounded-sm text-muted-foreground hover:text-foreground cursor-pointer"
                >
                  <CloseCircle size="20" />
                </button>
              </div>
            </div>

            {/* Modal Scrollable Canvas Preview */}
            <div className="flex-1 overflow-y-auto">
              {(previewTemplate.initialDocument.sections || []).map((sec) => (
                <SectionRenderer
                  key={sec.id}
                  section={sec}
                  theme={
                    previewTemplate.initialDocument.theme || {
                      canvasBg: "#FDFBF7",
                      surfaceBg: "#F4EFE6",
                      textPrimary: "#1F1C18",
                      textMuted: "#797268",
                      borderColor: "rgba(31, 28, 24, 0.12)",
                      accentColor: "#C85A32",
                      fontHeading: "display" as const,
                      fontBody: "sans" as const,
                    }
                  }
                  isEditorMode={false}
                />
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
