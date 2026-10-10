import type { Metadata } from "next";
import { connection } from "next/server";
import { redirect } from "next/navigation";
import { AuthService } from "@/services/auth.service";
import CrmClient from "./crm-client";

export const metadata: Metadata = {
  title: "CRM | Nexus",
  description: "Manage your business contacts and pipeline.",
};

export default async function CrmPage() {
  await connection();
  const user = await AuthService.getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  return <CrmClient />;
}
