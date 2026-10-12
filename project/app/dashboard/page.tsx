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

import { WorkspaceSkeleton } from "@/components/ui/skeleton";

export default function DashboardPage() {
  return (
    <React.Suspense fallback={<WorkspaceSkeleton />}>
      <DashboardContent />
    </React.Suspense>
  );
}
