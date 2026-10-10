"use client";

import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

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
type ApiResponse = { data?: FeedbackData | { submitted_at: string; product_interest: boolean }; error?: { message?: string } };

function formatDate(value: string, timezone: string) {
  return new Intl.DateTimeFormat(undefined, { dateStyle: "full", timeStyle: "short", timeZone: timezone }).format(new Date(value));
}

export function FeedbackForm({ token }: { token: string }) {
  const [data, setData] = useState<FeedbackData | null>(null);
  const [rating, setRating] = useState(0);
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
        if (!response.ok || !payload.data || !("session" in payload.data)) throw new Error(payload.error?.message ?? "Could not load this feedback form.");
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
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [token]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (rating === 0 || wasUseful === null) {
      setError("Choose a rating and tell us whether the session was useful.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const response = await fetch(`/api/public/webinar-feedback/${encodeURIComponent(token)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rating, was_useful: wasUseful, comments, product_interest: productInterest, marketing_opt_in: marketingOptIn }),
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

  if (loading) return <p className="text-sm text-muted-foreground">Loading feedback form…</p>;
  if (error && !data) return <p role="alert" className="rounded-sm border border-status-danger-border bg-status-danger-bg p-4 text-sm text-status-danger-fg">{error}</p>;
  if (!data) return null;
  if (submitted) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Thanks for sharing.</CardTitle>
          <CardDescription>Your feedback for {data.session.title} has been recorded.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 text-sm text-muted-foreground">
          {productInterest && data.session.product_url && (
            <p><a className="font-semibold text-brand-text underline underline-offset-4" href={data.session.product_url} target="_blank" rel="noreferrer">Learn more about the product or subscription</a></p>
          )}
          <p>Your product interest is recorded separately from permission to receive future marketing emails.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{data.session.title}</CardTitle>
        <CardDescription>{formatDate(data.session.scheduled_start, data.session.timezone)} · {data.session.duration_minutes} minutes</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={submit} className="space-y-6">
          <fieldset className="space-y-3">
            <legend className="text-sm font-semibold">How would you rate the session?</legend>
            <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Session rating">
              {[1, 2, 3, 4, 5].map((value) => (
                <label key={value} className={`flex h-10 w-10 cursor-pointer items-center justify-center rounded-sm border text-sm font-semibold ${rating === value ? "border-brand bg-brand-subtle text-brand-text" : "border-border bg-background"}`}>
                  <Input className="sr-only" type="radio" name="rating" value={value} checked={rating === value} onChange={() => setRating(value)} />
                  {value}
                </label>
              ))}
            </div>
          </fieldset>

          <fieldset className="space-y-3">
            <legend className="text-sm font-semibold">Was the session useful?</legend>
            <div className="flex flex-wrap gap-3">
              {[{ value: true, label: "Yes" }, { value: false, label: "No" }].map((option) => (
                <label key={option.label} className="flex items-center gap-2 text-sm">
                  <input type="radio" name="was-useful" checked={wasUseful === option.value} onChange={() => setWasUseful(option.value)} />
                  {option.label}
                </label>
              ))}
            </div>
          </fieldset>

          <label className="block space-y-2 text-sm font-semibold" htmlFor="feedback-comments">
            What could we improve? <span className="font-normal text-muted-foreground">(optional)</span>
            <textarea id="feedback-comments" value={comments} onChange={(event) => setComments(event.target.value)} maxLength={2000} rows={5} className="flex w-full rounded-sm border border-input bg-card px-3 py-2 font-sans text-base text-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring" />
          </label>

          <label className="flex items-start gap-3 text-sm text-muted-foreground">
            <input type="checkbox" checked={productInterest} onChange={(event) => setProductInterest(event.target.checked)} className="mt-1 h-4 w-4 accent-brand" />
            <span>I would like to learn more about the business&apos;s product or subscription.</span>
          </label>

          <label className="flex items-start gap-3 text-sm text-muted-foreground">
            <input type="checkbox" checked={marketingOptIn} onChange={(event) => setMarketingOptIn(event.target.checked)} className="mt-1 h-4 w-4 accent-brand" />
            <span>Send me future marketing emails from this business.</span>
          </label>

          {error && <p role="alert" className="rounded-sm border border-status-danger-border bg-status-danger-bg p-3 text-sm text-status-danger-fg">{error}</p>}
          <Button type="submit" variant="brand" disabled={submitting}>{submitting ? "Saving feedback…" : "Send feedback"}</Button>
        </form>
      </CardContent>
    </Card>
  );
}
