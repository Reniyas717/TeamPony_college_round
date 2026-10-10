# Nexus — AI Agent Operating Instructions (`AGENTS.md`)

> **Scope:** Authoritative operating instructions for all AI coding agents working on the Nexus codebase.  
> **Repository Root:** `TeamPony_college_round/`  
> **Application Directory:** `project/`  
> **Design Specification:** Refer to [`DESIGN.md`](./DESIGN.md) for all visual tokens, UI patterns, and layout rules.

---

## 1. Core Engineering Directives

Every AI agent working on Nexus must operate under three integrated engineering philosophies: the **Karpathy Guidelines**, the **Ponytail Principle of Simplicity**, and the **Matt Pocock Deep-Module & Testing Disciplines**.

### 1.1 Karpathy Guidelines (Execution Discipline)

Derived from Andrej Karpathy's principles on preventing LLM coding traps:

1. **Think Before Coding**
   - **Never assume.** If an instruction has multiple interpretations or constraints are ambiguous, stop and surface them explicitly.
   - If a simpler approach exists than what was requested, present it and push back constructively.
   - State your technical assumptions before generating code.

2. **Simplicity First**
   - Implement the **minimum code that solves the problem**. Write nothing speculative.
   - No speculative abstractions, no single-use factories, no premature configuration flags.
   - If an implementation took 200 lines and could be done cleanly in 50 lines, rewrite it.

3. **Surgical Changes**
   - **Touch only what you must.** Clean up only your own orphans.
   - Never "improve" adjacent code, reformat untouched files, or adjust unrelated comments.
   - Match existing repository style, naming conventions, and file structure.
   - Every modified line must trace directly to the task at hand.

4. **Goal-Driven Execution**
   - Define verifiable success criteria before touching code.
   - Break multi-step tasks into actionable steps: `[Step] → verify: [check]`.
   - Never claim an operation is complete without executing the verification check.

---

### 1.2 Ponytail Principle (The Ladder of Simplicity)

The best code is the code that never had to be written. When deciding how to implement any feature, evaluate solutions down **The Ladder**:

```text
1. Does this need to exist at all? (YAGNI — if speculative, skip it)
   ↓
2. Does the standard library / runtime do it natively? (Use built-ins)
   ↓
3. Does a native web/browser/Postgres feature cover it? (CSS, DB constraints, HTML forms)
   ↓
4. Does an already-installed dependency solve it? (Never add a package for what 5 lines can do)
   ↓
5. Can it be expressed as a concise one-liner or simple function?
   ↓
6. Only then: implement the minimal bespoke code that works.
```

- **Deletion over addition.** Boring code over clever code.
- **Shortest working diff wins.**
- Mark deliberate structural simplifications with a comment:  
  `// ponytail: using simple lookup table; add dynamic index if key space exceeds 10k items`
- **When NOT to be lazy:** Never simplify away input validation at trust boundaries, security checks, tenant isolation, error handling that prevents data loss, or accessibility basics.

---

### 1.3 Matt Pocock Disciplines (Deep Modules, Seams & TDD)

#### Deep Modules over Shallow Layers
- **Deep Module:** A small, simple, robust interface hiding significant internal behavior and business logic.
- **Shallow Module (Anti-pattern):** A bloated interface passing through to a thin wrapper with minimal logic.
- **The Deletion Test:** If deleting a module causes complexity to evaporate, it was a useless pass-through. If complexity reappears scattered across multiple callers, the module was earning its keep.
- **Seams (Michael Feathers):** A seam is the public boundary where an interface lives. Callers and tests cross the exact same seam. Test through public interfaces, never by reaching into internals or private methods.

#### Test-Driven Development (TDD) at Seams
- Work in **vertical slices** (tracer bullets: one seam → one failing test → one minimal implementation → verify).
- Avoid horizontal slicing (writing dozens of tests upfront before any implementation exists).
- **Red before green:** Prove the test fails for the expected reason before writing production code.
- Avoid implementation-coupled tests (mocking every internal detail) and tautological tests (testing `expect(a + b).toBe(a + b)`).

#### Six-Phase Bug Diagnosis
When debugging defects, never jump straight to guessing code fixes:
1. **Phase 1 — Build a Feedback Loop:** Construct a deterministic, fast, automated repro command (curl script, test, or fixture) that fails on this specific bug.
2. **Phase 2 — Reproduce & Minimise:** Shrink the repro to the smallest load-bearing input.
3. **Phase 3 — Hypothesise:** Formulate 3–5 falsifiable hypotheses (`"If X is the cause, changing Y will..."`).
4. **Phase 4 — Instrument:** Add targeted, tagged logs (`[DEBUG-xxx]`) testing one hypothesis at a time.
5. **Phase 5 — Fix & Regression Test:** Write the regression test at the correct seam, apply the fix, verify it passes.
6. **Phase 6 — Cleanup & Post-Mortem:** Remove all debug tags and evaluate what architectural seam would have prevented the bug.

---

## 2. Repository Baseline & Next.js 16 Directives

### 2.1 Verified Repository State `[REPO]`

| Component | Verified Fact |
|---|---|
| **Root Directory** | `TeamPony_college_round/` (contains `.git`, `DESIGN.md`, `project/`) |
| **Application Directory** | `project/` |
| **Framework** | Next.js **16.4.0** (App Router, Turbopack enabled) |
| **Runtime / Library** | React **19.3.0**, TypeScript 5 (`strict: true`) |
| **Styling** | Tailwind CSS **4.3.3** (CSS-first `@theme` configuration in `project/app/globals.css`) |
| **Config Flags** | `next.config.ts`: `cacheComponents: true`, `partialPrefetching: true`, `experimental.agentFeedback: true` |
| **Package Manager** | `npm` (lockfile: `project/package-lock.json`) |
| **Path Alias** | `@/*` maps to `./*` inside `project/` |
| **Installed Dependencies** | Minimal starter: `next`, `react`, `react-dom`, `@tailwindcss/turbopack`, `tailwindcss`, `eslint`, `typescript` |
| **Missing Libraries (Planned)** | Supabase (`@supabase/supabase-js`, `@supabase/ssr`), TanStack Query, Zod, React Hook Form, Lucide/Iconsax are **not yet installed**. |

### 2.2 Next.js 16 Breaking Changes Warning `[REPO]`

As documented in `project/AGENTS.md`:

<!-- BEGIN:nextjs-agent-rules -->
> **This is NOT the Next.js you know.**  
> Next.js 16 introduces breaking changes to APIs, caching, and conventions compared to older versions. Always consult documentation located at `project/node_modules/next/dist/docs/` before implementing server routing, caching, or data loading.
<!-- END:nextjs-agent-rules -->

- **Cache Components & PPR:** With `cacheComponents: true` and `partialPrefetching: true`, static shells prerender automatically, and dynamic content streams in via `<Suspense>`.
- **Navigation with `<Activity>`:** Next.js 16 preserves route component state in client memory (mode `"hidden"`) when navigating away. Overlays, drawers, and form state may remain mounted unless explicitly reset or unmounted.
- **Server Component boundaries:** Request-bound functions (`cookies()`, `headers()`, `searchParams`) must not be called prematurely at the top of layout trees, as doing so opts entire routes out of partial prefetching.

---

## 3. Mandatory Application Data Flow & Boundaries

All reads and mutations of application business data must strictly adhere to this unidirectional architecture:

```text
┌────────────────────────────────────────────────────────┐
│ UI Components (Server / Client Components)             │
└───────────────────────────┬────────────────────────────┘
                            │ (calls client hooks)
                            ▼
┌────────────────────────────────────────────────────────┐
│ Custom TanStack Query Hooks (@/hooks/...)              │
└───────────────────────────┬────────────────────────────┘
                            │ (HTTP fetch via JSON API)
                            ▼
┌────────────────────────────────────────────────────────┐
│ Next.js API Route Handlers (@/app/api/.../route.ts)    │
│ • Authenticates caller & validates untrusted inputs    │
│ • Enforces business tenant authorization               │
└───────────────────────────┬────────────────────────────┘
                            │ (invokes service functions)
                            ▼
┌────────────────────────────────────────────────────────┐
│ Service Layer (@/services/...)                         │
│ • Encapsulates business invariants and use cases       │
│ • Owns cross-table consistency & transactions          │
└───────────────────────────┬────────────────────────────┘
                            │ (uses server-only client)
                            ▼
┌────────────────────────────────────────────────────────┐
│ Server-Only Supabase Database Client (@/lib/supabase)  │
└───────────────────────────┬────────────────────────────┘
                            │ (queries with RLS/service)
                            ▼
┌────────────────────────────────────────────────────────┐
│ PostgreSQL Database (Supabase)                         │
└────────────────────────────────────────────────────────┘
```

### 3.1 Strict Layer Responsibilities

1. **UI Presentation (`@/app/**`, `@/components/**`)**
   - Server Components render static shells and layout structure.
   - Client Components handle user interaction and invoke custom hooks.
   - **STRICT PROHIBITION:** UI components must **never** import or initialize a Supabase client, must never execute direct SQL or table queries, and must not contain backend business logic.

2. **Custom Hooks (`@/hooks/**`)**
   - Wrap TanStack Query `useQuery` and `useMutation`.
   - Call application `/api/*` endpoints via typed fetchers.
   - Manage caching, optimistic invalidation, and UI loading/error states.
   - Do not duplicate server-side business rules on the client.

3. **API Route Handlers (`@/app/api/**/route.ts`)**
   - Act as the security and HTTP boundary.
   - Validate authentication tokens/cookies and resolve the verified user identity.
   - Validate input payloads with **Zod**.
   - Verify business ownership authorization.
   - Delegate all business logic to the service layer.
   - Return standardized JSON responses with proper HTTP status codes.
   - Handlers must remain thin (typically < 50 lines).

4. **Service Layer (`@/services/**`)**
   - Pure server-side business domain logic.
   - Coordinates database access, transactional integrity, and external integrations (billing, email, AI).
   - Enforces domain invariants and business rules.
   - Reusable across multiple route handlers or background jobs.

5. **Server-Only Supabase Client (`@/lib/supabase/**`)**
   - Created exclusively on the server (using `@supabase/ssr` or server-scoped factories).
   - Handles connection to PostgreSQL.
   - Browser client libraries must never connect directly to the database.

### 3.2 PROHIBITION: No Server Actions for Application Data

- **Server Actions must NOT be used for reading or mutating business application data.**
- All client-to-server data operations must pass through the `/api/*` Route Handler architecture.
- Server Actions may only be used for native form progressive enhancement or auth cookie handshakes if explicitly approved, never as a backdoor bypass around RESTful API routes.

---

## 4. Authentication, Ownership & Business Isolation

Nexus uses a strictly partitioned, single-tenant-per-account business model.

### 4.1 Single-Owner, Single-Business Model

```text
[User Account]  1 ─── 1  [Business]  1 ─── N  [Contacts / Campaigns / Invoices]
```

- Each user has exactly **one** account.
- Each account owns exactly **one** business.
- Each business has exactly **one** owner.
- The business record is created automatically during user onboarding (collecting business name).
- **Out of Scope (Do NOT implement):** Multi-user teams, member invitations, role-based access control (RBAC) across teammates, or multi-organization switching. If an individual operates multiple businesses, they must create separate user accounts.

### 4.2 Cross-Tenant Isolation Rules

- **Zero Trust on Client Identifiers:** Never trust a client-supplied `business_id`, `org_id`, or `user_id` from query parameters, request bodies, or headers as proof of authority.
- **Server-Derived Context:** Always resolve the authenticated user ID from the verified server session (`supabase.auth.getUser()`), then query the single business owned by that user ID.
- **Query Scoping:** Every database query mutating or retrieving business data must explicitly filter by the server-resolved `business_id`:
  ```typescript
  // REQUIRED pattern in service layer
  const { data, error } = await supabase
    .from('crm_contacts')
    .select('*')
    .eq('business_id', verifiedBusinessId);
  ```
- **Insecure Direct Object Reference (IDOR) Prevention:** Looking up an entity by primary key `id` must always be paired with `.eq('business_id', verifiedBusinessId)` to prevent access across businesses.

---

## 5. Supabase Security & Database Operations

### 5.1 Client Boundaries & Credentials

- **Server-Scoped Auth Client:** Used for operations acting on behalf of the logged-in user. Respects Row Level Security (RLS).
- **Service-Role Privileged Client:** Reserved strictly for webhook processing (e.g. Stripe webhooks), initial user creation triggers, or scheduled background tasks where no active user session exists.
  - Never use service-role access to bypass ownership checks.
  - Never expose `SUPABASE_SERVICE_ROLE_KEY` to any client-side bundle or environment variable starting with `NEXT_PUBLIC_`.

### 5.2 Row Level Security (RLS)

- **RLS is mandatory on every table created in PostgreSQL.**
- Standard tenant isolation policy pattern:
  ```sql
  ALTER TABLE public.crm_contacts ENABLE ROW LEVEL SECURITY;

  CREATE POLICY "Owners can access their business records"
    ON public.crm_contacts
    FOR ALL
    TO authenticated
    USING (
      business_id IN (
        SELECT id FROM public.businesses WHERE owner_id = auth.uid()
      )
    )
    WITH CHECK (
      business_id IN (
        SELECT id FROM public.businesses WHERE owner_id = auth.uid()
      )
    );
  ```

### 5.3 Database Migration Discipline

- Database schema changes must be authored as versioned SQL migration files (e.g. in `supabase/migrations/`).
- Never perform manual ad-hoc production schema edits.
- Ensure all foreign keys, unique constraints, and indices on `business_id` and lookup columns are explicitly defined.
- Run type-generation tools (`supabase gen types typescript`) to keep TypeScript database definitions synchronized.

---

## 6. Validation, Error Handling & API Contracts

### 6.1 Validation at Boundaries

- **Treat all inbound data as untrusted:** browser payloads, query strings, webhooks, and AI outputs.
- Define schemas using **Zod** (`z.object({...})`).
- In API route handlers:
  ```typescript
  export async function POST(request: Request) {
    const json = await request.json().catch(() => null);
    const parsed = CreateContactSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: 'Invalid payload', details: parsed.error.flatten() } },
        { status: 400 }
      );
    }
    // proceed to service layer...
  }
  ```
- Use **React Hook Form** with `@hookform/resolvers/zod` for client-side forms.

### 6.2 Standard API Response Contract

Keep responses predictable and unbloated:

**Success Response (HTTP 200/201):**
```json
{
  "data": { ... }
}
```

**Error Response (HTTP 4xx/5xx):**
```json
{
  "error": {
    "code": "NOT_FOUND | UNAUTHORIZED | FORBIDDEN | VALIDATION_ERROR | INTERNAL_ERROR",
    "message": "Human-readable safe explanation",
    "details": null
  }
}
```

- **HTTP Status Codes:** Use semantic codes (200 OK, 201 Created, 400 Bad Request, 401 Unauthorized, 403 Forbidden, 404 Not Found, 409 Conflict, 422 Unprocessable, 500 Server Error).
- **Leak Prevention:** Never return stack traces, database error messages, or internal secrets in client-facing error responses.

---

## 7. Client State & TanStack Query

### 7.1 Server State vs Client State

- **Server State:** Managed exclusively with **TanStack Query** (`@tanstack/react-query`).
- **Transient UI State:** Use React local state (`useState`, `useReducer`) or React Context for modals, active tabs, and temporary form filters.
- **No Global Store Libraries:** Do not install Zustand, Redux, or MobX unless a feature presents a proven, non-server-state requirement that cannot be handled by Context.

### 7.2 Query Key Architecture

Define query keys systematically to ensure deterministic cache invalidation:

```typescript
export const contactKeys = {
  all: ['contacts'] as const,
  lists: () => [...contactKeys.all, 'list'] as const,
  list: (filters: ContactFilters) => [...contactKeys.lists(), filters] as const,
  details: () => [...contactKeys.all, 'detail'] as const,
  detail: (id: string) => [...contactKeys.details(), id] as const,
};
```

- After mutations, invalidate the relevant query family:
  ```typescript
  queryClient.invalidateQueries({ queryKey: contactKeys.lists() });
  ```

---

## 8. AI Workflows, Approvals & Background Execution

The Nexus AI Business Agent executes real business actions, not just chat completions. High-consequence operations require rigorous execution guarantees.

### 8.1 Workflow Lifecycle & State Machine

Workflows must transition through explicit, persisted states:
`DRAFT` → `AWAITING_APPROVAL` → `QUEUED` → `RUNNING` → `COMPLETED` | `COMPLETED_WITH_WARNINGS` | `FAILED` | `CANCELLED`

- **Untrusted Model Output:** Validate all structured tool calls and LLM outputs with Zod before execution.
- **Idempotency Keys:** Every external side effect (charging a card, sending an email campaign, triggering a webhook) must require an idempotency key to prevent duplicate execution during retries.
- **Honest Progress:** Never fake progress bars or show completion when asynchronous worker steps are still running.
- **Partial Failure Visibility:** If 4 of 5 steps succeed and step 5 fails, the workflow must be recorded as partially failed with completed side effects explicitly listed.

### 8.2 Human Approval Checkpoints

Any high-impact operation must pause execution and await user confirmation:
- Bulk customer deletion or mass updates.
- Dispatching email campaigns to live external recipient lists.
- Publishing websites to public domains.
- Financial transactions, invoice generation, or plan cancellations.
- Changes to API keys or business security credentials.

The approval UI must display:
1. The exact proposed action.
2. The business reason.
3. Affected entities/recipients count.
4. Irreversible consequences.
5. Explicit `[Approve]` and `[Reject]` controls (requiring distinct user clicks, no accidental shortcuts).

---

## 9. Mandatory Central Audit Logging Architecture

Nexus requires a unified, authoritative, server-side audit trail for all security-relevant events and meaningful business state changes across CRM, billing, marketing, website building, analytics, and autonomous AI workflows.

### 9.1 Mandatory Audit Logging Rules

1. **Feature Audit Specification:** Every new feature must explicitly identify and document its auditable business and security actions during design.
2. **Central Service Exclusivity:** All services must record events via the shared `AuditService` (`@/services/audit.service.ts`). Services must **never** implement bespoke audit tables, independent insertion logic, or incompatible event schemas.
3. **Mandatory Auditable Categories:**
   - **Authentication & Identity:** User login, logout, registration, password changes, session revocations, and failed login attempts.
   - **Security & Authorization:** Configuration changes, API key creation/rotation, tenant boundary access attempts, and permission violations.
   - **Business State Mutations:** CRM contact/deal stage changes, subscription updates, invoice payments, website publishing, and campaign dispatches.
   - **Sensitive Data Operations:** Bulk exports, data deletions, and credential modifications.
   - **AI Workflows & Approvals:** Workflow creation, human approval/rejection decisions, autonomous action executions, and execution failures.
4. **Distinction from Diagnostics & Analytics:**
   - **Audit Logs:** Immutable, compliance-grade records of *who did what, to which resource, when, under what authority, and with what outcome*.
   - **Debug / Application Logs:** Transient operational logs (`console.log`, APM traces) for developer diagnostics.
   - **Analytics:** High-volume user behavior telemetry (e.g. pageviews, scroll depth, button hover). Do NOT log technical noise, page views, or keystrokes into the audit table.
5. **Actor & Authority Disambiguation:**
   - Actor types must explicitly distinguish **Human user (`user`)**, **AI agent (`ai_agent`)**, **System process (`system`)**, and **External integration (`integration`)**.
   - Preserve the strict separation between:
     - **Initiator:** The identity that requested the action (e.g., human user who prompted the agent).
     - **Approver:** The identity that signed off on a high-consequence action (e.g., business owner confirmation).
     - **Actor (Executor):** The entity actually executing the database mutation or external API call (e.g., the AI agent).
     - **STRICT DIRECTIVE:** Never represent an AI-executed action as a direct human action simply because a human originally prompted it.
6. **Trusted Context Only:** Never trust client-supplied `business_id`, `actor_id`, `outcome`, or approval flags. Authoritative context must be derived strictly on the server from authenticated sessions (`supabase.auth.getUser()`) and server-verified business ownership.
7. **Privacy & Zero-Credential Policy:**
   - The audit service must **NEVER** persist passwords, session cookies, auth tokens, API keys, private keys, payment card PANs/CVVs, unrestricted HTTP request/response bodies, or unredacted raw AI prompts.
   - All metadata must pass through allowlisting and `sanitizeAuditMetadata()`.
8. **Append-Only Immutability:**
   - Normal application paths must not modify (`UPDATE`) or delete (`DELETE`) historical audit records.
   - Enforced by database RLS default-deny and the PostgreSQL trigger `trg_audit_logs_immutable`.
9. **Atomic Recording & Fail-Closed Policy:**
   - Critical business mutations and required audit records must commit atomically where supported.
   - A business operation must **NEVER** report success if its required audit event failed to persist.
   - If audit persistence fails for a critical action, the operation must fail closed and rethrow `AuditLoggingError`.
10. **Strict Tenant Isolation:** Audit access must be strictly scoped to the authenticated owner's `business_id`. Cross-tenant audit querying is cryptographically prevented at both the service and RLS layers.
11. **Testing & Coverage:** Tests must cover audit emission, tenant isolation, metadata redaction, failure handling, and append-only constraints.
12. **Explicit Exception Approval:** Any intentional omission of audit logging for a state change must be documented, justified, and approved. Silent omission is prohibited.

---

## 10. Frontend & UI Engineering Standards

All frontend code must conform to the authoritative [`DESIGN.md`](./DESIGN.md) specification:

1. **Typography:** **Manrope** for primary UI, inputs, tables, and buttons; **Bricolage Grotesque** selectively for hero headings, page titles (`h1`), and prominent KPI values.
2. **Color Palette:** Warm off-white/ivory canvas (`--background`), cream cards (`--card`), charcoal typography (`--foreground`), with restrained terracotta (`--brand` / `--chart-1`) for primary emphasis. No random neon or purple AI gradients.
3. **Icons:** Use **Iconsax** (linear/outline style) or **Famicons**. Never install or mix Lucide or secondary icon packages.
4. **Motion:** Strictly adhere to `DESIGN.md §20` — UI animations under 300ms, `ease-out` for enters, exit ~20% faster, press feedback `scale(0.97)` on buttons, and full support for `prefers-reduced-motion`.
5. **Component Reusability:** When implementing UI primitives, structure them under `@/components/ui/` normalized to Nexus tokens.

---

## 11. Verification, Testing & Quality Gates

### 11.1 Package Scripts & Verification Commands `[REPO]`

The following scripts are verified in `project/package.json`:

```bash
# Development server (Turbopack)
npm --prefix project run dev

# Production build verification (must compile with 0 TypeScript/CSS errors)
npm --prefix project run build

# Code linting (ESLint 9 + Next.js config)
npm --prefix project run lint

# Automated test execution (Node built-in runner)
npm --prefix project test

# Start production server
npm --prefix project run start
```

### 11.2 Quality Gates for AI Coding Agents

Before declaring any coding task complete:
1. **Lint Check:** Run `npm --prefix project run lint` — must exit with code 0.
2. **Type & Build Check:** Run `npm --prefix project run build` — Turbopack compilation and TypeScript verification must pass with zero errors.
3. **Audit Verification:** Ensure any new business mutation emits a structured event via `AuditService` with sanitized metadata and server-derived tenant context.
4. **Security Sanity Check:** Ensure no secrets or service-role keys are exposed in client-side code, git diffs, or client bundles.
5. **Surgical Verification:** Run `git status` to verify no unrelated files, configuration items, or lockfiles were inadvertently touched.

---

## 12. Agent Behavioral Checklist & Anti-Patterns

### ❌ Strict Prohibitions
- **NO** direct client-side Supabase database queries or browser-initialized DB clients.
- **NO** Server Actions for mutating application business state.
- **NO** multi-tenant/organization abstractions (stick to single-account = single-business).
- **NO** trusting client-provided `business_id` parameters.
- **NO** installing unvetted packages when native standard library or existing tools suffice (Ponytail).
- **NO** speculative abstractions or premature generalizations (Karpathy).
- **NO** modifying or deleting historical audit records (append-only enforcement).
- **NO** inventing independent audit tables or bypassing the central `AuditService`.
- **NO** silently swallowing audit persistence failures for critical business mutations.
- **NO** logging raw passwords, tokens, API keys, or unrestricted AI prompts.
- **NO** modifying files outside the specific task scope.
- **NO** fabricated claims of test execution or tool results.

###  Mandatory Practices
- Always trace user requests down the **Ladder of Simplicity**.
- Always construct a **reproduction loop** before attempting bug fixes.
- Always enforce **tenant scoping** at the database layer.
- Always emit structured audit events via `AuditService` for all security and meaningful state changes.
- Always cross-reference [`DESIGN.md`](./DESIGN.md) when touching user interfaces.
