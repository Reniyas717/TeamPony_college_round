import * as React from "react";
import { Metadata } from "next";
import { CrmClient } from "@/app/crm/crm-client";

export const metadata: Metadata = {
  title: "Intelligent CRM | Nexus",
  description: "Customer lifecycle management, deal pipeline tracking, and multi-channel touchpoints",
};

export default function DashboardCrmPage() {
  return <CrmClient />;
}
