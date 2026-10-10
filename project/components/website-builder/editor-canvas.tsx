"use client";

import * as React from "react";
import { WebsiteDocument, WebsiteSection } from "@/lib/validations/website";
import { DeviceMode } from "./types";
import { SectionRenderer } from "./section-renderer";
import { Add, Global } from "iconsax-react";

interface EditorCanvasProps {
  document: WebsiteDocument;
  selectedSectionId: string | null;
  deviceMode: DeviceMode;
  onSelectSection: (id: string) => void;
  onMoveUp: (index: number) => void;
  onMoveDown: (index: number) => void;
  onDuplicate: (index: number) => void;
  onDelete: (index: number) => void;
  onToggleHide: (index: number) => void;
  onOpenAddSection: (insertIndex?: number) => void;
  onUpdateSectionField: (id: string, field: keyof WebsiteSection, value: unknown) => void;
}

export function EditorCanvas({
  document,
  selectedSectionId,
  deviceMode,
  onSelectSection,
  onMoveUp,
  onMoveDown,
  onDuplicate,
  onDelete,
  onToggleHide,
  onOpenAddSection,
  onUpdateSectionField,
}: EditorCanvasProps) {
  const sections = document.sections || [];

  // Width styling based on selected device preview mode
  const getDeviceContainerStyle = () => {
    switch (deviceMode) {
      case "mobile":
        return {
          width: "375px",
          minHeight: "780px",
          borderRadius: "32px",
          border: "8px solid #1F1C18",
          boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.35)",
        };
      case "tablet":
        return {
          width: "768px",
          minHeight: "900px",
          borderRadius: "20px",
          border: "8px solid #2D2A26",
          boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
        };
      default:
        return {
          width: "100%",
          minHeight: "100%",
          borderRadius: "0px",
          border: "none",
          boxShadow: "none",
        };
    }
  };

  return (
    <div className="flex-1 overflow-y-auto bg-muted/30 p-4 sm:p-6 lg:p-8 flex justify-center items-start min-h-[calc(100vh-120px)]">
      <div
        style={getDeviceContainerStyle()}
        className={`bg-background transition-all duration-300 relative overflow-hidden flex flex-col ${
          deviceMode !== "desktop" ? "my-4" : "w-full max-w-full"
        }`}
      >
        {/* Mobile Device Frame Header Notch / Dynamic Island */}
        {deviceMode === "mobile" && (
          <div className="sticky top-0 z-40 bg-black text-white h-7 flex items-center justify-between px-6 shrink-0">
            <span className="text-[10px] font-mono font-medium">9:41</span>
            <div className="w-20 h-4 bg-zinc-900 rounded-full mx-auto" />
            <span className="text-[10px] font-mono font-medium">5G</span>
          </div>
        )}

        {/* Tablet Device Frame Indicator */}
        {deviceMode === "tablet" && (
          <div className="sticky top-0 z-40 bg-zinc-900 text-zinc-400 h-5 flex items-center justify-center shrink-0">
            <div className="w-2.5 h-2.5 rounded-full bg-zinc-700" />
          </div>
        )}

        {/* Render sections or empty state */}
        {sections.length === 0 ? (
          <div className="p-16 text-center space-y-4 my-auto">
            <div className="w-12 h-12 rounded-sm bg-muted/50 flex items-center justify-center mx-auto text-muted-foreground">
              <Global size="24" />
            </div>
            <div>
              <h3 className="font-display text-lg font-bold">No sections in this page</h3>
              <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
                Start creating your site by inserting your first hero, feature grid, or editorial section.
              </p>
            </div>
            <button
              type="button"
              onClick={() => onOpenAddSection(0)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-sm bg-brand text-brand-foreground text-xs font-semibold hover:opacity-90 cursor-pointer shadow-xs"
            >
              <Add size="16" />
              <span>Add First Section</span>
            </button>
          </div>
        ) : (
          <div className="flex-1 flex flex-col">
            {sections.map((section, index) => (
              <React.Fragment key={section.id}>
                <SectionRenderer
                  section={section}
                  theme={document.theme}
                  isEditorMode={true}
                  isSelected={selectedSectionId === section.id}
                  onSelect={() => onSelectSection(section.id)}
                  onMoveUp={index > 0 ? () => onMoveUp(index) : undefined}
                  onMoveDown={index < sections.length - 1 ? () => onMoveDown(index) : undefined}
                  onDuplicate={() => onDuplicate(index)}
                  onDelete={() => onDelete(index)}
                  onToggleHide={() => onToggleHide(index)}
                  onUpdateField={(field, val) => onUpdateSectionField(section.id, field, val)}
                />

                {/* Inline Section Inserter Line on hover in desktop mode */}
                {deviceMode === "desktop" && (
                  <div className="group relative h-4 -my-2 z-20 flex items-center justify-center">
                    <div className="w-full h-px bg-transparent group-hover:bg-brand-text/30 transition-colors" />
                    <button
                      type="button"
                      onClick={() => onOpenAddSection(index + 1)}
                      className="opacity-0 group-hover:opacity-100 transition-opacity absolute px-2.5 py-0.5 rounded-full bg-card text-foreground border border-border shadow-xs text-[10px] font-semibold flex items-center gap-1 hover:bg-accent cursor-pointer"
                    >
                      <Add size="12" className="text-brand-text" />
                      <span>Insert Section</span>
                    </button>
                  </div>
                )}
              </React.Fragment>
            ))}

            {/* Bottom Add Section Button in Editor Canvas */}
            <div className="p-8 text-center bg-muted/10 border-t border-dashed border-border/60">
              <button
                type="button"
                onClick={() => onOpenAddSection(sections.length)}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-sm border border-border/80 bg-card hover:bg-accent text-foreground text-xs font-medium cursor-pointer shadow-xs transition-colors"
              >
                <Add size="14" className="text-brand-text" />
                <span>Add Section to Bottom</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
