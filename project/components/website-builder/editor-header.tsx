"use client";

import * as React from "react";
import { DeviceMode } from "./types";
import {
  ArrowLeft,
  Monitor,
  Mobile,
  Eye,
  Refresh,
  TickCircle,
  Clock,
  Send2,
} from "iconsax-react";

interface EditorHeaderProps {
  title: string;
  slug?: string;
  isPublished: boolean;
  isDirty: boolean;
  isSaving: boolean;
  lastSavedAt: string | null;
  deviceMode: DeviceMode;
  canUndo: boolean;
  canRedo: boolean;
  websiteId: string;
  onTitleChange: (newTitle: string) => void;
  onDeviceModeChange: (mode: DeviceMode) => void;
  onUndo: () => void;
  onRedo: () => void;
  onSave: () => void;
  onPublishToggle: () => void;
  onBackToGallery: () => void;
}

export function EditorHeader({
  title,
  slug,
  isPublished,
  isDirty,
  isSaving,
  lastSavedAt,
  deviceMode,
  canUndo,
  canRedo,
  websiteId,
  onTitleChange,
  onDeviceModeChange,
  onUndo,
  onRedo,
  onSave,
  onPublishToggle,
  onBackToGallery,
}: EditorHeaderProps) {
  return (
    <header className="h-16 bg-background/95 backdrop-blur-sm border-b border-border/40 px-4 sm:px-6 flex items-center justify-between gap-4 shrink-0 z-30">
      {/* Left: Back & Title */}
      <div className="flex items-center gap-3 min-w-0">
        <button
          type="button"
          onClick={onBackToGallery}
          className="p-1.5 rounded-sm hover:bg-muted text-muted-foreground hover:text-foreground cursor-pointer transition-colors shrink-0"
          title="Back to Studio Gallery"
        >
          <ArrowLeft size="18" />
        </button>

        <div className="h-4 w-px bg-border/60 shrink-0" />

        <div className="flex items-center gap-2 min-w-0">
          <input
            type="text"
            value={title}
            onChange={(e) => onTitleChange(e.target.value)}
            className="font-display text-sm font-bold bg-transparent border-b border-transparent hover:border-border/60 focus:border-brand-text focus:outline-hidden text-foreground truncate max-w-[200px] sm:max-w-[280px]"
            title="Click to rename website"
          />

          {isPublished && slug ? (
            <a
              href={`/site/${slug}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-mono font-semibold shrink-0 bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/25 transition-all shadow-xs"
              title={`View published live website at /site/${slug}`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span>/site/{slug}</span>
              <span className="text-[10px] opacity-75">↗</span>
            </a>
          ) : (
            <span
              className={`px-2 py-0.5 rounded-sm text-[10px] font-mono font-semibold shrink-0 ${
                isPublished
                  ? "bg-status-success-bg text-status-success-fg"
                  : "bg-muted/60 text-muted-foreground"
              }`}
            >
              {isPublished ? "Live" : "Draft"}
            </span>
          )}
        </div>
      </div>

      {/* Center: Device Viewport Switcher & Undo/Redo */}
      <div className="hidden md:flex items-center gap-2 bg-muted/40 p-1 rounded-sm border border-border/40">
        <button
          type="button"
          onClick={() => onDeviceModeChange("desktop")}
          className={`px-2.5 py-1 rounded-xs text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer ${
            deviceMode === "desktop"
              ? "bg-card text-foreground shadow-xs font-semibold"
              : "text-muted-foreground hover:text-foreground"
          }`}
          title="Desktop View (Fluid 1440px)"
        >
          <Monitor size="14" />
          <span>Desktop</span>
        </button>

        <button
          type="button"
          onClick={() => onDeviceModeChange("tablet")}
          className={`px-2.5 py-1 rounded-xs text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer ${
            deviceMode === "tablet"
              ? "bg-card text-foreground shadow-xs font-semibold"
              : "text-muted-foreground hover:text-foreground"
          }`}
          title="Tablet View (768px)"
        >
          <Monitor size="14" className="rotate-90" />
          <span>Tablet</span>
        </button>

        <button
          type="button"
          onClick={() => onDeviceModeChange("mobile")}
          className={`px-2.5 py-1 rounded-xs text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer ${
            deviceMode === "mobile"
              ? "bg-card text-foreground shadow-xs font-semibold"
              : "text-muted-foreground hover:text-foreground"
          }`}
          title="Mobile View (375px)"
        >
          <Mobile size="14" />
          <span>Mobile</span>
        </button>
      </div>

      {/* Right: Save, Status, Publish, Preview */}
      <div className="flex items-center gap-2.5 shrink-0">
        {/* Undo / Redo */}
        <div className="hidden lg:flex items-center gap-1 border-r border-border/40 pr-2">
          <button
            type="button"
            onClick={onUndo}
            disabled={!canUndo}
            className="p-1.5 rounded-xs text-muted-foreground hover:text-foreground disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed"
            title="Undo (Ctrl+Z)"
          >
            <span className="font-mono text-xs font-bold">↶</span>
          </button>
          <button
            type="button"
            onClick={onRedo}
            disabled={!canRedo}
            className="p-1.5 rounded-xs text-muted-foreground hover:text-foreground disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed"
            title="Redo (Ctrl+Y)"
          >
            <span className="font-mono text-xs font-bold">↷</span>
          </button>
        </div>

        {/* Save Status Indicator */}
        <div className="hidden sm:flex items-center gap-1.5 text-[11px] font-mono text-muted-foreground">
          {isSaving ? (
            <span className="flex items-center gap-1 text-brand-text">
              <Refresh size="12" className="animate-spin" />
              <span>Saving...</span>
            </span>
          ) : isDirty ? (
            <span className="flex items-center gap-1 text-amber-500">
              <Clock size="12" />
              <span>Unsaved changes</span>
            </span>
          ) : (
            <span className="flex items-center gap-1 text-status-success-fg">
              <TickCircle size="12" />
              <span>{lastSavedAt ? `Saved ${lastSavedAt}` : "Saved"}</span>
            </span>
          )}
        </div>

        {/* Save Draft Button */}
        <button
          type="button"
          onClick={onSave}
          disabled={isSaving}
          className="px-3 py-1.5 rounded-sm border border-border bg-card hover:bg-muted/60 text-foreground text-xs font-medium cursor-pointer shadow-xs transition-colors"
        >
          {isSaving ? "Saving..." : "Save Draft"}
        </button>

        {/* Publish Button */}
        <button
          type="button"
          onClick={onPublishToggle}
          className={`px-3.5 py-1.5 rounded-sm text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-xs transition-all ${
            isPublished
              ? "bg-card border border-border text-foreground hover:bg-muted/40"
              : "bg-brand text-brand-foreground hover:opacity-90"
          }`}
        >
          <Send2 size="13" />
          <span>{isPublished ? "Unpublish" : "Publish Site"}</span>
        </button>

        {/* Clean Standalone Preview */}
        <a
          href={`/dashboard/website/preview/${websiteId}`}
          target="_blank"
          rel="noopener noreferrer"
          className="p-1.5 rounded-sm border border-border bg-card hover:bg-muted text-muted-foreground hover:text-foreground cursor-pointer shadow-xs"
          title="Open Live Preview in New Tab"
        >
          <Eye size="16" />
        </a>
      </div>
    </header>
  );
}
