"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "iconsax-react";
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
    try {
      await mutations.createSeries.mutateAsync({ title: title.trim(), description: description.trim() || null });
      router.push("/dashboard/webinars/new");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not create webinar series.");
    }
  }

  return <form onSubmit={submit} className="space-y-6">
    <div><Link href="/dashboard/webinars" className="inline-flex items-center gap-2 text-xs font-semibold text-muted-foreground hover:text-foreground"><ArrowLeft size="14" /> Webinars</Link><h1 className="mt-4 font-display text-3xl font-bold tracking-tight">Create a series</h1><p className="mt-2 text-sm text-muted-foreground">Group related sessions under one registration page where attendees can choose sessions.</p></div>
    {error && <p role="alert" className="text-sm text-status-danger-fg">{error}</p>}
    <Card><CardHeader><CardTitle>Series details</CardTitle><CardDescription>Each session keeps its own schedule, capacity, and attendance record.</CardDescription></CardHeader><CardContent className="space-y-5"><label className="block space-y-2"><span className="text-xs font-semibold">Series title</span><Input required maxLength={180} value={title} onChange={(event) => setTitle(event.target.value)} /></label><label className="block space-y-2"><span className="text-xs font-semibold">Description</span><textarea rows={4} maxLength={5000} value={description} onChange={(event) => setDescription(event.target.value)} className="w-full rounded-sm border border-input bg-card px-3 py-2 text-sm text-foreground outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring" /></label></CardContent></Card>
    <div className="flex justify-end gap-3"><Button variant="outline" asChild><Link href="/dashboard/webinars">Cancel</Link></Button><Button variant="brand" type="submit" disabled={mutations.createSeries.isPending}>{mutations.createSeries.isPending ? "Creating..." : "Create series"}</Button></div>
  </form>;
}
