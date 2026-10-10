# Nexus CRM — Intelligent Customer & Pipeline Management

> **Module Overview:** Authoritative specification and guide for the Nexus CRM module.  
> **Architecture Reference:** Conforms to [`AGENTS.md`](./AGENTS.md) (Unidirectional data flow, single-owner business isolation).  
> **Visual Reference:** Conforms to [`DESIGN.md §15.2`](./DESIGN.md) (Warm OKLCH palette, Manrope/Bricolage typography, Iconsax linear icons).

---

## 1. Executive Summary

In traditional business workflows, customer management is fragmented across separate website builders (WordPress, Webflow), webinar platforms (Zoom), form tools (Typeform), and standalone CRMs (HubSpot, Salesforce). This fragmentation results in lost leads, manual data entry, and broken context.

**Nexus CRM** is the unified customer database and sales engine of Nexus. It automatically captures leads from native website forms and webinar registrations, visualizes deal progress through an interactive sales pipeline, tracks chronological customer touchpoints in an activity timeline, and allows the **AI Business Agent** to execute multi-step automations across the customer lifecycle.

---

## 2. Business & Tenant Isolation Model

Per [`AGENTS.md §4.1`](./AGENTS.md#L182), Nexus enforces a **Single-Owner, Single-Business Model**:

```text
[User Account]  1 ─── 1  [Business]  1 ─── N  [CRM Contacts & Activities]
```

- **Single Business Owner:** The logged-in business owner is the sole operator. There are no multi-user team invites, permission matrices, or role switching.
- **Tenant Scoping:** All queries and mutations are isolated by `business_id` at the database and service layers.
- **Zero Client Trust:** The authenticated user identity is resolved on the server; client-provided tenant identifiers are never trusted.

---

## 3. Core Capabilities & User Experience

### 3.1 Lead Capture & Sourcing
Leads enter the system through four primary sources:
1. **Website Forms (`website_form`):** Submissions from the visual landing page builder automatically create or enrich leads.
2. **Webinar Registrations (`webinar`):** Registrants for online events are tagged and routed into the pipeline.
3. **Manual Entry (`manual`):** Quick-add drawer form for direct data entry.
4. **Referrals & Inbound (`referral`):** Tracked attribution for partner deals.

### 3.2 Sales Pipeline & Lifecycle Stages
Contacts transition through explicit business stages:

| Stage | Badge Style | Description |
|---|---|---|
| **`lead`** | Neutral (`--status-neutral`) | Newly captured contact; no outreach yet. |
| **`contacted`** | Info (`--status-info`) | Initial communication or email initiated. |
| **`qualified`** | Info (`--status-info`) | Verified budget, authority, and need. |
| **`proposal`** | Warning (`--status-warning`) | Pricing, quote, or proposal delivered. |
| **`customer`** | Success (`--status-success`) | Deal won; active customer or subscriber. |
| **`churned`** | Danger (`--status-danger`) | Inactive, lost opportunity, or cancelled. |

### 3.3 Dual Working Views
1. **Spreadsheet Table View:**
   - **Columns:** Name & Company, Stage chip, Owner avatar, Next Action (with overdue warning badge), Last Activity (relative + absolute hover), Deal Value (right-aligned tabular currency in ₹).
   - **Sticky Toolbar:** Real-time search by name/email/company, filter by stage/source/tag, density toggle, and primary `+ Add Contact` brand button.
2. **Pipeline (Kanban) Board:**
   - Visual cards grouped into vertical columns by stage.
   - Column headers display stage count and aggregate deal value.
   - Interactive stage progression (move forward/backward with one click).

### 3.4 Contact Detail Drawer (`lg` Slide-out / `<lg` Full Screen)
Clicking any contact row or Kanban card opens a slide-out panel:
- **Header:** Contact name, company, stage badge, deal value, quick action buttons (copy email, call phone, edit stage).
- **Inline Editing:** Update `Stage` and `Next Action` directly.
- **Tabs:**
  - **Overview:** Core contact fields, tags, deal value, source attribution.
  - **Activity Timeline:** Reverse-chronological timeline grouped by day.
  - **Notes:** Freeform notes and comments.

### 3.5 Funnel & Conversion Analytics
At the top of the CRM view, a conversion banner displays:
- **Conversion Ratios:** Always shown with explicit denominators per [`DESIGN.md §15.2`](./DESIGN.md#L772) (e.g., `"14 of 52 qualified · 27%"`), never percentages without bases.
- **Pipeline Value:** Total pipeline value formatted with **Bricolage Grotesque** tabular numerals.

---

## 4. Cross-Module & AI Business Agent Integration

The defining power of Nexus CRM is its deep integration with the rest of the workspace:

```text
┌──────────────────────┐      ┌─────────────────────────┐
│ Website Form Submit  ├─────►│                         │
└──────────────────────┘      │                         │
                              │        Nexus CRM        │
┌──────────────────────┐      │                         │
│ Webinar Registration ├─────►│  • Central Contacts     │
└──────────────────────┘      │  • Unified Timeline     │
                              │                         │
┌──────────────────────┐      │                         │
│ AI Business Agent    │◄────►│                         │
└──────────┬───────────┘      └────────────┬────────────┘
           │                               │
           ▼                               ▼
┌──────────────────────┐      ┌─────────────────────────┐
│ Multi-Step Workflows │      │ Marketing Automation    │
│ (Targeted Campaigns) │      │ (Audience Segments)     │
└──────────────────────┘      └─────────────────────────┘
```

- **AI Natural Language Execution:**
  The business owner can instruct the AI Business Agent in plain English:
  > *"Find all leads in the Qualified stage who haven't been contacted in 7 days, and draft an outreach email."*
- **Auditability & Attribution:**
  When the AI Agent or system updates a contact, it creates an activity log with distinct **AI Agent attribution** (`actor: 'ai_agent'`) visible in the contact's timeline.

---

## 5. System Architecture & Boundaries

Nexus CRM strictly adheres to the unidirectional data flow outlined in [`AGENTS.md §3`](./AGENTS.md#L104):

```text
┌────────────────────────────────────────────────────────┐
│ UI Components (@/app/(app)/crm/...)                    │
│ • ContactsTable, PipelineBoard, ContactDetailDrawer    │
└───────────────────────────┬────────────────────────────┘
                            │ (calls client hooks)
                            ▼
┌────────────────────────────────────────────────────────┐
│ TanStack Query Hooks (@/hooks/use-crm.ts)              │
│ • contactKeys.lists(), contactKeys.detail(id)          │
└───────────────────────────┬────────────────────────────┘
                            │ (HTTP JSON API)
                            ▼
┌────────────────────────────────────────────────────────┐
│ Next.js API Routes (@/app/api/crm/.../route.ts)        │
│ • Zod input validation, owner session verification     │
└───────────────────────────┬────────────────────────────┘
                            │ (invokes service methods)
                            ▼
┌────────────────────────────────────────────────────────┐
│ Service Layer (@/services/crm.service.ts)              │
│ • Business logic, invariants, activity logging         │
└───────────────────────────┬────────────────────────────┘
                            │ (server-only queries)
                            ▼
┌────────────────────────────────────────────────────────┐
│ PostgreSQL Database (Supabase)                         │
└────────────────────────────────────────────────────────┘
```

### Prohibitions Enforced:
- ❌ **No direct client database calls:** UI components never import `@supabase/supabase-js`.
- ❌ **No Server Actions for data mutations:** All mutations pass through `/api/crm/*` REST routes.
- ❌ **No client-provided tenant identifiers:** Server derives `business_id` exclusively.

---

## 6. PostgreSQL Database Schema

```sql
-- 1. Businesses Table (Single-owner isolation)
CREATE TABLE public.businesses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL,
  name TEXT NOT NULL,
  currency TEXT NOT NULL DEFAULT 'INR',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. CRM Contacts Table
CREATE TABLE public.crm_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  company TEXT,
  stage TEXT NOT NULL CHECK (stage IN ('lead', 'contacted', 'qualified', 'proposal', 'customer', 'churned')),
  value INTEGER NOT NULL DEFAULT 0, -- Value in base currency
  source TEXT NOT NULL CHECK (source IN ('website_form', 'webinar', 'manual', 'referral')),
  tags TEXT[] NOT NULL DEFAULT '{}',
  next_action_text TEXT,
  next_action_due_at TIMESTAMPTZ,
  last_activity_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. CRM Activity Timeline
CREATE TABLE public.crm_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  contact_id UUID NOT NULL REFERENCES public.crm_contacts(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('form_submission', 'stage_change', 'note', 'email_sent', 'ai_agent_action')),
  title TEXT NOT NULL,
  description TEXT,
  actor TEXT NOT NULL CHECK (actor IN ('owner', 'system', 'ai_agent')),
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indices for rapid querying & tenant filtering
CREATE INDEX idx_crm_contacts_biz_stage ON public.crm_contacts(business_id, stage);
CREATE INDEX idx_crm_contacts_biz_last_act ON public.crm_contacts(business_id, last_activity_at DESC);
CREATE INDEX idx_crm_activities_contact ON public.crm_activities(contact_id, created_at DESC);
```

---

## 7. Design System & Interaction Specs

- **Typography:**
  - **Manrope:** Standard UI body, table cells, form inputs, toolbar buttons.
  - **Bricolage Grotesque:** Prominent funnel KPI values and page `h1`.
- **Colors & Surfaces:**
  - Ivory background (`--background`), cream cards (`--card`), charcoal typography (`--foreground`).
  - Restrained terracotta (`--brand`) for primary CTA and active highlights.
  - Semantic status tokens: `--status-success`, `--status-warning`, `--status-info`, `--status-danger`.
- **Icons:** Exclusively `iconsax-react` (linear style).
- **Micro-interactions:** Scale press feedback (`scale(0.97)`) on action buttons, drawer transition under 300ms.
