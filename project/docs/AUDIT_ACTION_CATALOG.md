# Nexus audit action catalog

This is the closed application vocabulary in project/lib/validations/audit-actions.ts. Every event action must use one of these names. Metadata keys outside the row for that action are removed by the application and rejected or removed by the SQL audit RPC before persistence.

COMMON means the action also accepts operation_id, request_id, correlation_id, result, and reason_code.

The catalog describes the contract recognized by the application and the compatibility migration. The SQL migrations contain matching per-action metadata checks for all 84 declared actions. A name being present does not prove that a corresponding product operation is implemented or currently emitting events.

## Authentication, business, and Google

| Action | Additional metadata keys |
|---|---|
| auth.login | provider, method, auth_method |
| auth.logout | provider |
| auth.signup | provider, method |
| auth.failed_login | provider, method, identifier_type, reason_code |
| auth.password_reset | none |
| auth.session_revoked | none |
| business.created | business_name, provisioning_source |
| business.updated | changed_fields |
| business.api_key_rotated | key_name |
| business.settings_changed | changed_fields |
| google.connected | provider, scopes |
| google.reconnected | provider, scopes |
| google.credentials_replaced | provider, scopes |
| google.disconnected | provider |

## CRM

| Action | Additional metadata keys |
|---|---|
| crm.contact.created | contact_id, source, stage |
| crm.contact.updated | contact_id, changed_fields |
| crm.contact.deleted | contact_id |
| crm.contact.stage_changed | contact_id, previous_stage, stage |
| crm.activity.created | contact_id, activity_type |
| crm.activity.updated | contact_id, activity_id, changed_fields |
| crm.activity.deleted | contact_id, activity_id |

## Billing and marketing vocabulary

| Action | Additional metadata keys |
|---|---|
| billing.subscription.created | none |
| billing.subscription.updated | none |
| billing.subscription.cancelled | none |
| billing.invoice.paid | none |
| billing.payment_failed | none |
| marketing.campaign.created | none |
| marketing.campaign.updated | none |
| marketing.campaign.dispatched | none |
| marketing.campaign.paused | none |

No billing or marketing audit call sites were found in the current source scan. These names are validation vocabulary, not evidence that those platform features exist.

## Website builder

| Action | Additional metadata keys |
|---|---|
| website.created | website_id, website_title, slug, template_id, section_count |
| website.updated | website_id, title, sections_count, changed_fields |
| website.published | website_id, website_title |
| website.unpublished | website_id, website_title |
| website.deleted | website_id, deleted_title, deleted_slug |

## Webinar lifecycle and operations

| Action | Additional metadata keys |
|---|---|
| webinar.created | webinar_id, session_count, status |
| webinar.updated | webinar_id, changed_fields, version |
| webinar.scheduled | webinar_id, version, recipient_count |
| webinar.rescheduled | webinar_id, version, recipient_count |
| webinar.cancelled | webinar_id, version, recipient_count |
| webinar.deleted | webinar_id |
| webinar.completed | webinar_id |
| webinar.series.created | series_id, session_count |
| webinar.series.updated | series_id, changed_fields |
| webinar.series.deleted | series_id |
| webinar.registration.created | webinar_id, registration_id, session_count, source |
| webinar.feedback.submitted | webinar_id, registration_id, rating, was_useful, product_interest |
| webinar.feedback.marketing_opt_in | webinar_id, registration_id, consent |
| webinar.attendance.import_started | webinar_id, import_id, page_count |
| webinar.attendance.import_completed | webinar_id, import_id, participant_count, unresolved_count |
| webinar.participant.reviewed | webinar_id, participant_id, review_disposition |
| webinar.meet.provisioning_started | webinar_id, operation_id |
| webinar.meet.provisioned | webinar_id, operation_id, provider |
| webinar.meet.provisioning_unknown | webinar_id, operation_id, provider, reason_code |
| webinar.followup.updated | webinar_id, enabled, version |
| webinar.followup.scheduled | webinar_id, version, recipient_count |
| webinar.notification.queued | webinar_id, operation_id, recipient_count, notification_type |
| webinar.email.processing_started | webinar_id, operation_id, job_count |
| webinar.email.provider_accepted | webinar_id, operation_id, job_id, provider |
| webinar.email.failed | webinar_id, operation_id, job_id, provider, reason_code |
| webinar.email.needs_review | webinar_id, operation_id, job_id, provider, reason_code |

The public registration and feedback routes use fixed integration attribution. The manual email worker uses the fixed system actor webinar.manual-worker and the compatibility migration permits its four webinar.email.* actions. Public registration's webinar.notification.queued action is now also aligned: it uses the fixed public registration actor and requires an owned registration row.

## Customer journey

| Action | Additional metadata keys |
|---|---|
| journey.map.created | journey_map_id, stage_count |
| journey.map.updated | journey_map_id, changed_fields |
| journey.map.deleted | journey_map_id |
| journey.stage.created | journey_map_id, stage_id, order_index |
| journey.stage.updated | journey_map_id, stage_id, changed_fields |
| journey.stage.deleted | journey_map_id, stage_id |
| journey.action.approved | journey_map_id, action_id |
| journey.action.dismissed | journey_map_id, action_id |

## AI workflow

| Action | Additional metadata keys |
|---|---|
| ai.workflow.created | workflow_id, node_count |
| ai.workflow.updated | workflow_id, changed_fields |
| ai.workflow.deleted | workflow_id |
| ai.workflow.approved | workflow_id, run_id, node_id |
| ai.workflow.rejected | workflow_id, run_id, node_id, reason_code |
| ai.workflow.executed | workflow_id, run_id, node_count |
| ai.workflow.failed | workflow_id, run_id, node_id, reason_code |
| ai.workflow.step_succeeded | workflow_id, run_id, node_id, capability |
| ai.workflow.step_failed | workflow_id, run_id, node_id, capability, reason_code |
| ai.workflow.step_simulated | workflow_id, run_id, node_id, capability |
| ai.workflow.step_unsupported | workflow_id, run_id, node_id, capability, reason_code |

An AI event must preserve the AI executor in actor, the initiating owner in initiator, and verified owner approval in approver when applicable. The current SQL RPC requires an owned workflow context when AI attribution or a workflow ID is supplied.

## Security events

| Action | Additional metadata keys |
|---|---|
| security.unauthorized_access | route, method, reason_code |
| security.rate_limited | route, method |
| security.tenant_violation | route, method, resource_type |
| security.api_key_rotated | key_name |

Only auth.signup, auth.failed_login, security.unauthorized_access, and security.rate_limited are currently allowed in null-business platform scope. security.tenant_violation and security.api_key_rotated are business vocabulary and require a verified business event.

## Attribution rules

- user: verified signed-in owner from server auth context.
- ai_agent: AI executor, with workflow context and separate initiator and approver fields.
- system: manual worker or other server process, with a server-derived operation reference.
- integration: trusted public-registration, public-feedback, or provider path; it must not impersonate the anonymous visitor as an owner.

Clients must not supply authoritative business IDs, actor IDs, outcomes, or approval fields. Resource IDs and metadata are still validated and filtered at the server boundary.

## Known coverage mismatches

- The catalog includes billing and marketing names, but those product mutation paths were not found emitting audit events.
- The application allowlist and the compatibility migrations now both enforce per-action metadata keys for all 84 declared actions. The installed database should still be checked against the migration source after deployment.
- The compatibility migration's service-role branch fixes the manual worker actor and permits its four webinar.email.* actions plus webinar.notification.queued for the fixed public registration actor. Its installed grants and runtime behavior remain unvalidated until the migrations are executed.
- The 20261021_atomic_crm_journey_rpc.sql migration was inspected. It defines six CRM transaction functions plus owner/audit helpers; no journey mutation function was found, so journey atomic coverage remains provisional.
- The OpenSpec matrix requires atomic mutation-plus-audit paths across the covered modules. Current service code generally mutates first and records through a separate audit RPC.
- Existing tests cover validation, sanitization, owner-derived attribution, and selected boundaries, but there is no live Supabase verification in this checkout for rollback, RLS, grants, or two-owner database behavior.

