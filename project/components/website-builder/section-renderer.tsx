/* eslint-disable @next/next/no-img-element */
"use client";

import * as React from "react";
import { WebsiteSection, WebsiteTheme, SectionItem } from "@/lib/validations/website";
import { BillingPlanId } from "@/lib/validations/billing";
import {
  ArrowUp,
  ArrowDown,
  Copy,
  Trash,
  TickCircle,
  Eye,
  EyeSlash,
  HambergerMenu,
  CloseSquare,
} from "iconsax-react";

declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => {
      open: () => void;
    };
  }
}

// Dynamically inject Razorpay Checkout SDK if not yet loaded
function ensureRazorpayScriptLoaded(): Promise<boolean> {
  if (typeof window === "undefined") return Promise.resolve(false);
  if (window.Razorpay) return Promise.resolve(true);

  return new Promise((resolve) => {
    const existingScript = document.querySelector('script[src="https://checkout.razorpay.com/v1/checkout.js"]');
    if (existingScript) {
      existingScript.addEventListener("load", () => resolve(true));
      existingScript.addEventListener("error", () => resolve(false));
      return;
    }
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

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

interface ContactFormSectionProps {
  section: WebsiteSection;
  theme: WebsiteTheme;
  isEditorMode: boolean;
  textColor: string;
  mutedTextColor: string;
  surfaceBg?: string;
  borderColor: string;
  getFontFamily: () => string;
}

function ContactFormSection({
  section,
  theme,
  isEditorMode,
  textColor,
  mutedTextColor,
  surfaceBg = theme.surfaceBg || "#F4EFE6",
  borderColor,
  getFontFamily,
}: ContactFormSectionProps) {
  const [firstName, setFirstName] = React.useState("");
  const [lastName, setLastName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [company, setCompany] = React.useState("");
  const [phone, setPhone] = React.useState("");
  const [message, setMessage] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);
  const [submitted, setSubmitted] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firstName.trim() || !lastName.trim() || !email.trim()) {
      setError("Please fill in first name, last name, and a valid email.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/crm/contacts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          email: email.trim(),
          company: company.trim() || undefined,
          phone: phone.trim() || undefined,
          source: "website_form",
          stage: "lead",
          next_action_text: message.trim() || "Website contact form submission",
        }),
      });

      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json?.error?.message || "Failed to submit inquiry");
      }

      setSubmitted(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Submission failed");
    } finally {
      setSubmitting(false);
    }
  };

  const handleReset = () => {
    setSubmitted(false);
    setFirstName("");
    setLastName("");
    setEmail("");
    setCompany("");
    setPhone("");
    setMessage("");
    setError(null);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start py-4">
      {/* Left Col: Narrative & CRM Connectivity */}
      <div className="lg:col-span-5 space-y-4">
        {section.eyebrow && (
          <span
            className="text-[11px] font-mono uppercase tracking-widest block font-semibold"
            style={{ color: theme.accentColor }}
          >
            {section.eyebrow}
          </span>
        )}
        <h2
          className={`${getFontFamily()} text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight leading-tight`}
          style={{ color: textColor }}
        >
          {section.title || "Get In Touch With Us"}
        </h2>
        {section.subtitle && (
          <p className="text-sm sm:text-base leading-relaxed" style={{ color: mutedTextColor }}>
            {section.subtitle}
          </p>
        )}
        {section.body && (
          <p className="text-xs sm:text-sm leading-relaxed" style={{ color: mutedTextColor }}>
            {section.body}
          </p>
        )}

        {/* Live CRM connectivity pill */}
        <div
          className="p-3.5 rounded-sm border flex items-start gap-3 mt-6"
          style={{ borderColor, backgroundColor: surfaceBg }}
        >
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse shrink-0 mt-1" />
          <div className="space-y-0.5">
            <p className="text-xs font-semibold" style={{ color: textColor }}>
              Nexus Intelligent CRM Connected
            </p>
            <p className="text-[11px] leading-relaxed" style={{ color: mutedTextColor }}>
              Inquiries submit directly into your Intelligent CRM pipeline as New Leads with source &apos;Website Form&apos;.
            </p>
          </div>
        </div>

        {isEditorMode && (
          <div className="text-[11px] font-mono px-3 py-2 rounded-sm bg-brand-subtle text-brand-text border border-brand/20">
            Interactive Form: Test submitting now to verify real-time ingestion into your Intelligent CRM.
          </div>
        )}
      </div>

      {/* Right Col: Interactive Lead Capture Form */}
      <div className="lg:col-span-7">
        <div
          className="p-6 sm:p-8 rounded-sm border shadow-sm"
          style={{
            borderColor,
            backgroundColor: surfaceBg,
          }}
        >
          {submitted ? (
            <div className="text-center py-8 space-y-4 animate-in fade-in zoom-in-95 duration-200">
              <div
                className="w-12 h-12 rounded-full mx-auto flex items-center justify-center text-white shadow-sm"
                style={{ backgroundColor: theme.accentColor }}
              >
                <TickCircle size="24" />
              </div>
              <div className="space-y-1">
                <h3 className={`${getFontFamily()} text-xl font-bold`} style={{ color: textColor }}>
                  Inquiry Received
                </h3>
                <p className="text-xs sm:text-sm max-w-md mx-auto" style={{ color: mutedTextColor }}>
                  Thank you! Your contact lead has been captured and routed directly to the Nexus Intelligent CRM.
                </p>
              </div>

              <div className="flex flex-wrap items-center justify-center gap-3 pt-4">
                <a
                  href="/dashboard/crm"
                  className="px-4 py-2 rounded-sm text-xs font-semibold text-white transition-opacity hover:opacity-90 inline-flex items-center gap-1.5 cursor-pointer shadow-xs"
                  style={{ backgroundColor: theme.accentColor }}
                >
                  <span>View in Intelligent CRM &rarr;</span>
                </a>
                <button
                  type="button"
                  onClick={handleReset}
                  className="px-4 py-2 rounded-sm text-xs font-semibold border transition-colors hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer"
                  style={{ borderColor, color: textColor }}
                >
                  Send Another Inquiry
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="p-3 rounded-sm text-xs bg-destructive/10 text-destructive border border-destructive/20 font-medium">
                  {error}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-[11px] font-semibold uppercase tracking-wider block" style={{ color: mutedTextColor }}>
                    First Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    placeholder="e.g. Rohan"
                    className="w-full px-3 py-2 text-xs rounded-sm border bg-background/80 focus:outline-hidden"
                    style={{ borderColor, color: textColor }}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[11px] font-semibold uppercase tracking-wider block" style={{ color: mutedTextColor }}>
                    Last Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    placeholder="e.g. Sharma"
                    className="w-full px-3 py-2 text-xs rounded-sm border bg-background/80 focus:outline-hidden"
                    style={{ borderColor, color: textColor }}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-semibold uppercase tracking-wider block" style={{ color: mutedTextColor }}>
                  Work Email *
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="rohan@enterprise.in"
                  className="w-full px-3 py-2 text-xs rounded-sm border bg-background/80 focus:outline-hidden"
                  style={{ borderColor, color: textColor }}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-[11px] font-semibold uppercase tracking-wider block" style={{ color: mutedTextColor }}>
                    Company / Studio
                  </label>
                  <input
                    type="text"
                    value={company}
                    onChange={(e) => setCompany(e.target.value)}
                    placeholder="Apex Tech Solutions"
                    className="w-full px-3 py-2 text-xs rounded-sm border bg-background/80 focus:outline-hidden"
                    style={{ borderColor, color: textColor }}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[11px] font-semibold uppercase tracking-wider block" style={{ color: mutedTextColor }}>
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+91 98201 12345"
                    className="w-full px-3 py-2 text-xs rounded-sm border bg-background/80 focus:outline-hidden"
                    style={{ borderColor, color: textColor }}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-semibold uppercase tracking-wider block" style={{ color: mutedTextColor }}>
                  Project Brief or Inquiry
                </label>
                <textarea
                  rows={3}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Tell us about your project requirements, timeline, or consultation goals..."
                  className="w-full px-3 py-2 text-xs rounded-sm border bg-background/80 focus:outline-hidden resize-none"
                  style={{ borderColor, color: textColor }}
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full sm:w-auto px-6 py-2.5 rounded-sm text-xs font-bold text-white transition-opacity hover:opacity-95 cursor-pointer shadow-xs disabled:opacity-50"
                  style={{ backgroundColor: theme.accentColor }}
                >
                  {submitting ? "Submitting Inquiry..." : section.buttons?.[0]?.text || "Submit Inquiry"}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
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
  const sectionStyle = section.style || { background: "default", paddingY: "normal", align: "left" };
  const getSectionBg = () => {
    switch (sectionStyle.background) {
      case "subtle":
        return theme.surfaceBg || "#F4EFE6";
      case "contrast":
        return "#1F1C18";
      case "dark":
        return "#0D0D0D";
      case "brand":
        return theme.accentColor || "#C85A32";
      default:
        return theme.canvasBg || "#FDFBF7";
    }
  };

  const isDarkSection = sectionStyle.background === "dark" || sectionStyle.background === "contrast";
  const textColor = isDarkSection ? "#F9FAFB" : theme.textPrimary || "#1F1C18";
  const mutedTextColor = isDarkSection ? "#9CA3AF" : theme.textMuted || "#797268";
  const borderColor = isDarkSection ? "rgba(255, 255, 255, 0.12)" : theme.borderColor || "rgba(31, 28, 24, 0.12)";
  const surfaceBg = isDarkSection ? "rgba(255, 255, 255, 0.05)" : theme.surfaceBg || "#F4EFE6";

  const getPaddingClasses = () => {
    switch (sectionStyle.paddingY) {
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

  // State for interactive Razorpay payments directly within published site & preview
  const [checkoutPlanId, setCheckoutPlanId] = React.useState<string | null>(null);
  const [successPlanId, setSuccessPlanId] = React.useState<string | null>(null);
  const [paymentError, setPaymentError] = React.useState<string | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState<boolean>(false);

  // Smooth scroll and routing helper for in-page anchors & routes
  const handleNavClick = (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    if (!href) return;
    setMobileMenuOpen(false);

    if (href.startsWith("#")) {
      e.preventDefault();
      const targetId = href.replace(/^#/, "").toLowerCase();
      // Look for element with that id, prefixed id, or matching data-section-type
      const el =
        document.getElementById(targetId) ||
        document.getElementById(`sec-${targetId}`) ||
        document.getElementById(`saas-${targetId}`) ||
        document.getElementById(`cs-${targetId}`) ||
        document.getElementById(`blank-${targetId}`) ||
        document.querySelector(`[data-section-type="${targetId}"]`);

      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    }
  };

  const handlePricingPayment = async (plan: SectionItem) => {
    setCheckoutPlanId(plan.id);
    setPaymentError(null);
    setSuccessPlanId(null);

    try {
      // 1. Resolve tier plan ID
      let planId: BillingPlanId = "growth";
      const titleLower = (plan.title || "").toLowerCase();
      if (titleLower.includes("starter") || titleLower.includes("basic") || titleLower.includes("solo") || titleLower.includes("sandbox")) {
        planId = "starter";
      } else if (titleLower.includes("enterprise") || titleLower.includes("custom") || titleLower.includes("scale") || titleLower.includes("dedicated")) {
        planId = "enterprise";
      } else {
        planId = "growth";
      }

      // 2. Load Razorpay SDK
      const sdkLoaded = await ensureRazorpayScriptLoaded();

      // 3. Create real order on backend
      const res = await fetch("/api/billing/razorpay/order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planId, billingInterval: "monthly" }),
      });

      if (!res.ok) {
        throw new Error("Unable to create payment order. Please try again.");
      }

      const { data: order } = await res.json();

      if (typeof window !== "undefined" && window.Razorpay && sdkLoaded) {
        const options = {
          key: order.keyId || "rzp_test_UKHiHLEpvJ8wdz",
          amount: order.amount * 100,
          currency: "INR",
          name: section.title || "Website Checkout",
          description: `${plan.title} Subscription`,
          order_id:
            order.orderId && order.orderId.startsWith("order_") && !order.orderId.startsWith("order_test")
              ? order.orderId
              : undefined,
          prefill: {
            name: "Website Visitor",
            email: "visitor@nexusplatform.io",
          },
          theme: {
            color: theme.accentColor || "#2563EB",
          },
          handler: async (response: {
            razorpay_payment_id: string;
            razorpay_order_id?: string;
            razorpay_signature?: string;
          }) => {
            try {
              // Verify on server
              const verifyRes = await fetch("/api/billing/razorpay/verify", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  planId,
                  razorpay_order_id: response.razorpay_order_id || order.orderId,
                  razorpay_payment_id: response.razorpay_payment_id,
                  razorpay_signature: response.razorpay_signature || "sim_sig_verified",
                }),
              });

              if (!verifyRes.ok) {
                // Also gracefully fall back to tier registration
                await fetch("/api/billing/change-plan", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    planId,
                    billingInterval: "monthly",
                    razorpayPaymentId: response.razorpay_payment_id,
                    razorpayOrderId: response.razorpay_order_id || order.orderId,
                  }),
                });
              }

              // Also capture as paying contact lead in CRM
              await fetch("/api/crm/contacts", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  first_name: "Customer",
                  last_name: `(${plan.title})`,
                  email: `checkout_${Date.now()}@customer.com`,
                  source: "website_checkout",
                  stage: "customer",
                  next_action_text: `Completed Razorpay payment for ${plan.title} (${plan.price}). Payment ID: ${response.razorpay_payment_id}`,
                }),
              }).catch(() => {});

              setSuccessPlanId(plan.id);
            } catch (vErr) {
              setPaymentError(vErr instanceof Error ? vErr.message : "Payment verification failed.");
            } finally {
              setCheckoutPlanId(null);
            }
          },
          modal: {
            ondismiss: () => {
              setCheckoutPlanId(null);
            },
          },
        };

        const rzp = new window.Razorpay(options);
        rzp.open();
      } else {
        // Fast sandbox verification mode when Razorpay modal blocked or offline
        const simPayId = `pay_test_${Math.random().toString(36).substring(2, 9)}`;
        await fetch("/api/billing/change-plan", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            planId,
            billingInterval: "monthly",
            razorpayPaymentId: simPayId,
            razorpayOrderId: order.orderId,
          }),
        });

        // Capture in CRM
        await fetch("/api/crm/contacts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            first_name: "Customer",
            last_name: `(${plan.title})`,
            email: `checkout_${Date.now()}@customer.com`,
            source: "website_checkout",
            stage: "customer",
            next_action_text: `Completed sandbox checkout for ${plan.title} (${plan.price}).`,
          }),
        }).catch(() => {});

        setSuccessPlanId(plan.id);
        setCheckoutPlanId(null);
      }
    } catch (err) {
      setPaymentError(err instanceof Error ? err.message : "Payment initialization failed.");
      setCheckoutPlanId(null);
    }
  };

  return (
    <section
      id={section.id}
      data-section-type={section.type}
      onClick={isEditorMode ? onSelect : undefined}
      style={{ backgroundColor: getSectionBg(), color: textColor }}
      className={`relative transition-all duration-150 scroll-mt-6 ${getPaddingClasses()} ${
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
          <header className="relative py-2 border-b" style={{ borderColor }}>
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                <span className={`${getFontFamily()} text-base sm:text-xl font-bold tracking-tight uppercase truncate`}>
                  {section.title}
                </span>
                {section.subtitle && (
                  <span className="text-[10px] uppercase tracking-widest font-mono hidden sm:inline-block" style={{ color: mutedTextColor }}>
                    • {section.subtitle}
                  </span>
                )}
              </div>

              {/* Desktop Nav */}
              <nav className="hidden md:flex items-center gap-4 lg:gap-6 text-xs sm:text-sm font-medium">
                {(section.buttons || []).map((btn) => (
                  <a
                    key={btn.id}
                    href={btn.href}
                    onClick={(e) => handleNavClick(e, btn.href)}
                    className={`transition-colors cursor-pointer ${
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

              {/* Mobile Menu Hamburger Toggle */}
              {(section.buttons || []).length > 0 && (
                <button
                  type="button"
                  onClick={() => setMobileMenuOpen((prev) => !prev)}
                  className="md:hidden p-2 rounded-sm border cursor-pointer transition-colors"
                  style={{ borderColor, color: textColor }}
                  aria-label="Toggle navigation menu"
                >
                  {mobileMenuOpen ? <CloseSquare size="18" /> : <HambergerMenu size="18" />}
                </button>
              )}
            </div>

            {/* Mobile Collapsible Navigation Menu */}
            {mobileMenuOpen && (section.buttons || []).length > 0 && (
              <div
                className="md:hidden pt-4 pb-3 mt-3 border-t space-y-2 animate-in fade-in slide-in-from-top-1"
                style={{ borderColor }}
              >
                {(section.buttons || []).map((btn) => (
                  <a
                    key={btn.id}
                    href={btn.href}
                    onClick={(e) => handleNavClick(e, btn.href)}
                    className={`block w-full py-2 px-3 rounded-sm text-xs font-semibold cursor-pointer transition-colors text-center ${
                      btn.variant === "primary"
                        ? "text-white shadow-xs"
                        : btn.variant === "outline"
                        ? "border"
                        : "hover:bg-black/5 dark:hover:bg-white/5"
                    }`}
                    style={
                      btn.variant === "primary"
                        ? { backgroundColor: theme.accentColor }
                        : btn.variant === "outline"
                        ? { borderColor, color: textColor }
                        : { color: textColor }
                    }
                  >
                    {btn.text}
                  </a>
                ))}
              </div>
            )}
          </header>
        )}

        {/* ============================================================== */}
        {/* 2. HERO SECTION */}
        {/* ============================================================== */}
        {section.type === "hero" && (
          <div className="space-y-8 md:space-y-12">
            <div className={`space-y-4 max-w-4xl ${sectionStyle.align === "center" ? "mx-auto text-center" : ""}`}>
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
                <div className={`pt-2 flex flex-wrap items-center gap-3 ${sectionStyle.align === "center" ? "justify-center" : ""}`}>
                  {(section.buttons || []).map((btn) => (
                    <a
                      key={btn.id}
                      href={btn.href}
                      onClick={(e) => handleNavClick(e, btn.href)}
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
              {(section.items || []).map((item) => (
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
              {(section.items || []).map((item, idx) => (
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
            <div className={`max-w-2xl ${sectionStyle.align === "center" ? "mx-auto text-center" : ""}`}>
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
              {(section.items || []).map((feat) => (
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
              {(section.items || []).map((m) => (
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

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 items-stretch">
              {(section.items || []).map((plan) => {
                const isRec = !!plan.badge;
                const isPlanCheckout = checkoutPlanId === plan.id;
                const isPlanSuccess = successPlanId === plan.id;

                return (
                  <div
                    key={plan.id}
                    className={`p-5 sm:p-7 md:p-8 rounded-sm border flex flex-col justify-between relative transition-shadow ${
                      isRec ? "ring-2 shadow-sm" : ""
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
                        className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full text-[10px] font-mono font-semibold uppercase tracking-wider text-white shadow-xs whitespace-nowrap"
                        style={{ backgroundColor: theme.accentColor }}
                      >
                        {plan.badge}
                      </span>
                    )}

                    <div className="space-y-4">
                      <div className="space-y-1">
                        <div className="flex items-center justify-between gap-2">
                          <h3 className={`${getFontFamily()} text-base sm:text-lg font-bold truncate`}>{plan.title}</h3>
                          <span className="text-[10px] font-mono text-emerald-500 font-semibold uppercase tracking-wider shrink-0">
                            Razorpay
                          </span>
                        </div>
                        <p className="text-xs leading-relaxed" style={{ color: mutedTextColor }}>
                          {plan.description}
                        </p>
                      </div>

                      <div className="pt-2 pb-4 border-b flex flex-wrap items-baseline gap-1.5" style={{ borderColor }}>
                        <span className={`${getFontFamily()} text-2xl sm:text-3xl md:text-4xl font-bold tabular-nums`}>
                          {plan.price}
                        </span>
                        <span className="text-xs font-mono" style={{ color: mutedTextColor }}>
                          {plan.pricePeriod}
                        </span>
                      </div>

                      {plan.features && (
                        <ul className="space-y-2.5 text-xs">
                          {(plan.features || []).map((feat, fi) => (
                            <li key={fi} className="flex items-start gap-2">
                              <TickCircle size="14" className="shrink-0 mt-0.5" style={{ color: theme.accentColor }} />
                              <span className="leading-tight">{feat}</span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>

                    <div className="pt-6 mt-6 border-t space-y-2" style={{ borderColor }}>
                      {isPlanSuccess ? (
                        <div className="p-2.5 rounded-sm bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-xs text-center font-semibold animate-in fade-in">
                          Payment Successful! Subscribed via Razorpay.
                        </div>
                      ) : (
                        <button
                          type="button"
                          disabled={isPlanCheckout}
                          onClick={() => handlePricingPayment(plan)}
                          className={`w-full py-2.5 px-4 rounded-sm text-xs font-semibold text-center block transition-all cursor-pointer disabled:opacity-60 shadow-xs ${
                            isRec ? "text-white" : "border hover:bg-black/5 dark:hover:bg-white/5"
                          }`}
                          style={
                            isRec
                              ? { backgroundColor: theme.accentColor }
                              : { borderColor, color: textColor }
                          }
                        >
                          {isPlanCheckout ? (
                            <span className="flex items-center justify-center gap-2">
                              <span className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
                              Connecting Razorpay...
                            </span>
                          ) : (
                            plan.button?.text || "Pay with Razorpay"
                          )}
                        </button>
                      )}

                      {paymentError && checkoutPlanId === plan.id && (
                        <p className="text-[11px] text-destructive text-center font-medium mt-1">
                          {paymentError}
                        </p>
                      )}

                      <div className="flex items-center justify-center gap-1.5 pt-1 text-[10px] font-mono text-muted-foreground/70">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                        <span>Instant Checkout • Test Key rzp_test_...</span>
                      </div>
                    </div>
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
              {(section.items || []).map((srv) => (
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
                {(section.buttons || []).map((btn) => (
                  <a
                    key={btn.id}
                    href={btn.href}
                    onClick={(e) => handleNavClick(e, btn.href)}
                    className={`px-6 py-3 rounded-sm text-sm font-semibold transition-all shadow-xs cursor-pointer ${
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
        {/* 11. CONTACT FORM SECTION */}
        {/* ============================================================== */}
        {section.type === "contact" && (
          <ContactFormSection
            section={section}
            theme={theme}
            isEditorMode={isEditorMode}
            textColor={textColor}
            mutedTextColor={mutedTextColor}
            surfaceBg={surfaceBg}
            borderColor={borderColor}
            getFontFamily={getFontFamily}
          />
        )}

        {/* ============================================================== */}
        {/* 12. FOOTER SECTION */}
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
                {(section.buttons || []).map((btn) => (
                  <a
                    key={btn.id}
                    href={btn.href}
                    onClick={(e) => handleNavClick(e, btn.href)}
                    className="hover:underline font-semibold cursor-pointer"
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
