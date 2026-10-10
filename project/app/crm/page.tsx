import * as React from "react";
import type { Metadata } from "next";
import { connection } from "next/server";
import { redirect } from "next/navigation";
import { AuthService } from "@/services/auth.service";
import { CrmClient } from "./crm-client";
import CrmLoading from "./loading";

export const metadata: Metadata = {
  title: "CRM | Nexus",
  description: "Manage your business contacts and pipeline.",
};

async function CrmContent() {
  await connection();
  const user = await AuthService.getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  return <CrmClient />;
}

export default function CrmPage() {
  return (
    <React.Suspense fallback={<CrmLoading />}>
      <CrmContent />
    </React.Suspense>
  );
}
