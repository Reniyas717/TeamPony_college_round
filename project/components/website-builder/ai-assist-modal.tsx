"use client";

import * as React from "react";
import { WebsiteSection, WebsiteTheme } from "@/lib/validations/website";
import { Magicpen, CloseCircle, TickCircle, Refresh } from "iconsax-react";

interface AiAssistModalProps {
  isOpen: boolean;
  section: WebsiteSection | null;
  theme: WebsiteTheme;
  onClose: () => void;
  onApply: (patch: Partial<WebsiteSection>) => void;
}

export function AiAssistModal({
  isOpen,
  section,
  theme,
  onClose,
  onApply,
}: AiAssistModalProps) {
  const [selectedAction, setSelectedAction] = React.useState<
    "refine_heading" | "shorten_subtitle" | "generate_ctas" | "generate_section_copy"
  >("refine_heading");
  const [industryTopic, setIndustryTopic] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [suggestions, setSuggestions] = React.useState<
    { title?: string; subtitle?: string; body?: string; ctaPrimary?: string; ctaSecondary?: string }[]
  >([]);

  if (!isOpen || !section) return null;

  const handleGenerate = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/website/ai-assist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: selectedAction,
          currentText: section.title,
          sectionType: section.type,
          vibe: theme.colorVibe || "editorial",
          topic: industryTopic.trim() || undefined,
        }),
      });

      const json = await res.json();
      if (json.data?.suggestions) {
        setSuggestions(json.data.suggestions);
      }
    } catch {
      // Graceful fallback
    } finally {
      setLoading(false);
    }
  };

  const handleApplySuggestion = (s: {
    title?: string;
    subtitle?: string;
    body?: string;
    ctaPrimary?: string;
    ctaSecondary?: string;
  }) => {
    const patch: Partial<WebsiteSection> = {};
    if (s.title) patch.title = s.title;
    if (s.subtitle) patch.subtitle = s.subtitle;
    if (s.body) patch.body = s.body;
    if (s.ctaPrimary && section.buttons && section.buttons.length > 0) {
      patch.buttons = section.buttons.map((b, i) =>
        i === 0
          ? { ...b, text: s.ctaPrimary! }
          : i === 1 && s.ctaSecondary
          ? { ...b, text: s.ctaSecondary! }
          : b
      );
    }
    onApply(patch);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div className="bg-card border border-border rounded-sm shadow-2xl max-w-lg w-full flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="p-4 border-b border-border/40 flex items-center justify-between shrink-0 bg-muted/20">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-sm bg-brand-subtle flex items-center justify-center text-brand-text">
              <Magicpen size="16" />
            </div>
            <div>
              <h3 className="font-display text-sm font-bold text-foreground">AI Copywriting Assistant</h3>
              <p className="text-[11px] text-muted-foreground">Targeted copywriting for: {section.name}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-sm text-muted-foreground hover:text-foreground cursor-pointer"
          >
            <CloseCircle size="18" />
          </button>
        </div>

        {/* Action Selectors */}
        <div className="p-4 space-y-4 text-xs">
          <div className="space-y-1.5">
            <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground block">
              Assistance Goal
            </label>
            <div className="grid grid-cols-2 gap-1.5">
              {[
                { id: "refine_heading", label: "Refine Heading" },
                { id: "shorten_subtitle", label: "Shorten Subtitle" },
                { id: "generate_ctas", label: "Generate CTAs" },
                { id: "generate_section_copy", label: "Generate Full Copy" },
              ].map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => {
                    setSelectedAction(opt.id as typeof selectedAction);
                    setSuggestions([]);
                  }}
                  className={`p-2 rounded-sm border text-[11px] font-medium text-left cursor-pointer transition-colors ${
                    selectedAction === opt.id
                      ? "border-brand-text bg-accent text-foreground font-semibold"
                      : "border-border/40 bg-card text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {selectedAction === "generate_section_copy" && (
            <div className="space-y-1.5">
              <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground block">
                Brand / Industry Focus
              </label>
              <input
                type="text"
                value={industryTopic}
                onChange={(e) => setIndustryTopic(e.target.value)}
                placeholder="e.g. Sustainable Architectural Studio, B2B Cloud Security..."
                className="w-full px-3 py-1.5 rounded-sm border border-border/60 bg-background text-xs"
              />
            </div>
          )}

          <div className="pt-1">
            <button
              type="button"
              onClick={handleGenerate}
              disabled={loading}
              className="w-full py-2 px-4 rounded-sm bg-brand text-brand-foreground text-xs font-semibold hover:opacity-90 cursor-pointer flex items-center justify-center gap-2 shadow-xs transition-opacity"
            >
              {loading ? (
                <>
                  <Refresh size="14" className="animate-spin" />
                  <span>Synthesizing Copy...</span>
                </>
              ) : (
                <>
                  <Magicpen size="14" />
                  <span>Generate Suggestions</span>
                </>
              )}
            </button>
          </div>

          {/* Suggestions List */}
          {suggestions.length > 0 && (
            <div className="space-y-2 pt-2 border-t border-border/40">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground block">
                Generated Options (Click to Apply)
              </span>

              <div className="space-y-2 max-h-56 overflow-y-auto">
                {suggestions.map((s, idx) => (
                  <div
                    key={idx}
                    onClick={() => handleApplySuggestion(s)}
                    className="p-3 rounded-sm border border-border/60 hover:border-brand-text bg-card/60 hover:bg-accent/40 cursor-pointer transition-all space-y-1.5 group"
                  >
                    {s.title && (
                      <p className="font-display font-bold text-xs text-foreground group-hover:text-brand-text">
                        {s.title}
                      </p>
                    )}
                    {s.subtitle && (
                      <p className="text-[11px] text-muted-foreground leading-relaxed">{s.subtitle}</p>
                    )}
                    {s.body && (
                      <p className="text-[11px] text-muted-foreground leading-relaxed">{s.body}</p>
                    )}
                    {s.ctaPrimary && (
                      <div className="flex items-center gap-2 pt-1 font-mono text-[10px] text-brand-text">
                        <span>[1] {s.ctaPrimary}</span>
                        {s.ctaSecondary && <span>• [2] {s.ctaSecondary}</span>}
                      </div>
                    )}
                    <div className="pt-1 flex justify-end">
                      <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-brand-text">
                        <TickCircle size="12" />
                        <span>Apply</span>
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
