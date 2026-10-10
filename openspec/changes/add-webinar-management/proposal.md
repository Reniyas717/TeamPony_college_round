## Why

Nexus currently offers authentication and a dashboard but no working webinar lifecycle. The approved requirements in docs/webinar-management.md call for one owner workspace that connects scheduling, native registration, Google Meet attendance, optional reviewed follow-ups, and feedback without moving participant data between separate tools.

## What Changes

- Add an authenticated webinar list and session/series detail experience, including unscheduled drafts, timezone-aware scheduling, editing, cancellation, and confirmed permanent deletion.
- Create a separate Google Meet space per session through the existing Supabase Google sign-in flow, extended with the Meet scope and encrypted server-side token refresh; persist integration failures and attendance import progress honestly.
- Add public Nexus registration forms for standalone sessions and session-selectable series, with capacity/deadline enforcement, duplicate prevention, and separate optional marketing consent.
- Import every participant and join/leave session exposed by Meet, preserve anonymous/unregistered participants, and let the owner resolve uncertain registration matches before classifying no-shows.
- Deliver confirmation, reschedule, and cancellation notifications through a shared email outbox, independently of the optional follow-up service.
- Add optional attendee/no-show follow-up drafts that the owner reviews and schedules only after the session ends and attendance is resolved.
- Collect attendee feedback, product interest, and optional future marketing consent; allow an owner-provided product/purchase URL.
- Extend the existing database through additive migrations, enforce business ownership and RLS, and preserve shared CRM contacts and marketing consent when webinar-specific records are deleted.

## Capabilities

### New Capabilities

- `webinar-management`: Owner-scoped session and series lifecycle, scheduling, cancellation/deletion, management views, and basic webinar outcome counts.
- `webinar-registration`: Native public registration forms, per-session registrations, limits, contact linkage, and separate marketing consent.
- `webinar-meet-attendance`: Extension of the existing Supabase Google sign-in with encrypted server-side provider-token refresh, per-session Meet provisioning, exhaustive attendance import, reliable matching, and review of unidentified participants.
- `webinar-communications`: Independent event notifications and optional reviewed/scheduled follow-ups with durable delivery and duplicate prevention.
- `webinar-feedback`: Participant-specific feedback collection, product interest, optional purchase links, and explicit marketing opt-in.

### Modified Capabilities

None. No existing OpenSpec capability specs were found. Existing login behavior is reused; this change adds the webinar owner authorization boundary without redesigning authentication.

## Impact

- Keep all application pages, APIs, OAuth callbacks, and worker code inside the Next.js app in project/. Add owner routes under project/app/dashboard/webinars, public registration/feedback routes, /api/webinars and /api/public endpoints, and a protected Next.js internal worker endpoint.
- Add webinar hooks, Zod contracts, domain services, small server-only Meet/email adapters, and versioned SQL under project/supabase/migrations. Reuse installed Supabase, TanStack Query, Iconsax, and Zod dependencies.
- Extend public.webinars (currently schedule-required) to support drafts and series; add registration, attendance, consent, feedback, integration, and durable work/delivery records. Keep the initial migration intact.
- Link the existing dashboard webinar tile to a real route. Scope visual work to the webinar module using DESIGN.md; the confirmed fixed form replaces the specification's future visual registration-page editor for this change.
- Extend the existing Supabase Google sign-in scope and callback; do not create another OAuth flow, callback, OAuth-state store, or Google connection UI. Add one business-scoped encrypted token vault because Supabase does not refresh provider tokens. Refresh with the same Google OAuth client credentials configured in Supabase Auth. Keep application work in Next.js. Use Resend via built-in fetch and a durable database-backed worker; for the hackathon, the signed-in owner manually triggers a bounded, business-scoped batch from the webinar dashboard. Automatic scheduling is deferred.
- Coordinate the CRM contact seam with the teammate building CRM. CRM_README.md proposes a richer contact schema that is not yet implemented; do not introduce a competing stage/source taxonomy or rebuild CRM, billing, marketing UI, or the general AI agent.
- Permanent deletion affects webinar-specific records and pending work only; it cannot retract sent emails or imply deletion of provider-side meeting history.
