import { RegistrationForm } from "./registration-form";

type Context = { params: Promise<{ slug: string }> };

export const instant = false;

export default async function PublicWebinarPage({ params }: Context) {
  const { slug } = await params;

  return (
    <main className="min-h-screen bg-background text-foreground antialiased selection:bg-brand-subtle selection:text-brand-text">
      {/* Top Editorial Brand Bar */}
      <header className="border-b border-border/60 bg-card/60 backdrop-blur-md px-4 py-3.5 sm:px-8">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="flex h-7 w-7 items-center justify-center rounded-sm bg-brand font-display text-sm font-bold text-brand-foreground">
              N
            </span>
            <span className="font-display text-sm font-bold tracking-tight text-foreground">
              Nexus Live
            </span>
          </div>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-subtle px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider text-brand-text">
            Official Registration
          </span>
        </div>
      </header>

      {/* Main Registration Experience */}
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        <RegistrationForm slug={slug} />
      </div>
    </main>
  );
}
