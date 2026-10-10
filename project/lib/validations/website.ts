import { z } from "zod";
import { UuidSchema } from "./audit";

/**
 * Supported section types across templates
 */
export const SectionTypeSchema = z.enum([
  "header",
  "hero",
  "manifesto",
  "features",
  "gallery",
  "case-studies",
  "metrics",
  "pricing",
  "services",
  "cta",
  "footer",
]);
export type SectionType = z.infer<typeof SectionTypeSchema>;

/**
 * Standard button action model
 */
export const SectionButtonSchema = z.object({
  id: z.string(),
  text: z.string().min(1, "Button text is required"),
  href: z.string().default("#"),
  variant: z.enum(["primary", "secondary", "outline", "link"]).default("primary"),
});
export type SectionButton = z.infer<typeof SectionButtonSchema>;

/**
 * Generic item within a section (e.g. feature card, project item, pricing tier)
 */
export const SectionItemSchema = z.object({
  id: z.string(),
  title: z.string().default(""),
  subtitle: z.string().optional(),
  description: z.string().optional(),
  imageUrl: z.string().optional(),
  imageAlt: z.string().optional(),
  badge: z.string().optional(),
  price: z.string().optional(),
  pricePeriod: z.string().optional(),
  features: z.array(z.string()).optional(),
  meta: z.string().optional(),
  button: SectionButtonSchema.optional(),
});
export type SectionItem = z.infer<typeof SectionItemSchema>;

/**
 * Section styling configuration
 */
export const SectionStyleSchema = z.object({
  background: z.enum(["default", "subtle", "contrast", "brand", "dark"]).default("default"),
  paddingY: z.enum(["none", "compact", "standard", "spacious"]).default("standard"),
  align: z.enum(["left", "center", "right"]).default("left"),
  columns: z.number().int().min(1).max(4).default(3),
  fullWidth: z.boolean().default(false),
});
export type SectionStyle = z.infer<typeof SectionStyleSchema>;

/**
 * A discrete editable section in the website document
 */
export const WebsiteSectionSchema = z.object({
  id: z.string(),
  type: SectionTypeSchema,
  name: z.string().min(1, "Section name is required"),
  eyebrow: z.string().optional(),
  title: z.string().default(""),
  subtitle: z.string().optional(),
  body: z.string().optional(),
  imageUrl: z.string().optional(),
  imageAlt: z.string().optional(),
  secondaryImageUrl: z.string().optional(),
  buttons: z.array(SectionButtonSchema).default([]),
  items: z.array(SectionItemSchema).default([]),
  style: SectionStyleSchema.default({
    background: "default",
    paddingY: "standard",
    align: "left",
    columns: 3,
    fullWidth: false,
  }),
  hidden: z.boolean().default(false),
});
export type WebsiteSection = z.infer<typeof WebsiteSectionSchema>;

/**
 * Website document design theme
 */
export const WebsiteThemeSchema = z.object({
  fontHeading: z.enum(["bricolage", "serif", "sans", "mono"]).default("bricolage"),
  fontBody: z.enum(["manrope", "sans", "serif"]).default("manrope"),
  colorVibe: z.enum(["editorial", "saas", "creative", "monochrome"]).default("editorial"),
  accentColor: z.string().default("#C85A32"),
  canvasBg: z.string().default("#FDFBF7"),
  surfaceBg: z.string().default("#F4EFE6"),
  textPrimary: z.string().default("#1F1C18"),
  textMuted: z.string().default("#797268"),
  borderColor: z.string().default("rgba(31, 28, 24, 0.12)"),
  radius: z.enum(["none", "sm", "md", "full"]).default("sm"),
});
export type WebsiteTheme = z.infer<typeof WebsiteThemeSchema>;

/**
 * Full website structured document model stored in JSONB
 */
export const WebsiteDocumentSchema = z.object({
  templateId: z.enum(["editorial-luxury", "modern-saas", "creative-studio", "blank"]),
  theme: WebsiteThemeSchema,
  seoTitle: z.string().optional(),
  seoDescription: z.string().optional(),
  sections: z.array(WebsiteSectionSchema).default([]),
});
export type WebsiteDocument = z.infer<typeof WebsiteDocumentSchema>;

/**
 * Input for creating a new website
 */
export const CreateWebsiteInputSchema = z.object({
  title: z.string().min(1, "Website title is required").max(100),
  slug: z.string().min(1, "Slug is required").regex(/^[a-z0-9-]+$/, "Slug must contain lowercase letters, numbers, and hyphens"),
  templateId: z.enum(["editorial-luxury", "modern-saas", "creative-studio", "blank"]),
  initialDocument: WebsiteDocumentSchema.optional(),
});
export type CreateWebsiteInput = z.infer<typeof CreateWebsiteInputSchema>;

/**
 * Input for updating a website document
 */
export const UpdateWebsiteInputSchema = z.object({
  title: z.string().min(1).max(100).optional(),
  slug: z.string().min(1).regex(/^[a-z0-9-]+$/).optional(),
  document: WebsiteDocumentSchema,
  isPublished: z.boolean().optional(),
});
export type UpdateWebsiteInput = z.infer<typeof UpdateWebsiteInputSchema>;

/**
 * Database record schema for websites
 */
export const WebsiteRecordSchema = z.object({
  id: UuidSchema,
  business_id: UuidSchema,
  title: z.string(),
  slug: z.string(),
  content: WebsiteDocumentSchema,
  is_published: z.boolean(),
  created_at: z.string(),
  updated_at: z.string(),
});
export type WebsiteRecord = z.infer<typeof WebsiteRecordSchema>;
