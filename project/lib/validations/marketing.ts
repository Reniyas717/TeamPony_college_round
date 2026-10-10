import { z } from "zod";

export const CampaignChannelSchema = z.enum(["email", "sms", "whatsapp"]);
export type CampaignChannel = z.infer<typeof CampaignChannelSchema>;

export const CampaignStatusSchema = z.enum([
  "DRAFT",
  "AWAITING_APPROVAL",
  "SCHEDULED",
  "QUEUED",
  "SENDING",
  "COMPLETED",
  "CANCELLED",
  "FAILED",
]);
export type CampaignStatus = z.infer<typeof CampaignStatusSchema>;

export const RecipientStatusSchema = z.enum([
  "PENDING",
  "SENT",
  "DELIVERED",
  "FAILED",
  "BOUNCED",
  "SUPPRESSED",
]);
export type RecipientStatus = z.infer<typeof RecipientStatusSchema>;

export const SegmentFiltersSchema = z.object({
  stages: z.array(z.string()).default([]),
  tags: z.array(z.string()).default([]),
  sources: z.array(z.string()).default([]),
  minValue: z.number().min(0).optional(),
  maxValue: z.number().min(0).optional(),
  searchQuery: z.string().optional(),
});
export type SegmentFilters = z.infer<typeof SegmentFiltersSchema>;

export const CreateCampaignSchema = z.object({
  title: z.string().min(1, "Campaign title is required").max(120),
  channel: CampaignChannelSchema.default("email"),
  subject: z.string().max(200).optional(),
  preview_text: z.string().max(250).optional(),
  content_html: z.string().min(1, "Campaign content is required"),
  content_text: z.string().optional(),
  segment_filters: SegmentFiltersSchema.default({ stages: [], tags: [], sources: [] }),
  scheduled_at: z.string().datetime().nullable().optional(),
});
export type CreateCampaignInput = z.infer<typeof CreateCampaignSchema>;

export const UpdateCampaignSchema = CreateCampaignSchema.partial().extend({
  status: CampaignStatusSchema.optional(),
  total_recipients: z.number().int().min(0).optional(),
  delivered_count: z.number().int().min(0).optional(),
  opened_count: z.number().int().min(0).optional(),
  clicked_count: z.number().int().min(0).optional(),
  bounced_count: z.number().int().min(0).optional(),
  unsubscribed_count: z.number().int().min(0).optional(),
  sent_at: z.string().nullable().optional(),
});
export type UpdateCampaignInput = z.infer<typeof UpdateCampaignSchema>;

export const DispatchCampaignSchema = z.object({
  approved: z.boolean().default(false),
  idempotency_key: z.string().optional(),
  override_schedule: z.boolean().default(false),
});
export type DispatchCampaignInput = z.infer<typeof DispatchCampaignSchema>;

export const PreviewSegmentSchema = z.object({
  segment_filters: SegmentFiltersSchema,
  channel: CampaignChannelSchema.default("email"),
});
export type PreviewSegmentInput = z.infer<typeof PreviewSegmentSchema>;

export interface MarketingCampaign {
  id: string;
  business_id: string;
  title: string;
  channel: CampaignChannel;
  subject: string | null;
  preview_text: string | null;
  content_html: string;
  content_text: string | null;
  segment_filters: SegmentFilters;
  status: CampaignStatus;
  scheduled_at: string | null;
  sent_at: string | null;
  total_recipients: number;
  delivered_count: number;
  opened_count: number;
  clicked_count: number;
  bounced_count: number;
  unsubscribed_count: number;
  created_at: string;
  updated_at: string;
}

export interface CampaignRecipient {
  id: string;
  campaign_id: string;
  business_id: string;
  contact_id: string | null;
  recipient_email: string;
  recipient_phone: string | null;
  status: RecipientStatus;
  provider_message_id: string | null;
  tracking_token: string;
  first_opened_at: string | null;
  first_clicked_at: string | null;
  error_message: string | null;
  created_at: string;
}

export interface SuppressionRecord {
  id: string;
  business_id: string;
  contact_id: string | null;
  email_or_phone: string;
  channel: string;
  reason: string;
  suppressed_at: string;
}

export interface MarketingAnalyticsOverview {
  totalCampaigns: number;
  totalSent: number;
  totalDelivered: number;
  uniqueOpens: number;
  uniqueClicks: number;
  totalUnsubscribes: number;
  averageOpenRate: number;
  averageClickRate: number;
  deliverySuccessRate: number;
}
