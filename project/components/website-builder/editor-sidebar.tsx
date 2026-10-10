"use client";

import * as React from "react";
import { WebsiteDocument, WebsiteTheme } from "@/lib/validations/website";
import {
  Add,
  ArrowUp,
  ArrowDown,
  Trash,
  Eye,
  EyeSlash,
  Colorfilter,
  Element3,
  Copy,
} from "iconsax-react";

interface EditorSidebarProps {
  document: WebsiteDocument;
  selectedSectionId: string | null;
  onSelectSection: (id: string) => void;
  onMoveUp: (index: number) => void;
  onMoveDown: (index: number) => void;
  onDuplicate: (index: number) => void;
  onDelete: (index: number) => void;
  onToggleHide: (index: number) => void;
  onOpenAddSection: (insertIndex?: number) => void;
  onUpdateTheme: (themePatch: Partial<WebsiteTheme>) => void;
}

export function EditorSidebar({
  document,
  selectedSectionId,
  onSelectSection,
  onMoveUp,
  onMoveDown,
  onDuplicate,
  onDelete,
  onToggleHide,
  onOpenAddSection,
  onUpdateTheme,
}: EditorSidebarProps) {
  const [activeTab, setActiveTab] = React.useState<"sections" | "theme">("sections");
  const sections = document.sections || [];
  const theme = document.theme || {
    fontHeading: "display" as const,
    fontBody: "sans" as const,
    accentColor: "#C85A32",
    canvasBg: "#FDFBF7",
    surfaceBg: "#F4EFE6",
    textPrimary: "#1F1C18",
    textMuted: "#797268",
    borderColor: "rgba(31, 28, 24, 0.12)",
  };

  return (
    <aside className="w-72 bg-sidebar border-r border-border/40 flex flex-col shrink-0 h-full overflow-hidden">
      {/* Sidebar Tabs */}
      <div className="flex items-center border-b border-border/40 bg-sidebar/80 shrink-0 px-2 pt-2 gap-1 text-xs font-medium">
        <button
          type="button"
          onClick={() => setActiveTab("sections")}
          className={`flex items-center gap-1.5 px-3 py-2 border-b-2 transition-colors cursor-pointer ${
            activeTab === "sections"
              ? "border-brand-text text-foreground font-semibold"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <Element3 size="14" />
          <span>Sections ({sections.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("theme")}
          className={`flex items-center gap-1.5 px-3 py-2 border-b-2 transition-colors cursor-pointer ${
            activeTab === "theme"
              ? "border-brand-text text-foreground font-semibold"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <Colorfilter size="14" />
          <span>Document Theme</span>
        </button>
      </div>

      {/* Tab 1: Section Hierarchy */}
      {activeTab === "sections" && (
        <div className="flex-1 overflow-y-auto flex flex-col justify-between p-3 space-y-4">
          <div className="space-y-1">
            <div className="flex items-center justify-between pb-2 px-1">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Page Hierarchy
              </span>
              <button
                type="button"
                onClick={() => onOpenAddSection(sections.length)}
                className="inline-flex items-center gap-1 text-[11px] font-semibold text-brand-text hover:underline cursor-pointer"
              >
                <Add size="12" />
                <span>Add Section</span>
              </button>
            </div>

            <div className="space-y-1">
              {sections.map((section, index) => {
                const isSelected = selectedSectionId === section.id;
                return (
                  <div
                    key={section.id}
                    onClick={() => onSelectSection(section.id)}
                    className={`p-2 rounded-sm border transition-all text-xs flex items-center justify-between gap-2 cursor-pointer group ${
                      isSelected
                        ? "bg-accent/80 border-brand-text/50 shadow-xs"
                        : "bg-card/40 border-border/30 hover:bg-card/80"
                    } ${section.hidden ? "opacity-50" : ""}`}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono text-[10px] text-muted-foreground">0{index + 1}</span>
                        <span
                          className={`font-medium truncate ${
                            section.hidden ? "line-through text-muted-foreground italic" : "text-foreground"
                          }`}
                        >
                          {section.name}
                        </span>
                        {section.hidden && (
                          <span className="text-[8px] font-mono px-1 py-0.2 rounded-xs bg-amber-500/20 text-amber-700 dark:text-amber-400 font-bold shrink-0">
                            HIDDEN
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] font-mono text-muted-foreground block truncate">
                        type: {section.type}
                      </span>
                    </div>

                    {/* Quick Section Actions */}
                    <div className="flex items-center gap-0.5 opacity-80 group-hover:opacity-100">
                      {index > 0 && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onMoveUp(index);
                          }}
                          className="p-1 hover:bg-muted rounded-xs text-muted-foreground hover:text-foreground cursor-pointer"
                          title="Move Up"
                        >
                          <ArrowUp size="12" />
                        </button>
                      )}
                      {index < sections.length - 1 && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onMoveDown(index);
                          }}
                          className="p-1 hover:bg-muted rounded-xs text-muted-foreground hover:text-foreground cursor-pointer"
                          title="Move Down"
                        >
                          <ArrowDown size="12" />
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onDuplicate(index);
                        }}
                        className="p-1 hover:bg-muted rounded-xs text-muted-foreground hover:text-foreground cursor-pointer"
                        title="Duplicate"
                      >
                        <Copy size="12" />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onToggleHide(index);
                        }}
                        className={`p-1 rounded-xs transition-colors cursor-pointer ${
                          section.hidden
                            ? "text-amber-600 dark:text-amber-400 bg-amber-500/20 hover:bg-amber-500/30"
                            : "hover:bg-muted text-muted-foreground hover:text-foreground"
                        }`}
                        title={section.hidden ? "Unhide Section" : "Hide from visitors"}
                      >
                        {section.hidden ? <EyeSlash size="12" /> : <Eye size="12" />}
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onDelete(index);
                        }}
                        className="p-1 hover:bg-destructive/10 rounded-xs text-muted-foreground hover:text-destructive cursor-pointer"
                        title="Delete"
                      >
                        <Trash size="12" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Add Section Button */}
          <div className="pt-2">
            <button
              type="button"
              onClick={() => onOpenAddSection(sections.length)}
              className="w-full py-2 px-3 rounded-sm border border-dashed border-border/80 hover:border-brand-text/50 bg-card/50 hover:bg-accent text-foreground text-xs font-semibold flex items-center justify-center gap-2 cursor-pointer transition-colors"
            >
              <Add size="14" className="text-brand-text" />
              <span>Insert New Section</span>
            </button>
          </div>
        </div>
      )}

      {/* Tab 2: Document Theme & Tokens */}
      {activeTab === "theme" && (
        <div className="flex-1 overflow-y-auto p-4 space-y-5 text-xs">
          <div className="space-y-1.5">
            <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground block">
              Display Typography
            </label>
            <div className="grid grid-cols-2 gap-1.5">
              {[
                { id: "bricolage", label: "Bricolage Display" },
                { id: "serif", label: "Editorial Serif" },
                { id: "sans", label: "Modern Sans" },
                { id: "mono", label: "Technical Mono" },
              ].map((font) => (
                <button
                  key={font.id}
                  type="button"
                  onClick={() => onUpdateTheme({ fontHeading: font.id as WebsiteTheme["fontHeading"] })}
                  className={`p-2 text-left rounded-sm border text-[11px] font-medium transition-colors cursor-pointer ${
                    theme.fontHeading === font.id
                      ? "border-brand-text bg-accent text-foreground font-semibold"
                      : "border-border/40 bg-card/40 text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {font.label}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground block">
              Palette Accent Tone
            </label>
            <div className="grid grid-cols-4 gap-2">
              {[
                { color: "#C85A32", name: "Terracotta" },
                { color: "#2563EB", name: "Royal Blue" },
                { color: "#F43F5E", name: "Crimson" },
                { color: "#1F1C18", name: "Charcoal" },
              ].map((swatch) => (
                <button
                  key={swatch.color}
                  type="button"
                  onClick={() => onUpdateTheme({ accentColor: swatch.color })}
                  className={`h-8 rounded-sm border transition-transform cursor-pointer relative ${
                    theme.accentColor === swatch.color ? "ring-2 ring-foreground scale-105" : ""
                  }`}
                  style={{ backgroundColor: swatch.color }}
                  title={swatch.name}
                />
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground block">
              Canvas Surface Atmosphere
            </label>
            <div className="space-y-1.5">
              {[
                { bg: "#FDFBF7", surface: "#F4EFE6", text: "#1F1C18", muted: "#797268", name: "Warm Editorial Ivory" },
                { bg: "#0B0F17", surface: "#111827", text: "#F9FAFB", muted: "#9CA3AF", name: "Deep Obsidian OLED" },
                { bg: "#0D0D0D", surface: "#171717", text: "#FAFAFA", muted: "#A3A3A3", name: "High-Contrast Studio" },
                { bg: "#FFFFFF", surface: "#F9FAFB", text: "#111827", muted: "#6B7280", name: "Pure Minimal White" },
              ].map((atm) => (
                <button
                  key={atm.name}
                  type="button"
                  onClick={() =>
                    onUpdateTheme({
                      canvasBg: atm.bg,
                      surfaceBg: atm.surface,
                      textPrimary: atm.text,
                      textMuted: atm.muted,
                    })
                  }
                  className={`w-full p-2.5 rounded-sm border text-left flex items-center justify-between text-xs cursor-pointer ${
                    theme.canvasBg === atm.bg
                      ? "border-brand-text bg-accent text-foreground font-semibold"
                      : "border-border/40 bg-card/40 text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <span>{atm.name}</span>
                  <div className="flex items-center gap-1">
                    <span className="w-3.5 h-3.5 rounded-xs border" style={{ backgroundColor: atm.bg }} />
                    <span className="w-3.5 h-3.5 rounded-xs border" style={{ backgroundColor: atm.surface }} />
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </aside>
  );
}
