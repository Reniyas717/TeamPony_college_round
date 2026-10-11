"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Contact,
  Activity,
  CrmStats,
  CreateContactInput,
  UpdateContactInput,
  ContactFilters,
} from "@/lib/validations/crm";

/**
 * Deterministic Query Keys per AGENTS.md §7.2
 */
export const contactKeys = {
  all: ["contacts"] as const,
  lists: () => [...contactKeys.all, "list"] as const,
  list: (filters?: ContactFilters) => [...contactKeys.lists(), filters] as const,
  details: () => [...contactKeys.all, "detail"] as const,
  detail: (id: string) => [...contactKeys.details(), id] as const,
  activities: (id: string) => [...contactKeys.detail(id), "activities"] as const,
  stats: () => [...contactKeys.all, "stats"] as const,
};

/**
 * Fetch contact list with optional search and filters
 */
export function useContacts(filters?: ContactFilters) {
  return useQuery({
    queryKey: contactKeys.list(filters),
    queryFn: async (): Promise<Contact[]> => {
      const params = new URLSearchParams();
      if (filters?.search) params.set("search", filters.search);
      if (filters?.stage) params.set("stage", filters.stage);
      if (filters?.source) params.set("source", filters.source);
      if (filters?.tag) params.set("tag", filters.tag);
      if (filters?.limit) params.set("limit", String(filters.limit));
      if (filters?.offset) params.set("offset", String(filters.offset));

      const res = await fetch(`/api/crm/contacts?${params.toString()}`);
      if (!res.ok) {
        throw new Error("Failed to load contacts");
      }
      const json = await res.json();
      return json.data;
    },
    refetchInterval: 3000,
  });
}

/**
 * Fetch a single contact by ID
 */
export function useContact(id: string | null) {
  return useQuery({
    queryKey: id ? contactKeys.detail(id) : ["contacts", "detail", "empty"],
    queryFn: async (): Promise<Contact> => {
      if (!id) throw new Error("Contact ID is required");
      const res = await fetch(`/api/crm/contacts/${id}`);
      if (!res.ok) {
        throw new Error("Failed to load contact");
      }
      const json = await res.json();
      return json.data;
    },
    enabled: Boolean(id),
  });
}

/**
 * Fetch activity timeline for a contact
 */
export function useContactActivities(contactId: string | null) {
  return useQuery({
    queryKey: contactId ? contactKeys.activities(contactId) : ["contacts", "activities", "empty"],
    queryFn: async (): Promise<Activity[]> => {
      if (!contactId) return [];
      const res = await fetch(`/api/crm/contacts/${contactId}/activities`);
      if (!res.ok) {
        throw new Error("Failed to load activities");
      }
      const json = await res.json();
      return json.data;
    },
    enabled: Boolean(contactId),
  });
}

/**
 * Fetch conversion and pipeline metrics
 */
export function useCrmStats() {
  return useQuery({
    queryKey: contactKeys.stats(),
    queryFn: async (): Promise<CrmStats> => {
      const res = await fetch("/api/crm/stats");
      if (!res.ok) {
        throw new Error("Failed to load CRM stats");
      }
      const json = await res.json();
      return json.data;
    },
    refetchInterval: 3000,
  });
}

/**
 * Mutation: Create contact
 */
export function useCreateContact() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: CreateContactInput): Promise<Contact> => {
      const res = await fetch("/api/crm/contacts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errorJson = await res.json().catch(() => ({}));
        throw new Error(errorJson?.error?.message || "Failed to create contact");
      }

      const json = await res.json();
      return json.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: contactKeys.lists() });
      queryClient.invalidateQueries({ queryKey: contactKeys.stats() });
    },
  });
}

/**
 * Mutation: Update contact details or stage
 */
export function useUpdateContact() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: string;
      data: UpdateContactInput;
    }): Promise<Contact> => {
      const res = await fetch(`/api/crm/contacts/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        const errorJson = await res.json().catch(() => ({}));
        throw new Error(errorJson?.error?.message || "Failed to update contact");
      }

      const json = await res.json();
      return json.data;
    },
    onSuccess: (_data, { id }) => {
      queryClient.invalidateQueries({ queryKey: contactKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: contactKeys.lists() });
      queryClient.invalidateQueries({ queryKey: contactKeys.activities(id) });
      queryClient.invalidateQueries({ queryKey: contactKeys.stats() });
    },
  });
}

/**
 * Mutation: Delete contact
 */
export function useDeleteContact() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string): Promise<boolean> => {
      const res = await fetch(`/api/crm/contacts/${id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        throw new Error("Failed to delete contact");
      }

      const json = await res.json();
      return json.data.success;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: contactKeys.lists() });
      queryClient.invalidateQueries({ queryKey: contactKeys.stats() });
    },
  });
}

/**
 * Mutation: Add activity / note to contact timeline
 */
export function useAddActivity() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      contactId,
      title,
      description,
      type = "note",
    }: {
      contactId: string;
      title: string;
      description?: string;
      type?: Activity["type"];
    }): Promise<Activity> => {
      const res = await fetch(`/api/crm/contacts/${contactId}/activities`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, description, type, actor: "owner" }),
      });

      if (!res.ok) {
        throw new Error("Failed to add activity");
      }

      const json = await res.json();
      return json.data;
    },
    onSuccess: (_data, { contactId }) => {
      queryClient.invalidateQueries({ queryKey: contactKeys.activities(contactId) });
      queryClient.invalidateQueries({ queryKey: contactKeys.detail(contactId) });
      queryClient.invalidateQueries({ queryKey: contactKeys.lists() });
    },
  });
}

/**
 * Mutation: Dispatch message (Email / WhatsApp) to contact
 */
export function useSendMessage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      contactId,
      channel,
      subject,
      message,
    }: {
      contactId: string;
      channel: "email" | "whatsapp" | "sms";
      subject?: string;
      message?: string;
    }) => {
      const res = await fetch(`/api/crm/contacts/${contactId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ channel, subject, message }),
      });

      if (!res.ok) {
        const errorJson = await res.json().catch(() => ({}));
        throw new Error(errorJson?.error?.message || "Failed to dispatch message");
      }

      const json = await res.json();
      return json.data;
    },
    onSuccess: (_data, { contactId }) => {
      queryClient.invalidateQueries({ queryKey: contactKeys.activities(contactId) });
      queryClient.invalidateQueries({ queryKey: contactKeys.detail(contactId) });
      queryClient.invalidateQueries({ queryKey: contactKeys.lists() });
    },
  });
}

/**
 * Mutation: Process incoming lead response (email or message)
 * Decides whether lead is qualified or churned based on positive/negative response
 */
export function useProcessLeadResponse() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      contactId,
      channel = "email",
      responseText,
    }: {
      contactId: string;
      channel?: "email" | "whatsapp" | "message";
      responseText: string;
    }) => {
      const res = await fetch(`/api/crm/contacts/${contactId}/response`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ channel, responseText }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.error?.message || "Failed to process lead response");
      }

      const json = await res.json();
      return json.data;
    },
    onSuccess: (_data, { contactId }) => {
      queryClient.invalidateQueries({ queryKey: contactKeys.activities(contactId) });
      queryClient.invalidateQueries({ queryKey: contactKeys.detail(contactId) });
      queryClient.invalidateQueries({ queryKey: contactKeys.lists() });
    },
  });
}
