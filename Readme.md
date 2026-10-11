<div align="center">

# Nexus

### Autonomous AI Business Operating System & Multi-Channel Enterprise Platform

[![Next.js 16](https://img.shields.io/badge/Next.js-16.4.0-black?style=for-the-badge&logo=next.js&logoColor=white)](https://nextjs.org/)
[![React 19](https://img.shields.io/badge/React-19.3.0-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://react.dev/)
[![Tailwind CSS v4](https://img.shields.io/badge/Tailwind_CSS-v4.3.3-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)
[![Supabase](https://img.shields.io/badge/Supabase-Auth%20%26%20Postgres-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white)](https://supabase.com/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![PWA](https://img.shields.io/badge/PWA-Ready-E0533C?style=for-the-badge&logo=pwa&logoColor=white)](https://web.dev/progressive-web-apps/)

**Govern. Automate. Engage. Scale.**

An enterprise-grade, autonomous business operating system designed for modern founders and SMBs. Nexus centralizes multi-channel customer communications, autonomous AI workflow orchestration, lifecycle webinar marketing, visual website generation, SaaS billing, and strict cryptographic audit logging into a unified, high-assurance workspace.

</div>

---

## Overview

**Nexus** is a unified business operating platform that replaces fragmented SaaS stacks with a single autonomous core.

Rather than duct-taping disjointed CRMs, marketing automation tools, landing page builders, event management apps, and external AI agents together, Nexus operates on a single-owner, single-business architecture backed by Row Level Security (RLS) and strict server-derived trust boundaries.

At its core, Nexus governs operations across seven tightly coupled business engines:

- **Autonomous Agent & Workflow Studio** — State-machine workflows (`DRAFT` → `AWAITING_APPROVAL` → `QUEUED` → `RUNNING` → `COMPLETED`) with mandatory human checkpoints for high-consequence operations.
- **Unified Omni-Channel CRM** — Multi-channel lead tracking, stage pipelines, inbound webhook listeners, real-time sentiment scoring, and automated engagement heatmaps.
- **Customer Journey Intelligence** — Stage transition tracking, velocity metrics, conversion funnels, churn-risk detection, and automated stage actions.
- **Webinar & Event Marketing Engine** — Complete lifecycle management for webinar series and standalone sessions, self-hosted registration portals, attendance reconciliation, and post-session follow-up workflows.
- **Multi-Channel Marketing Engine** — Segment audience builder, live message previews with merge tags, Twilio SMS/WhatsApp dispatch, Resend/SendGrid transactional email, and granular suppression management.
- **Visual Website Builder & AI Studio** — Template-driven dynamic site creator, AI copy assistance, instant production publishing, and hosted live routes.
- **Enterprise SaaS Billing & Audit Trails** — Razorpay order & verification pipelines, plan tier usage gating, metered consumption tracking, and immutable transactional audit logs (`record_audit_log_tx`).

---

## Why Nexus?

Traditional business management platforms answer:

> "How many different SaaS subscriptions and browser tabs do I need to run my business?"

Nexus focuses on a fundamentally different standard:

> **"Can an autonomous AI operating system coordinate customer discovery, conversion, operations, and compliance within one secure boundary?"**

A business operation does not happen in silos.

Every real-world customer journey directly bridges marketing, CRM, events, billing, and compliance:

```text
                                BUSINESS OWNER
                                      │
                 ┌────────────────────┼────────────────────┐
                 ▼                    ▼                    ▼
          Autonomous AI        Multi-Channel CRM      Lifecycle Events
         Workflow Engine        & Intelligence          & Marketing
                 │                    │                    │
          ┌──────┴──────┐      ┌──────┴──────┐      ┌──────┴──────┐
        Drafts      Runs     Leads   Sentiment   Webinars Campaigns
       Approvals Checkpoints Stages  Heatmaps   Feedback Suppression
                 │                    │                    │
                 └────────────────────┼────────────────────┘
                                      │
                                    NEXUS
                                      │
                             Enterprise Platform
                                      │
                 ┌────────────────────┼────────────────────┐
                 ▼                    ▼                    ▼
             Website &            Subscription         Immutable
             Page Studio            Billing           Audit Vault
```

---

# Technology Stack

<div align="center">

### Frontend & Application Shell

![Next.js](https://img.shields.io/badge/Next.js-16.4.0-black?style=for-the-badge&logo=next.js&logoColor=white)
![React](https://img.shields.io/badge/React-19.3.0-61DAFB?style=for-the-badge&logo=react&logoColor=black)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-v4.3.3-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white)
![TanStack Query](https://img.shields.io/badge/TanStack_Query-v5-FF4154?style=for-the-badge&logo=react-query&logoColor=white)
![Framer Motion](https://img.shields.io/badge/Framer_Motion-14.1-FF0055?style=for-the-badge&logo=framer&logoColor=white)
![Mermaid](https://img.shields.io/badge/Mermaid.js-11.17-FF3670?style=for-the-badge)

### Backend, Security & Infrastructure

![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Supabase-4169E1?style=for-the-badge&logo=postgresql&logoColor=white)
![Supabase SSR](https://img.shields.io/badge/Supabase-SSR%20Client-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white)
![Zod](https://img.shields.io/badge/Zod-v4-3E67B1?style=for-the-badge&logo=zod&logoColor=white)
![Twilio](https://img.shields.io/badge/Twilio-SMS%20%26%20WhatsApp-F22F46?style=for-the-badge&logo=twilio&logoColor=white)
![Razorpay](https://img.shields.io/badge/Razorpay-Payment%20Engine-0C2340?style=for-the-badge&logo=razorpay&logoColor=white)
![Service Worker](https://img.shields.io/badge/PWA-Offline%20Cache-E0533C?style=for-the-badge)

</div>

### Core Engineering Specifications

| Layer | Technology | Architectural Role |
|---|---|---|
| **Framework** | Next.js 16.4.0 (App Router, Turbopack) | Server Components, Partial Prerendering (PPR), Edge API routes |
| **Runtime** | React 19.3.0 + TypeScript 5 | Strict types, Actions, Hydration safety, zero `any` policy |
| **Styling** | Tailwind CSS v4.3.3 (`@theme` in CSS) | Terracotta brand tokens (`#E0533C`), Dark mode surface (`#0B0A09`) |
| **State & Cache** | TanStack Query v5 (`@tanstack/react-query`) | Unidirectional server state caching, optimistic mutation invalidation |
| **Database & Auth** | Supabase (`@supabase/ssr`, Postgres RLS) | Strict single-tenant isolation, row-level security, auth sessions |
| **Validation** | Zod (`z.object({...})`) | Schema validation at all API route handlers and trust boundaries |
| **Integrations** | Twilio, Resend, Razorpay | SMS/WhatsApp messaging, transactional emails, subscription billing |
| **Offline & PWA** | Web Manifest + Native Service Worker | Offline cache-first static assets, network-first shell, install banner |
| **Visualizations** | Mermaid.js + Framer Motion | Interactive workflow topologies, live journey maps, dynamic charts |

---

# Core Business Modules

```text
┌────────────────────────────────────────────────────────────────────────┐
│                          NEXUS PLATFORM CORE                           │
├───────────────┬────────────────┬────────────────┬──────────────────────┤
│  AUTONOMOUS   │   OMNI-CHANNEL │    CUSTOMER    │  LIFECYCLE WEBINAR   │
│   WORKFLOWS   │    CRM ENGINE  │  JOURNEY MAPS  │   & EVENT SUITE      │
├───────────────┼────────────────┼────────────────┼──────────────────────┤
│ • State Mach. │ • Lead Pipeline│ • Funnel Graph │ • Series & Sessions  │
│ • Approvals   │ • Lead Score   │ • Churn Risk   │ • Reg. Capacity      │
│ • Auto-Retry  │ • Omni Comms   │ • Transitions  │ • Attendance Sync    │
│ • Run History │ • Sentiment    │ • Velocity     │ • Automated Surveys  │
├───────────────┼────────────────┼────────────────┼──────────────────────┤
│ MULTI-CHANNEL │  DYNAMIC SITE  │   SAAS USAGE   │   CENTRAL AUDIT      │
│   MARKETING   │    BUILDER     │   & BILLING    │     LOG VAULT        │
├───────────────┼────────────────┼────────────────┼──────────────────────┤
│ • Segmenting  │ • AI Assistant │ • Razorpay Pay │ • Compliance RPC     │
│ • Email / SMS │ • Live Deploy  │ • Plan Limits  │ • Actor Attribution  │
│ • WhatsApp    │ • SEO Meta     │ • Invoice Gen  │ • Business Scoping   │
│ • Unsubscribe │ • Custom Slugs │ • Metered Use  │ • Immutable DB Logs  │
└───────────────┴────────────────┴────────────────┴──────────────────────┘
```

---

## 1. Autonomous AI Workflow Studio & Human Approvals

The Nexus Autonomous Workflow Engine executes multi-step business logic across internal and external APIs without hallucinating side effects.

- **Explicit Lifecycle State Machine:**
  $$\text{DRAFT} \longrightarrow \text{AWAITING\_APPROVAL} \longrightarrow \text{QUEUED} \longrightarrow \text{RUNNING} \longrightarrow \text{COMPLETED} \mid \text{FAILED}$$
- **Human-in-the-Loop Checkpoints:** High-consequence side effects (bulk messaging, external domain publishing, monetary transactions) pause execution and require distinct, non-bypassable owner sign-off.
- **Idempotency Guarantees:** Side effects carry unique idempotency keys to prevent duplicate actions during network retries or worker restarts.
- **Visual Topology & Dry Runs:** Generates interactive Mermaid.js flow diagrams and provides dry-run payload inspection prior to execution.

```text
Step 1: Segment Filter ───> Step 2: AI Copy Draft ───> [CHECKPOINT: Human Approval] ───> Step 3: Twilio Dispatch
```

---

## 2. Omni-Channel CRM & Lead Intelligence

A consolidated relationship hub designed to capture, organize, and score customer interactions across all channels.

- **Pipeline Stages:** `LEAD` &rarr; `PROSPECT` &rarr; `OPPORTUNITY` &rarr; `CUSTOMER` &rarr; `INACTIVE`.
- **Real-Time Sentiment Scoring:** Evaluates inbound customer communication tone and sentiment intensity to prioritize high-value prospects.
- **Omni-Channel Timeline:** Unifies WhatsApp messages, Twilio SMS conversations, transactional emails, webinar attendances, and note history into a single feed.
- **Zero-IDOR Security:** Every contact mutation and fetch strictly verifies ownership through server-derived business tenant contexts (`.eq('business_id', verifiedBusinessId)`).

---

## 3. Customer Journey Mapping & Velocity Analytics

Visualizes how accounts progress through your business funnel from cold discovery to lifetime customer.

- **Stage Transition Graphs:** Measures transition velocity between funnel milestones.
- **Bottleneck & Churn Analytics:** Flags stalled prospects based on configurable inactivity thresholds.
- **Stage Action Triggers:** Automatically dispatches notifications, tags contacts, or invokes workflows when a lead enters a new milestone.

---

## 4. Lifecycle Webinar & Event Suite

A full-service event platform designed to turn attendees into paying customers.

- **Session & Series Architecture:** Host standalone events or link sessions into multi-part masterclass series under a single registration funnel.
- **Registration Controls:** Automatic capacity caps, custom registration deadlines, and instant confirmation notifications.
- **Live Attendance Reconciliation:** Track check-in timestamps, participant vs. registrant counts, and attendance durations.
- **Automated Two-Track Follow-ups:** Automatically segregates post-session emails:
  - **Attendees:** Receives satisfaction surveys, slide decks, and product upgrade offerings.
  - **No-Shows:** Receives session recaps and reschedule invitations.
- **Explicit Marketing Opt-In:** Strict separation between event transaction notifications and future marketing opt-ins.

---

## 5. Multi-Channel Marketing Engine

Automate high-converting outreach campaigns across Email, SMS, and WhatsApp.

- **Dynamic Audience Segmentation:** Filter contacts by lifecycle stage, sentiment rating, tag combinations, or event attendance history.
- **Merge-Tag Templating:** Personalize messages with `{{first_name}}`, `{{last_name}}`, `{{company}}`, and fallback values in both text and preview modes.
- **Twilio SMS & WhatsApp Sandboxing:** Production-grade phone formatting with E.164 normalization and development sandbox fallback.
- **Granular Suppression System:** Automated bounce handling, rate-limiting shields, and one-click compliance unsubscribe tokens (`/api/marketing/unsubscribe/[token]`).

---

## 6. Dynamic Website Builder & AI Page Studio

Rapidly design and deploy public-facing landing pages and event capture portals without leaving Nexus.

- **Visual Customizer:** Customize brand colors, hero typography, feature matrices, and CTA forms.
- **AI Copy Assistance:** Instant headline generation, feature value-prop drafting, and SEO meta optimization.
- **Instant Publishing:** Single-click deployments serving live routes directly on clean URL paths.

---

## 7. SaaS Usage, Billing & Razorpay Integration

Metered consumption and subscription monetization built directly into the operating system.

- **Subscription Tier Gating:** `Free`, `Starter`, `Professional`, and `Enterprise` limits for contacts, workflows, and campaign messages.
- **Razorpay Orders & Verification:** Cryptographic HMAC signature verification on webhook and client-side payment completion.
- **Invoice Vault:** Downloadable PDF invoice generation, payment receipt logging, and billing usage meters.

---

## 8. Immutable Central Audit Logging

Nexus enforces compliance and security accountability via a unified server-side audit service (`AuditService`).

- **Actor Disambiguation:** Strictly separates `user` (human), `ai_agent` (AI executor), `system` (background daemon), and `integration` (webhooks).
- **Three-Tier Authority:** Always records the **Initiator** (who requested), the **Approver** (who signed off), and the **Executor** (who called the API).
- **Database Enforcement:** Audit records are written via PostgreSQL RPC `record_audit_log_tx` with automatic fallback to direct table persistence, guaranteeing no critical event is silently lost.

---

# Progressive Web App (PWA) Architecture

Nexus features a zero-dependency, production-grade Progressive Web App configured natively for Next.js 16 and Turbopack.

```text
Browser Client
   │
   ├── Service Worker (/sw.js)
   │     ├── Install: Pre-caches critical shell (/, /dashboard, /offline, icons)
   │     ├── Fetch: Cache-first for static assets (_next/static, images, fonts)
   │     ├── Fetch: Network-first for navigation routes with /offline fallback
   │     └── Security: Strict bypass for all dynamic /api/* and /auth/* routes
   │
   ├── Web Manifest (/manifest.webmanifest)
   │     ├── Standalone app mode (no browser URL chrome)
   │     ├── Terracotta theme color (#E0533C) & obsidian background (#0B0A09)
   │     ├── Maskable & standard icons (192px, 512px, SVG)
   │     └── Shortcuts: Direct launcher for Dashboard, Agent, CRM, Marketing
   │
   └── In-App Install Prompt (<PwaInstallPrompt />)
         └── Captures beforeinstallprompt with session-aware dismissal
```

---

# System Architecture & Unidirectional Data Flow

Nexus strictly enforces a unidirectional data flow architecture. UI components never access database clients directly:

```text
┌────────────────────────────────────────────────────────┐
│ UI Components (Server & Client Components)             │
│ • Render shells, handle user interactions, call hooks  │
└───────────────────────────┬────────────────────────────┘
                            │ (invokes client hooks)
                            ▼
┌────────────────────────────────────────────────────────┐
│ Custom TanStack Query Hooks (@/hooks/...)              │
│ • Typed JSON fetchers, cache keys, optimistic updates  │
└───────────────────────────┬────────────────────────────┘
                            │ (HTTP fetch via JSON API)
                            ▼
┌────────────────────────────────────────────────────────┐
│ Next.js API Route Handlers (@/app/api/.../route.ts)    │
│ • Authenticates caller & validates input via Zod       │
│ • Enforces business tenant authorization & IDOR checks │
└───────────────────────────┬────────────────────────────┘
                            │ (invokes domain services)
                            ▼
┌────────────────────────────────────────────────────────┐
│ Service Layer (@/services/...)                         │
│ • Encapsulates business domain logic and transactions  │
│ • Dispatches audit events to AuditService              │
└───────────────────────────┬────────────────────────────┘
                            │ (server-only Supabase client)
                            ▼
┌────────────────────────────────────────────────────────┐
│ Server-Only Supabase Database Client (@/lib/supabase)  │
│ • Respects PostgreSQL Row Level Security (RLS)         │
└───────────────────────────┬────────────────────────────┘
                            │ (parameterized SQL queries)
                            ▼
┌────────────────────────────────────────────────────────┐
│ PostgreSQL Database (Supabase)                         │
└────────────────────────────────────────────────────────┘
```

---

# Project Structure

```text
BNB_Internal_2026/
│
├── project/                            # Application Root Directory
│   ├── app/                            # Next.js 16 App Router
│   │   ├── api/                        # RESTful API Route Handlers
│   │   │   ├── analytics/              # Aggregated metrics & dashboard reporting
│   │   │   ├── audit/                  # Audit trail queries & verification
│   │   │   ├── auth/                   # Signup, login, and session exchange
│   │   │   ├── billing/                # Razorpay order, verify, usage, invoices
│   │   │   ├── crm/                    # Contacts, activities, timeline messages
│   │   │   ├── journey-maps/           # Journey funnel generation & stage actions
│   │   │   ├── marketing/              # Campaigns, dispatch, suppression, tracking
│   │   │   ├── public/                 # Public webinar registration & feedback forms
│   │   │   ├── webinars/               # Webinar sessions, series, attendance sync
│   │   │   ├── website/                # Visual site generator & publishing API
│   │   │   └── workflows/              # Workflow definitions, AI generation, runs
│   │   │
│   │   ├── dashboard/                  # Authenticated Dashboard Application
│   │   │   ├── agent/                  # Autonomous AI Agent Studio
│   │   │   ├── analytics/              # Platform intelligence & KPI charts
│   │   │   ├── approvals/              # Human-in-the-loop checkpoint queue
│   │   │   ├── audit-logs/             # Immutable audit log inspection table
│   │   │   ├── billing/                # Subscription management & invoice portal
│   │   │   ├── crm/                    # Kanban pipeline & omni-channel contact hub
│   │   │   ├── intelligence/           # Customer journey maps & funnel velocity
│   │   │   ├── marketing/              # Campaign composer, audience preview & dispatch
│   │   │   ├── webinars/               # Webinar manager & attendance tracking
│   │   │   ├── website/                # Visual website editor & custom domains
│   │   │   └── workflows/              # Automated workflow list & run logs
│   │   │
│   │   ├── offline/                    # PWA offline fallback shield
│   │   ├── layout.tsx                  # Root layout, viewport, PWA registration
│   │   ├── manifest.ts                 # Native Web App Manifest route
│   │   └── globals.css                 # Tailwind CSS v4 @theme design tokens
│   │
│   ├── components/                     # Modular React Components
│   │   ├── pwa/                        # PWA registration & install banner
│   │   ├── providers/                  # QueryClientProvider & theme wrappers
│   │   └── ui/                         # Accessible UI primitives & inputs
│   │
│   ├── hooks/                          # Custom TanStack Query Hooks
│   │   ├── use-contacts.ts             # Contact queries & stage mutations
│   │   ├── use-campaigns.ts            # Campaign fetching & dispatch hooks
│   │   └── use-webinars.ts             # Webinar series & attendance hooks
│   │
│   ├── lib/                            # Shared Utilities & Clients
│   │   ├── supabase/                   # Server-only Supabase SSR client factories
│   │   └── utils.ts                    # Class name mergers & date formatters
│   │
│   ├── public/                         # Public Assets & Service Worker
│   │   ├── icons/                      # PWA icons (192px, 512px, maskable, apple)
│   │   └── sw.js                       # Offline caching service worker
│   │
│   ├── services/                       # Server-Side Business Domain Services
│   │   ├── analytics.service.ts        # Performance calculations & forecasting
│   │   ├── audit.service.ts            # Mandatory compliance audit logging
│   │   ├── auth.service.ts             # Single-tenant user & business onboarding
│   │   ├── billing.service.ts          # Razorpay orders, limits & invoice generation
│   │   ├── crm.service.ts              # Contact invariants & stage transitions
│   │   ├── journey-map.service.ts      # Journey topology & churn analytics
│   │   ├── marketing.service.ts        # Merge-tag rendering, segments, suppression
│   │   ├── notification.service.ts     # Multi-channel dispatch (Twilio SMS/WhatsApp)
│   │   ├── webinar/                    # Event sessions, attendance & follow-ups
│   │   ├── website.service.ts          # Website publishing & AI copy assistance
│   │   └── workflow-engine.service.ts  # State-machine execution & checkpoint logic
│   │
│   ├── supabase/migrations/            # Versioned PostgreSQL migrations & RLS
│   ├── tests/                          # Automated seam tests & domain assertions
│   └── package.json                    # Project metadata & dependencies
│
├── AGENTS.md                           # AI Agent operating directives & seams
├── CONTEXT.md                          # Domain ubiquitous language & terms
├── DESIGN.md                           # Editorial design tokens & UI patterns
└── Readme.md                           # Repository documentation
```

---

# API Route Architecture

Nexus exposes a modular RESTful API strictly guarded by authentication, Zod schema validation, and server-side tenant derivation.

```text
/api
│
├── /analytics                          # Aggregated metrics & revenue statistics
├── /audit                              # Verified audit event inspection
│
├── /auth
│   ├── /signup                         # Registration & automatic business creation
│   ├── /login                          # Authenticated cookie exchange
│   └── /session                        # Session validation & identity resolution
│
├── /billing
│   ├── /subscription                   # Current tier status & usage metrics
│   ├── /invoices                       # Invoice generation & history
│   └── /razorpay
│       ├── /order                      # Cryptographic order token creation
│       └── /verify                     # Webhook/client HMAC verification
│
├── /crm
│   ├── /contacts                       # Contact CRUD with tenant isolation
│   ├── /contacts/[id]/activities       # Unified omni-channel interaction log
│   ├── /contacts/[id]/messages         # Direct SMS/WhatsApp message thread
│   └── /stats                          # Pipeline conversion counts
│
├── /journey-maps
│   ├── /                               # Journey map definitions
│   ├── /generate                       # AI-assisted funnel generation
│   └── /[id]/stages                    # Stage actions & velocity metrics
│
├── /marketing
│   ├── /campaigns                      # Campaign creation & scheduling
│   ├── /campaigns/[id]/dispatch        # Multi-channel batch dispatch
│   ├── /segment/preview                # Real-time recipient filtering & count
│   ├── /suppression                    # Opt-out & bounce registry
│   └── /unsubscribe/[token]            # One-click cryptographic opt-out
│
├── /public
│   ├── /webinars/[slug]                # Public registration portal
│   └── /webinar-feedback/[token]       # Post-event attendee feedback form
│
├── /webinars
│   ├── /                               # Webinar session management
│   ├── /[id]/attendance                # Check-in sync & participant logging
│   └── /[id]/followup                  # Post-event survey trigger
│
├── /website
│   ├── /                               # Page template configurations
│   ├── /ai-assist                      # AI marketing copy generation
│   └── /[id]/publish                   # Production route deployment
│
└── /workflows
    ├── /                               # Workflow definitions
    ├── /generate                       # AI natural-language workflow synthesis
    ├── /[id]/run                       # Workflow worker trigger
    └── /[id]/approve                   # Human checkpoint authorization
```

---

# Single-Owner Business Isolation & Security

Nexus enforces a strict **Single-Owner, Single-Business** partitioned tenancy model:

```text
[User Account]  1 ─── 1  [Business]  1 ─── N  [Contacts / Campaigns / Invoices / Webinars]
```

### Security Rules
1. **Zero Client Trust:** Never trust a client-supplied `business_id` or `user_id` from query parameters, cookies, or request bodies.
2. **Server-Derived Context:** User identity is always resolved through `supabase.auth.getUser()`, followed by querying the single business owned by that user ID.
3. **Insecure Direct Object Reference (IDOR) Prevention:** Looking up an entity by primary key `id` is always combined with `.eq('business_id', verifiedBusinessId)`.
4. **Mandatory Row Level Security (RLS):** Every PostgreSQL table enforces RLS ensuring tenant records remain cryptographically unreachable across accounts.

---

# Design System

Nexus features an editorial, high-density interface designed to balance productivity with an authoritative aesthetic.

### Brand Palette (OKLCH Native)

```text
Terracotta Core    #E0533C    oklch(0.62 0.21 28)    Primary accent, CTA buttons, active indicators
Obsidian Surface   #0B0A09    oklch(0.12 0.01 45)    Dark mode background canvas
Warm Card          #141311    oklch(0.16 0.01 50)    Card containers, table rows, drawers
Subtle Border      #262420    oklch(0.24 0.01 55)    Dividers, structural seams
Pure White         #FFFFFF    oklch(0.99 0.00 0)     Headings, primary typographic hierarchy
Muted Text         #9A9488    oklch(0.68 0.02 60)    Secondary labels, timestamps, metadata
```

### Typography Hierarchy

```text
Bricolage Grotesque  → High-impact metric callouts, section headers, hero titles
Manrope              → Interface typography, readable body prose, form fields
JetBrains Mono       → Financial amounts, transaction IDs, status codes, audit logs
```

---

# Quick Start & Local Setup

### Prerequisites

Ensure you have the following installed on your machine:
- **Node.js**: `v20.x` or `v22.x`
- **npm**: `v10+`
- **Git**
- A configured **Supabase project** (PostgreSQL with RLS enabled)

---

### 1. Clone the Repository

```bash
git clone https://github.com/Reniyas717/TeamPony_college_round.git
cd TeamPony_college_round/project
```

---

### 2. Configure Environment Variables

Create `.env.local` inside the `project/` directory:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key

# Razorpay Payments
RAZORPAY_KEY_ID=your-razorpay-key-id
RAZORPAY_KEY_SECRET=your-razorpay-key-secret

# Communication Providers
TWILIO_ACCOUNT_SID=your-twilio-account-sid
TWILIO_AUTH_TOKEN=your-twilio-auth-token
TWILIO_PHONE_NUMBER=your-twilio-phone-number
TWILIO_WHATSAPP_NUMBER=whatsapp:+14155238886

# Transactional Email
RESEND_API_KEY=your-resend-api-key

# AI Orchestration
GROQ_API_KEY=your-groq-api-key
```

> **Security Warning:** Never commit `SUPABASE_SERVICE_ROLE_KEY` or payment secrets to public repositories.

---

### 3. Install Dependencies

```bash
npm install
```

---

### 4. Database Schema Setup

Apply the SQL migration scripts in `project/supabase/migrations/` via the Supabase SQL Editor to initialize:
- Single-tenant account and business tables
- Central immutable audit log tables and RPC functions (`record_audit_log_tx`)
- CRM, Webinar, Workflow, and Billing tables with RLS policies

---

### 5. Start the Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser. The app will launch with Next.js 16 App Router, Turbopack, and PWA capabilities enabled.

---

### 6. Run the Test Suite

Execute the vertical seam unit and integration test suite:

```bash
npm test
```

---

# Key Application Routes

| Route | Purpose | Access Level |
|---|---|---|
| `/` | Product landing experience & overview | Public |
| `/login` | Owner authentication & session handshake | Public |
| `/signup` | Account registration & automatic business creation | Public |
| `/dashboard` | Executive KPI overview & operational summaries | Authenticated |
| `/dashboard/agent` | Autonomous AI Agent workflow studio & runner | Authenticated |
| `/dashboard/crm` | Pipeline stages, contact list, omni-channel feeds | Authenticated |
| `/dashboard/intelligence`| Customer journey maps, funnel velocity & churn | Authenticated |
| `/dashboard/webinars` | Webinar series, session scheduling & attendance | Authenticated |
| `/dashboard/marketing` | Campaigns, dynamic audience preview & dispatch | Authenticated |
| `/dashboard/website` | Visual website builder & instant page publishing | Authenticated |
| `/dashboard/billing` | Razorpay subscription plans, invoices & usage | Authenticated |
| `/dashboard/approvals` | Human checkpoint approval/rejection queue | Authenticated |
| `/dashboard/audit-logs`| Immutable compliance audit log viewer | Authenticated |
| `/offline` | PWA offline fallback shield | Offline / Cached |

---

# Contributors

Nexus was developed collaboratively by **Team Pony**:

<div align="center">

| Contributor | GitHub |
|:---:|:---:|
| **Reniyas717** | [![GitHub](https://img.shields.io/badge/GitHub-Reniyas717-181717?style=for-the-badge&logo=github&logoColor=white)](https://github.com/Reniyas717) |
| **rohanbagel** | [![GitHub](https://img.shields.io/badge/GitHub-rohanbagel-181717?style=for-the-badge&logo=github&logoColor=white)](https://github.com/rohanbagel) |
| **Hike-12** | [![GitHub](https://img.shields.io/badge/GitHub-Hike--12-181717?style=for-the-badge&logo=github&logoColor=white)](https://github.com/Hike-12) |
| **Mayank Mehta** | [![GitHub](https://img.shields.io/badge/GitHub-MayankMehta-181717?style=for-the-badge&logo=github&logoColor=white)](https://github.com/Reniyas717) |

</div>

---

# License

This project is developed for hackathon, academic, and commercial demonstration purposes. All rights reserved by the contributors.

---

<div align="center">

## Nexus

**The Autonomous Business Operating System.**

Built with precision by Team Pony.

[![GitHub](https://img.shields.io/badge/GitHub-TeamPony__college__round-181717?style=for-the-badge&logo=github&logoColor=white)](https://github.com/Reniyas717/TeamPony_college_round)

</div>