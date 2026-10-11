"use client";

import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar, Clock, DirectSend, TickCircle, VideoPlay } from "iconsax-react";

type Session = {
  title: string;
  description: string | null;
  scheduled_start: string;
  duration_minutes: number;
  timezone: string;
  product_url: string | null;
};

type ExistingResponse = {
  rating: number;
  was_useful: boolean;
  comments: string | null;
  product_interest: boolean;
  marketing_opt_in: boolean;
  submitted_at: string;
};

type FeedbackData = { session: Session; response: ExistingResponse | null };
type ApiResponse = {
  data?: FeedbackData | { submitted_at: string; product_interest: boolean };
  error?: { message?: string };
};

const RATING_LABELS = ["", "Poor", "Fair", "Good", "Very Good", "Exceptional!"];

function formatDate(value: string, timezone: string) {
  try {
    return new Intl.DateTimeFormat("en-US", {
      dateStyle: "full",
      timeStyle: "short",
      timeZone: timezone,
    }).format(new Date(value));
  } catch {
    return new Date(value).toLocaleDateString();
  }
}

export function FeedbackForm({ token }: { token: string }) {
  const [data, setData] = useState<FeedbackData | null>(null);
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [wasUseful, setWasUseful] = useState<boolean | null>(null);
  const [comments, setComments] = useState("");
  const [productInterest, setProductInterest] = useState(false);
  const [marketingOptIn, setMarketingOptIn] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    fetch(`/api/public/webinar-feedback/${encodeURIComponent(token)}`)
      .then(async (response) => {
        const payload = (await response.json()) as ApiResponse;
        if (!response.ok || !payload.data || !("session" in payload.data))
          throw new Error(payload.error?.message ?? "Could not load this feedback form.");
        if (active) {
          setData(payload.data);
          if (payload.data.response) {
            setRating(payload.data.response.rating);
            setWasUseful(payload.data.response.was_useful);
            setComments(payload.data.response.comments ?? "");
            setProductInterest(payload.data.response.product_interest);
            setMarketingOptIn(payload.data.response.marketing_opt_in);
          }
        }
      })
      .catch((requestError: unknown) => {
        if (active) setError(requestError instanceof Error ? requestError.message : "Could not load this feedback form.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [token]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (rating === 0 || wasUseful === null) {
      setError("Please select a rating and tell us whether the session was useful.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const response = await fetch(`/api/public/webinar-feedback/${encodeURIComponent(token)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rating,
          was_useful: wasUseful,
          comments,
          product_interest: productInterest,
          marketing_opt_in: marketingOptIn,
        }),
      });
      const payload = (await response.json()) as ApiResponse;
      if (!response.ok) throw new Error(payload.error?.message ?? "Could not save your feedback.");
      setSubmitted(true);
    } catch (requestError: unknown) {
      setError(requestError instanceof Error ? requestError.message : "Could not save your feedback.");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="py-24 text-center text-xs text-muted-foreground">
        <div className="inline-block size-6 animate-spin rounded-full border-2 border-primary border-r-transparent mb-3" />
        <p>Loading session feedback survey...</p>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div role="alert" className="rounded-sm border border-status-danger-border bg-status-danger-bg p-5 text-center text-xs text-status-danger-fg">
        <p className="font-semibold text-sm">Feedback Unavailable</p>
        <p className="mt-1">{error}</p>
      </div>
    );
  }

  if (!data) return null;

  // Thank You Screen
  if (submitted) {
    return (
      <div className="rounded-lg border border-border/80 bg-card p-6 sm:p-8 shadow-sm space-y-6 text-center animate-in fade-in duration-300">
        <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-status-success-bg text-status-success-fg">
          <TickCircle size="32" variant="Bold" />
        </span>
        <div className="space-y-2">
          <h2 className="font-display text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            Thank You for Your Feedback!
          </h2>
          <p className="text-xs sm:text-sm text-muted-foreground max-w-md mx-auto">
            Your insights for <strong className="text-foreground">{data.session.title}</strong> have been recorded and will help shape our upcoming workshops.
          </p>
        </div>

        {productInterest && data.session.product_url && (
          <div className="rounded-sm border border-brand/40 bg-brand-subtle/40 p-4 max-w-md mx-auto space-y-2">
            <p className="text-xs font-semibold text-brand-text">Explore Solutions Discussed Today</p>
            <p className="text-[11px] text-muted-foreground">
              You indicated interest in our enterprise platform. Review documentation and schedule architecture onboarding:
            </p>
            <Button variant="brand" size="sm" asChild className="text-xs h-8.5 gap-1.5 cursor-pointer">
              <a href={data.session.product_url} target="_blank" rel="noreferrer">
                Explore Product ↗
              </a>
            </Button>
          </div>
        )}

        <p className="text-[11px] text-muted-foreground">
          You may now close this browser tab.
        </p>
      </div>
    );
  }

  const activeRating = hoverRating || rating;

  return (
    <div className="space-y-6">
      {/* Session Recap Card */}
      <div className="rounded-sm border border-border/70 bg-card p-5 shadow-xs space-y-2">
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-subtle px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-brand-text">
            <VideoPlay size="12" /> Session Recap
          </span>
          <span className="text-xs text-muted-foreground">
            {formatDate(data.session.scheduled_start, data.session.timezone)}
          </span>
        </div>
        <h1 className="font-display text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
          {data.session.title}
        </h1>
        {data.session.description && (
          <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">
            {data.session.description}
          </p>
        )}
      </div>

      {/* Main Feedback Card */}
      <Card className="border-border/80 shadow-md bg-card">
        <CardHeader className="pb-3 border-b border-border/50">
          <CardTitle className="font-display text-lg font-bold text-foreground">
            Attendee Evaluation Survey
          </CardTitle>
          <CardDescription className="text-xs">
            Help us understand what went well and where we can improve. Takes under 1 minute.
          </CardDescription>
        </CardHeader>

        <CardContent className="pt-5">
          <form onSubmit={submit} className="space-y-6">
            {/* Rating Question */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-foreground block">
                Overall Session Rating <span className="text-status-danger-fg">*</span>
              </label>
              <div className="flex flex-wrap items-center gap-2" role="radiogroup" aria-label="Session rating">
                {[1, 2, 3, 4, 5].map((val) => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => setRating(val)}
                    onMouseEnter={() => setHoverRating(val)}
                    onMouseLeave={() => setHoverRating(0)}
                    className={`flex h-11 w-11 items-center justify-center rounded-sm border text-base font-bold transition-all cursor-pointer ${
                      rating >= val
                        ? "border-brand bg-brand-subtle text-brand-text"
                        : "border-border/80 bg-background text-muted-foreground hover:border-brand hover:bg-accent"
                    }`}
                  >
                    ★
                  </button>
                ))}
                {activeRating > 0 && (
                  <span className="ml-2 font-display text-xs font-bold text-brand-text animate-in fade-in">
                    {RATING_LABELS[activeRating]}
                  </span>
                )}
              </div>
            </div>

            {/* Utility Question */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-foreground block">
                Was this session valuable and applicable to your work? <span className="text-status-danger-fg">*</span>
              </label>
              <div className="flex gap-2.5">
                <button
                  type="button"
                  onClick={() => setWasUseful(true)}
                  className={`flex-1 rounded-sm border py-2.5 px-4 text-xs font-semibold transition-colors cursor-pointer ${
                    wasUseful === true
                      ? "border-status-success-fg bg-status-success-bg text-status-success-fg"
                      : "border-border/80 bg-background text-muted-foreground hover:bg-accent hover:text-foreground"
                  }`}
                >
                  ✓ Yes, very valuable
                </button>
                <button
                  type="button"
                  onClick={() => setWasUseful(false)}
                  className={`flex-1 rounded-sm border py-2.5 px-4 text-xs font-semibold transition-colors cursor-pointer ${
                    wasUseful === false
                      ? "border-status-danger-fg bg-status-danger-bg text-status-danger-fg"
                      : "border-border/80 bg-background text-muted-foreground hover:bg-accent hover:text-foreground"
                  }`}
                >
                  ✕ Not particularly relevant
                </button>
              </div>
            </div>

            {/* Verbatim Comments */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground" htmlFor="comments">
                Key Takeaways or Suggestions (Optional)
              </label>
              <textarea
                id="comments"
                value={comments}
                onChange={(e) => setComments(e.target.value)}
                placeholder="What topics resonated most? What would you like to see covered in future deep-dives?"
                rows={4}
                className="w-full rounded-sm border border-input bg-card px-3 py-2 text-xs text-foreground outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring"
              />
            </div>

            {/* Lead & Product Interest */}
            <div className="rounded-sm border border-border/60 bg-muted/20 p-3.5 space-y-3">
              <label className="flex items-start gap-2.5 text-xs text-foreground font-semibold cursor-pointer">
                <input
                  type="checkbox"
                  checked={productInterest}
                  onChange={(e) => setProductInterest(e.target.checked)}
                  className="mt-0.5 h-3.5 w-3.5 accent-brand rounded"
                />
                <div>
                  <span>I would like to explore or try the product/platform featured in this session</span>
                  <span className="block text-[11px] font-normal text-muted-foreground mt-0.5">
                    Our team will share direct onboarding materials and sandbox credentials.
                  </span>
                </div>
              </label>

              <label className="flex items-start gap-2.5 text-xs text-muted-foreground cursor-pointer pt-1 border-t border-border/40">
                <input
                  type="checkbox"
                  checked={marketingOptIn}
                  onChange={(e) => setMarketingOptIn(e.target.checked)}
                  className="mt-0.5 h-3.5 w-3.5 accent-brand rounded"
                />
                <span className="text-[11px] leading-snug">
                  Keep me invited to upcoming masterclasses, research papers, and webinars.
                </span>
              </label>
            </div>

            {error && (
              <p role="alert" className="rounded-sm border border-status-danger-border bg-status-danger-bg p-2.5 text-xs text-status-danger-fg">
                {error}
              </p>
            )}

            <Button
              type="submit"
              variant="brand"
              disabled={submitting}
              className="w-full h-10 text-xs font-bold uppercase tracking-wider cursor-pointer"
            >
              {submitting ? "Submitting Feedback..." : "Submit Survey Responses ↗"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
