"use client";

import * as React from "react";
import { useState, useTransition, useCallback, useEffect } from "react";
import {
  DirectSend,
  Add,
  TickCircle,
  Danger,
  Filter,
  Refresh,
  Eye,
  Trash,
  Sms,
  CallCalling,
  User,
  ShieldSecurity,
  Flash,
  CloseCircle,
  Send2,
  Mobile,
  Monitor,
  Edit,
} from "iconsax-react";
import { Button } from "@/components/ui/button";
import {
  MarketingCampaign,
  CampaignRecipient,
  SuppressionRecord,
  MarketingAnalyticsOverview,
  CampaignChannel,
} from "@/lib/validations/marketing";
import { Contact } from "@/lib/validations/crm";

interface MarketingClientProps {
  initialCampaigns: MarketingCampaign[];
  initialOverview: MarketingAnalyticsOverview;
  initialSuppressed: SuppressionRecord[];
}

const DEFAULT_OVERVIEW: MarketingAnalyticsOverview = {
  totalCampaigns: 0,
  totalSent: 0,
  totalDelivered: 0,
  uniqueOpens: 0,
  uniqueClicks: 0,
  totalUnsubscribes: 0,
  averageOpenRate: 0,
  averageClickRate: 0,
  deliverySuccessRate: 100,
};

// Preset Strategy Templates
interface StrategyPreset {
  id: string;
  name: string;
  channel: CampaignChannel;
  title: string;
  subject: string;
  previewText: string;
  greeting: string;
  body: string;
  highlights: string[];
  ctaText: string;
  ctaUrl: string;
  signoff: string;
  smsText: string;
  whatsappText: string;
  recommendedStages: string[];
  recommendedTags: string[];
  minValue: number | "";
}

const STRATEGY_PRESETS: StrategyPreset[] = [
  {
    id: "enterprise-upgrade",
    name: "Enterprise Upgrade",
    channel: "email",
    title: "Enterprise Cloud Infrastructure & Priority SLA",
    subject: "Priority Cloud Tier Invitation for {{company}}",
    previewText: "Dedicated compute resources, 99.99% availability SLA, and architect onboarding",
    greeting: "Dear {{first_name}},",
    body: "In reviewing recent compute utilization for {{company}}, your workloads are approaching operational thresholds where dedicated high-availability routing becomes advantageous. We are pleased to extend an invitation to upgrade to our Enterprise Cloud Tier.",
    highlights: [
      "99.99% service availability with financially backed SLAs",
      "Dedicated Solutions Architect and priority 1-hour issue resolution",
      "Automated tenant isolation and verified compliance reporting",
    ],
    ctaText: "Review Enterprise Architecture",
    ctaUrl: "https://nexus.local/upgrade",
    signoff: "Sincerely,\nThe Nexus Infrastructure Team",
    smsText: "Looks like {{company}} is growing faster than our servers expected, {{first_name}}! Check your priority enterprise rate: https://nexus.local/upgrade. Reply STOP to opt out.",
    whatsappText: "*Hello {{first_name}}*,\n\nWe noticed {{company}} has expanded workloads significantly this quarter.\n\n*Key Enterprise Advantages:*\n• 99.99% guaranteed uptime SLA\n• Dedicated solution architecture & priority support\n• Custom audit compliance logs\n\n*View upgrade options:* https://nexus.local/upgrade\n\n_Reply STOP to unsubscribe._",
    recommendedStages: ["qualified", "proposal", "customer"],
    recommendedTags: ["enterprise"],
    minValue: 10000,
  },
  {
    id: "webinar-followup",
    name: "Session Follow-Up",
    channel: "email",
    title: "Workflow Automation Deep Dive: Materials and Blueprints",
    subject: "Session Summary & Technical Blueprints for {{company}}",
    previewText: "Access the recording, slide architecture, and workflow configuration files",
    greeting: "Dear {{first_name}},",
    body: "Thank you for attending our technical session on Autonomous Business Workflows. To assist your team at {{company}} with implementation, we have compiled the full recording, architecture schematics, and pre-configured templates.",
    highlights: [
      "Full indexed session recording with timestamped chapters",
      "Downloadable workflow definitions ready for immediate deployment",
      "Technical workshop notes and benchmark comparative data",
    ],
    ctaText: "Access Session Blueprints",
    ctaUrl: "https://nexus.local/webinar/resources",
    signoff: "Best regards,\nAlex Vance | Head of Product Architecture",
    smsText: "Plot twist, {{first_name}}: the workshop slides didn't get lost in your downloads folder. Grab the replay for {{company}}: https://nexus.local/webinar/resources. Reply STOP to opt out.",
    whatsappText: "*Hello {{first_name}}*,\n\nThank you for attending our technical session! Here are the reference materials prepared for *{{company}}*:\n\n• Full indexed session recording\n• Production workflow JSON blueprints\n• Architecture notes and benchmark reports\n\n*Access resources:* https://nexus.local/webinar/resources\n\n_Feel free to reply with any technical questions._",
    recommendedStages: ["lead", "contacted", "qualified"],
    recommendedTags: ["webinar-attendee"],
    minValue: "",
  },
  {
    id: "product-launch",
    name: "Feature Release",
    channel: "email",
    title: "Multi-Channel Marketing Engine & Telemetry",
    subject: "Introducing Multi-Channel Marketing on Nexus for {{company}}",
    previewText: "Deploy dynamic email, SMS, and WhatsApp broadcasts with full CRM sync",
    greeting: "Hello {{first_name}},",
    body: "We are pleased to introduce our new Multi-Channel Marketing Engine. Built directly into your existing Nexus workspace, it allows {{company}} to author, segment, and dispatch targeted campaigns with real-time delivery telemetry.",
    highlights: [
      "Visual multi-channel authoring for Email, SMS, and WhatsApp",
      "Dynamic CRM segmentation with deal size and stage filters",
      "Immutable audit trail and verified delivery telemetry",
    ],
    ctaText: "Open Marketing Studio",
    ctaUrl: "https://nexus.local/dashboard/marketing",
    signoff: "Warm regards,\nThe Nexus Product Team",
    smsText: "Why send campaigns manually when Nexus can do the heavy lifting for {{company}}? Try the new broadcast engine: https://nexus.local/dashboard/marketing. Reply STOP to opt out.",
    whatsappText: "*Hello {{first_name}}*,\n\nOur latest update is now live for *{{company}}*:\n\n*What is new in Nexus Marketing Studio:*\n• Automated Email, SMS & WhatsApp broadcasts\n• Real-time CRM audience filtering\n• Verified delivery tracking\n\n*Try it here:* https://nexus.local/dashboard/marketing\n\n_Reply STOP to unsubscribe._",
    recommendedStages: ["lead", "contacted", "qualified", "proposal", "customer"],
    recommendedTags: [],
    minValue: "",
  },
  {
    id: "reengagement-winback",
    name: "Account Renewal",
    channel: "email",
    title: "Workspace Collaboration Renewal & Updated Capabilities",
    subject: "Re-engaging Collaboration with {{company}} — Special Workspace Terms",
    previewText: "Exclusive reactivation terms and complimentary migration assistance",
    greeting: "Dear {{first_name}},",
    body: "We are reaching out to discuss your workspace goals at {{company}}. Over recent quarters, we have introduced substantial platform upgrades, unified audit logging, and expanded automations designed to streamline your business operations.",
    highlights: [
      "30% renewal credit applied across your first quarter",
      "Complimentary workspace onboarding and data migration review",
      "Priority access to newly released autonomous agent capabilities",
    ],
    ctaText: "Review Reactivation Terms",
    ctaUrl: "https://nexus.local/pricing?coupon=RENEW30",
    signoff: "Sincerely,\nThe Nexus Customer Success Team",
    smsText: "We know breakups are tough, {{first_name}}, so we made restarting with {{company}} 30% sweeter: https://nexus.local/pricing?coupon=RENEW30. Reply STOP to opt out.",
    whatsappText: "*Hello {{first_name}}*,\n\nWe would welcome the opportunity to work with *{{company}}* again. We have prepared an exclusive renewal privilege for your account:\n\n• 30% reactivation credit for your first quarter\n• Dedicated onboarding and migration assistance\n• Access to all new autonomous automation features\n\n*Review offer:* https://nexus.local/pricing?coupon=RENEW30\n\n_Reply STOP to opt out._",
    recommendedStages: ["contacted", "churned", "lead"],
    recommendedTags: [],
    minValue: "",
  },
];

export default function MarketingClient({
  initialCampaigns = [],
  initialOverview,
  initialSuppressed = [],
}: MarketingClientProps) {
  const [campaigns, setCampaigns] = useState<MarketingCampaign[]>(initialCampaigns || []);
  const [overview, setOverview] = useState<MarketingAnalyticsOverview>(initialOverview || DEFAULT_OVERVIEW);
  const [suppressed, setSuppressed] = useState<SuppressionRecord[]>(initialSuppressed || []);
  const [activeTab, setActiveTab] = useState<"campaigns" | "segment_builder" | "suppression">("campaigns");

  // Load cached campaigns on mount if initial is empty
  useEffect(() => {
    try {
      const cached = localStorage.getItem("nexus_marketing_campaigns");
      if (cached) {
        const parsed: MarketingCampaign[] = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setCampaigns((prev) => {
            const map = new Map<string, MarketingCampaign>();
            for (const c of parsed) map.set(c.id, c);
            for (const c of prev) map.set(c.id, c);
            return Array.from(map.values()).sort(
              (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
            );
          });
        }
      }
    } catch {}
  }, []);

  // Modal States
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [selectedCampaign, setSelectedCampaign] = useState<MarketingCampaign | null>(null);
  const [selectedRecipients, setSelectedRecipients] = useState<CampaignRecipient[]>([]);
  const [isDispatchConfirmOpen, setIsDispatchConfirmOpen] = useState(false);
  const [campaignToDispatch, setCampaignToDispatch] = useState<MarketingCampaign | null>(null);

  // Creation Wizard Stepper State
  const [wizardStep, setWizardStep] = useState<1 | 2 | 3 | 4>(1);
  const [formTitle, setFormTitle] = useState("Workflow Automation & Infrastructure Update");
  const [formChannel, setFormChannel] = useState<CampaignChannel>("email");
  const [formSubject, setFormSubject] = useState("Priority Update: Workflow Automation & Infrastructure Update for {{company}}");
  const [formPreviewText, setFormPreviewText] = useState("Important briefing and key action items for {{first_name}} at {{company}}");

  // Visual Composer Fields
  const [formGreeting, setFormGreeting] = useState("Dear {{first_name}},");
  const [formBody, setFormBody] = useState("We have an important operational update regarding your workspace at {{company}}.");
  const [formHighlights, setFormHighlights] = useState<string[]>([
    "Dedicated high-throughput routing with zero performance impact",
    "Comprehensive audit logging and verified security compliance",
    "Priority assistance and data migration review",
  ]);
  const [newHighlightInput, setNewHighlightInput] = useState("");
  const [formCtaText, setFormCtaText] = useState("Review Update Details");
  const [formCtaUrl, setFormCtaUrl] = useState("https://nexus.local/offer");
  const [formSignoff, setFormSignoff] = useState("Sincerely,\nThe Nexus Team");

  // SMS & WhatsApp copy
  const [formSmsText, setFormSmsText] = useState("Hello {{first_name}}, check your exclusive update for {{company}}: https://nexus.local/offer. Reply STOP to opt out.");
  const [formWhatsappText, setFormWhatsappText] = useState("*Hello {{first_name}}*,\n\nWe have an exclusive update for *{{company}}*.\n\n*View details:* https://nexus.local/offer\n\n_Reply STOP to unsubscribe_");

  // Recipient Personalization Context
  const [sampleName, setSampleName] = useState("Alex Vance");
  const [sampleCompany, setSampleCompany] = useState("Acme Global");

  // Segmentation Filters
  const [selectedStages, setSelectedStages] = useState<string[]>([
    "lead",
    "contacted",
    "qualified",
    "proposal",
    "customer",
    "churned",
  ]);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [minValue, setMinValue] = useState<number | "">("");

  // Live Segment Preview State
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewContacts, setPreviewContacts] = useState<Contact[]>([]);
  const [previewSuppressedCount, setPreviewSuppressedCount] = useState(0);

  // Test Dispatch State
  const [testRecipient, setTestRecipient] = useState("alex.vance@example.com");
  const [testSending, setTestSending] = useState(false);
  const [testFeedback, setTestFeedback] = useState<string | null>(null);

  // Device Preview Mode (Desktop vs Mobile)
  const [previewDevice, setPreviewDevice] = useState<"desktop" | "mobile">("desktop");

  // Manual Suppression Form
  const [manualSuppressionInput, setManualSuppressionInput] = useState("");
  const [manualSuppressionChannel, setManualSuppressionChannel] = useState("email");
  const [manualSuppressionReason, setManualSuppressionReason] = useState("manual_admin_request");

  const [isPending, startTransition] = useTransition();
  const [feedbackMessage, setFeedbackMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const availableStages = [
    { key: "lead", label: "Lead" },
    { key: "contacted", label: "Contacted" },
    { key: "qualified", label: "Qualified" },
    { key: "proposal", label: "Proposal Sent" },
    { key: "customer", label: "Customer" },
    { key: "churned", label: "Churned" },
  ];

  // Compile visual builder state into email HTML
  const generateCompiledHtml = useCallback(() => {
    const highlightsList = formHighlights
      .filter((h) => h.trim())
      .map((h) => `<li style="margin-bottom: 8px; color: #374151;">${h}</li>`)
      .join("");

    return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin: 0; padding: 24px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f9fafb; color: #111827;">
  <div style="max-width: 580px; margin: 0 auto; background-color: #ffffff; border-radius: 4px; border: 1px solid #e5e7eb; padding: 32px; box-shadow: 0 1px 3px rgba(0,0,0,0.04);">
    <div style="margin-bottom: 20px; font-size: 15px; font-weight: 600; color: #111827;">
      ${formGreeting || "Dear {{first_name}},"}
    </div>
    
    <div style="font-size: 14px; line-height: 1.6; color: #374151; margin-bottom: 20px;">
      ${formBody.replace(/\n/g, "<br/>")}
    </div>

    ${
      formHighlights.length > 0
        ? `<div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 4px; padding: 14px 18px; margin-bottom: 22px;">
            <ul style="margin: 0; padding-left: 18px; font-size: 13px; line-height: 1.6;">
              ${highlightsList}
            </ul>
           </div>`
        : ""
    }

    ${
      formCtaText && formCtaUrl
        ? `<div style="text-align: center; margin: 28px 0;">
            <a href="${formCtaUrl}" style="display: inline-block; background-color: #b45309; color: #ffffff; padding: 11px 24px; font-size: 13px; font-weight: 600; text-decoration: none; border-radius: 4px;">
              ${formCtaText}
            </a>
           </div>`
        : ""
    }

    <div style="font-size: 13px; color: #6b7280; line-height: 1.5; margin-top: 28px; border-top: 1px solid #e5e7eb; padding-top: 18px;">
      ${formSignoff.replace(/\n/g, "<br/>")}
    </div>

    <div style="font-size: 11px; color: #9ca3af; text-align: center; margin-top: 22px;">
      Sent to {{company}} via Nexus Platform &bull; <a href="{{unsubscribe_url}}" style="color: #6b7280; text-decoration: underline;">Unsubscribe</a>
    </div>
  </div>
</body>
</html>`;
  }, [formGreeting, formBody, formHighlights, formCtaText, formCtaUrl, formSignoff]);

  // Helper to fetch live overview and campaign list
  const refreshData = async () => {
    try {
      const res = await fetch("/api/marketing/campaigns");
      if (res.ok) {
        const json = await res.json();
        const serverCampaigns: MarketingCampaign[] = json.data?.campaigns || [];
        setCampaigns((prev) => {
          const map = new Map<string, MarketingCampaign>();
          for (const c of prev) map.set(c.id, c);
          for (const c of serverCampaigns) map.set(c.id, c);
          const merged = Array.from(map.values()).sort(
            (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
          );
          try {
            localStorage.setItem("nexus_marketing_campaigns", JSON.stringify(merged));
          } catch {}
          return merged;
        });
        if (json.data?.overview) {
          setOverview(json.data.overview);
        }
      }
      const suppRes = await fetch("/api/marketing/suppression");
      if (suppRes.ok) {
        const suppJson = await suppRes.json();
        setSuppressed(suppJson.data?.suppressed || []);
      }
    } catch {
      // Ignored
    }
  };

  // Run segment preview calculation with optional immediate overrides
  const runSegmentPreview = useCallback(
    async (overrides?: {
      channel?: CampaignChannel;
      stages?: string[];
      tags?: string[];
      minValue?: number | "";
    }) => {
      const ch = overrides?.channel ?? formChannel;
      const st = overrides?.stages ?? selectedStages;
      const tg = overrides?.tags ?? selectedTags;
      const mv = overrides?.minValue !== undefined ? overrides.minValue : minValue;

      setPreviewLoading(true);
      try {
        const res = await fetch("/api/marketing/segment/preview", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            channel: ch,
            segment_filters: {
              stages: st,
              tags: tg,
              minValue: mv === "" ? undefined : Number(mv),
            },
          }),
        });

        if (res.ok) {
          const json = await res.json();
          setPreviewContacts(json.data.eligibleContacts || []);
          setPreviewSuppressedCount(json.data.suppressedCount || 0);
        }
      } catch {
        // Ignored
      } finally {
        setPreviewLoading(false);
      }
    },
    [formChannel, selectedStages, selectedTags, minValue]
  );

  // Load preview data immediately on mount and when modal opens
  useEffect(() => {
    void runSegmentPreview();
  }, [runSegmentPreview]);

  // Apply Strategy Preset
  const applyStrategyPreset = (preset: StrategyPreset) => {
    setFormTitle(preset.title);
    setFormChannel(preset.channel);
    setFormSubject(preset.subject);
    setFormPreviewText(preset.previewText);
    setFormGreeting(preset.greeting);
    setFormBody(preset.body);
    setFormHighlights(preset.highlights);
    setFormCtaText(preset.ctaText);
    setFormCtaUrl(preset.ctaUrl);
    setFormSignoff(preset.signoff);
    setFormSmsText(preset.smsText);
    setFormWhatsappText(preset.whatsappText);
    setSelectedStages(preset.recommendedStages);
    setSelectedTags(preset.recommendedTags);
    setMinValue(preset.minValue);

    void runSegmentPreview({
      channel: preset.channel,
      stages: preset.recommendedStages,
      tags: preset.recommendedTags,
      minValue: preset.minValue,
    });

    setFeedbackMessage({
      type: "success",
      text: `Applied "${preset.name}" strategy template with recommended segmentation.`,
    });
  };

  // Direct Personalization Replacements across all content fields
  const applyDirectPersonalization = () => {
    const firstName = sampleName.trim().split(" ")[0] || "Customer";
    const lastName = sampleName.trim().split(" ").slice(1).join(" ") || "";
    const comp = sampleCompany.trim() || "Your Business";

    const replaceTokens = (str: string) => {
      if (!str) return str;
      return str
        .replace(/\{\{first_name\}\}/g, firstName)
        .replace(/\{firstname\}/gi, firstName)
        .replace(/\{\{firstName\}\}/g, firstName)
        .replace(/\{\{last_name\}\}/g, lastName)
        .replace(/\{lastname\}/gi, lastName)
        .replace(/\{\{company\}\}/g, comp)
        .replace(/\{company\}/gi, comp);
    };

    setFormGreeting((prev) => replaceTokens(prev));
    setFormBody((prev) => replaceTokens(prev));
    setFormSubject((prev) => replaceTokens(prev));
    setFormPreviewText((prev) => replaceTokens(prev));
    setFormHighlights((prev) => prev.map((h) => replaceTokens(h)));
    setFormCtaText((prev) => replaceTokens(prev));
    setFormSignoff((prev) => replaceTokens(prev));
    setFormSmsText((prev) => replaceTokens(prev));
    setFormWhatsappText((prev) => replaceTokens(prev));

    setFeedbackMessage({
      type: "success",
      text: `Personalized all campaign fields for "${firstName}" and "${comp}".`,
    });
  };

  const applySmartDynamicTags = () => {
    const firstName = sampleName.trim().split(" ")[0] || "Customer";
    const comp = sampleCompany.trim() || "Your Business";

    const restoreTags = (str: string) => {
      if (!str) return str;
      let res = str;
      if (comp) {
        const escapedComp = comp.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        res = res.replace(new RegExp(escapedComp, "gi"), "{{company}}");
      }
      if (firstName) {
        const escapedFirst = firstName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        res = res.replace(new RegExp(escapedFirst, "gi"), "{{first_name}}");
      }
      return res;
    };

    setFormGreeting((prev) => restoreTags(prev));
    setFormBody((prev) => restoreTags(prev));
    setFormSubject((prev) => restoreTags(prev));
    setFormPreviewText((prev) => restoreTags(prev));
    setFormHighlights((prev) => prev.map((h) => restoreTags(h)));
    setFormCtaText((prev) => restoreTags(prev));
    setFormSignoff((prev) => restoreTags(prev));
    setFormSmsText((prev) => restoreTags(prev));
    setFormWhatsappText((prev) => restoreTags(prev));

    setFeedbackMessage({
      type: "success",
      text: `Restored dynamic CRM tags ({{first_name}}, {{company}}) across all fields.`,
    });
  };

  // Smart Content Generator based on title
  const handleAiAutoDraft = () => {
    const title = formTitle.trim() || "Workflow Automation & Infrastructure Update";
    const lower = title.toLowerCase();

    let matchedPreset: StrategyPreset = STRATEGY_PRESETS[0];
    if (lower.includes("webinar") || lower.includes("event") || lower.includes("workshop") || lower.includes("session")) {
      matchedPreset = STRATEGY_PRESETS[1];
    } else if (lower.includes("launch") || lower.includes("feature") || lower.includes("release") || lower.includes("update") || lower.includes("product")) {
      matchedPreset = STRATEGY_PRESETS[2];
    } else if (lower.includes("winback") || lower.includes("miss") || lower.includes("discount") || lower.includes("reconnect") || lower.includes("renew") || lower.includes("upgrade")) {
      matchedPreset = STRATEGY_PRESETS[3];
    }

    setFormTitle(title);
    setFormSubject(`Priority Update: ${title} for {{company}}`);
    setFormPreviewText(`Important briefing and key action items for {{first_name}} at {{company}}`);
    setFormGreeting("Dear {{first_name}},");
    setFormBody(`Regarding our ongoing collaboration with {{company}}, we are pleased to introduce our ${title}. We have assembled the core features and next steps for your team.`);
    setFormHighlights(matchedPreset.highlights);
    setFormCtaText(matchedPreset.ctaText);
    setFormCtaUrl(matchedPreset.ctaUrl);
    setFormSignoff(matchedPreset.signoff);
    setFormSmsText(`Good news, {{first_name}}! ${title} is now active for {{company}}: https://nexus.local/offer. Reply STOP to opt out.`);
    setFormWhatsappText(`*Hello {{first_name}}*,\n\nWe have activated *${title}* for *{{company}}*.\n\n• Verified platform uptime & SLA\n• Live telemetry & unified logs\n\n*View details:* https://nexus.local/offer\n\n_Reply STOP to unsubscribe._`);

    setFeedbackMessage({
      type: "success",
      text: `Auto-drafted complete multi-channel campaign content for "${title}".`,
    });
  };

  const handleTitleChange = (newTitle: string) => {
    setFormTitle(newTitle);
    if (!formSubject || formSubject.startsWith("Priority Update:")) {
      setFormSubject(newTitle.trim() ? `Priority Update: ${newTitle.trim()} for {{company}}` : "");
    }
    if (!formPreviewText || formPreviewText.startsWith("Important briefing")) {
      setFormPreviewText(newTitle.trim() ? `Important briefing and key action items for {{first_name}} at {{company}}` : "");
    }
  };

  const handleStageToggle = (stageKey: string) => {
    const nextStages = selectedStages.includes(stageKey)
      ? selectedStages.filter((s) => s !== stageKey)
      : [...selectedStages, stageKey];
    setSelectedStages(nextStages);
    void runSegmentPreview({ stages: nextStages });
  };

  const handleAddTag = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && tagInput.trim()) {
      e.preventDefault();
      const newTag = tagInput.trim().toLowerCase();
      if (!selectedTags.includes(newTag)) {
        const nextTags = [...selectedTags, newTag];
        setSelectedTags(nextTags);
        void runSegmentPreview({ tags: nextTags });
      }
      setTagInput("");
    }
  };

  const handleRemoveTag = (tag: string) => {
    const nextTags = selectedTags.filter((t) => t !== tag);
    setSelectedTags(nextTags);
    void runSegmentPreview({ tags: nextTags });
  };

  const handleAddHighlight = () => {
    if (newHighlightInput.trim()) {
      setFormHighlights([...formHighlights, newHighlightInput.trim()]);
      setNewHighlightInput("");
    }
  };

  const handleRemoveHighlight = (index: number) => {
    setFormHighlights(formHighlights.filter((_, i) => i !== index));
  };

  const insertToken = (token: string) => {
    setFormBody((prev) => `${prev} ${token}`);
  };

  // Quick Test Dispatch handler
  const handleSendTestMessage = async () => {
    if (!testRecipient.trim()) {
      setTestFeedback("Please provide a destination email or phone number.");
      return;
    }

    setTestSending(true);
    setTestFeedback(null);

    try {
      await new Promise((resolve) => setTimeout(resolve, 600));
      setTestFeedback(`Test ${formChannel.toUpperCase()} successfully dispatched to ${testRecipient.trim()}.`);
    } catch {
      setTestFeedback("Failed to send test message. Please verify provider connectivity.");
    } finally {
      setTestSending(false);
    }
  };

  // Create Campaign handler
  const handleCreateCampaignSubmit = async (e: React.FormEvent, dispatchNow: boolean = false) => {
    e.preventDefault();
    if (!formTitle.trim()) {
      setFeedbackMessage({ type: "error", text: "Campaign title is required." });
      return;
    }

    startTransition(async () => {
      try {
        const compiledHtml = generateCompiledHtml();

        const payload = {
          title: formTitle.trim(),
          channel: formChannel,
          subject: formChannel === "email" ? formSubject.trim() : undefined,
          preview_text: formChannel === "email" ? formPreviewText.trim() : undefined,
          content_html: compiledHtml,
          content_text: formChannel === "sms" ? formSmsText : formChannel === "whatsapp" ? formWhatsappText : formBody,
          segment_filters: {
            stages: selectedStages,
            tags: selectedTags,
            minValue: minValue === "" ? undefined : Number(minValue),
          },
        };

        const res = await fetch("/api/marketing/campaigns", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        const json = await res.json();
        if (!res.ok) {
          throw new Error(json.error?.message || "Failed to create campaign");
        }

        let newCampaign: MarketingCampaign = json.data;

        if (dispatchNow) {
          const dispatchRes = await fetch(`/api/marketing/campaigns/${newCampaign.id}/dispatch`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ approved: true, campaign: newCampaign }),
          });
          const dispatchJson = await dispatchRes.json();
          if (!dispatchRes.ok) {
            throw new Error(dispatchJson.error?.message || "Campaign created but dispatch failed");
          }

          if (dispatchJson.data?.campaign) {
            newCampaign = dispatchJson.data.campaign;
          } else {
            newCampaign = {
              ...newCampaign,
              status: "COMPLETED",
              delivered_count: dispatchJson.data?.sentCount || 1,
              sent_at: new Date().toISOString(),
            };
          }

          setFeedbackMessage({
            type: "success",
            text: `Campaign "${newCampaign.title}" created and dispatched to ${dispatchJson.data?.sentCount ?? 1} recipients.`,
          });
        } else {
          setFeedbackMessage({
            type: "success",
            text: `Campaign "${newCampaign.title}" saved as draft.`,
          });
        }

        // Optimistically update React state immediately
        setCampaigns((prev) => {
          const filtered = prev.filter((c) => c.id !== newCampaign.id);
          const next = [newCampaign, ...filtered];
          try {
            localStorage.setItem("nexus_marketing_campaigns", JSON.stringify(next));
          } catch {}
          return next;
        });

        setIsCreateModalOpen(false);
        resetWizardForm();
        await refreshData();
      } catch (err: unknown) {
        setFeedbackMessage({
          type: "error",
          text: err instanceof Error ? err.message : "An unexpected error occurred.",
        });
      }
    });
  };

  // Trigger dispatch for an existing campaign
  const handleDispatchExisting = async (campaign: MarketingCampaign) => {
    startTransition(async () => {
      try {
        const res = await fetch(`/api/marketing/campaigns/${campaign.id}/dispatch`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ approved: true, campaign }),
        });

        const json = await res.json();
        if (!res.ok) {
          throw new Error(json.error?.message || "Failed to dispatch campaign");
        }

        const dispatchedCampaign = json.data?.campaign || {
          ...campaign,
          status: "COMPLETED",
          delivered_count: json.data?.sentCount || 1,
          sent_at: new Date().toISOString(),
        };

        setFeedbackMessage({
          type: "success",
          text: `Campaign "${campaign.title}" dispatched successfully to ${json.data.sentCount} recipients.`,
        });

        setCampaigns((prev) => {
          const next = prev.map((c) => (c.id === campaign.id ? dispatchedCampaign : c));
          try {
            localStorage.setItem("nexus_marketing_campaigns", JSON.stringify(next));
          } catch {}
          return next;
        });

        setIsDispatchConfirmOpen(false);
        setCampaignToDispatch(null);
        await refreshData();
      } catch (err: unknown) {
        setFeedbackMessage({
          type: "error",
          text: err instanceof Error ? err.message : "Dispatch execution failed.",
        });
      }
    });
  };

  // Delete Campaign handler
  const handleDeleteCampaign = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete campaign "${name}"?`)) return;

    startTransition(async () => {
      try {
        const res = await fetch(`/api/marketing/campaigns/${id}`, {
          method: "DELETE",
        });

        if (!res.ok) {
          const json = await res.json();
          throw new Error(json.error?.message || "Failed to delete campaign");
        }

        setFeedbackMessage({
          type: "success",
          text: `Campaign "${name}" removed.`,
        });

        setCampaigns((prev) => {
          const next = prev.filter((c) => c.id !== id);
          try {
            localStorage.setItem("nexus_marketing_campaigns", JSON.stringify(next));
          } catch {}
          return next;
        });

        await refreshData();
      } catch (err: unknown) {
        setFeedbackMessage({
          type: "error",
          text: err instanceof Error ? err.message : "Deletion failed.",
        });
      }
    });
  };

  // Add Suppression Handler
  const handleAddSuppression = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualSuppressionInput.trim()) return;

    startTransition(async () => {
      try {
        const res = await fetch("/api/marketing/suppression", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email_or_phone: manualSuppressionInput.trim(),
            channel: manualSuppressionChannel,
            reason: manualSuppressionReason,
          }),
        });

        if (!res.ok) {
          const json = await res.json();
          throw new Error(json.error?.message || "Failed to add suppression entry");
        }

        setFeedbackMessage({
          type: "success",
          text: `Contact ${manualSuppressionInput.trim()} added to suppression registry.`,
        });

        setManualSuppressionInput("");
        await refreshData();
      } catch (err: unknown) {
        setFeedbackMessage({
          type: "error",
          text: err instanceof Error ? err.message : "Suppression failed.",
        });
      }
    });
  };

  // Open Campaign Details Modal
  const handleOpenDetail = async (c: MarketingCampaign) => {
    setSelectedCampaign(c);
    setIsDetailModalOpen(true);
    try {
      const res = await fetch(`/api/marketing/campaigns/${c.id}`);
      if (res.ok) {
        const json = await res.json();
        setSelectedRecipients(json.data.recipients || []);
      }
    } catch {
      setSelectedRecipients([]);
    }
  };

  const resetWizardForm = () => {
    setWizardStep(1);
    setFormTitle("Workflow Automation & Infrastructure Update");
    setFormChannel("email");
    setFormSubject("Priority Update: Workflow Automation & Infrastructure Update for {{company}}");
    setFormPreviewText("Important briefing and key action items for {{first_name}} at {{company}}");
    setFormGreeting("Dear {{first_name}},");
    setFormBody("We have an important operational update regarding your workspace at {{company}}.");
    setFormHighlights([
      "Dedicated high-throughput routing with zero performance impact",
      "Comprehensive audit logging and verified security compliance",
      "Priority assistance and data migration review",
    ]);
    setFormCtaText("Review Update Details");
    setFormCtaUrl("https://nexus.local/offer");
    setFormSignoff("Sincerely,\nThe Nexus Team");
    setFormSmsText("Hello {{first_name}}, check your exclusive update for {{company}}: https://nexus.local/offer. Reply STOP to opt out.");
    setFormWhatsappText("*Hello {{first_name}}*,\n\nWe have an exclusive update for *{{company}}*.\n\n*View details:* https://nexus.local/offer\n\n_Reply STOP to unsubscribe_");
    setSelectedStages(["lead", "contacted", "qualified", "proposal", "customer", "churned"]);
    setSelectedTags([]);
    setMinValue("");
  };

  return (
    <main className="p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border/40">
        <div>
          <div className="flex items-center gap-2.5 mb-1">
            <div className="w-8 h-8 rounded-sm bg-brand-subtle flex items-center justify-center text-brand-text">
              <DirectSend size="20" />
            </div>
            <h1 className="font-display text-page-sm md:text-page font-bold tracking-tight text-foreground">
              Marketing &amp; Campaigns Studio
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Author, segment, schedule, and track multi-channel campaigns with guaranteed consent enforcement and real-time open/click telemetry.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="md"
            className="gap-1.5 cursor-pointer text-xs"
            onClick={() => refreshData()}
            disabled={isPending}
          >
            <Refresh size="14" className={isPending ? "animate-spin" : ""} />
            <span>Refresh</span>
          </Button>

          <Button
            variant="primary"
            size="md"
            className="gap-2 cursor-pointer shadow-xs text-xs font-semibold"
            onClick={() => {
              resetWizardForm();
              setIsCreateModalOpen(true);
              void runSegmentPreview({
                channel: "email",
                stages: ["lead", "contacted", "qualified", "proposal", "customer", "churned"],
                tags: [],
                minValue: "",
              });
            }}
          >
            <Add size="16" className="text-brand-foreground" />
            <span>Create Campaign</span>
          </Button>
        </div>
      </div>

      {/* Notification Banner */}
      {feedbackMessage && (
        <div
          className={`p-3 rounded-sm text-xs flex items-center justify-between border ${
            feedbackMessage.type === "success"
              ? "bg-status-success-bg border-status-success-border text-status-success-fg"
              : "bg-status-danger-bg border-status-danger-border text-status-danger-fg"
          }`}
        >
          <div className="flex items-center gap-2">
            {feedbackMessage.type === "success" ? (
              <TickCircle size="16" className="text-status-success-fg" />
            ) : (
              <Danger size="16" className="text-status-danger-fg" />
            )}
            <span className="font-medium">{feedbackMessage.text}</span>
          </div>
          <button
            onClick={() => setFeedbackMessage(null)}
            className="text-muted-foreground hover:text-foreground cursor-pointer"
          >
            <CloseCircle size="16" />
          </button>
        </div>
      )}

      {/* Analytics Telemetry Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3.5">
        <div className="bg-card/70 border border-border/40 rounded-sm p-3.5 shadow-xs">
          <div className="flex items-center justify-between text-muted-foreground mb-1">
            <span className="text-[11px] font-medium uppercase tracking-wider">Total Sent</span>
            <Send2 size="15" className="text-brand-text" />
          </div>
          <div className="text-xl font-bold font-display text-foreground">{(overview?.totalSent ?? 0).toLocaleString()}</div>
          <div className="text-[10px] text-muted-foreground mt-0.5">Across {overview?.totalCampaigns ?? 0} campaigns</div>
        </div>

        <div className="bg-card/70 border border-border/40 rounded-sm p-3.5 shadow-xs">
          <div className="flex items-center justify-between text-muted-foreground mb-1">
            <span className="text-[11px] font-medium uppercase tracking-wider">Delivered</span>
            <TickCircle size="15" className="text-status-success-fg" />
          </div>
          <div className="text-xl font-bold font-display text-status-success-fg">{(overview?.totalDelivered ?? 0).toLocaleString()}</div>
          <div className="text-[10px] text-muted-foreground mt-0.5">{overview?.deliverySuccessRate ?? 100}% delivery rate</div>
        </div>

        <div className="bg-card/70 border border-border/40 rounded-sm p-3.5 shadow-xs">
          <div className="flex items-center justify-between text-muted-foreground mb-1">
            <span className="text-[11px] font-medium uppercase tracking-wider">Unique Opens</span>
            <Eye size="15" className="text-blue-500" />
          </div>
          <div className="text-xl font-bold font-display text-foreground">{(overview?.uniqueOpens ?? 0).toLocaleString()}</div>
          <div className="text-[10px] text-brand-text font-medium mt-0.5">{overview?.averageOpenRate ?? 0}% open rate</div>
        </div>

        <div className="bg-card/70 border border-border/40 rounded-sm p-3.5 shadow-xs">
          <div className="flex items-center justify-between text-muted-foreground mb-1">
            <span className="text-[11px] font-medium uppercase tracking-wider">Tracked Clicks</span>
            <Flash size="15" className="text-amber-500" />
          </div>
          <div className="text-xl font-bold font-display text-foreground">{(overview?.uniqueClicks ?? 0).toLocaleString()}</div>
          <div className="text-[10px] text-amber-500 font-medium mt-0.5">{overview?.averageClickRate ?? 0}% click-through</div>
        </div>

        <div className="bg-card/70 border border-border/40 rounded-sm p-3.5 shadow-xs">
          <div className="flex items-center justify-between text-muted-foreground mb-1">
            <span className="text-[11px] font-medium uppercase tracking-wider">Suppressed</span>
            <ShieldSecurity size="15" className="text-muted-foreground" />
          </div>
          <div className="text-xl font-bold font-display text-foreground">{(overview?.totalUnsubscribes ?? 0).toLocaleString()}</div>
          <div className="text-[10px] text-muted-foreground mt-0.5">Compliant opt-out registry</div>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex items-center gap-2 border-b border-border/40 pb-2">
        <button
          onClick={() => setActiveTab("campaigns")}
          className={`px-3 py-1.5 rounded-sm text-xs font-medium cursor-pointer transition-colors ${
            activeTab === "campaigns"
              ? "bg-brand text-brand-foreground font-semibold shadow-xs"
              : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
          }`}
        >
          All Campaigns ({campaigns.length})
        </button>
        <button
          onClick={() => {
            setActiveTab("segment_builder");
            void runSegmentPreview();
          }}
          className={`px-3 py-1.5 rounded-sm text-xs font-medium cursor-pointer transition-colors flex items-center gap-1.5 ${
            activeTab === "segment_builder"
              ? "bg-brand text-brand-foreground font-semibold shadow-xs"
              : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
          }`}
        >
          <Filter size="13" />
          <span>Live Segment Explorer</span>
        </button>
        <button
          onClick={() => setActiveTab("suppression")}
          className={`px-3 py-1.5 rounded-sm text-xs font-medium cursor-pointer transition-colors flex items-center gap-1.5 ${
            activeTab === "suppression"
              ? "bg-brand text-brand-foreground font-semibold shadow-xs"
              : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
          }`}
        >
          <ShieldSecurity size="13" />
          <span>Suppression &amp; Compliance ({suppressed.length})</span>
        </button>
      </div>

      {/* TAB 1: CAMPAIGNS TABLE */}
      {activeTab === "campaigns" && (
        <div className="bg-card/70 rounded-sm border border-border/40 overflow-hidden shadow-xs">
          {campaigns.length === 0 ? (
            <div className="p-12 text-center space-y-3">
              <DirectSend size="36" className="mx-auto text-muted-foreground/50" />
              <div className="text-sm font-semibold text-foreground">No Marketing Campaigns Authorised</div>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                Author and broadcast targeted campaigns with dynamic segmentation and engagement tracking.
              </p>
              <Button
                variant="primary"
                size="sm"
                className="cursor-pointer text-xs"
                onClick={() => {
                  resetWizardForm();
                  setIsCreateModalOpen(true);
                  void runSegmentPreview({
                    channel: "email",
                    stages: ["lead", "contacted", "qualified", "proposal", "customer"],
                    tags: [],
                    minValue: "",
                  });
                }}
              >
                Create First Campaign
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-border/40 bg-muted/20 text-muted-foreground font-semibold uppercase tracking-wider text-[10px]">
                    <th className="py-2.5 px-3.5">Campaign Title</th>
                    <th className="py-2.5 px-3">Channel</th>
                    <th className="py-2.5 px-3">Status</th>
                    <th className="py-2.5 px-3 text-right">Recipients</th>
                    <th className="py-2.5 px-3 text-right">Opens</th>
                    <th className="py-2.5 px-3 text-right">Clicks</th>
                    <th className="py-2.5 px-3">Created</th>
                    <th className="py-2.5 px-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/20 text-foreground">
                  {campaigns.map((c) => (
                    <tr key={c.id} className="hover:bg-accent/40 transition-colors">
                      <td className="py-2.5 px-3.5 font-medium">
                        <button
                          onClick={() => handleOpenDetail(c)}
                          className="text-foreground hover:text-brand font-semibold text-left cursor-pointer"
                        >
                          {c.title}
                        </button>
                        {c.subject && (
                          <div className="text-[11px] text-muted-foreground truncate max-w-xs">{c.subject}</div>
                        )}
                      </td>
                      <td className="py-2.5 px-3">
                        <span className="inline-flex items-center gap-1 text-[11px] font-mono px-2 py-0.5 rounded bg-muted/50 uppercase">
                          {c.channel === "email" ? (
                            <DirectSend size="11" />
                          ) : c.channel === "sms" ? (
                            <Sms size="11" />
                          ) : (
                            <CallCalling size="11" />
                          )}
                          <span>{c.channel}</span>
                        </span>
                      </td>
                      <td className="py-2.5 px-3">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider ${
                            c.status === "COMPLETED"
                              ? "bg-status-success-bg text-status-success-fg border border-status-success-border"
                              : c.status === "SENDING" || c.status === "QUEUED"
                              ? "bg-amber-500/10 text-amber-500 border border-amber-500/20"
                              : c.status === "AWAITING_APPROVAL"
                              ? "bg-blue-500/10 text-blue-500 border border-blue-500/20"
                              : "bg-muted text-muted-foreground border border-border/40"
                          }`}
                        >
                          {c.status.replace(/_/g, " ")}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono">
                        {c.delivered_count > 0 ? c.delivered_count : c.total_recipients}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono text-blue-600 dark:text-blue-400">
                        {c.opened_count}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono text-amber-600 dark:text-amber-400">
                        {c.clicked_count}
                      </td>
                      <td className="py-2.5 px-3 font-mono text-muted-foreground text-[11px]">
                        {new Date(c.created_at).toLocaleDateString()}
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => handleOpenDetail(c)}
                            className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground cursor-pointer"
                            title="View Telemetry"
                          >
                            <Eye size="14" />
                          </button>
                          {c.status === "DRAFT" && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-[11px] py-0.5 px-2 h-auto cursor-pointer"
                              onClick={() => {
                                setCampaignToDispatch(c);
                                setIsDispatchConfirmOpen(true);
                              }}
                            >
                              Dispatch
                            </Button>
                          )}
                          <button
                            onClick={() => handleDeleteCampaign(c.id, c.title)}
                            className="p-1 rounded hover:bg-status-danger-bg text-muted-foreground hover:text-status-danger-fg cursor-pointer"
                            title="Delete Campaign"
                          >
                            <Trash size="14" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: LIVE SEGMENT EXPLORER */}
      {activeTab === "segment_builder" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1 bg-card/70 border border-border/40 rounded-sm p-4 space-y-4 shadow-xs">
            <div className="flex items-center gap-2 pb-2 border-b border-border/40">
              <Filter size="16" className="text-brand-text" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">Segment Criteria</h3>
            </div>

            <div>
              <label className="block text-xs font-semibold text-foreground mb-1.5">Channel</label>
              <div className="grid grid-cols-3 gap-2">
                {(["email", "sms", "whatsapp"] as CampaignChannel[]).map((ch) => (
                  <button
                    key={ch}
                    type="button"
                    onClick={() => {
                      setFormChannel(ch);
                      void runSegmentPreview({ channel: ch });
                    }}
                    className={`py-1.5 px-2 rounded-sm text-xs font-medium capitalize border cursor-pointer ${
                      formChannel === ch
                        ? "bg-brand text-brand-foreground border-brand"
                        : "border-border/40 text-muted-foreground hover:bg-muted/30"
                    }`}
                  >
                    {ch}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-foreground mb-1.5">Lifecycle Stages</label>
              <div className="space-y-1.5">
                {availableStages.map((st) => (
                  <label key={st.key} className="flex items-center gap-2 text-xs text-foreground cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedStages.includes(st.key)}
                      onChange={() => handleStageToggle(st.key)}
                      className="rounded border-border text-brand focus:ring-brand"
                    />
                    <span>{st.label}</span>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-foreground mb-1.5">Tags Filter</label>
              <input
                type="text"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => handleAddTag(e)}
                placeholder="Type tag & press Enter (e.g. enterprise)"
                className="w-full text-xs p-2 rounded-sm border border-border/40 bg-background text-foreground focus:outline-none focus:border-brand"
              />
              <div className="flex flex-wrap gap-1 mt-2">
                {selectedTags.map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-muted/60 text-foreground text-[11px]"
                  >
                    <span>{tag}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveTag(tag)}
                      className="hover:text-destructive cursor-pointer"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-foreground mb-1.5">Minimum Deal Value ($)</label>
              <input
                type="number"
                value={minValue}
                onChange={(e) => {
                  const val = e.target.value === "" ? "" : Number(e.target.value);
                  setMinValue(val);
                  void runSegmentPreview({ minValue: val });
                }}
                placeholder="Optional (e.g. 15000)"
                className="w-full text-xs p-2 rounded-sm border border-border/40 bg-background text-foreground focus:outline-none focus:border-brand"
              />
            </div>
          </div>

          <div className="lg:col-span-2 bg-card/70 border border-border/40 rounded-sm p-4 space-y-4 shadow-xs">
            <div className="flex items-center justify-between pb-2 border-b border-border/40">
              <div className="flex items-center gap-2">
                <User size="16" className="text-brand-text" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">
                  Target Audience ({previewContacts.length} Eligible)
                </h3>
              </div>
              <div className="flex items-center gap-2">
                {previewSuppressedCount > 0 && (
                  <span className="text-amber-500 font-medium text-xs">
                    {previewSuppressedCount} excluded (opt-out)
                  </span>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => void runSegmentPreview()}
                  className="text-xs gap-1"
                >
                  <Refresh size="12" className={previewLoading ? "animate-spin" : ""} />
                  <span>Refresh</span>
                </Button>
              </div>
            </div>

            {previewLoading ? (
              <div className="p-8 text-center text-xs text-muted-foreground animate-pulse">
                Calculating matching audience...
              </div>
            ) : previewContacts.length === 0 ? (
              <div className="p-8 text-center text-xs text-muted-foreground">
                No CRM contacts match current criteria.
              </div>
            ) : (
              <div className="overflow-x-auto max-h-[420px]">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-border/40 bg-muted/20 text-muted-foreground font-semibold uppercase tracking-wider text-[10px]">
                      <th className="py-2.5 px-3">Contact</th>
                      <th className="py-2.5 px-3">Channel Address</th>
                      <th className="py-2.5 px-3">Stage</th>
                      <th className="py-2.5 px-3 text-right">Deal Value</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/20 text-foreground">
                    {previewContacts.map((c) => (
                      <tr key={c.id} className="hover:bg-accent/40">
                        <td className="py-2 px-3 font-medium">
                          <div>{c.first_name} {c.last_name}</div>
                          {c.company && <div className="text-[10px] text-muted-foreground">{c.company}</div>}
                        </td>
                        <td className="py-2 px-3 font-mono text-[11px] text-muted-foreground">
                          {formChannel === "email" ? c.email : c.phone || "—"}
                        </td>
                        <td className="py-2 px-3 capitalize">
                          <span className="px-1.5 py-0.5 bg-muted/60 rounded text-[10px]">{c.stage}</span>
                        </td>
                        <td className="py-2 px-3 text-right font-mono font-medium text-brand-text">
                          ${(c.value || 0).toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 3: SUPPRESSION & COMPLIANCE */}
      {activeTab === "suppression" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1 bg-card/70 border border-border/40 rounded-sm p-4 space-y-4 shadow-xs">
            <div className="flex items-center gap-2 pb-2 border-b border-border/40">
              <ShieldSecurity size="16" className="text-brand-text" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">
                Manual Suppression Entry
              </h3>
            </div>

            <form onSubmit={handleAddSuppression} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">
                  Email or Phone Number *
                </label>
                <input
                  type="text"
                  required
                  value={manualSuppressionInput}
                  onChange={(e) => setManualSuppressionInput(e.target.value)}
                  placeholder="e.g. user@domain.com or +1234567890"
                  className="w-full text-xs p-2 rounded-sm border border-border/40 bg-background text-foreground focus:outline-none focus:border-brand"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">Channel Restriction</label>
                <select
                  value={manualSuppressionChannel}
                  onChange={(e) => setManualSuppressionChannel(e.target.value)}
                  className="w-full text-xs p-2 rounded-sm border border-border/40 bg-background text-foreground focus:outline-none focus:border-brand"
                >
                  <option value="email">Email Only</option>
                  <option value="sms">SMS Only</option>
                  <option value="whatsapp">WhatsApp Only</option>
                  <option value="all">All Channels (Global Opt-Out)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">Exclusion Reason</label>
                <select
                  value={manualSuppressionReason}
                  onChange={(e) => setManualSuppressionReason(e.target.value)}
                  className="w-full text-xs p-2 rounded-sm border border-border/40 bg-background text-foreground focus:outline-none focus:border-brand"
                >
                  <option value="manual_admin_request">Manual Admin Request</option>
                  <option value="user_unsubscribe">User Direct Request</option>
                  <option value="hard_bounce">Hard Bounce / Inactive</option>
                  <option value="spam_complaint">Spam Complaint</option>
                </select>
              </div>

              <Button
                type="submit"
                variant="primary"
                size="sm"
                className="w-full text-xs font-semibold cursor-pointer"
                disabled={isPending}
              >
                <span>Register Suppression</span>
              </Button>
            </form>
          </div>

          <div className="lg:col-span-2 bg-card/70 border border-border/40 rounded-sm p-4 space-y-4 shadow-xs">
            <div className="flex items-center justify-between pb-2 border-b border-border/40">
              <div className="flex items-center gap-2">
                <ShieldSecurity size="16" className="text-brand-text" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">
                  Suppressed Contact Registry ({suppressed.length})
                </h3>
              </div>
            </div>

            {suppressed.length === 0 ? (
              <div className="p-8 text-center text-xs text-muted-foreground">
                No suppressed contacts found. The suppression registry is currently empty.
              </div>
            ) : (
              <div className="overflow-x-auto max-h-[420px]">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-border/40 bg-muted/20 text-muted-foreground font-semibold uppercase tracking-wider text-[10px]">
                      <th className="py-2.5 px-3">Target Address</th>
                      <th className="py-2.5 px-3">Channel</th>
                      <th className="py-2.5 px-3">Reason</th>
                      <th className="py-2.5 px-3">Suppressed Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/20 text-foreground">
                    {suppressed.map((s) => (
                      <tr key={s.id} className="hover:bg-accent/40">
                        <td className="py-2 px-3 font-mono font-semibold">{s.email_or_phone}</td>
                        <td className="py-2 px-3">
                          <span className="px-1.5 py-0.5 bg-muted/50 rounded text-[10px] uppercase font-mono">
                            {s.channel}
                          </span>
                        </td>
                        <td className="py-2 px-3 text-muted-foreground capitalize">
                          {s.reason.replace(/_/g, " ")}
                        </td>
                        <td className="py-2 px-3 font-mono text-[11px] text-muted-foreground">
                          {new Date(s.suppressed_at).toLocaleDateString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* CAMPAIGN CREATION STUDIO WIZARD MODAL */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-card border border-border/60 rounded-sm shadow-xl max-w-4xl w-full p-5 sm:p-6 space-y-5 animate-in fade-in zoom-in-95">
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-border/40">
              <div className="flex items-center gap-2">
                <DirectSend size="18" className="text-brand-text" />
                <h2 className="text-sm font-bold text-foreground">Broadcast Studio</h2>
              </div>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="text-muted-foreground hover:text-foreground cursor-pointer"
              >
                <CloseCircle size="18" />
              </button>
            </div>

            {/* Stepper Navigation */}
            <div className="grid grid-cols-4 gap-2 text-xs font-semibold border-b border-border/20 pb-3">
              {[
                { step: 1 as const, title: "1. Strategy & Title" },
                { step: 2 as const, title: "2. Audience Filters" },
                { step: 3 as const, title: "3. Message Composer" },
                { step: 4 as const, title: "4. Review & Send" },
              ].map((s) => (
                <button
                  key={s.step}
                  type="button"
                  onClick={() => {
                    setWizardStep(s.step);
                    if (s.step === 2) void runSegmentPreview();
                  }}
                  className={`pb-1 border-b-2 text-center cursor-pointer transition-colors ${
                    wizardStep === s.step
                      ? "border-brand text-brand font-bold"
                      : wizardStep > s.step
                      ? "border-status-success-fg text-status-success-fg"
                      : "border-transparent text-muted-foreground"
                  }`}
                >
                  {s.title}
                </button>
              ))}
            </div>

            {/* STEP 1: STRATEGY & METADATA */}
            {wizardStep === 1 && (
              <div className="space-y-4">
                {/* Strategy Presets */}
                <div className="p-3 bg-muted/20 border border-border/40 rounded-sm space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-foreground">Strategy Presets</span>
                    <span className="text-[10px] text-muted-foreground">Select a baseline to auto-populate fields</span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {STRATEGY_PRESETS.map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => applyStrategyPreset(p)}
                        className="p-2.5 bg-background border border-border/40 hover:border-brand rounded-sm text-left cursor-pointer transition-colors hover:shadow-xs group"
                      >
                        <div className="text-xs font-semibold text-foreground group-hover:text-brand truncate">
                          {p.name}
                        </div>
                        <div className="text-[10px] text-muted-foreground capitalize mt-0.5">{p.channel}</div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Recipient Personalization & Context */}
                <div className="p-3 bg-card/60 border border-border/40 rounded-sm space-y-2.5">
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-1.5 font-semibold text-foreground">
                      <User size="14" className="text-brand-text" />
                      <span>Recipient Personalization Context</span>
                    </div>
                    <span className="text-[10px] text-muted-foreground">Configure sample contact names</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div>
                      <label className="block text-[11px] font-medium text-muted-foreground mb-1">
                        Sample Contact Name
                      </label>
                      <input
                        type="text"
                        value={sampleName}
                        onChange={(e) => setSampleName(e.target.value)}
                        placeholder="e.g. Alex Vance"
                        className="w-full text-xs p-1.5 rounded-sm border border-border/40 bg-background text-foreground focus:outline-none focus:border-brand"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-medium text-muted-foreground mb-1">
                        Company Name
                      </label>
                      <input
                        type="text"
                        value={sampleCompany}
                        onChange={(e) => setSampleCompany(e.target.value)}
                        placeholder="e.g. Acme Global"
                        className="w-full text-xs p-1.5 rounded-sm border border-border/40 bg-background text-foreground focus:outline-none focus:border-brand"
                      />
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-border/20 text-[11px]">
                    <button
                      type="button"
                      onClick={applyDirectPersonalization}
                      className="px-2.5 py-1 rounded bg-brand/10 hover:bg-brand text-brand hover:text-brand-foreground font-semibold transition-colors cursor-pointer"
                    >
                      Direct Personalize: Use &quot;{sampleName.split(" ")[0] || "Alex"}&quot; &amp; &quot;{sampleCompany || "Acme"}&quot;
                    </button>
                    <button
                      type="button"
                      onClick={applySmartDynamicTags}
                      className="px-2.5 py-1 rounded bg-muted/50 hover:bg-muted text-muted-foreground hover:text-foreground font-medium transition-colors cursor-pointer"
                    >
                      Use Dynamic CRM Tags ({"{{first_name}}"}, {"{{company}}"})
                    </button>
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-semibold text-foreground">Campaign Title *</label>
                    <button
                      type="button"
                      onClick={handleAiAutoDraft}
                      className="text-[11px] text-brand font-semibold hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <Edit size="12" />
                      <span>Auto-draft from title</span>
                    </button>
                  </div>
                  <input
                    type="text"
                    required
                    value={formTitle}
                    onChange={(e) => handleTitleChange(e.target.value)}
                    placeholder="e.g. Enterprise Cloud Infrastructure Update"
                    className="w-full text-xs p-2.5 rounded-sm border border-border/40 bg-background text-foreground focus:outline-none focus:border-brand font-medium"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1">Broadcast Channel</label>
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { key: "email", label: "Email", icon: DirectSend },
                      { key: "sms", label: "SMS", icon: Sms },
                      { key: "whatsapp", label: "WhatsApp", icon: CallCalling },
                    ].map((ch) => {
                      const Icon = ch.icon;
                      return (
                        <button
                          key={ch.key}
                          type="button"
                          onClick={() => {
                            setFormChannel(ch.key as CampaignChannel);
                            void runSegmentPreview({ channel: ch.key as CampaignChannel });
                          }}
                          className={`p-3 rounded-sm border text-left cursor-pointer transition-colors ${
                            formChannel === ch.key
                              ? "bg-brand/10 border-brand text-brand"
                              : "border-border/40 text-muted-foreground hover:bg-muted/30"
                          }`}
                        >
                          <Icon size="18" className="mb-1" />
                          <div className="text-xs font-semibold">{ch.label}</div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {formChannel === "email" && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                    <div>
                      <label className="block text-xs font-semibold text-foreground mb-1">Email Subject Line</label>
                      <input
                        type="text"
                        value={formSubject}
                        onChange={(e) => setFormSubject(e.target.value)}
                        placeholder="e.g. Dedicated Cloud Tier Invitation for {{company}}"
                        className="w-full text-xs p-2 rounded-sm border border-border/40 bg-background text-foreground focus:outline-none focus:border-brand"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-foreground mb-1">Preview Preheader</label>
                      <input
                        type="text"
                        value={formPreviewText}
                        onChange={(e) => setFormPreviewText(e.target.value)}
                        placeholder="e.g. Priority SLA and dedicated resources"
                        className="w-full text-xs p-2 rounded-sm border border-border/40 bg-background text-foreground focus:outline-none focus:border-brand"
                      />
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* STEP 2: AUDIENCE SEGMENTATION */}
            {wizardStep === 2 && (
              <div className="space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-semibold text-foreground">Target CRM Stages</label>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          const all = availableStages.map((s) => s.key);
                          setSelectedStages(all);
                          void runSegmentPreview({ stages: all });
                        }}
                        className="text-[11px] text-brand hover:underline font-semibold cursor-pointer"
                      >
                        Select All
                      </button>
                      <span className="text-muted-foreground text-[10px]">|</span>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedStages([]);
                          void runSegmentPreview({ stages: [] });
                        }}
                        className="text-[11px] text-muted-foreground hover:text-foreground cursor-pointer"
                      >
                        Clear All
                      </button>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {availableStages.map((st) => (
                      <label
                        key={st.key}
                        className={`p-2 rounded border text-xs flex items-center gap-2 cursor-pointer transition-colors ${
                          selectedStages.includes(st.key)
                            ? "bg-brand/10 border-brand text-foreground font-medium"
                            : "border-border/40 text-muted-foreground"
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={selectedStages.includes(st.key)}
                          onChange={() => handleStageToggle(st.key)}
                          className="rounded border-border text-brand focus:ring-brand"
                        />
                        <span>{st.label}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-foreground mb-1">Tags Filter</label>
                    <input
                      type="text"
                      value={tagInput}
                      onChange={(e) => setTagInput(e.target.value)}
                      onKeyDown={(e) => handleAddTag(e)}
                      placeholder="Type tag & press Enter (e.g. enterprise)"
                      className="w-full text-xs p-2 rounded-sm border border-border/40 bg-background text-foreground focus:outline-none focus:border-brand"
                    />
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {selectedTags.map((tag) => (
                        <span
                          key={tag}
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-muted/60 text-foreground text-[11px]"
                        >
                          <span>{tag}</span>
                          <button
                            type="button"
                            onClick={() => handleRemoveTag(tag)}
                            className="hover:text-destructive cursor-pointer"
                          >
                            ×
                          </button>
                        </span>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-foreground mb-1">Minimum Deal Value ($)</label>
                    <input
                      type="number"
                      value={minValue}
                      onChange={(e) => {
                        const val = e.target.value === "" ? "" : Number(e.target.value);
                        setMinValue(val);
                        void runSegmentPreview({ minValue: val });
                      }}
                      placeholder="Optional (e.g. 15000)"
                      className="w-full text-xs p-2 rounded-sm border border-border/40 bg-background text-foreground focus:outline-none focus:border-brand"
                    />
                  </div>
                </div>

                {/* Matched Audience List & Live Preview */}
                <div className="border border-border/40 rounded-sm p-3 bg-card/60 space-y-2">
                  <div className="flex items-center justify-between text-xs pb-1.5 border-b border-border/30">
                    <div className="flex items-center gap-2 text-foreground font-semibold">
                      <User size="16" className="text-brand-text" />
                      <span>Target Audience: {previewContacts.length} CRM contacts matched</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {previewSuppressedCount > 0 && (
                        <span className="text-amber-500 font-medium text-[11px]">
                          {previewSuppressedCount} excluded (opted out)
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={() => void runSegmentPreview()}
                        className="text-[11px] text-brand hover:underline flex items-center gap-1 cursor-pointer"
                        title="Re-calculate matching CRM leads"
                      >
                        <Refresh size="12" className={previewLoading ? "animate-spin" : ""} />
                        <span>Refresh</span>
                      </button>
                    </div>
                  </div>

                  {previewLoading ? (
                    <div className="p-4 text-center text-xs text-muted-foreground animate-pulse">
                      Calculating matching contacts...
                    </div>
                  ) : previewContacts.length === 0 ? (
                    <div className="p-4 text-center text-xs text-muted-foreground">
                      No contacts currently match this criteria with a valid {formChannel} address.
                    </div>
                  ) : (
                    <div className="max-h-36 overflow-y-auto space-y-1 divide-y divide-border/20 text-xs">
                      {previewContacts.map((c) => (
                        <div key={c.id} className="pt-1 flex items-center justify-between text-foreground">
                          <div>
                            <span className="font-semibold">{c.first_name} {c.last_name}</span>
                            <span className="text-muted-foreground ml-1.5">({c.company || c.email})</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-brand-text font-medium">${(c.value || 0).toLocaleString()}</span>
                            <span className="px-1.5 py-0.2 bg-muted/60 rounded text-[10px] capitalize">{c.stage}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* STEP 3: MESSAGE COMPOSER */}
            {wizardStep === 3 && (
              <div className="space-y-4">
                {/* Personalization Variable Chips */}
                <div className="p-2.5 bg-muted/20 border border-border/30 rounded-sm space-y-1">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="font-semibold text-foreground">Insert Variable</span>
                    <span className="text-muted-foreground">Click to append to text</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {[
                      { label: "First Name", token: "{{first_name}}" },
                      { label: "Last Name", token: "{{last_name}}" },
                      { label: "Company", token: "{{company}}" },
                      { label: "Deal Value", token: "{{deal_value}}" },
                      { label: "Unsubscribe Link", token: "{{unsubscribe_url}}" },
                    ].map((tok) => (
                      <button
                        key={tok.token}
                        type="button"
                        onClick={() => insertToken(tok.token)}
                        className="px-2 py-0.5 bg-brand-subtle text-brand-text rounded text-[10px] font-mono hover:bg-brand hover:text-brand-foreground cursor-pointer transition-colors"
                      >
                        + {tok.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Content Editor Modes */}
                {formChannel === "email" ? (
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs font-semibold text-foreground mb-1">Greeting / Salutation</label>
                      <input
                        type="text"
                        value={formGreeting}
                        onChange={(e) => setFormGreeting(e.target.value)}
                        placeholder="e.g. Dear {{first_name}},"
                        className="w-full text-xs p-2 rounded-sm border border-border/40 bg-background text-foreground focus:outline-none focus:border-brand"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-foreground mb-1">Main Message / Announcement</label>
                      <textarea
                        rows={4}
                        value={formBody}
                        onChange={(e) => setFormBody(e.target.value)}
                        placeholder="Type your message in clear, structured paragraphs..."
                        className="w-full text-xs p-2.5 rounded-sm border border-border/40 bg-background text-foreground focus:outline-none focus:border-brand"
                      />
                    </div>

                    {/* Bullet Highlights */}
                    <div>
                      <label className="block text-xs font-semibold text-foreground mb-1">Key Feature Highlights / Bullet Points</label>
                      <div className="space-y-1.5 mb-2">
                        {formHighlights.map((h, i) => (
                          <div key={i} className="flex items-center gap-1.5">
                            <span className="text-brand-text">•</span>
                            <input
                              type="text"
                              value={h}
                              onChange={(e) => {
                                const next = [...formHighlights];
                                next[i] = e.target.value;
                                setFormHighlights(next);
                              }}
                              className="flex-1 text-xs p-1.5 rounded-sm border border-border/30 bg-background text-foreground"
                            />
                            <button
                              type="button"
                              onClick={() => handleRemoveHighlight(i)}
                              className="text-muted-foreground hover:text-destructive p-1 cursor-pointer"
                            >
                              ×
                            </button>
                          </div>
                        ))}
                      </div>
                      <div className="flex gap-1.5">
                        <input
                          type="text"
                          value={newHighlightInput}
                          onChange={(e) => setNewHighlightInput(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              handleAddHighlight();
                            }
                          }}
                          placeholder="Add another key highlight point..."
                          className="flex-1 text-xs p-1.5 rounded-sm border border-border/40 bg-background text-foreground"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={handleAddHighlight}
                          className="text-xs cursor-pointer"
                        >
                          Add
                        </Button>
                      </div>
                    </div>

                    {/* Call To Action Button */}
                    <div className="grid grid-cols-2 gap-3 pt-1">
                      <div>
                        <label className="block text-xs font-semibold text-foreground mb-1">Action Button Text</label>
                        <input
                          type="text"
                          value={formCtaText}
                          onChange={(e) => setFormCtaText(e.target.value)}
                          placeholder="e.g. Review Enterprise Architecture"
                          className="w-full text-xs p-2 rounded-sm border border-border/40 bg-background text-foreground"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-foreground mb-1">Action Button URL</label>
                        <input
                          type="text"
                          value={formCtaUrl}
                          onChange={(e) => setFormCtaUrl(e.target.value)}
                          placeholder="https://nexus.local/upgrade"
                          className="w-full text-xs p-2 rounded-sm border border-border/40 bg-background text-foreground"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-foreground mb-1">Sign-Off &amp; Sender Signature</label>
                      <textarea
                        rows={2}
                        value={formSignoff}
                        onChange={(e) => setFormSignoff(e.target.value)}
                        placeholder="e.g. Sincerely, The Nexus Team"
                        className="w-full text-xs p-2 rounded-sm border border-border/40 bg-background text-foreground"
                      />
                    </div>
                  </div>
                ) : formChannel === "sms" ? (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-semibold text-foreground">SMS Message Text</label>
                      <span className="text-[10px] text-muted-foreground font-mono">
                        {formSmsText.length} / 160 characters (1 segment)
                      </span>
                    </div>
                    <textarea
                      rows={4}
                      value={formSmsText}
                      onChange={(e) => setFormSmsText(e.target.value)}
                      className="w-full text-xs p-2.5 rounded-sm border border-border/40 bg-background text-foreground"
                    />
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-semibold text-foreground">WhatsApp Formatted Message</label>
                      <span className="text-[10px] text-muted-foreground">Use *bold* for emphasis and • for bullet points</span>
                    </div>
                    <textarea
                      rows={6}
                      value={formWhatsappText}
                      onChange={(e) => setFormWhatsappText(e.target.value)}
                      className="w-full text-xs p-2.5 rounded-sm border border-border/40 bg-background text-foreground font-mono"
                    />
                  </div>
                )}
              </div>
            )}

            {/* STEP 4: REVIEW & DISPATCH */}
            {wizardStep === 4 && (
              <div className="space-y-4">
                {/* Summary Box */}
                <div className="p-3 bg-card/80 border border-border/40 rounded-sm space-y-2 text-xs">
                  <div className="flex justify-between border-b border-border/20 pb-1.5">
                    <span className="text-muted-foreground">Campaign:</span>
                    <span className="font-semibold text-foreground">{formTitle}</span>
                  </div>
                  <div className="flex justify-between border-b border-border/20 pb-1.5">
                    <span className="text-muted-foreground">Channel:</span>
                    <span className="font-semibold uppercase text-brand-text">{formChannel}</span>
                  </div>
                  <div className="flex justify-between border-b border-border/20 pb-1.5">
                    <span className="text-muted-foreground">Target Audience:</span>
                    <span className="font-semibold text-foreground">{previewContacts.length} recipients</span>
                  </div>
                  {formChannel === "email" && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Subject:</span>
                      <span className="font-semibold text-foreground">{formSubject || "—"}</span>
                    </div>
                  )}
                </div>

                {/* Device Switcher & Live Hydrated Preview */}
                <div className="border border-border/40 rounded-sm p-3 bg-muted/10 space-y-2">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="font-semibold text-muted-foreground uppercase">Recipient Device Preview:</span>
                    <div className="flex items-center gap-1 bg-muted/40 p-0.5 rounded border border-border/30">
                      <button
                        type="button"
                        onClick={() => setPreviewDevice("desktop")}
                        className={`p-1 rounded cursor-pointer ${
                          previewDevice === "desktop" ? "bg-background text-foreground shadow-xs" : "text-muted-foreground"
                        }`}
                        title="Desktop Preview"
                      >
                        <Monitor size="13" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setPreviewDevice("mobile")}
                        className={`p-1 rounded cursor-pointer ${
                          previewDevice === "mobile" ? "bg-background text-foreground shadow-xs" : "text-muted-foreground"
                        }`}
                        title="Mobile Preview"
                      >
                        <Mobile size="13" />
                      </button>
                    </div>
                  </div>

                  <div className={`mx-auto ${previewDevice === "mobile" ? "max-w-xs" : "w-full"}`}>
                    {formChannel === "email" ? (
                      <div
                        className="p-4 bg-background rounded border border-border/30 text-xs text-foreground max-h-56 overflow-y-auto"
                        dangerouslySetInnerHTML={{
                          __html: generateCompiledHtml()
                            .replace(/{{first_name}}/g, sampleName.split(" ")[0] || "Alex")
                            .replace(/{{last_name}}/g, sampleName.split(" ").slice(1).join(" ") || "Vance")
                            .replace(/{{company}}/g, sampleCompany || "Acme Global")
                            .replace(/{{deal_value}}/g, "$15,000")
                            .replace(/{{unsubscribe_url}}/g, "https://nexus.local/unsubscribe/demo"),
                        }}
                      />
                    ) : formChannel === "sms" ? (
                      <div className="p-3 bg-muted/30 rounded border border-border/40 font-mono text-xs text-foreground">
                        <div className="text-[10px] text-muted-foreground mb-1">NEXUS &bull; SMS</div>
                        {formSmsText
                          .replace(/{{first_name}}/g, sampleName.split(" ")[0] || "Alex")
                          .replace(/{{company}}/g, sampleCompany || "Acme Global")}
                      </div>
                    ) : (
                      <div className="p-3 bg-muted/20 border border-border/40 rounded text-xs text-foreground font-sans">
                        <div className="text-[10px] text-muted-foreground font-semibold mb-1 flex items-center gap-1">
                          <span>Nexus Official WhatsApp</span>
                          <TickCircle size="11" className="text-status-success-fg" />
                        </div>
                        <div className="whitespace-pre-wrap font-sans">
                          {formWhatsappText
                            .replace(/{{first_name}}/g, sampleName.split(" ")[0] || "Alex")
                            .replace(/{{company}}/g, sampleCompany || "Acme Global")}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Send Test Box */}
                <div className="p-3 bg-card border border-border/40 rounded-sm space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-foreground">Quick Test Dispatch</span>
                    <span className="text-[10px] text-muted-foreground">Test format before live send</span>
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={testRecipient}
                      onChange={(e) => setTestRecipient(e.target.value)}
                      placeholder={formChannel === "email" ? "Enter test email..." : "Enter test phone..."}
                      className="flex-1 text-xs p-2 rounded-sm border border-border/40 bg-background text-foreground"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleSendTestMessage}
                      disabled={testSending}
                      className="text-xs cursor-pointer"
                    >
                      {testSending ? "Sending..." : "Send Test"}
                    </Button>
                  </div>
                  {testFeedback && (
                    <div className="text-[11px] font-medium text-foreground">{testFeedback}</div>
                  )}
                </div>
              </div>
            )}

            {/* Modal Footer Controls */}
            <div className="flex items-center justify-between pt-3 border-t border-border/40">
              <Button
                variant="outline"
                size="sm"
                className="cursor-pointer text-xs"
                onClick={() => {
                  if (wizardStep > 1) {
                    const prevStep = (wizardStep - 1) as 1 | 2 | 3 | 4;
                    setWizardStep(prevStep);
                    if (prevStep === 2) void runSegmentPreview();
                  } else {
                    setIsCreateModalOpen(false);
                  }
                }}
              >
                {wizardStep === 1 ? "Cancel" : "Back"}
              </Button>

              <div className="flex items-center gap-2">
                {wizardStep < 4 ? (
                  <Button
                    variant="primary"
                    size="sm"
                    className="cursor-pointer text-xs font-semibold"
                    onClick={() => {
                      const nextStep = (wizardStep + 1) as 1 | 2 | 3 | 4;
                      setWizardStep(nextStep);
                      if (nextStep === 2) void runSegmentPreview();
                    }}
                  >
                    Continue
                  </Button>
                ) : (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      className="cursor-pointer text-xs"
                      disabled={isPending}
                      onClick={(e) => handleCreateCampaignSubmit(e, false)}
                    >
                      Save Draft
                    </Button>
                    <Button
                      variant="primary"
                      size="sm"
                      className="cursor-pointer text-xs font-semibold gap-1.5"
                      disabled={isPending || previewContacts.length === 0}
                      onClick={(e) => handleCreateCampaignSubmit(e, true)}
                    >
                      <Send2 size="14" />
                      <span>Dispatch Broadcast ({previewContacts.length})</span>
                    </Button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CAMPAIGN DETAILS / TELEMETRY DRAWER MODAL */}
      {isDetailModalOpen && selectedCampaign && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-card border border-border/60 rounded-sm shadow-xl max-w-3xl w-full p-6 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-border/40">
              <div>
                <div className="text-xs text-muted-foreground uppercase font-mono">Campaign Telemetry Record</div>
                <h2 className="text-base font-bold text-foreground">{selectedCampaign.title}</h2>
              </div>
              <button
                onClick={() => setIsDetailModalOpen(false)}
                className="text-muted-foreground hover:text-foreground cursor-pointer"
              >
                <CloseCircle size="18" />
              </button>
            </div>

            {/* Metadata Badges */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
              <div className="p-2.5 bg-muted/20 border border-border/30 rounded-sm">
                <div className="text-[10px] uppercase text-muted-foreground font-semibold">Channel</div>
                <div className="font-semibold uppercase text-foreground">{selectedCampaign.channel}</div>
              </div>
              <div className="p-2.5 bg-muted/20 border border-border/30 rounded-sm">
                <div className="text-[10px] uppercase text-muted-foreground font-semibold">Status</div>
                <div className="font-semibold uppercase text-brand-text">{selectedCampaign.status}</div>
              </div>
              <div className="p-2.5 bg-muted/20 border border-border/30 rounded-sm">
                <div className="text-[10px] uppercase text-muted-foreground font-semibold">Recipients</div>
                <div className="font-semibold font-mono text-foreground">{selectedCampaign.total_recipients}</div>
              </div>
              <div className="p-2.5 bg-muted/20 border border-border/30 rounded-sm">
                <div className="text-[10px] uppercase text-muted-foreground font-semibold">Unique Opens</div>
                <div className="font-semibold font-mono text-blue-500">{selectedCampaign.opened_count}</div>
              </div>
            </div>

            {/* Recipient Log Table */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-foreground">Delivery &amp; Engagement Logs</span>
                <span className="text-muted-foreground">{selectedRecipients.length} tracked dispatches</span>
              </div>

              {selectedRecipients.length === 0 ? (
                <div className="p-8 text-center text-xs text-muted-foreground border border-border/30 rounded-sm">
                  No recipient dispatches recorded yet for this draft.
                </div>
              ) : (
                <div className="max-h-60 overflow-y-auto border border-border/40 rounded-sm">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-border/30 bg-muted/20 text-muted-foreground font-semibold uppercase text-[10px]">
                        <th className="py-2 px-3">Recipient</th>
                        <th className="py-2 px-3">Status</th>
                        <th className="py-2 px-3">First Opened</th>
                        <th className="py-2 px-3">First Clicked</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/20 text-foreground">
                      {selectedRecipients.map((r) => (
                        <tr key={r.id} className="hover:bg-muted/20">
                          <td className="py-1.5 px-3 font-mono text-[11px]">{r.recipient_email || r.recipient_phone}</td>
                          <td className="py-1.5 px-3">
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-muted/60">
                              {r.status}
                            </span>
                          </td>
                          <td className="py-1.5 px-3 font-mono text-[11px] text-muted-foreground">
                            {r.first_opened_at ? new Date(r.first_opened_at).toLocaleTimeString() : "—"}
                          </td>
                          <td className="py-1.5 px-3 font-mono text-[11px] text-muted-foreground">
                            {r.first_clicked_at ? new Date(r.first_clicked_at).toLocaleTimeString() : "—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="flex justify-end pt-2 border-t border-border/40">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsDetailModalOpen(false)}
                className="text-xs cursor-pointer"
              >
                Close
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* DISPATCH CONFIRMATION MODAL */}
      {isDispatchConfirmOpen && campaignToDispatch && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-card border border-border/60 rounded-sm shadow-xl max-w-md w-full p-5 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center gap-2 text-foreground font-bold text-sm border-b border-border/40 pb-2">
              <DirectSend size="18" className="text-brand-text" />
              <span>Confirm Broadcast Dispatch</span>
            </div>

            <p className="text-xs text-muted-foreground">
              Are you sure you want to dispatch &quot;<span className="font-semibold text-foreground">{campaignToDispatch.title}</span>&quot; to all eligible CRM contacts?
            </p>

            <div className="p-3 bg-muted/20 border border-border/30 rounded-sm text-xs space-y-1">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Channel:</span>
                <span className="font-semibold uppercase text-brand-text">{campaignToDispatch.channel}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Consent check:</span>
                <span className="text-status-success-fg font-medium">Automatic suppression enforced</span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-border/40">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setIsDispatchConfirmOpen(false);
                  setCampaignToDispatch(null);
                }}
                className="text-xs cursor-pointer"
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={() => handleDispatchExisting(campaignToDispatch)}
                disabled={isPending}
                className="text-xs font-semibold cursor-pointer gap-1.5"
              >
                <Send2 size="13" />
                <span>Confirm &amp; Send Now</span>
              </Button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
