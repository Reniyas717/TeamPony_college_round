import * as React from "react";
import { connection } from "next/server";
import { redirect } from "next/navigation";
import { AuthService } from "@/services/auth.service";
import { createClient } from "@/lib/supabase/server";
import { WebsiteService } from "@/services/website.service";
import StudioClient from "./studio-client";
import { WebsiteRecord } from "@/lib/validations/website";

async function WebsiteContent() {
  await connection();
  const user = await AuthService.getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  const supabase = await createClient();
  const { data: business } = await supabase
    .from("businesses")
    .select("id")
    .eq("owner_id", user.id)
    .maybeSingle();

  let websites: WebsiteRecord[] = [];
  if (business?.id) {
    websites = await WebsiteService.listWebsites(business.id);
  }

  return <StudioClient initialWebsites={websites} />;
}

import { PageHeaderSkeleton, Skeleton } from "@/components/ui/skeleton";

export default function WebsitePage() {
  return (
    <React.Suspense
      fallback={
        <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6 w-full animate-in fade-in duration-200">
          <PageHeaderSkeleton hasAction={true} />
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-4">
              <div className="rounded-sm border border-border/60 bg-card p-6 space-y-4">
                <Skeleton className="h-6 w-48" />
                <Skeleton className="h-64 w-full rounded-sm" />
              </div>
            </div>
            <div className="space-y-4">
              <div className="rounded-sm border border-border/60 bg-card p-5 space-y-3">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-8 w-full rounded-sm" />
                <Skeleton className="h-8 w-full rounded-sm" />
                <Skeleton className="h-8 w-full rounded-sm" />
              </div>
            </div>
          </div>
        </div>
      }
    >
      <WebsiteContent />
    </React.Suspense>
  );
}
