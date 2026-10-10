"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useGenerateWorkflow, useCreateWorkflow } from "@/hooks/use-workflows";

export function WorkflowCreator() {
  const [isOpen, setIsOpen] = useState(false);
  const [prompt, setPrompt] = useState("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const router = useRouter();
  const generateMutation = useGenerateWorkflow();
  const createMutation = useCreateWorkflow();

  const handleGenerate = async () => {
    if (!prompt.trim()) return;
    setErrorMsg(null);

    try {
      const dag = await generateMutation.mutateAsync({ prompt });
      const created = await createMutation.mutateAsync({
        title: dag.title,
        description: dag.description,
        naturalLanguagePrompt: prompt,
        dag,
        status: "DRAFT",
      });
      
      setIsOpen(false);
      setPrompt("");
      router.push(`/dashboard/workflows/${created.id}`);
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "Failed to generate workflow");
    }
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="h-10 px-4 bg-primary text-primary-foreground font-sans font-semibold rounded-sm text-base transition-colors hover:bg-primary/90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring flex items-center gap-2"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="M12 5v14"/></svg>
        New Workflow
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/50 backdrop-blur-sm p-4">
          <div className="bg-card w-full max-w-2xl rounded-xl shadow-lg border border-border flex flex-col overflow-hidden">
            <div className="p-6 border-b border-border">
              <h2 className="text-2xl font-display font-semibold text-foreground">Create AI Workflow</h2>
              <p className="text-sm text-muted-foreground mt-1">
                Describe the automation you want in natural language. The AI Business Agent will build a DAG workflow for you.
              </p>
            </div>
            
            <div className="p-6 flex flex-col gap-4">
              {errorMsg && (
                <div className="p-3 rounded-md border border-destructive/50 bg-destructive/10 text-destructive text-sm flex gap-2 items-start">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mt-0.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                  {errorMsg}
                </div>
              )}
              
              <div className="flex flex-col gap-1.5">
                <label htmlFor="prompt" className="text-sm font-semibold text-foreground">Prompt</label>
                <textarea
                  id="prompt"
                  rows={4}
                  className="w-full bg-card border border-input rounded-sm px-3 py-2 text-base focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring resize-none placeholder:text-muted-foreground"
                  placeholder="e.g. When a customer attends a webinar, wait 2 days, and if they aren't subscribed send a 20% discount offer via email."
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  disabled={generateMutation.isPending || createMutation.isPending}
                />
              </div>
            </div>
            
            <div className="p-6 border-t border-border bg-muted/30 flex justify-end gap-2">
              <button
                onClick={() => setIsOpen(false)}
                className="h-10 px-4 bg-transparent text-foreground hover:bg-accent rounded-sm font-sans font-semibold text-base transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:opacity-50"
                disabled={generateMutation.isPending || createMutation.isPending}
              >
                Cancel
              </button>
              <button
                onClick={handleGenerate}
                disabled={!prompt.trim() || generateMutation.isPending || createMutation.isPending}
                className="h-10 px-4 bg-primary text-primary-foreground font-sans font-semibold rounded-sm text-base transition-colors hover:bg-primary/90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {(generateMutation.isPending || createMutation.isPending) ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                    Generating...
                  </>
                ) : (
                  <>
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/><path d="M5 3v4"/><path d="M19 17v4"/><path d="M3 5h4"/><path d="M17 19h4"/></svg>
                    Generate DAG
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
