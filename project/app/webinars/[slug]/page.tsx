import { RegistrationForm } from "./registration-form";

type Context = { params: Promise<{ slug: string }> };

// The slug is resolved at request time so the form can load the current public registration projection.
export const instant = false;

export default async function PublicWebinarPage({ params }: Context) {
  const { slug } = await params;

  return (
    <main className="min-h-screen bg-background px-5 py-12 text-foreground sm:px-8">
      <div className="mx-auto max-w-3xl space-y-8">
        <header className="space-y-3">
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-brand-text">Nexus webinar</p>
          <h1 className="font-display text-4xl font-semibold tracking-tight sm:text-5xl">Join the conversation.</h1>
          <p className="max-w-2xl text-muted-foreground">Choose a session and reserve your place with the form below.</p>
        </header>
        <RegistrationForm slug={slug} />
      </div>
    </main>
  );
}
