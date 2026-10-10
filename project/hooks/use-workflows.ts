"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  AutomationWorkflow,
  WorkflowDAG,
  WorkflowRun,
  WorkflowStepLog,
  CreateWorkflowInput,
  UpdateWorkflowInput,
  GenerateWorkflowInput,
  TriggerWorkflowInput,
  ApproveWorkflowInput,
} from "@/lib/validations/workflow";

/**
 * Deterministic Query Keys per AGENTS.md §7.2
 */
export const workflowKeys = {
  all: ["workflows"] as const,
  lists: () => [...workflowKeys.all, "list"] as const,
  details: () => [...workflowKeys.all, "detail"] as const,
  detail: (id: string) => [...workflowKeys.details(), id] as const,
  runs: () => [...workflowKeys.all, "runs"] as const,
  latestRun: (workflowId: string) => [...workflowKeys.runs(), "latest", workflowId] as const,
  runLogs: (runId: string) => [...workflowKeys.runs(), runId, "logs"] as const,
};

/**
 * Fetch all workflows for the business
 */
export function useWorkflows() {
  return useQuery({
    queryKey: workflowKeys.lists(),
    queryFn: async (): Promise<AutomationWorkflow[]> => {
      const res = await fetch("/api/workflows");
      if (!res.ok) {
        throw new Error("Failed to load workflows");
      }
      const json = await res.json();
      return json.data;
    },
  });
}

/**
 * Fetch a single workflow by ID
 */
export function useWorkflow(id: string | null) {
  return useQuery({
    queryKey: id ? workflowKeys.detail(id) : ["workflows", "detail", "empty"],
    queryFn: async (): Promise<AutomationWorkflow> => {
      if (!id) throw new Error("Workflow ID is required");
      const res = await fetch(`/api/workflows/${id}`);
      if (!res.ok) {
        throw new Error("Failed to load workflow");
      }
      const json = await res.json();
      return json.data;
    },
    enabled: Boolean(id),
  });
}

/**
 * Fetch step logs for a specific workflow run
 */
export function useRunStepLogs(runId: string | null) {
  return useQuery({
    queryKey: runId ? workflowKeys.runLogs(runId) : ["workflows", "runs", "logs", "empty"],
    queryFn: async (): Promise<WorkflowStepLog[]> => {
      if (!runId) throw new Error("Run ID is required");
      const res = await fetch(`/api/workflows/runs/${runId}`);
      if (!res.ok) {
        throw new Error("Failed to load run step logs");
      }
      const json = await res.json();
      return json.data;
    },
    enabled: Boolean(runId),
  });
}

/** Fetches the latest persisted run so approval state survives a page reload. */
export function useLatestWorkflowRun(workflowId: string | null) {
  return useQuery({
    queryKey: workflowId ? workflowKeys.latestRun(workflowId) : ["workflows", "runs", "latest", "empty"],
    queryFn: async (): Promise<WorkflowRun | null> => {
      if (!workflowId) throw new Error("Workflow ID is required");
      const res = await fetch(`/api/workflows/${workflowId}/run`);
      if (!res.ok) {
        const errorJson = await res.json().catch(() => ({}));
        throw new Error(errorJson?.error?.message || "Failed to load latest workflow run");
      }
      const json = await res.json();
      return json.data;
    },
    enabled: Boolean(workflowId),
  });
}

/**
 * Mutation: Generate a workflow DAG from a natural language prompt
 */
export function useGenerateWorkflow() {
  return useMutation({
    mutationFn: async (payload: GenerateWorkflowInput): Promise<WorkflowDAG> => {
      const res = await fetch("/api/workflows/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errorJson = await res.json().catch(() => ({}));
        throw new Error(errorJson?.error?.message || "Failed to generate workflow");
      }

      const json = await res.json();
      return json.data;
    },
  });
}

/**
 * Mutation: Create and persist a new workflow
 */
export function useCreateWorkflow() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: CreateWorkflowInput): Promise<AutomationWorkflow> => {
      const res = await fetch("/api/workflows", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errorJson = await res.json().catch(() => ({}));
        throw new Error(errorJson?.error?.message || "Failed to create workflow");
      }

      const json = await res.json();
      return json.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: workflowKeys.lists() });
    },
  });
}

/**
 * Mutation: Update a workflow
 */
export function useUpdateWorkflow() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: string;
      data: UpdateWorkflowInput;
    }): Promise<AutomationWorkflow> => {
      const res = await fetch(`/api/workflows/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        const errorJson = await res.json().catch(() => ({}));
        throw new Error(errorJson?.error?.message || "Failed to update workflow");
      }

      const json = await res.json();
      return json.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: workflowKeys.lists() });
      queryClient.invalidateQueries({ queryKey: workflowKeys.detail(data.id) });
    },
  });
}

/**
 * Mutation: Delete a workflow
 */
export function useDeleteWorkflow() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string): Promise<boolean> => {
      const res = await fetch(`/api/workflows/${id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        throw new Error("Failed to delete workflow");
      }

      const json = await res.json();
      return json.data.success;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: workflowKeys.lists() });
    },
  });
}

/**
 * Mutation: Trigger a workflow run
 */
export function useTriggerWorkflow() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      payload,
    }: {
      id: string;
      payload: TriggerWorkflowInput;
    }): Promise<{ run: WorkflowRun; stepLogs: WorkflowStepLog[] }> => {
      const res = await fetch(`/api/workflows/${id}/trigger`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errorJson = await res.json().catch(() => ({}));
        throw new Error(errorJson?.error?.message || "Failed to trigger workflow");
      }

      const json = await res.json();
      return json.data;
    },
    onSuccess: (_data, { id }) => {
      queryClient.invalidateQueries({ queryKey: workflowKeys.latestRun(id) });
      queryClient.invalidateQueries({ queryKey: workflowKeys.detail(id) });
    },
  });
}

/**
 * Mutation: Approve a workflow run
 */
export function useApproveWorkflowRun() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      workflowId,
      payload,
    }: {
      workflowId: string;
      payload: ApproveWorkflowInput;
    }): Promise<WorkflowRun> => {
      const res = await fetch(`/api/workflows/${workflowId}/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errorJson = await res.json().catch(() => ({}));
        throw new Error(errorJson?.error?.message || "Failed to approve workflow run");
      }

      const json = await res.json();
      return json.data;
    },
    onSuccess: (_data, { workflowId, payload }) => {
      queryClient.invalidateQueries({ queryKey: workflowKeys.runLogs(payload.runId) });
      queryClient.invalidateQueries({ queryKey: workflowKeys.latestRun(workflowId) });
      queryClient.invalidateQueries({ queryKey: workflowKeys.detail(workflowId) });
    },
  });
}
