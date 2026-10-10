"use client";

import * as React from "react";
import { WebsiteSection, SectionType } from "@/lib/validations/website";
import { Add, CloseCircle } from "iconsax-react";
import { generateId } from "./types";

interface AddSectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onInsert: (section: WebsiteSection) => void;
}

interface SectionTemplateOption {
  type: SectionType;
  category: string;
  name: string;
  description: string;
  sample: Partial<WebsiteSection>;
}

const SECTION_OPTIONS: SectionTemplateOption[] = [
  {
    type: "hero",
    category: "Hero & Intro",
    name: "Editorial Asymmetric Hero",
    description: "Large statement headline, eyebrow tag, dual buttons, and asymmetric architectural imagery.",
    sample: {
      type: "hero",
      name: "Editorial Hero",
      eyebrow: "PRIVATE RESIDENCES & EDITIONS",
      title: "The Architecture of Quiet Living",
      subtitle: "Crafting enduring residential monoliths that balance limestone purity with contemplative natural light.",
      imageUrl: "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=80",
      imageAlt: "Minimalist stone architectural residence",
      buttons: [
        { id: "btn-1", text: "Explore Monograph", href: "#", variant: "primary" },
        { id: "btn-2", text: "Request Consultation", href: "#", variant: "outline" },
      ],
      style: { background: "default", paddingY: "spacious", align: "left", columns: 1, fullWidth: false },
    },
  },
  {
    type: "hero",
    category: "Hero & Intro",
    name: "Centered Product SaaS Hero",
    description: "Centered high-converting headline, technical eyebrow badge, and primary software CTA.",
    sample: {
      type: "hero",
      name: "SaaS Product Hero",
      eyebrow: "NEXUS DISTRIBUTED ENGINE v2.4",
      title: "Autonomous Business Operations, Verifiable at Every Step",
      subtitle: "Unify your CRM, billing metering, and automated marketing flows in isolated single-tenant environments.",
      imageUrl: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=1200&q=80",
      imageAlt: "Distributed metrics software preview",
      buttons: [
        { id: "btn-1", text: "Start Free Sandbox", href: "#", variant: "primary" },
        { id: "btn-2", text: "Inspect Specs", href: "#", variant: "outline" },
      ],
      style: { background: "dark", paddingY: "spacious", align: "center", columns: 1, fullWidth: false },
    },
  },
  {
    type: "manifesto",
    category: "Narrative & Philosophy",
    name: "Studio Manifesto",
    description: "Large typographic quote, narrative body text, and 3 columnar philosophy pillars.",
    sample: {
      type: "manifesto",
      name: "Studio Manifesto",
      eyebrow: "OUR PHILOSOPHY",
      title: "We believe authentic luxury is the total absence of unnecessary noise.",
      body: "In an era of disposable digital trends, our practice commits to tactile truth: honest limestone, brushed brass, and natural solar rhythms.",
      imageUrl: "https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?auto=format&fit=crop&w=800&q=80",
      items: [
        { id: "m-1", title: "Material Truth", description: "Certified sustainable materials sourced with traceability." },
        { id: "m-2", title: "Spatial Rhythm", description: "Natural light orientation optimizing interior acoustics." },
        { id: "m-3", title: "Permanence", description: "Designed to endure beyond seasonal fashion cycles." },
      ],
      style: { background: "subtle", paddingY: "spacious", align: "left", columns: 3, fullWidth: false },
    },
  },
  {
    type: "features",
    category: "Features & Bento",
    name: "Bento Feature Grid",
    description: "2-column or 3-column feature cards with capability badges and structured explanations.",
    sample: {
      type: "features",
      name: "Core Features",
      eyebrow: "CAPABILITIES",
      title: "Engineered for Uncompromising Quality",
      subtitle: "A unified system that gives your company unprecedented control and security.",
      items: [
        { id: "f-1", title: "Deterministic Execution", description: "Zero race conditions with append-only state machines.", badge: "Performance" },
        { id: "f-2", title: "Tenant Isolation", description: "Hardware-level boundaries prevent cross-account leakage.", badge: "Security" },
        { id: "f-3", title: "Human Guardrails", description: "High-consequence operations pause for explicit authorization.", badge: "Governance" },
        { id: "f-4", title: "Automated Billing", description: "Real-time usage metering synchronized with Stripe.", badge: "Revenue" },
      ],
      style: { background: "default", paddingY: "spacious", align: "left", columns: 2, fullWidth: false },
    },
  },
  {
    type: "gallery",
    category: "Visual Portfolios",
    name: "Curated Works Gallery",
    description: "3-column image cards showcasing recent projects with location, badges, and dimensions.",
    sample: {
      type: "gallery",
      name: "Selected Works",
      eyebrow: "PORTFOLIO ARCHIVE",
      title: "Recent Commissions",
      subtitle: "A selected survey of bespoke architecture and private dwellings.",
      items: [
        {
          id: "g-1",
          title: "Villa Solaria",
          subtitle: "Cap d'Antibes, France",
          description: "Monolithic maritime limestone residence framing panoramic Mediterranean horizons.",
          imageUrl: "https://images.unsplash.com/photo-1613490493576-7fde63acd811?auto=format&fit=crop&w=800&q=80",
          badge: "Completed 2025",
          meta: "1,200 sq.m",
        },
        {
          id: "g-2",
          title: "Kyoto Pavilion",
          subtitle: "Higashiyama, Japan",
          description: "Traditional cedar timber frame reinterpreted with frameless acoustic glass.",
          imageUrl: "https://images.unsplash.com/photo-1503899036084-c55cdd92da26?auto=format&fit=crop&w=800&q=80",
          badge: "Completed 2024",
          meta: "650 sq.m",
        },
        {
          id: "g-3",
          title: "Palazzo di Pietra",
          subtitle: "Lake Como, Italy",
          description: "Restoration and cantilevered modern extension of an 18th-century vineyard estate.",
          imageUrl: "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=800&q=80",
          badge: "Completed 2026",
          meta: "1,850 sq.m",
        },
      ],
      style: { background: "default", paddingY: "spacious", align: "left", columns: 3, fullWidth: false },
    },
  },
  {
    type: "metrics",
    category: "Proof & Metrics",
    name: "Technical SLA & Metrics Strip",
    description: "Bold tabular numerals displaying technical benchmarks, latencies, or business outcomes.",
    sample: {
      type: "metrics",
      name: "SLA Benchmarks",
      eyebrow: "SYSTEM BENCHMARKS",
      title: "Engineered for Mission-Critical Production Loads",
      subtitle: "Verified on multi-region PostgreSQL instances with append-only guarantees.",
      items: [
        { id: "m-1", title: "1.2ms", subtitle: "P99 Write Latency", description: "Append-only audit writes" },
        { id: "m-2", title: "99.99%", subtitle: "Uptime SLA", description: "Guaranteed enterprise availability" },
        { id: "m-3", title: "1:1", subtitle: "Tenant Isolation", description: "Hardware-enforced RLS scope" },
        { id: "m-4", title: "0", subtitle: "Data Leaks", description: "Cryptographically verified boundary" },
      ],
      style: { background: "subtle", paddingY: "standard", align: "center", columns: 4, fullWidth: false },
    },
  },
  {
    type: "pricing",
    category: "Commerce & Pricing",
    name: "3-Tier Transparent Pricing",
    description: "Side-by-side tier comparison with recommended plan badge and included feature checklists.",
    sample: {
      type: "pricing",
      name: "Transparent Pricing",
      eyebrow: "FAIR PLANS",
      title: "Predictable Plans for Growing Operations",
      subtitle: "Scale compute and audit retention without hidden seat taxes.",
      items: [
        {
          id: "p-1",
          title: "Developer Sandbox",
          price: "₹0",
          pricePeriod: "forever free",
          description: "Essential tools for evaluating custom workflows.",
          features: ["1 Verified Business", "Up to 500 CRM Contacts", "10k Monthly Events"],
          button: { id: "b-1", text: "Get Started", href: "#", variant: "outline" },
        },
        {
          id: "p-2",
          title: "Growth Workspace",
          price: "₹4,999",
          pricePeriod: "/ month",
          badge: "Recommended",
          description: "For active revenue operations needing autonomous execution.",
          features: ["Unlimited Contacts", "Autonomous AI Agents", "1M Monthly Events", "24/7 SLA Support"],
          button: { id: "b-2", text: "Start Free Trial", href: "#", variant: "primary" },
        },
        {
          id: "p-3",
          title: "Enterprise Dedicated",
          price: "₹24,999",
          pricePeriod: "/ month",
          description: "Dedicated infrastructure and custom compliance packs.",
          features: ["Dedicated Database Cluster", "7-Year Audit Retention", "SOC2 Compliance Pack"],
          button: { id: "b-3", text: "Contact Sales", href: "#", variant: "outline" },
        },
      ],
      style: { background: "default", paddingY: "spacious", align: "center", columns: 3, fullWidth: false },
    },
  },
  {
    type: "services",
    category: "Services & Disciplines",
    name: "Numbered Disciplines Index",
    description: "Numbered 2-column or 4-column capabilities with concise descriptions.",
    sample: {
      type: "services",
      name: "Disciplines of Practice",
      eyebrow: "CAPABILITIES",
      title: "Integrated Architectural Disciplines",
      subtitle: "We govern every dimension of the project lifecycle from master planning to custom bespoke millwork.",
      items: [
        { id: "s-1", title: "Master Architecture", description: "Site topography assessment, structural masonry, and planning permissions.", meta: "01" },
        { id: "s-2", title: "Interior Architecture", description: "Custom millwork, acoustic spatial tuning, and indirect ambient lighting.", meta: "02" },
        { id: "s-3", title: "Curated Furnishing", description: "Commissioning rare artisanal pieces and hand-woven textiles.", meta: "03" },
        { id: "s-4", title: "Landscape Integration", description: "Native flora drought-tolerant gardens and reflective water courts.", meta: "04" },
      ],
      style: { background: "subtle", paddingY: "standard", align: "left", columns: 2, fullWidth: false },
    },
  },
  {
    type: "cta",
    category: "Call to Action",
    name: "Conversion Action Banner",
    description: "High-impact conversion statement with dual call to action buttons.",
    sample: {
      type: "cta",
      name: "Action Banner",
      eyebrow: "GET STARTED IN SECONDS",
      title: "Start Automating Your Business Operations Today",
      subtitle: "Deploy a production-ready single-tenant workspace in under 60 seconds. No credit card required.",
      buttons: [
        { id: "btn-c1", text: "Deploy Free Workspace", href: "#", variant: "primary" },
        { id: "btn-c2", text: "Read Documentation", href: "#", variant: "outline" },
      ],
      style: { background: "dark", paddingY: "spacious", align: "center", columns: 1, fullWidth: false },
    },
  },
  {
    type: "contact",
    category: "Contact & Forms",
    name: "Interactive Lead Capture Form",
    description: "Lead capture form with name, email, company, phone, and project inquiry. Submissions sync in real-time to Nexus Intelligent CRM.",
    sample: {
      type: "contact",
      name: "Contact & Lead Form",
      eyebrow: "GET IN TOUCH",
      title: "Start a Conversation With Our Team",
      subtitle: "Submit your project inquiry or request a tailored consultation. Every submission routes directly into our Intelligent CRM pipeline.",
      body: "Our team typically reviews and follows up within 24 business hours.",
      buttons: [
        { id: "btn-sub", text: "Submit Inquiry", href: "#", variant: "primary" },
      ],
      items: [],
      style: { background: "subtle", paddingY: "spacious", align: "left", columns: 1, fullWidth: false },
    },
  },
  {
    type: "footer",
    category: "Footers",
    name: "Editorial Colophon Footer",
    description: "Atelier credits, studio coordinates, inquiry link, and copyright notice.",
    sample: {
      type: "footer",
      name: "Footer Colophon",
      title: "MAISON VALLIER ATELIER",
      subtitle: "PARIS • KYOTO • WORLDWIDE",
      body: "Private commissions accepted by direct inquiry or referral only. Inquiries: commissions@maisonvallier.com",
      buttons: [
        { id: "btn-f1", text: "Initiate Private Consultation", href: "mailto:commissions@maisonvallier.com", variant: "primary" },
      ],
      style: { background: "dark", paddingY: "standard", align: "center", columns: 1, fullWidth: false },
    },
  },
];

export function AddSectionModal({ isOpen, onClose, onInsert }: AddSectionModalProps) {
  const [selectedCategory, setSelectedCategory] = React.useState<string>("All");

  if (!isOpen) return null;

  const categories = ["All", ...Array.from(new Set(SECTION_OPTIONS.map((o) => o.category)))];

  const filtered =
    selectedCategory === "All"
      ? SECTION_OPTIONS
      : SECTION_OPTIONS.filter((o) => o.category === selectedCategory);

  const handleSelectOption = (opt: SectionTemplateOption) => {
    const newSection: WebsiteSection = {
      id: generateId("sec"),
      type: opt.sample.type || "hero",
      name: opt.sample.name || opt.name,
      eyebrow: opt.sample.eyebrow,
      title: opt.sample.title || opt.name,
      subtitle: opt.sample.subtitle,
      body: opt.sample.body,
      imageUrl: opt.sample.imageUrl,
      imageAlt: opt.sample.imageAlt,
      buttons: opt.sample.buttons || [],
      items: opt.sample.items || [],
      style: opt.sample.style || {
        background: "default",
        paddingY: "standard",
        align: "left",
        columns: 2,
        fullWidth: false,
      },
      hidden: false,
    };
    onInsert(newSection);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div className="bg-card border border-border rounded-sm shadow-2xl max-w-3xl w-full max-h-[85vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="p-4 border-b border-border/40 flex items-center justify-between shrink-0 bg-muted/20">
          <div>
            <h3 className="font-display text-base font-bold text-foreground">Insert Website Section</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Select a pre-composed architectural section to insert into your page layout.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-sm text-muted-foreground hover:text-foreground cursor-pointer"
          >
            <CloseCircle size="20" />
          </button>
        </div>

        {/* Category Pills */}
        <div className="px-4 py-2 border-b border-border/40 flex items-center gap-1.5 overflow-x-auto shrink-0 bg-muted/10 text-xs">
          {categories.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap cursor-pointer transition-colors ${
                selectedCategory === cat
                  ? "bg-foreground text-background font-semibold"
                  : "bg-muted/50 text-muted-foreground hover:text-foreground"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Section Options Grid */}
        <div className="flex-1 overflow-y-auto p-4 grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {filtered.map((opt, i) => (
            <div
              key={i}
              onClick={() => handleSelectOption(opt)}
              className="p-4 rounded-sm border border-border/60 hover:border-brand-text bg-card/60 hover:bg-accent/40 transition-all cursor-pointer group flex flex-col justify-between space-y-3"
            >
              <div className="space-y-1">
                <div className="flex items-center justify-between text-[10px] font-mono text-muted-foreground">
                  <span className="uppercase font-semibold text-brand-text">{opt.category}</span>
                  <span>type: {opt.type}</span>
                </div>
                <h4 className="font-display text-sm font-bold text-foreground group-hover:text-brand-text transition-colors">
                  {opt.name}
                </h4>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {opt.description}
                </p>
              </div>

              <div className="pt-2 flex items-center justify-between border-t border-border/30 text-xs">
                <span className="text-[11px] font-mono text-muted-foreground">Click to insert</span>
                <span className="inline-flex items-center gap-1 text-xs font-semibold text-brand-text group-hover:translate-x-0.5 transition-transform">
                  <Add size="14" />
                  <span>Insert</span>
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
