"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, VideoPlay, TickCircle, Calendar, People } from "iconsax-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useWebinarMutations } from "@/hooks/webinars/use-webinar-mutations";

export function NewSeriesForm() {
  const router = useRouter();
  const mutations = useWebinarMutations();
  const [title, setTitle] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [error, setError] = React.useState("");

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    if (!title.trim()) {
      setError("Please provide a series title.");
      return;
    }
    try {
      await mutations.createSeries.mutateAsync({ title: title.trim(), description: description.trim() || null });
      router.push("/dashboard/webinars/new");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not create webinar series.");
    }
  }

  return (
    <form onSubmit={submit} className="space-y-6">
      {/* Header */}
      <div className="border-b border-border/60 pb-5">
        <Link
          href="/dashboard/webinars"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors mb-2"
        >
          <ArrowLeft size="13" /> All Webinars
        </Link>
        <h1 className="font-display text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
          Create Webinar Series
        </h1>
        <p className="mt-1 text-xs sm:text-sm text-muted-foreground">
          Group multi-part workshops or weekly training sessions under one registration portal.
        </p>
      </div>

      {error && (
        <p role="alert" className="rounded-sm border border-status-danger-border bg-status-danger-bg px-4 py-2.5 text-xs font-semibold text-status-danger-fg">
          {error}
        </p>
      )}

      {/* 2-Column Balanced Layout */}
      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        {/* Form Controls */}
        <Card className="border-border/70 shadow-xs">
          <CardHeader className="pb-3 border-b border-border/50">
            <CardTitle className="text-sm font-bold uppercase tracking-wider text-foreground">
              Series Configuration
            </CardTitle>
            <CardDescription className="text-xs">
              This title and description will be displayed on the unified series registration page.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-4 space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground" htmlFor="series-title">
                Series Title <span className="text-status-danger-fg">*</span>
              </label>
              <Input
                id="series-title"
                required
                maxLength={180}
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="e.g. Masterclass Series: Modern AI Architecture"
                className="h-9 text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground" htmlFor="series-desc">
                Series Overview / Syllabus
              </label>
              <textarea
                id="series-desc"
                rows={5}
                maxLength={5000}
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                placeholder="Explain the multi-session curriculum, key learning outcomes, and prerequisites..."
                className="w-full rounded-sm border border-input bg-card px-3 py-2 text-xs text-foreground outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-border/40">
              <Button variant="outline" size="sm" asChild className="text-xs h-9">
                <Link href="/dashboard/webinars">Cancel</Link>
              </Button>
              <Button
                variant="brand"
                size="sm"
                type="submit"
                disabled={mutations.createSeries.isPending}
                className="text-xs h-9 cursor-pointer"
              >
                {mutations.createSeries.isPending ? "Creating Series..." : "Create Series & Add Sessions"}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Informational Architecture Card (Eliminating Whitespace) */}
        <div className="space-y-4">
          <div className="rounded-sm border border-brand/40 bg-card p-5 shadow-xs space-y-4">
            <div className="flex items-center gap-2 border-b border-border/60 pb-3">
              <span className="flex h-7 w-7 items-center justify-center rounded-sm bg-brand-subtle text-brand-text">
                <VideoPlay size="16" />
              </span>
              <div>
                <h3 className="font-display text-sm font-bold text-foreground">How Series Work</h3>
                <p className="text-[11px] text-muted-foreground">Multi-session registration architecture</p>
              </div>
            </div>

            <ul className="space-y-3 text-xs text-muted-foreground">
              <li className="flex items-start gap-2.5">
                <TickCircle size="16" className="text-status-success-fg shrink-0 mt-0.5" />
                <span>
                  <strong className="text-foreground">Single Landing Page:</strong> Prospective attendees visit one link and can register for one, several, or all sessions simultaneously.
                </span>
              </li>
              <li className="flex items-start gap-2.5">
                <Calendar size="16" className="text-brand-text shrink-0 mt-0.5" />
                <span>
                  <strong className="text-foreground">Independent Schedules:</strong> Each webinar session keeps its own start time, duration, Meet stream link, and capacity limit.
                </span>
              </li>
              <li className="flex items-start gap-2.5">
                <People size="16" className="text-status-success-fg shrink-0 mt-0.5" />
                <span>
                  <strong className="text-foreground">Separate Attendance Sync:</strong> Meet participant records and follow-ups are tracked distinctly per session.
                </span>
              </li>
            </ul>

            <div className="rounded-sm bg-muted/40 p-3 text-[11px] text-muted-foreground">
              After creating your series, create your first session and assign it to this series container.
            </div>
          </div>
        </div>
      </div>
    </form>
  );
}
