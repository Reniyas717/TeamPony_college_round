# Implementation Plan — Customer Journey Intelligence & Next-Best Action Engine

> **Module:** Machine Learning & Predictive Personalization Engine  
> **Status:** Authoritative Specification & Implementation Blueprint  
> **Context:** Distinct from standard CRM (which handles manual pipeline management & contact tables). This engine is the **predictive decision brain** that continuously listens to cross-module signals (Website visits, Webinar attendance, Campaign clicks, Billing transactions, and CRM touchpoints), models intent/churn probabilities, explains recommendations with concrete evidence, executes actions upon owner approval, and measures conversion uplift.

---

## 1. Goal Description

Build an end-to-end, deterministic Machine Learning & Predictive Intelligence Engine inside Nexus that:
1. **Aggregates Multi-Touchpoint Event Streams:** Captures events from Website Builder (`page_view`, `pricing_visit`, `checkout_abandon`), Webinars (`attended`, `q_and_a_ask`), Email Campaigns (`opened`, `clicked`), Billing (`invoice_failed`, `plan_upgrade`), and CRM interactions.
2. **Performs Identity Resolution:** Unifies anonymous cookie sessions with authenticated contact records upon form submission or email click.
3. **Calculates Real-Time Customer Vectors:**
   - **Purchase Intent Score (0–100%):** Weighted velocity of high-intent actions (e.g. repeated `/pricing` visits + webinar attendance - checkout abandon).
   - **Churn Probability Risk (0–100%):** Inactivity decay + usage drop + failed invoice signals.
   - **Engagement Velocity:** Rate of customer touchpoints over 7/14/30-day windows.
4. **Generates Ranked Next-Best Actions (NBA) with Explainable Evidence:**
   - E.g., *"Recommend VIP Executive Discount (20%) — Trigger: High purchase intent (84%), visited pricing 3x, abandoned checkout 4h ago"*.
5. **Enforces Human Approval & Action Dispatch:** One-click approval to dispatch personalized emails, assign CRM sales tasks, or apply billing discounts with full idempotency.
6. **Measures Lift & Experiment Uplift:** Tracks whether executing the NBA resulted in statistically significant conversion / retention lift vs baseline.

---

## 2. Distinction from Existing Nexus CRM (`CRM_README.md`)

| Capability | Nexus CRM (`CRM_README.md`) | Customer Journey Intelligence (This Feature) |
|---|---|---|
| **Primary Purpose** | Operational contact management & sales pipeline tracking (Kanban/Table). | **Predictive AI Brain & Recommendation Engine** across all platform modules. |
| **Data Focus** | Static/manual contact fields, lifecycle stages (`lead`, `qualified`, etc.), notes. | **High-frequency cross-module event stream** (webinar, website, billing, email, CRM). |
| **Action Paradigm** | Manual sales reps tasks & manual stage progression. | **Automated next-best action ranking**, intent scoring, and automated experiment uplift tracking. |
| **Intelligence** | Basic filter & search. | **Bayesian purchase intent calculation, churn risk decay models, and explainability cards**. |

---

## 3. Architecture & Data Flow

```mermaid
flowchart TD
    subgraph Event Ingestion (Cross-Module)
        Web[Website Visits / Checkout Abandon] --> Ingest[Event Ingestion API /api/intelligence/events]
        Webinar[Webinar Attendance & Q&A] --> Ingest
        Marketing[Email Opens & Clicks] --> Ingest
        Billing[Invoice Events & MRR] --> Ingest
        CRM[Sales Calls & Stage Updates] --> Ingest
    end

    Ingest --> Identity[Identity Resolution & Session Stitching]
    Identity --> EventStore[(customer_journey_events)]

    subgraph Intelligence & Scoring Engine
        EventStore --> FeatureEngine[Customer Journey Feature Extractor]
        FeatureEngine --> IntentModel[Intent & Churn Prediction Algorithm]
        IntentModel --> NBARanker[Next-Best Action Ranking & Evidence Generator]
    end

    NBARanker --> RecommendationStore[(customer_recommendations)]
    
    subgraph Execution & Impact Measurement
        RecommendationStore --> UI[Intelligence Dashboard & Live Journey Stream]
        UI --> ApproveGate{Owner Review & Approval}
        ApproveGate -- Approve --> Dispatcher[Action Dispatcher]
        Dispatcher --> CRMTask[Create CRM Task]
        Dispatcher --> EmailOffer[Send Targeted Email]
        Dispatcher --> BillingDiscount[Apply Stripe Discount]
        
        Dispatcher --> ExperimentTracker[Lift & Conversion Uplift Engine]
        ExperimentTracker --> ImpactMetrics[(recommendation_outcomes)]
    end
```

---

## 4. Proposed Changes & File Inventory

### 4.1 Database Layer (PostgreSQL & Supabase Migration)

#### `[NEW]` `project/supabase/migrations/20261012_journey_intelligence.sql`
- **`customer_journey_events`**: Cross-module unified event log (tenant scoped, indexed on `contact_id`, `anonymous_id`, `event_type`, `created_at`).
- **`customer_scores`**: Materialized / real-time scores (`intent_score`, `churn_risk`, `engagement_velocity`, `lifecycle_momentum`).
- **`customer_recommendations`**: Ranked NBA recommendations with explicit evidence chains, status (`PENDING_APPROVAL`, `APPROVED`, `REJECTED`, `EXECUTED`).
- **`recommendation_outcomes`**: Attribution tracking measuring conversion event, time-to-convert, and incremental revenue uplift.
- **Row Level Security (RLS)** strictly applied on all 4 tables with `business_id IN (SELECT id FROM businesses WHERE owner_id = auth.uid())`.

---

### 4.2 Data Validation & Type Layer (Zod)

#### `[NEW]` `project/lib/validations/intelligence.ts`
- `JourneyEventSchema`: Validates inbound events (`eventType`, `actorId`, `anonymousId`, `metadata`, `timestamp`).
- `NextBestActionSchema`: Validates action types (`SEND_PERSONALIZED_OFFER`, `ASSIGN_SALES_CALL`, `RECOVERY_CAMPAIGN`, `APPLY_RETENTION_DISCOUNT`).
- `CustomerInsightSchema`: Validates computed intent, churn probability, and evidence bullet points.
- `ExperimentUpliftSchema`: Validates conversion attribution and ROI lift metrics.

---

### 4.3 Service Layer (Business Domain & Prediction Logic)

#### `[NEW]` `project/services/journey-intelligence.service.ts`
- **`recordEvent(event)`**: Ingests cross-module events, performs anonymous-to-contact identity stitching.
- **`computeCustomerMetrics(contactId)`**:
  - *Bayesian Purchase Intent Model*: $P(\text{Intent} \mid \text{Pricing Visits}, \text{Webinar}, \text{Abandon})$.
  - *Time-Decay Churn Model*: Half-life activity decay based on last touchpoint & billing status.
- **`generateNextBestActions(contactId)`**: Generates structured, evidence-backed recommendations.
- **`executeApprovedAction(recommendationId)`**: Dispatches approved actions with SHA-256 idempotency protection.
- **`getJourneyOverview(filters)`**: Retrieves aggregate business intent distribution, top at-risk accounts, and active recommendations.

---

### 4.4 API Route Handlers

#### `[NEW]` `project/app/api/intelligence/events/route.ts`
- `POST`: High-throughput ingestion endpoint for cross-module events.

#### `[NEW]` `project/app/api/intelligence/insights/route.ts`
- `GET`: Returns overall journey metrics, high-intent leads, churn risks, and intent distribution.

#### `[NEW]` `project/app/api/intelligence/recommendations/route.ts`
- `GET`: Lists ranked Next-Best Actions awaiting review.

#### `[NEW]` `project/app/api/intelligence/recommendations/[id]/action/route.ts`
- `POST`: Executes or rejects recommended actions upon owner confirmation (`approve` / `reject`).

---

### 4.5 UI Presentation Layer (`DESIGN.md` Compliant)

#### `[NEW]` `project/app/dashboard/intelligence/page.tsx`
- Server shell prerendering static layout with `<Suspense>` streaming for dynamic ML insights.

#### `[NEW]` `project/app/dashboard/intelligence/intelligence-client.tsx`
- Interactive main client view featuring:
  1. **Executive Insight KPIs:** High Intent Leads count, At-Risk MRR, Conversion Uplift Rate (+34.2%), and Active Recommendations.
  2. **Next-Best Action Recommendation Stream:** Interactive cards displaying:
     - Predicted intent score (e.g. `88% High Intent` / `72% Churn Risk`).
     - Evidence trail (e.g., *"Visited /pricing 3x • Attended Q3 Product Webinar • Abandoned Checkout 2h ago"*).
     - Expected Impact (e.g., *"+$4,200 MRR potential"*).
     - Single-click `[Approve & Execute]` and `[Dismiss]` controls.
  3. **Unified Customer Journey Timeline:** Interactive visual audit trail showing multi-module touchpoints in chronological order.
  4. **Experiment Lift & Attribution Chart:** Displays pre vs post-action conversion velocity.

#### `[MODIFY]` `project/app/dashboard/dashboard-client.tsx`
- Link the "Intelligence" and "AI Business Agent" modules to `/dashboard/intelligence`.

---

## 5. External Help & Dependencies Required

1. **No New Heavy NPM Packages Needed:**
   - Predictive intent and churn scoring can be implemented using native deterministic Bayesian weighting and exponential half-life decay functions without adding bloated ML Python runtimes or unsafe client packages.
2. **Environment Variables:**
   - Reuses existing verified `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, and `SUPABASE_SECRET_KEY`.

---

## 6. Verification & Quality Gates

### Automated Verification:
- **Lint Check:** `npm --prefix project run lint` — must exit with 0 errors / 0 warnings.
- **Build Check:** `npm --prefix project run build` — Turbopack compilation and Next.js 16 Partial Prerendering must pass cleanly.

### Manual Verification Flow:
1. Navigate to `/dashboard/intelligence`.
2. Inspect the **Next-Best Action** recommendations generated from cross-module simulated customer journeys.
3. Click **"Approve & Execute"** on a high-intent offer recommendation.
4. Verify that:
   - Action dispatches and marks status as `EXECUTED`.
   - The customer's activity timeline logs the attribution action.
   - Conversion uplift counter recalculates the expected business impact.
