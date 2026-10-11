"use client";

import * as React from "react";
import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

function CustomerResponseContent() {
  const searchParams = useSearchParams();
  const contactId = searchParams.get("id");
  const decisionParam = searchParams.get("decision"); // "yes" | "no"

  const [contactName, setContactName] = useState<string>("there");
  const [loading, setLoading] = useState<boolean>(true);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [outcome, setOutcome] = useState<"yes" | "no" | null>(null);
  const [aiReasoning, setAiReasoning] = useState<string | null>(null);
  const [aiEngine, setAiEngine] = useState<string | null>(null);
  const [customResponse, setCustomResponse] = useState<string>("");
  const [isCustomAi, setIsCustomAi] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // 1. Fetch contact info if ID is present
  useEffect(() => {
    if (!contactId) {
      setLoading(false);
      return;
    }

    fetch(`/api/crm/contacts/${contactId}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.data?.first_name) {
          setContactName(data.data.first_name);
        }
      })
      .catch(() => {})
      .finally(() => {
        setLoading(false);
      });
  }, [contactId]);

  // 2. Auto-process if decision parameter is in URL (from email button click)
  useEffect(() => {
    if (!contactId || !decisionParam || outcome) return;

    const isYes = decisionParam.toLowerCase() === "yes";
    const text = isYes
      ? "Yes, I am interested and want to connect!"
      : "No, not interested. Please unsubscribe me.";

    setIsCustomAi(false);
    setSubmitting(true);
    fetch(`/api/crm/contacts/${contactId}/response`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        channel: "email",
        responseText: text,
      }),
    })
      .then(async (res) => {
        if (!res.ok) {
          throw new Error("Failed to record response");
        }
        const data = await res.json();
        setOutcome(isYes ? "yes" : "no");
        if (data?.data?.reasoning) setAiReasoning(data.data.reasoning);
        if (data?.data?.engine) setAiEngine(data.data.engine);
      })
      .catch((err) => {
        setErrorMsg(err instanceof Error ? err.message : "Failed to record response");
      })
      .finally(() => {
        setSubmitting(false);
      });
  }, [contactId, decisionParam, outcome]);

  // 3. Handle manual button click on the page
  const handleSelectChoice = async (choice: "yes" | "no") => {
    if (!contactId) {
      setOutcome(choice);
      return;
    }

    setIsCustomAi(false);
    setSubmitting(true);
    setErrorMsg(null);
    const text =
      choice === "yes"
        ? "Yes, I am interested and want to connect!"
        : "No, not interested. Please unsubscribe me.";

    try {
      const res = await fetch(`/api/crm/contacts/${contactId}/response`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          channel: "email",
          responseText: text,
        }),
      });

      if (!res.ok) {
        throw new Error("Failed to record response");
      }

      const data = await res.json();
      setOutcome(choice);
      if (data?.data?.reasoning) setAiReasoning(data.data.reasoning);
      if (data?.data?.engine) setAiEngine(data.data.engine);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Failed to record response");
    } finally {
      setSubmitting(false);
    }
  };

  // 4. Handle custom message typed by customer (Evaluated by Groq / Gemini AI)
  const handleCustomSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customResponse.trim() || !contactId) return;

    setIsCustomAi(true);
    setSubmitting(true);
    setErrorMsg(null);

    try {
      const res = await fetch(`/api/crm/contacts/${contactId}/response`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          channel: "message",
          responseText: customResponse.trim(),
        }),
      });

      if (!res.ok) {
        throw new Error("Failed to process message");
      }

      const data = await res.json();
      const isYes = data?.data?.decision === "YES";
      setOutcome(isYes ? "yes" : "no");
      if (data?.data?.reasoning) setAiReasoning(data.data.reasoning);
      if (data?.data?.engine) setAiEngine(data.data.engine);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Failed to process message");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading || submitting) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="bg-card border border-border p-8 rounded-xl shadow-lg max-w-md w-full text-center flex flex-col items-center gap-4 animate-pulse">
          <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center text-primary">
            <svg className="w-6 h-6 animate-pulse" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
            </svg>
          </div>
          <h2 className="text-xl font-display font-semibold text-foreground">
            {submitting
              ? isCustomAi
                ? "Analyzing Your Message with AI..."
                : "Recording Your Response..."
              : "Loading..."}
          </h2>
          <p className="text-sm text-muted-foreground">
            {submitting
              ? isCustomAi
                ? "Evaluating intent and updating preferences in real time..."
                : "Saving your confirmation directly to CRM..."
              : "Fetching inquiry details..."}
          </p>
        </div>
      </div>
    );
  }

  // Outcome confirmation view
  if (outcome) {
    const isYes = outcome === "yes";
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="bg-card border border-border p-8 md:p-10 rounded-2xl shadow-xl max-w-lg w-full text-center flex flex-col items-center gap-5 animate-in fade-in zoom-in-95 duration-300">
          <div
            className={`w-16 h-16 rounded-full flex items-center justify-center shadow-sm ${
              isYes
                ? "bg-status-success-bg/30 text-status-success-fg border border-status-success-border"
                : "bg-status-danger-bg/30 text-status-danger-fg border border-status-danger-border"
            }`}
          >
            {isYes ? (
              <svg className="w-8 h-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            ) : (
              <svg className="w-8 h-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            )}
          </div>

          <div className="space-y-2">
            <h1 className="text-2xl md:text-3xl font-display font-bold text-foreground">
              {isYes ? `Awesome, ${contactName}!` : "Response Recorded"}
            </h1>
            <p className="text-muted-foreground text-sm md:text-base leading-relaxed">
              {isYes
                ? "We have recorded your confirmation. Our team will reach out with personalized next steps shortly."
                : "Thank you for letting us know. We have noted that you are not interested, and your email/number has been removed from future outreach."}
            </p>
          </div>

          <div
            className={`w-full py-3 px-4 rounded-lg text-xs font-semibold flex items-center justify-center gap-2 ${
              isYes
                ? "bg-status-success-bg/20 text-status-success-fg border border-status-success-border"
                : "bg-status-danger-bg/20 text-status-danger-fg border border-status-danger-border"
            }`}
          >
            <span>{isYes ? "STATUS: QUALIFIED (INTERESTED)" : "STATUS: CHURNED (UNSUBSCRIBED)"}</span>
          </div>

          {isCustomAi && aiReasoning && (
            <div className="w-full p-3 bg-muted/40 rounded-lg border border-border/80 text-left text-xs space-y-1">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-foreground">AI Sentiment Assessment:</span>
                {aiEngine && (
                  <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-primary/10 text-primary font-bold">
                    {aiEngine}
                  </span>
                )}
              </div>
              <p className="text-muted-foreground italic">&ldquo;{aiReasoning}&rdquo;</p>
            </div>
          )}

          <p className="text-xs text-muted-foreground pt-4 border-t border-border w-full">
            Nexus Autonomous Business Platform • Powered by Real-Time Telemetry
          </p>
        </div>
      </div>
    );
  }

  // Interactive Choice View (Customer opens the inquiry response page)
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="bg-card border border-border p-8 md:p-10 rounded-2xl shadow-xl max-w-lg w-full text-center flex flex-col items-center gap-6 animate-in fade-in duration-300">
        <div className="w-14 h-14 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
          <svg className="w-7 h-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect width="20" height="16" x="2" y="4" rx="2" />
            <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
          </svg>
        </div>

        <div className="space-y-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-primary bg-primary/10 px-3 py-1 rounded-full">
            Customer Response Portal
          </span>
          <h1 className="text-2xl md:text-3xl font-display font-bold text-foreground pt-2">
            Hi {contactName},
          </h1>
          <p className="text-muted-foreground text-sm md:text-base leading-relaxed">
            Thank you for reaching out via our website inquiry form! Are you interested in speaking with our team?
          </p>
        </div>

        {errorMsg && (
          <div className="w-full p-3 rounded-md bg-destructive/10 text-destructive border border-destructive/20 text-xs font-semibold">
            {errorMsg}
          </div>
        )}

        {/* 1-Click Fast Options */}
        <div className="flex flex-col sm:flex-row gap-3 w-full pt-1">
          <button
            type="button"
            onClick={() => handleSelectChoice("yes")}
            className="flex-1 py-3.5 px-4 rounded-xl bg-status-success-bg text-status-success-fg border border-status-success-border hover:bg-status-success-bg/80 font-sans font-bold text-sm flex items-center justify-center gap-2 transition-all shadow-sm hover:scale-[1.02] cursor-pointer"
          >
            <svg className="w-4 h-4 stroke-[2.5]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
            <span>Yes, I&apos;m Interested!</span>
          </button>

          <button
            type="button"
            onClick={() => handleSelectChoice("no")}
            className="flex-1 py-3.5 px-4 rounded-xl bg-status-danger-bg text-status-danger-fg border border-status-danger-border hover:bg-status-danger-bg/80 font-sans font-bold text-sm flex items-center justify-center gap-2 transition-all shadow-sm hover:scale-[1.02] cursor-pointer"
          >
            <svg className="w-4 h-4 stroke-[2.5]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
            <span>No, Not Interested</span>
          </button>
        </div>

        {/* Optional Custom Response Text Box (Evaluated by Groq / Gemini AI) */}
        <div className="w-full pt-3 border-t border-border/60 text-left">
          <form onSubmit={handleCustomSubmit} className="space-y-2.5">
            <label className="text-xs font-semibold text-muted-foreground block">
              Or type your response (Evaluated by Groq / Gemini AI):
            </label>
            <textarea
              className="w-full p-3 text-sm rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring resize-none min-h-[70px]"
              placeholder="e.g., 'Yes, let's schedule a call tomorrow afternoon' or 'Not looking for this right now, thanks'"
              value={customResponse}
              onChange={(e) => setCustomResponse(e.target.value)}
            />
            <button
              type="submit"
              disabled={!customResponse.trim()}
              className="w-full py-2.5 px-4 rounded-lg bg-primary text-primary-foreground font-semibold text-xs hover:bg-primary/90 disabled:opacity-50 transition-colors cursor-pointer flex items-center justify-center gap-1.5"
            >
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
              </svg>
              <span>Send Custom Reply (AI Analyzed)</span>
            </button>
          </form>
        </div>

        <p className="text-xs text-muted-foreground pt-3 border-t border-border w-full">
          Your response will be recorded directly into our customer operations engine.
        </p>
      </div>
    </div>
  );
}

export default function CustomerResponsePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-background flex items-center justify-center p-4">
          <div className="h-40 w-80 bg-card border border-border rounded-xl animate-pulse" />
        </div>
      }
    >
      <CustomerResponseContent />
    </Suspense>
  );
}
