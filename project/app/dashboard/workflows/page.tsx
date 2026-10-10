import { Metadata } from "next";
import { WorkflowList } from "./workflow-list";
import { WorkflowCreator } from "./workflow-creator";

export const metadata: Metadata = {
  title: "Workflow Automation | Nexus",
  description: "Manage natural language AI workflows.",
};

export default function WorkflowsPage() {
  return (
    <div className="flex flex-col gap-8 max-w-7xl mx-auto px-4 md:px-6 lg:px-8 py-8 w-full">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-page font-display text-foreground tracking-tight">Workflows</h1>
          <p className="text-base text-muted-foreground mt-1 max-w-[68ch]">
            Create and manage AI-powered business automations using natural language.
          </p>
        </div>
        <WorkflowCreator />
      </div>

      <WorkflowList />
    </div>
  );
}
