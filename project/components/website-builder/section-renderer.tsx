/* eslint-disable @next/next/no-img-element */
"use client";

import * as React from "react";
import { WebsiteSection, WebsiteTheme, SectionItem } from "@/lib/validations/website";
import { ArrowUp, ArrowDown, Copy, Trash, TickCircle, Eye, EyeSlash } from "iconsax-react";

interface SectionRendererProps {
  section: WebsiteSection;
  theme: WebsiteTheme;
  isEditorMode?: boolean;
  isSelected?: boolean;
  onSelect?: () => void;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  onDuplicate?: () => void;
  onDelete?: () => void;
  onToggleHide?: () => void;
  onUpdateField?: (field: keyof WebsiteSection, value: unknown) => void;
  onUpdateItem?: (itemId: string, itemPatch: Partial<SectionItem>) => void;
}

export function SectionRenderer({
  section,
  theme,
  isEditorMode = false,
  isSelected = false,
  onSelect,
  onMoveUp,
  onMoveDown,
  onDuplicate,
  onDelete,
  onToggleHide,
}: SectionRendererProps) {
  if (section.hidden) {
    if (!isEditorMode) {
      return null;
    }

    // In editor mode: render a clean, distinct collapsed placeholder bar
    return (
      <div
        id={section.id}
        onClick={onSelect}
        className={`my-3 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 transition-all ${
          isSelected ? "ring-2 ring-brand-text ring-offset-2" : ""
        }`}
      >
        <div className="py-3 px-5 rounded-sm border border-dashed border-amber-600/40 bg-amber-500/10 flex items-center justify-between text-xs cursor-pointer hover:bg-amber-500/15 transition-colors">
          <div className="flex items-center gap-2.5">
            <EyeSlash size="16" className="text-amber-600 dark:text-amber-400 shrink-0" />
            <span className="font-semibold text-foreground">{section.name}</span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-600/20 text-amber-700 dark:text-amber-300 uppercase tracking-wider font-bold">
              Hidden from live visitors
            </span>
          </div>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onToggleHide?.();
            }}
            className="px-3 py-1.5 rounded-xs bg-background border border-border hover:bg-muted text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-xs text-brand-text"
            title="Unhide Section"
          >
            <Eye size="13" />
            <span>Unhide Section</span>
          </button>
        </div>
      </div>
    );
  }

  // Derive styles based on section style and theme
  const getSectionBg = () => {
    switch (section.style.background) {
      case "subtle":
        return theme.surfaceBg || "#F4EFE6";
      case "contrast":
        return "#1F1C18";
      case "dark":
        return "#0D0D0D";
      case "brand":
        return theme.accentColor;
      default:
        return theme.canvasBg || "#FDFBF7";
    }
  };

  const isDarkSection = section.style.background === "dark" || section.style.background === "contrast";
  const textColor = isDarkSection ? "#F9FAFB" : theme.textPrimary || "#1F1C18";
  const mutedTextColor = isDarkSection ? "#9CA3AF" : theme.textMuted || "#797268";
  const borderColor = isDarkSection ? "rgba(255, 255, 255, 0.12)" : theme.borderColor || "rgba(31, 28, 24, 0.12)";

  const getPaddingClasses = () => {
    switch (section.style.paddingY) {
      case "none":
        return "py-0";
      case "compact":
        return "py-6 sm:py-8";
      case "spacious":
        return "py-20 sm:py-28 md:py-32";
      default:
        return "py-12 sm:py-16 md:py-20";
    }
  };

  const getFontFamily = () => {
    if (theme.fontHeading === "serif") return "font-serif";
    if (theme.fontHeading === "mono") return "font-mono";
    return "font-display";
  };

  return (
    <section
      id={section.id}
      onClick={isEditorMode ? onSelect : undefined}
      style={{ backgroundColor: getSectionBg(), color: textColor }}
      className={`relative transition-all duration-150 ${getPaddingClasses()} ${
        isEditorMode
          ? isSelected
            ? "ring-2 ring-brand-text ring-offset-2 z-10"
            : "hover:ring-1 hover:ring-brand-text/50 cursor-pointer"
          : ""
      }`}
    >
      {/* Editor Chrome & Floating Controls */}
      {isEditorMode && isSelected && (
        <div className="absolute top-2 right-4 z-30 flex items-center gap-1 bg-card text-foreground px-2 py-1 rounded-sm shadow-md border border-border text-xs pointer-events-auto">
          <span className="font-mono text-[10px] text-muted-foreground mr-1.5 uppercase font-medium">
            {section.name}
          </span>
          {onMoveUp && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onMoveUp();
              }}
              className="p-1 hover:bg-accent rounded-xs text-muted-foreground hover:text-foreground cursor-pointer"
              title="Move Up"
            >
              <ArrowUp size="12" />
            </button>
          )}
          {onMoveDown && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onMoveDown();
              }}
              className="p-1 hover:bg-accent rounded-xs text-muted-foreground hover:text-foreground cursor-pointer"
              title="Move Down"
            >
              <ArrowDown size="12" />
            </button>
          )}
          {onDuplicate && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onDuplicate();
              }}
              className="p-1 hover:bg-accent rounded-xs text-muted-foreground hover:text-foreground cursor-pointer"
              title="Duplicate"
            >
              <Copy size="12" />
            </button>
          )}
          {onToggleHide && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onToggleHide();
              }}
              className="p-1 hover:bg-accent rounded-xs text-muted-foreground hover:text-foreground cursor-pointer"
              title={section.hidden ? "Unhide Section" : "Hide from visitors"}
            >
              {section.hidden ? <EyeSlash size="12" /> : <Eye size="12" />}
            </button>
          )}
          {onDelete && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
              }}
              className="p-1 hover:bg-destructive/10 rounded-xs text-muted-foreground hover:text-destructive cursor-pointer"
              title="Delete Section"
            >
              <Trash size="12" />
            </button>
          )}
        </div>
      )}

      {/* Container wrapper */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* ============================================================== */}
        {/* 1. HEADER SECTION */}
        {/* ============================================================== */}
        {section.type === "header" && (
          <header className="flex items-center justify-between gap-6 py-2 border-b" style={{ borderColor }}>
            <div className="flex items-center gap-3">
              <span className={`${getFontFamily()} text-lg sm:text-xl font-bold tracking-tight uppercase`}>
                {section.title}
              </span>
              {section.subtitle && (
                <span className="text-[10px] uppercase tracking-widest font-mono" style={{ color: mutedTextColor }}>
                  • {section.subtitle}
                </span>
              )}
            </div>

            <nav className="flex items-center gap-4 sm:gap-6 text-xs sm:text-sm font-medium">
              {section.buttons.map((btn) => (
                <a
                  key={btn.id}
                  href={btn.href}
                  className={`transition-colors ${
                    btn.variant === "primary"
                      ? "px-3.5 py-1.5 rounded-sm font-semibold shadow-xs"
                      : btn.variant === "outline"
                      ? "px-3 py-1.5 rounded-sm border"
                      : "hover:opacity-75"
                  }`}
                  style={
                    btn.variant === "primary"
                      ? { backgroundColor: theme.accentColor, color: "#FFFFFF" }
                      : btn.variant === "outline"
                      ? { borderColor }
                      : { color: mutedTextColor }
                  }
                >
                  {btn.text}
                </a>
              ))}
            </nav>
          </header>
        )}

        {/* ============================================================== */}
        {/* 2. HERO SECTION */}
        {/* ============================================================== */}
        {section.type === "hero" && (
          <div className="space-y-8 md:space-y-12">
            <div className={`space-y-4 max-w-4xl ${section.style.align === "center" ? "mx-auto text-center" : ""}`}>
              {section.eyebrow && (
                <div
                  className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full text-[10px] sm:text-xs font-mono font-medium tracking-wider uppercase border"
                  style={{ borderColor, color: theme.accentColor }}
                >
                  <span>{section.eyebrow}</span>
                </div>
              )}

              <h1 className={`${getFontFamily()} text-3xl sm:text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight leading-[1.08]`}>
                {section.title}
              </h1>

              {section.subtitle && (
                <p className="text-base sm:text-lg md:text-xl leading-relaxed max-w-2xl" style={{ color: mutedTextColor }}>
                  {section.subtitle}
                </p>
              )}

              {/* Hero Buttons */}
              {section.buttons && section.buttons.length > 0 && (
                <div className={`pt-2 flex flex-wrap items-center gap-3 ${section.style.align === "center" ? "justify-center" : ""}`}>
                  {section.buttons.map((btn) => (
                    <a
                      key={btn.id}
                      href={btn.href}
                      className={`inline-flex items-center justify-center px-6 py-3 rounded-sm text-sm font-semibold transition-all duration-200 cursor-pointer shadow-xs ${
                        btn.variant === "primary"
                          ? "hover:opacity-95"
                          : "border hover:bg-black/5 dark:hover:bg-white/5"
                      }`}
                      style={
                        btn.variant === "primary"
                          ? { backgroundColor: theme.accentColor, color: "#FFFFFF" }
                          : { borderColor, color: textColor }
                      }
                    >
                      {btn.text}
                    </a>
                  ))}
                </div>
              )}
            </div>

            {/* Hero Main Visual / Media */}
            {section.imageUrl && (
              <div className="relative rounded-sm overflow-hidden border shadow-lg" style={{ borderColor }}>
                <img
                  src={section.imageUrl}
                  alt={section.imageAlt || section.title}
                  className="w-full h-[320px] sm:h-[460px] md:h-[560px] object-cover"
                />
                {section.secondaryImageUrl && (
                  <div
                    className="hidden lg:block absolute bottom-6 right-6 w-72 h-44 rounded-sm overflow-hidden border-2 shadow-2xl"
                    style={{ borderColor }}
                  >
                    <img
                      src={section.secondaryImageUrl}
                      alt="Detail perspective"
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ============================================================== */}
        {/* 3. MANIFESTO SECTION */}
        {/* ============================================================== */}
        {section.type === "manifesto" && (
          <div className="space-y-8">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              <div className="lg:col-span-8 space-y-4">
                {section.eyebrow && (
                  <span className="text-xs font-mono font-semibold uppercase tracking-widest" style={{ color: theme.accentColor }}>
                    {section.eyebrow}
                  </span>
                )}
                <h2 className={`${getFontFamily()} text-2xl sm:text-4xl md:text-5xl font-bold tracking-tight leading-tight`}>
                  {section.title}
                </h2>
                {section.body && (
                  <p className="text-sm sm:text-base leading-relaxed max-w-2xl pt-2" style={{ color: mutedTextColor }}>
                    {section.body}
                  </p>
                )}
              </div>

              {section.imageUrl && (
                <div className="lg:col-span-4 rounded-sm overflow-hidden border" style={{ borderColor }}>
                  <img
                    src={section.imageUrl}
                    alt={section.imageAlt || "Manifesto visual"}
                    className="w-full h-64 sm:h-80 object-cover"
                  />
                </div>
              )}
            </div>

            {/* Manifesto Principle Columns */}
            {section.items && section.items.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-6 border-t" style={{ borderColor }}>
                {section.items.map((it, idx) => (
                  <div key={it.id || idx} className="space-y-1.5">
                    <span className="font-mono text-xs font-bold" style={{ color: theme.accentColor }}>
                      0{idx + 1}
                    </span>
                    <h3 className={`${getFontFamily()} text-base font-bold`}>{it.title}</h3>
                    {it.description && (
                      <p className="text-xs leading-relaxed" style={{ color: mutedTextColor }}>
                        {it.description}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ============================================================== */}
        {/* 4. GALLERY / PORTFOLIO SECTION */}
        {/* ============================================================== */}
        {section.type === "gallery" && (
          <div className="space-y-10">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b pb-4" style={{ borderColor }}>
              <div className="space-y-1">
                {section.eyebrow && (
                  <span className="text-xs font-mono font-semibold uppercase tracking-wider" style={{ color: theme.accentColor }}>
                    {section.eyebrow}
                  </span>
                )}
                <h2 className={`${getFontFamily()} text-2xl sm:text-4xl font-bold tracking-tight`}>{section.title}</h2>
              </div>
              {section.subtitle && (
                <p className="text-xs sm:text-sm max-w-md text-right sm:text-left" style={{ color: mutedTextColor }}>
                  {section.subtitle}
                </p>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {section.items.map((item) => (
                <div
                  key={item.id}
                  className="group relative rounded-sm overflow-hidden border transition-all duration-300 flex flex-col justify-between"
                  style={{ borderColor, backgroundColor: isDarkSection ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.02)" }}
                >
                  {item.imageUrl && (
                    <div className="relative h-64 sm:h-72 w-full overflow-hidden">
                      <img
                        src={item.imageUrl}
                        alt={item.imageAlt || item.title}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                      {item.badge && (
                        <span
                          className="absolute top-3 left-3 px-2 py-0.5 rounded-full text-[10px] font-mono font-medium bg-black/70 text-white backdrop-blur-xs"
                        >
                          {item.badge}
                        </span>
                      )}
                    </div>
                  )}

                  <div className="p-5 space-y-2">
                    <div className="flex items-center justify-between text-xs font-mono" style={{ color: mutedTextColor }}>
                      <span>{item.subtitle}</span>
                      <span>{item.meta}</span>
                    </div>
                    <h3 className={`${getFontFamily()} text-lg font-bold tracking-tight`}>{item.title}</h3>
                    {item.description && (
                      <p className="text-xs leading-relaxed" style={{ color: mutedTextColor }}>
                        {item.description}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* 5. CASE STUDIES (Creative Studio) */}
        {/* ============================================================== */}
        {section.type === "case-studies" && (
          <div className="space-y-12">
            <div className="border-b pb-4 flex flex-col sm:flex-row justify-between sm:items-end gap-2" style={{ borderColor }}>
              <div>
                {section.eyebrow && (
                  <span className="text-xs font-mono font-bold uppercase tracking-widest" style={{ color: theme.accentColor }}>
                    {section.eyebrow}
                  </span>
                )}
                <h2 className={`${getFontFamily()} text-3xl sm:text-5xl font-bold tracking-tight`}>{section.title}</h2>
              </div>
              {section.subtitle && (
                <p className="text-xs sm:text-sm max-w-sm" style={{ color: mutedTextColor }}>
                  {section.subtitle}
                </p>
              )}
            </div>

            <div className="space-y-8">
              {section.items.map((item, idx) => (
                <div
                  key={item.id}
                  className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center p-6 rounded-sm border group"
                  style={{ borderColor, backgroundColor: isDarkSection ? "rgba(255,255,255,0.02)" : "rgba(0,0,0,0.01)" }}
                >
                  <div className={`lg:col-span-7 ${idx % 2 === 1 ? "lg:order-2" : ""}`}>
                    {item.imageUrl && (
                      <div className="h-64 sm:h-96 rounded-sm overflow-hidden border" style={{ borderColor }}>
                        <img
                          src={item.imageUrl}
                          alt={item.imageAlt || item.title}
                          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                        />
                      </div>
                    )}
                  </div>

                  <div className={`lg:col-span-5 space-y-4 ${idx % 2 === 1 ? "lg:order-1" : ""}`}>
                    <div className="flex items-center gap-2 text-xs font-mono" style={{ color: theme.accentColor }}>
                      <span className="font-bold">0{idx + 1}</span>
                      <span>•</span>
                      <span>{item.meta}</span>
                    </div>
                    <h3 className={`${getFontFamily()} text-2xl sm:text-3xl font-bold tracking-tight`}>
                      {item.title}
                    </h3>
                    <p className="text-xs sm:text-sm font-mono" style={{ color: mutedTextColor }}>
                      {item.subtitle}
                    </p>
                    {item.description && (
                      <p className="text-xs sm:text-sm leading-relaxed" style={{ color: mutedTextColor }}>
                        {item.description}
                      </p>
                    )}
                    {item.badge && (
                      <span className="inline-block px-2.5 py-1 text-[10px] font-mono uppercase tracking-wider rounded-xs border" style={{ borderColor }}>
                        {item.badge}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* 6. FEATURES / BENCHMARKS SECTION */}
        {/* ============================================================== */}
        {section.type === "features" && (
          <div className="space-y-8">
            <div className={`max-w-2xl ${section.style.align === "center" ? "mx-auto text-center" : ""}`}>
              {section.eyebrow && (
                <span className="text-xs font-mono font-bold tracking-wider uppercase block mb-1" style={{ color: theme.accentColor }}>
                  {section.eyebrow}
                </span>
              )}
              <h2 className={`${getFontFamily()} text-2xl sm:text-4xl font-bold tracking-tight`}>{section.title}</h2>
              {section.subtitle && (
                <p className="text-xs sm:text-sm mt-2 leading-relaxed" style={{ color: mutedTextColor }}>
                  {section.subtitle}
                </p>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {section.items.map((feat) => (
                <div
                  key={feat.id}
                  className="p-6 rounded-sm border space-y-3"
                  style={{ borderColor, backgroundColor: isDarkSection ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.02)" }}
                >
                  {feat.badge && (
                    <span
                      className="inline-block px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold uppercase tracking-wider"
                      style={{ backgroundColor: `${theme.accentColor}20`, color: theme.accentColor }}
                    >
                      {feat.badge}
                    </span>
                  )}
                  <h3 className={`${getFontFamily()} text-lg font-bold tracking-tight`}>{feat.title}</h3>
                  {feat.description && (
                    <p className="text-xs sm:text-sm leading-relaxed" style={{ color: mutedTextColor }}>
                      {feat.description}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* 7. METRICS SECTION */}
        {/* ============================================================== */}
        {section.type === "metrics" && (
          <div className="space-y-8">
            <div className="text-center max-w-2xl mx-auto space-y-2">
              {section.eyebrow && (
                <span className="text-xs font-mono font-semibold tracking-wider uppercase" style={{ color: theme.accentColor }}>
                  {section.eyebrow}
                </span>
              )}
              <h2 className={`${getFontFamily()} text-2xl sm:text-4xl font-bold tracking-tight`}>{section.title}</h2>
              {section.subtitle && (
                <p className="text-xs sm:text-sm" style={{ color: mutedTextColor }}>
                  {section.subtitle}
                </p>
              )}
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6 pt-4">
              {section.items.map((m) => (
                <div
                  key={m.id}
                  className="p-5 rounded-sm border text-center space-y-1.5"
                  style={{ borderColor, backgroundColor: isDarkSection ? "rgba(255,255,255,0.02)" : "rgba(0,0,0,0.01)" }}
                >
                  <p className={`${getFontFamily()} text-3xl sm:text-4xl font-bold tabular-nums`} style={{ color: theme.accentColor }}>
                    {m.title}
                  </p>
                  <p className="text-xs font-semibold font-mono tracking-tight">{m.subtitle}</p>
                  {m.description && (
                    <p className="text-[11px] leading-tight" style={{ color: mutedTextColor }}>
                      {m.description}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* 8. PRICING SECTION */}
        {/* ============================================================== */}
        {section.type === "pricing" && (
          <div className="space-y-10">
            <div className="text-center max-w-2xl mx-auto space-y-2">
              {section.eyebrow && (
                <span className="text-xs font-mono font-semibold tracking-wider uppercase" style={{ color: theme.accentColor }}>
                  {section.eyebrow}
                </span>
              )}
              <h2 className={`${getFontFamily()} text-2xl sm:text-4xl font-bold tracking-tight`}>{section.title}</h2>
              {section.subtitle && (
                <p className="text-xs sm:text-sm" style={{ color: mutedTextColor }}>
                  {section.subtitle}
                </p>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-stretch">
              {section.items.map((plan) => {
                const isRec = !!plan.badge;
                return (
                  <div
                    key={plan.id}
                    className={`p-6 sm:p-8 rounded-sm border flex flex-col justify-between relative ${
                      isRec ? "ring-2" : ""
                    }`}
                    style={{
                      borderColor: isRec ? theme.accentColor : borderColor,
                      backgroundColor: isRec
                        ? isDarkSection
                          ? "rgba(255,255,255,0.05)"
                          : "rgba(0,0,0,0.03)"
                        : isDarkSection
                        ? "rgba(255,255,255,0.02)"
                        : "transparent",
                    }}
                  >
                    {plan.badge && (
                      <span
                        className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full text-[10px] font-mono font-semibold uppercase tracking-wider text-white"
                        style={{ backgroundColor: theme.accentColor }}
                      >
                        {plan.badge}
                      </span>
                    )}

                    <div className="space-y-4">
                      <div className="space-y-1">
                        <h3 className={`${getFontFamily()} text-lg font-bold`}>{plan.title}</h3>
                        <p className="text-xs" style={{ color: mutedTextColor }}>
                          {plan.description}
                        </p>
                      </div>

                      <div className="pt-2 pb-4 border-b flex items-baseline gap-1" style={{ borderColor }}>
                        <span className={`${getFontFamily()} text-3xl sm:text-4xl font-bold tabular-nums`}>
                          {plan.price}
                        </span>
                        <span className="text-xs font-mono" style={{ color: mutedTextColor }}>
                          {plan.pricePeriod}
                        </span>
                      </div>

                      {plan.features && (
                        <ul className="space-y-2.5 text-xs">
                          {plan.features.map((feat, fi) => (
                            <li key={fi} className="flex items-center gap-2">
                              <TickCircle size="14" style={{ color: theme.accentColor }} />
                              <span>{feat}</span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>

                    {plan.button && (
                      <div className="pt-6 mt-6 border-t" style={{ borderColor }}>
                        <a
                          href={plan.button.href}
                          className={`w-full py-2.5 px-4 rounded-sm text-xs font-semibold text-center block transition-all ${
                            isRec ? "text-white shadow-xs" : "border hover:bg-black/5 dark:hover:bg-white/5"
                          }`}
                          style={
                            isRec
                              ? { backgroundColor: theme.accentColor }
                              : { borderColor, color: textColor }
                          }
                        >
                          {plan.button.text}
                        </a>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* 9. SERVICES SECTION */}
        {/* ============================================================== */}
        {section.type === "services" && (
          <div className="space-y-8">
            <div className="border-b pb-4 flex flex-col sm:flex-row justify-between sm:items-end gap-2" style={{ borderColor }}>
              <div>
                {section.eyebrow && (
                  <span className="text-xs font-mono font-semibold tracking-wider uppercase" style={{ color: theme.accentColor }}>
                    {section.eyebrow}
                  </span>
                )}
                <h2 className={`${getFontFamily()} text-2xl sm:text-4xl font-bold tracking-tight`}>{section.title}</h2>
              </div>
              {section.subtitle && (
                <p className="text-xs sm:text-sm max-w-sm" style={{ color: mutedTextColor }}>
                  {section.subtitle}
                </p>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
              {section.items.map((srv) => (
                <div key={srv.id} className="p-6 rounded-sm border space-y-2" style={{ borderColor }}>
                  <div className="flex items-center justify-between font-mono text-xs" style={{ color: theme.accentColor }}>
                    <span>{srv.meta}</span>
                  </div>
                  <h3 className={`${getFontFamily()} text-lg font-bold tracking-tight`}>{srv.title}</h3>
                  {srv.description && (
                    <p className="text-xs sm:text-sm leading-relaxed" style={{ color: mutedTextColor }}>
                      {srv.description}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* 10. CTA SECTION */}
        {/* ============================================================== */}
        {section.type === "cta" && (
          <div className="text-center max-w-3xl mx-auto space-y-6">
            {section.eyebrow && (
              <span className="text-xs font-mono font-semibold tracking-wider uppercase" style={{ color: theme.accentColor }}>
                {section.eyebrow}
              </span>
            )}
            <h2 className={`${getFontFamily()} text-3xl sm:text-5xl font-bold tracking-tight leading-tight`}>
              {section.title}
            </h2>
            {section.subtitle && (
              <p className="text-sm sm:text-base leading-relaxed" style={{ color: mutedTextColor }}>
                {section.subtitle}
              </p>
            )}

            {section.buttons && section.buttons.length > 0 && (
              <div className="pt-2 flex flex-wrap items-center justify-center gap-3">
                {section.buttons.map((btn) => (
                  <a
                    key={btn.id}
                    href={btn.href}
                    className={`px-6 py-3 rounded-sm text-sm font-semibold transition-all shadow-xs ${
                      btn.variant === "primary" ? "hover:opacity-95 text-white" : "border hover:bg-black/5 dark:hover:bg-white/5"
                    }`}
                    style={
                      btn.variant === "primary"
                        ? { backgroundColor: theme.accentColor }
                        : { borderColor, color: textColor }
                    }
                  >
                    {btn.text}
                  </a>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ============================================================== */}
        {/* 11. FOOTER SECTION */}
        {/* ============================================================== */}
        {section.type === "footer" && (
          <footer className="space-y-6 text-center pt-4 border-t" style={{ borderColor }}>
            <div className="space-y-2 max-w-xl mx-auto">
              <span className={`${getFontFamily()} text-base sm:text-lg font-bold tracking-tight uppercase block`}>
                {section.title}
              </span>
              {section.subtitle && (
                <p className="text-xs font-mono" style={{ color: mutedTextColor }}>
                  {section.subtitle}
                </p>
              )}
              {section.body && (
                <p className="text-[11px] leading-relaxed" style={{ color: mutedTextColor }}>
                  {section.body}
                </p>
              )}
            </div>

            {section.buttons && section.buttons.length > 0 && (
              <div className="flex items-center justify-center gap-4 text-xs font-medium pt-2">
                {section.buttons.map((btn) => (
                  <a
                    key={btn.id}
                    href={btn.href}
                    className="hover:underline font-semibold"
                    style={{ color: theme.accentColor }}
                  >
                    {btn.text}
                  </a>
                ))}
              </div>
            )}
          </footer>
        )}
      </div>
    </section>
  );
}
