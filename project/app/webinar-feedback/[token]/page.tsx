import { FeedbackForm } from "./feedback-form";

type Context = { params: Promise<{ token: string }> };

export const instant = false;

export default async function WebinarFeedbackPage({ params }: Context) {
  const { token } = await params;

  return (
    <main className="min-h-screen bg-background text-foreground antialiased selection:bg-brand-subtle selection:text-brand-text">
      {/* Top Editorial Brand Bar */}
      <header className="border-b border-border/60 bg-card/60 backdrop-blur-md px-4 py-3.5 sm:px-8">
        <div className="mx-auto flex max-w-4xl items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="flex h-7 w-7 items-center justify-center rounded-sm bg-brand font-display text-sm font-bold text-brand-foreground">
              N
            </span>
            <span className="font-display text-sm font-bold tracking-tight text-foreground">
              Nexus Feedback
            </span>
          </div>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-muted/60 px-2.5 py-0.5 text-[11px] font-semibold text-muted-foreground">
            Verified Attendee
          </span>
        </div>
      </header>

      {/* Main Feedback Container */}
      <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
        <FeedbackForm token={token} />
      </div>
    </main>
  );
}
