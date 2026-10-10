import { FeedbackForm } from "./feedback-form";

type Context = { params: Promise<{ token: string }> };

// The token is resolved at request time and the form loads its public projection client-side.
export const instant = false;

export default async function WebinarFeedbackPage({ params }: Context) {
  const { token } = await params;

  return (
    <main className="min-h-screen bg-background px-5 py-12 text-foreground sm:px-8">
      <div className="mx-auto max-w-2xl space-y-8">
        <header className="space-y-3">
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-brand-text">Nexus webinar</p>
          <h1 className="font-display text-4xl font-semibold tracking-tight sm:text-5xl">Tell us how it went.</h1>
          <p className="max-w-xl text-muted-foreground">Your feedback helps the business improve future sessions.</p>
        </header>
        <FeedbackForm token={token} />
      </div>
    </main>
  );
}
