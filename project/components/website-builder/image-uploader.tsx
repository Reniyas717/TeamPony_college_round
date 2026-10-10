/* eslint-disable @next/next/no-img-element */
"use client";

import * as React from "react";
import { DocumentUpload, Gallery, CloseCircle, Refresh, TickCircle } from "iconsax-react";

interface ImageUploaderProps {
  label: string;
  value?: string;
  onChange: (url: string) => void;
  helperText?: string;
}

export function ImageUploader({
  label,
  value,
  onChange,
  helperText = "PNG, JPG, WebP up to 10MB stored on Supabase Storage",
}: ImageUploaderProps) {
  const [isUploading, setIsUploading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [success, setSuccess] = React.useState(false);
  const fileInputRef = React.useRef<HTMLInputElement | null>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setError(null);
    setSuccess(false);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/website/upload", {
        method: "POST",
        body: formData,
      });

      const json = await res.json();

      if (!res.ok) {
        throw new Error(json?.error?.message || "Failed to upload image");
      }

      const uploadedUrl = json?.data?.url;
      if (uploadedUrl) {
        onChange(uploadedUrl);
        setSuccess(true);
        setTimeout(() => setSuccess(false), 3000);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Upload error");
    } finally {
      setIsUploading(false);
      // Reset input so same file can be re-selected if needed
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block">
          {label}
        </label>
        {value && (
          <button
            type="button"
            onClick={() => onChange("")}
            className="text-[10px] text-destructive hover:underline inline-flex items-center gap-0.5 cursor-pointer"
          >
            <CloseCircle size="11" />
            <span>Remove</span>
          </button>
        )}
      </div>

      {/* Image Preview & Upload Dropzone */}
      <div className="space-y-2">
        {value ? (
          <div className="relative group rounded-sm border border-border/60 overflow-hidden bg-muted/40 aspect-video flex items-center justify-center">
            <img
              src={value}
              alt="Preview"
              className="w-full h-full object-cover transition-transform group-hover:scale-102"
            />
            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 p-2">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                className="px-2.5 py-1 rounded-xs bg-white text-zinc-900 text-[11px] font-semibold flex items-center gap-1 cursor-pointer shadow-xs hover:bg-zinc-100"
              >
                <DocumentUpload size="12" />
                <span>Replace</span>
              </button>
            </div>
          </div>
        ) : (
          <div
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-border/70 hover:border-brand-text/60 rounded-sm p-4 text-center cursor-pointer transition-colors bg-card/40 hover:bg-card/70 flex flex-col items-center justify-center gap-1.5"
          >
            <div className="w-8 h-8 rounded-full bg-brand-subtle flex items-center justify-center text-brand-text">
              <Gallery size="16" />
            </div>
            <div className="space-y-0.5">
              <p className="text-xs font-semibold text-foreground">
                Click to upload from device
              </p>
              <p className="text-[10px] text-muted-foreground">{helperText}</p>
            </div>
          </div>
        )}

        {/* Hidden File Input */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          className="hidden"
        />

        {/* URL Direct Edit Input */}
        <div className="flex items-center gap-1.5">
          <input
            type="text"
            value={value || ""}
            onChange={(e) => onChange(e.target.value)}
            placeholder="Or paste external image URL..."
            className="flex-1 px-2.5 py-1 rounded-xs border border-border/60 bg-card text-foreground text-[11px] font-mono focus:ring-1 focus:ring-brand-text"
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className="px-2 py-1 rounded-xs border border-border bg-card hover:bg-muted text-foreground text-[11px] font-medium flex items-center gap-1 cursor-pointer shrink-0 disabled:opacity-50"
            title="Upload Image"
          >
            {isUploading ? (
              <Refresh size="12" className="animate-spin text-brand-text" />
            ) : (
              <DocumentUpload size="12" />
            )}
            <span>{isUploading ? "Uploading..." : "Upload"}</span>
          </button>
        </div>

        {/* Upload feedback states */}
        {error && (
          <p className="text-[10px] text-destructive font-medium flex items-center gap-1">
            <CloseCircle size="11" />
            <span>{error}</span>
          </p>
        )}
        {success && (
          <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1">
            <TickCircle size="11" />
            <span>Saved to Supabase Storage!</span>
          </p>
        )}
      </div>
    </div>
  );
}
