import * as React from "react";
import { redirect } from "next/navigation";
import { AuthService } from "@/services/auth.service";
import CrmClient from "./crm-client";

export const metadata = {
  title: "CRM | Nexus",
  description: "Manage your business contacts and pipeline.",
};

async function CrmContent() {
  const user = await AuthService.getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  return <CrmClient />;
}

export default function CrmPage() {
  return (
    <React.Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-background text-foreground">
          <p className="text-sm font-semibold text-muted-foreground animate-pulse">Loading CRM Workspace...</p>
        </div>
      }
    >
      <CrmContent />
    </React.Suspense>
  );
}
