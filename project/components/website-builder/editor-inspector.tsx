"use client";

import * as React from "react";
import {
  WebsiteSection,
  WebsiteDocument,
  SectionItem,
  SectionButton,
} from "@/lib/validations/website";
import { Magicpen, Add, Trash, Eye, EyeSlash } from "iconsax-react";

interface EditorInspectorProps {
  document: WebsiteDocument;
  selectedSection: WebsiteSection | null;
  onUpdateSectionField: (field: keyof WebsiteSection, value: unknown) => void;
  onUpdateSectionStyle: (stylePatch: Partial<WebsiteSection["style"]>) => void;
  onUpdateItem: (itemId: string, patch: Partial<SectionItem>) => void;
  onAddItem: () => void;
  onDeleteItem: (itemId: string) => void;
  onAddButton: () => void;
  onUpdateButton: (buttonId: string, patch: Partial<SectionButton>) => void;
  onDeleteButton: (buttonId: string) => void;
  onOpenAiAssist: (section: WebsiteSection) => void;
  onUpdateDocSeo: (patch: { seoTitle?: string; seoDescription?: string }) => void;
}

export function EditorInspector({
  document,
  selectedSection,
  onUpdateSectionField,
  onUpdateSectionStyle,
  onUpdateItem,
  onAddItem,
  onDeleteItem,
  onAddButton,
  onUpdateButton,
  onDeleteButton,
  onOpenAiAssist,
  onUpdateDocSeo,
}: EditorInspectorProps) {
  const [inspectorTab, setInspectorTab] = React.useState<"content" | "style" | "items">("content");

  if (!selectedSection) {
    return (
      <aside className="w-80 bg-sidebar border-l border-border/40 flex flex-col shrink-0 h-full overflow-y-auto p-4 space-y-6 text-xs">
        <div className="space-y-1 pb-3 border-b border-border/40">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            Document Properties
          </span>
          <h3 className="font-display text-sm font-bold">Global SEO & Identity</h3>
          <p className="text-[11px] text-muted-foreground">
            Click any section on the canvas or in the left sidebar to edit its content and styling.
          </p>
        </div>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground block">
              SEO Document Title
            </label>
            <input
              type="text"
              value={document.seoTitle || ""}
              onChange={(e) => onUpdateDocSeo({ seoTitle: e.target.value })}
              placeholder="e.g. Acme Atelier — Bespoke Architecture"
              className="w-full px-3 py-2 rounded-sm border border-border/60 bg-card text-foreground text-xs focus:outline-hidden focus:ring-1 focus:ring-brand-text"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground block">
              SEO Meta Description
            </label>
            <textarea
              rows={4}
              value={document.seoDescription || ""}
              onChange={(e) => onUpdateDocSeo({ seoDescription: e.target.value })}
              placeholder="Short search engine description..."
              className="w-full px-3 py-2 rounded-sm border border-border/60 bg-card text-foreground text-xs focus:outline-hidden focus:ring-1 focus:ring-brand-text resize-none"
            />
          </div>
        </div>
      </aside>
    );
  }

  const hasItems = selectedSection.items && selectedSection.items.length > 0;

  return (
    <aside className="w-80 bg-sidebar border-l border-border/40 flex flex-col shrink-0 h-full overflow-hidden text-xs">
      {/* Header Bar */}
      <div className="p-3 border-b border-border/40 bg-sidebar/80 flex items-center justify-between shrink-0">
        <div>
          <span className="text-[10px] font-mono uppercase text-muted-foreground font-semibold">
            Section Inspector
          </span>
          <h3 className="font-display text-xs font-bold truncate max-w-[170px] text-foreground">
            {selectedSection.name}
          </h3>
        </div>

        {/* AI Assist trigger */}
        <button
          type="button"
          onClick={() => onOpenAiAssist(selectedSection)}
          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-sm bg-brand-subtle text-brand-text hover:bg-brand hover:text-brand-foreground text-[11px] font-semibold cursor-pointer transition-colors shadow-xs"
          title="AI Copy Assistant"
        >
          <Magicpen size="13" />
          <span>AI Assist</span>
        </button>
      </div>

      {/* Tabs */}
      <div className="flex items-center border-b border-border/40 shrink-0 px-2 pt-1 gap-1">
        <button
          type="button"
          onClick={() => setInspectorTab("content")}
          className={`px-3 py-1.5 border-b-2 text-[11px] font-medium transition-colors cursor-pointer ${
            inspectorTab === "content"
              ? "border-brand-text text-foreground font-semibold"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          Content
        </button>
        <button
          type="button"
          onClick={() => setInspectorTab("style")}
          className={`px-3 py-1.5 border-b-2 text-[11px] font-medium transition-colors cursor-pointer ${
            inspectorTab === "style"
              ? "border-brand-text text-foreground font-semibold"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          Layout & Style
        </button>
        {hasItems && (
          <button
            type="button"
            onClick={() => setInspectorTab("items")}
            className={`px-3 py-1.5 border-b-2 text-[11px] font-medium transition-colors cursor-pointer ${
              inspectorTab === "items"
                ? "border-brand-text text-foreground font-semibold"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            Items ({selectedSection.items.length})
          </button>
        )}
      </div>

      {/* Tab: Content */}
      {inspectorTab === "content" && (
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          <div className="space-y-1.5">
            <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground block">
              Section Label
            </label>
            <input
              type="text"
              value={selectedSection.name}
              onChange={(e) => onUpdateSectionField("name", e.target.value)}
              className="w-full px-3 py-1.5 rounded-sm border border-border/60 bg-card text-foreground text-xs focus:ring-1 focus:ring-brand-text"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground block">
              Eyebrow Tag
            </label>
            <input
              type="text"
              value={selectedSection.eyebrow || ""}
              onChange={(e) => onUpdateSectionField("eyebrow", e.target.value)}
              placeholder="e.g. PRIVATE RESIDENCES • 2026"
              className="w-full px-3 py-1.5 rounded-sm border border-border/60 bg-card text-foreground text-xs focus:ring-1 focus:ring-brand-text"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground block">
              Main Heading
            </label>
            <textarea
              rows={3}
              value={selectedSection.title}
              onChange={(e) => onUpdateSectionField("title", e.target.value)}
              placeholder="Primary heading..."
              className="w-full px-3 py-2 rounded-sm border border-border/60 bg-card text-foreground text-xs focus:ring-1 focus:ring-brand-text resize-none"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground block">
              Subtitle / Description
            </label>
            <textarea
              rows={3}
              value={selectedSection.subtitle || ""}
              onChange={(e) => onUpdateSectionField("subtitle", e.target.value)}
              placeholder="Secondary narrative text..."
              className="w-full px-3 py-2 rounded-sm border border-border/60 bg-card text-foreground text-xs focus:ring-1 focus:ring-brand-text resize-none"
            />
          </div>

          {selectedSection.body !== undefined && (
            <div className="space-y-1.5">
              <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground block">
                Extended Body Text
              </label>
              <textarea
                rows={4}
                value={selectedSection.body || ""}
                onChange={(e) => onUpdateSectionField("body", e.target.value)}
                placeholder="Longer manifesto / descriptive body copy..."
                className="w-full px-3 py-2 rounded-sm border border-border/60 bg-card text-foreground text-xs focus:ring-1 focus:ring-brand-text resize-none"
              />
            </div>
          )}

          {/* Media fields */}
          <div className="pt-3 border-t border-border/40 space-y-3">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground block">
              Imagery & Media
            </span>

            <div className="space-y-1.5">
              <label className="text-[11px] text-muted-foreground block">Primary Image URL</label>
              <input
                type="text"
                value={selectedSection.imageUrl || ""}
                onChange={(e) => onUpdateSectionField("imageUrl", e.target.value)}
                placeholder="https://images.unsplash.com/..."
                className="w-full px-3 py-1.5 rounded-sm border border-border/60 bg-card text-foreground text-xs focus:ring-1 focus:ring-brand-text font-mono text-[11px]"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] text-muted-foreground block">Image Alt Text (Accessibility)</label>
              <input
                type="text"
                value={selectedSection.imageAlt || ""}
                onChange={(e) => onUpdateSectionField("imageAlt", e.target.value)}
                placeholder="Describe image content..."
                className="w-full px-3 py-1.5 rounded-sm border border-border/60 bg-card text-foreground text-xs focus:ring-1 focus:ring-brand-text"
              />
            </div>
          </div>

          {/* Actions & Buttons */}
          <div className="pt-3 border-t border-border/40 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Action Buttons
              </span>
              <button
                type="button"
                onClick={onAddButton}
                className="inline-flex items-center gap-1 text-[11px] text-brand-text font-semibold hover:underline cursor-pointer"
              >
                <Add size="12" />
                <span>Add Button</span>
              </button>
            </div>

            <div className="space-y-2">
              {selectedSection.buttons?.map((btn) => (
                <div key={btn.id} className="p-2.5 rounded-sm border border-border/40 bg-card/60 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-[10px] text-muted-foreground uppercase">{btn.variant}</span>
                    <button
                      type="button"
                      onClick={() => onDeleteButton(btn.id)}
                      className="text-muted-foreground hover:text-destructive cursor-pointer"
                      title="Remove"
                    >
                      <Trash size="12" />
                    </button>
                  </div>

                  <input
                    type="text"
                    value={btn.text}
                    onChange={(e) => onUpdateButton(btn.id, { text: e.target.value })}
                    placeholder="Button text"
                    className="w-full px-2 py-1 rounded-xs border border-border/60 bg-background text-xs"
                  />

                  <div className="grid grid-cols-2 gap-1.5">
                    <input
                      type="text"
                      value={btn.href}
                      onChange={(e) => onUpdateButton(btn.id, { href: e.target.value })}
                      placeholder="#destination"
                      className="w-full px-2 py-1 rounded-xs border border-border/60 bg-background text-xs font-mono text-[10px]"
                    />
                    <select
                      value={btn.variant}
                      onChange={(e) =>
                        onUpdateButton(btn.id, { variant: e.target.value as SectionButton["variant"] })
                      }
                      className="px-2 py-1 rounded-xs border border-border/60 bg-background text-xs"
                    >
                      <option value="primary">Primary</option>
                      <option value="secondary">Secondary</option>
                      <option value="outline">Outline</option>
                      <option value="link">Link</option>
                    </select>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Tab: Layout & Style */}
      {inspectorTab === "style" && (
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Visitor Visibility Setting */}
          <div className="p-3 bg-card/60 border border-border/40 rounded-sm flex items-center justify-between">
            <div className="space-y-0.5">
              <span className="font-semibold text-foreground text-xs block">Visitor Visibility</span>
              <span className="text-[10px] text-muted-foreground block">
                {selectedSection.hidden ? "Currently hidden from live visitors" : "Currently visible on public site"}
              </span>
            </div>
            <button
              type="button"
              onClick={() => onUpdateSectionField("hidden", !selectedSection.hidden)}
              className={`px-2.5 py-1 rounded-xs text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-colors ${
                selectedSection.hidden
                  ? "bg-amber-500/15 border border-amber-500/30 text-amber-600 dark:text-amber-400"
                  : "bg-muted hover:bg-muted/80 text-foreground border border-border"
              }`}
            >
              {selectedSection.hidden ? <EyeSlash size="12" /> : <Eye size="12" />}
              <span>{selectedSection.hidden ? "Hidden" : "Visible"}</span>
            </button>
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground block">
              Section Background Tone
            </label>
            <select
              value={selectedSection.style.background}
              onChange={(e) =>
                onUpdateSectionStyle({ background: e.target.value as WebsiteSection["style"]["background"] })
              }
              className="w-full px-3 py-2 rounded-sm border border-border/60 bg-card text-foreground text-xs"
            >
              <option value="default">Default Canvas Tone</option>
              <option value="subtle">Subtle Elevated Surface</option>
              <option value="contrast">High-Contrast Charcoal</option>
              <option value="dark">Deep OLED Dark</option>
              <option value="brand">Brand Accent Fill</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground block">
              Vertical Padding (Breathing Room)
            </label>
            <div className="grid grid-cols-2 gap-1.5">
              {[
                { id: "compact", label: "Compact (32px)" },
                { id: "standard", label: "Standard (64px)" },
                { id: "spacious", label: "Spacious (112px)" },
                { id: "none", label: "Flush (0px)" },
              ].map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() =>
                    onUpdateSectionStyle({ paddingY: p.id as WebsiteSection["style"]["paddingY"] })
                  }
                  className={`p-2 rounded-sm border text-[11px] font-medium text-left cursor-pointer ${
                    selectedSection.style.paddingY === p.id
                      ? "border-brand-text bg-accent text-foreground font-semibold"
                      : "border-border/40 bg-card text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground block">
              Content Alignment
            </label>
            <div className="grid grid-cols-3 gap-1.5">
              {[
                { id: "left", label: "Left" },
                { id: "center", label: "Center" },
                { id: "right", label: "Right" },
              ].map((al) => (
                <button
                  key={al.id}
                  type="button"
                  onClick={() => onUpdateSectionStyle({ align: al.id as WebsiteSection["style"]["align"] })}
                  className={`p-2 rounded-sm border text-[11px] font-medium text-center cursor-pointer ${
                    selectedSection.style.align === al.id
                      ? "border-brand-text bg-accent text-foreground font-semibold"
                      : "border-border/40 bg-card text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {al.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Tab: Multi-Items Manager */}
      {inspectorTab === "items" && (
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-border/40">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Card / Gallery Items
            </span>
            <button
              type="button"
              onClick={onAddItem}
              className="inline-flex items-center gap-1 text-[11px] text-brand-text font-semibold hover:underline cursor-pointer"
            >
              <Add size="12" />
              <span>Add Item</span>
            </button>
          </div>

          <div className="space-y-3">
            {selectedSection.items.map((item, idx) => (
              <div key={item.id} className="p-3 rounded-sm border border-border/40 bg-card/60 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[10px] text-muted-foreground font-bold">Item 0{idx + 1}</span>
                  <button
                    type="button"
                    onClick={() => onDeleteItem(item.id)}
                    className="text-muted-foreground hover:text-destructive cursor-pointer"
                    title="Delete item"
                  >
                    <Trash size="12" />
                  </button>
                </div>

                <div className="space-y-1">
                  <input
                    type="text"
                    value={item.title}
                    onChange={(e) => onUpdateItem(item.id, { title: e.target.value })}
                    placeholder="Item title"
                    className="w-full px-2 py-1 rounded-xs border border-border/60 bg-background text-xs font-semibold"
                  />
                  {item.subtitle !== undefined && (
                    <input
                      type="text"
                      value={item.subtitle || ""}
                      onChange={(e) => onUpdateItem(item.id, { subtitle: e.target.value })}
                      placeholder="Subtitle / Location"
                      className="w-full px-2 py-1 rounded-xs border border-border/60 bg-background text-xs"
                    />
                  )}
                  {item.description !== undefined && (
                    <textarea
                      rows={2}
                      value={item.description || ""}
                      onChange={(e) => onUpdateItem(item.id, { description: e.target.value })}
                      placeholder="Description..."
                      className="w-full px-2 py-1 rounded-xs border border-border/60 bg-background text-xs resize-none"
                    />
                  )}
                  {item.imageUrl !== undefined && (
                    <input
                      type="text"
                      value={item.imageUrl || ""}
                      onChange={(e) => onUpdateItem(item.id, { imageUrl: e.target.value })}
                      placeholder="Image URL"
                      className="w-full px-2 py-1 rounded-xs border border-border/60 bg-background text-xs font-mono text-[10px]"
                    />
                  )}
                  {item.badge !== undefined && (
                    <input
                      type="text"
                      value={item.badge || ""}
                      onChange={(e) => onUpdateItem(item.id, { badge: e.target.value })}
                      placeholder="Badge pill (e.g. Recommended)"
                      className="w-full px-2 py-1 rounded-xs border border-border/60 bg-background text-xs"
                    />
                  )}
                  {item.price !== undefined && (
                    <div className="grid grid-cols-2 gap-1.5">
                      <input
                        type="text"
                        value={item.price || ""}
                        onChange={(e) => onUpdateItem(item.id, { price: e.target.value })}
                        placeholder="Price (₹4,999)"
                        className="w-full px-2 py-1 rounded-xs border border-border/60 bg-background text-xs font-bold"
                      />
                      <input
                        type="text"
                        value={item.pricePeriod || ""}
                        onChange={(e) => onUpdateItem(item.id, { pricePeriod: e.target.value })}
                        placeholder="/ month"
                        className="w-full px-2 py-1 rounded-xs border border-border/60 bg-background text-xs"
                      />
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </aside>
  );
}
