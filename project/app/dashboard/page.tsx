import * as React from "react";
import { connection } from "next/server";
import { redirect } from "next/navigation";
import { AuthService } from "@/services/auth.service";
import DashboardClient from "./dashboard-client";

async function DashboardContent() {
  await connection();
  const user = await AuthService.getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  return <DashboardClient user={user} />;
}

export default function DashboardPage() {
  return (
    <React.Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-background text-foreground">
          <p className="text-sm font-semibold text-muted-foreground animate-pulse">Loading Nexus Workspace...</p>
        </div>
      }
    >
      <DashboardContent />
    </React.Suspense>
  );
}
