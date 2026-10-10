import { connection } from "next/server";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function requireWebinarOwner() {
  await connection();
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) redirect("/login");

  const { data: business, error: businessError } = await supabase
    .from("businesses").select("id").eq("owner_id", user.id).maybeSingle();
  if (businessError) throw new Error("Could not load business workspace.");
  if (!business) throw new Error("Business workspace has not been provisioned.");

  const { data: profile } = await supabase.from("profiles").select("username")
    .eq("id", user.id).maybeSingle();
  return { username: profile?.username ?? user.email?.split("@")[0] ?? "Owner", businessId: business.id };
}

export function WebinarTopBar({ username }: { username: string }) {
  return (
    <header className="border-b border-border bg-background/95 px-4 py-4 backdrop-blur-sm sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
        <div className="flex min-w-0 items-center gap-3">
          <a href="/dashboard" className="flex shrink-0 items-center gap-2 text-sm font-bold tracking-tight">
            <span className="flex h-8 w-8 items-center justify-center rounded-sm bg-brand font-display text-lg text-brand-foreground">N</span>
            <span className="hidden sm:inline">Nexus</span>
          </a>
          <span className="text-muted-foreground">/</span>
          <span className="truncate text-sm font-semibold">Webinars</span>
        </div>
        <span className="hidden text-xs text-muted-foreground sm:inline">{username}&apos;s Workspace</span>
      </div>
    </header>
  );
}
