import { randomUUID } from "node:crypto";
import type { OwnerContext } from "@/lib/supabase/owner-context";
import {
  CustomerJourneyMap,
  JourneyMapStage,
  JourneyStageAction,
  GenerateJourneyMapInput,
  AddStageInput,
  UpdateStageInput,
  NexusTelemetry,
} from "@/lib/validations/journey-map";

/**
 * Intelligent AI Journey Generator
 * Interprets the natural-language business objective and constructs relevant customer journey stages.
 * Synthesizes telemetry signals from CRM, Billing, Websites, and Campaigns.
 */
function buildJourneyFromObjective(
  objective: string,
  businessId: string,
  telemetry?: NexusTelemetry
): CustomerJourneyMap {
  const mapId = randomUUID();
  const lowerObj = objective.toLowerCase();
  const crmCount = telemetry?.crmContactsCount ?? 0;
  const pipelineValue = telemetry?.crmPipelineValue ?? 0;

  // Determine intent category
  const isRetention = lowerObj.includes("churn") || lowerObj.includes("retain") || lowerObj.includes("inactive");
  const isOnboarding = lowerObj.includes("onboard") || lowerObj.includes("activate") || lowerObj.includes("welcome");
  const isSupport = lowerObj.includes("support") || lowerObj.includes("complaint") || lowerObj.includes("ticket") || lowerObj.includes("resolution");
  const isRenewal = lowerObj.includes("renewal") || lowerObj.includes("upsell") || lowerObj.includes("expansion");

  const telemetrySignal = crmCount > 0
    ? `Integrated with ${crmCount} active CRM contacts (₹${pipelineValue.toLocaleString()} pipeline). Strategic recommendations leverage live lead stage distribution.`
    : `Calibrated for cold start with 0 recorded CRM contacts and ₹0 MRR baseline. Strategic recommendations prioritize high-converting inbound capture and rapid time-to-value.`;

  let title = "Customer Acquisition & Conversion Journey";
  let journeyType = "Acquisition & Conversion";
  let summary = `Strategic journey map designed to achieve: "${objective}". ${telemetrySignal}`;

  let stagesData: Omit<JourneyMapStage, "id" | "journey_map_id" | "order_index">[] = [];

  if (isOnboarding) {
    title = "Customer Onboarding & Activation Journey";
    journeyType = "Onboarding & Activation";
    summary = `Designed to accelerate time-to-value for: "${objective}". ${telemetrySignal}`;
    stagesData = [
      {
        stage_key: "signup",
        stage_name: "Signup & Registration",
        objective: "Visitor registers and completes workspace verification without drop-off",
        customer_actions: ["Fills email/password or selects social OAuth", "Receives workspace access"],
        touchpoints: ["Signup Modal", "Verification Email", "Auth Handshake"],
        customer_needs: ["Immediate access", "Clarity on whether credit card is required"],
        customer_thoughts: ["I hope this doesn't take 20 minutes to set up", "Is this safe to test with my team?"],
        emotion: "neutral",
        friction_points: [
          "Mandatory credit card upfront causes 40% signup abandonment",
          "Delayed verification email breaks user momentum",
        ],
        opportunities: [
          "Deploy 1-click social authentication",
          "Remove optional form fields until post-activation",
        ],
        findings_type: crmCount > 0 ? "data_backed" : "hypothesis",
        actions: [
          {
            id: randomUUID(),
            stage_id: "",
            journey_map_id: mapId,
            title: "Streamline Registration to 1-Click Form",
            description: "Reduces registration barriers by eliminating unnecessary fields in Website Builder.",
            why_it_helps: "Removes upfront hesitation so users enter the product immediately while interest is highest.",
            module_target: "website",
            suggested_action_type: "SIMPLIFY_SIGNUP",
            evidence_type: "hypothesis",
            action_payload: { skip_optional_fields: true },
            expected_impact: "+25% form completion rate (hypothesis)",
            status: "PROPOSED",
            created_at: new Date().toISOString(),
          },
        ],
      },
      {
        stage_key: "first_run",
        stage_name: "Initial Setup & First Value (Aha!)",
        objective: "User completes their first core task and experiences initial product value",
        customer_actions: ["Follows 3-step setup guide", "Creates first project/asset", "Sees real output"],
        touchpoints: ["In-App Tour", "Starter Template", "Workspace Canvas"],
        customer_needs: ["Intuitive guidance", "No confusing empty canvas syndrome"],
        customer_thoughts: ["Wow, that was fast!", "How do I show this to my colleagues?"],
        emotion: "delighted",
        friction_points: [
          "Complex initial configuration without pre-built templates causes confusion",
          "Users leave without realizing the primary benefit",
        ],
        opportunities: [
          "Provide one-click pre-populated business templates",
          "Celebrate completion of first task with clear confirmation",
        ],
        findings_type: "hypothesis",
        actions: [
          {
            id: randomUUID(),
            stage_id: "",
            journey_map_id: mapId,
            title: "Launch Automated Onboarding Sequence",
            description: "Triggers a helpful 3-step setup guide via Marketing Campaigns for users who signed up.",
            why_it_helps: "Guides unassisted trial users directly to value before they lose interest.",
            module_target: "campaign",
            suggested_action_type: "LAUNCH_ONBOARDING_FLOW",
            evidence_type: "hypothesis",
            action_payload: { trigger: "user_created", delay_hours: 1 },
            expected_impact: "+35% day-1 activation rate (hypothesis)",
            status: "PROPOSED",
            created_at: new Date().toISOString(),
          },
        ],
      },
      {
        stage_key: "team_invite",
        stage_name: "Team Collaboration & Routine Use",
        objective: "User integrates tool into regular workflow and invites teammates",
        customer_actions: ["Invites collaborators", "Sets up daily/weekly notifications"],
        touchpoints: ["Invite Modal", "Team Settings", "Product Dashboard"],
        customer_needs: ["Simple team permissions", "Clear value for team members"],
        customer_thoughts: ["Can my whole team collaborate here effortlessly?"],
        emotion: "positive",
        friction_points: [
          "Unclear seat limits or pricing barriers prevent inviting colleagues",
        ],
        opportunities: [
          "Provide seamless member invites with zero initial seat charges during trial",
        ],
        findings_type: "hypothesis",
        actions: [
          {
            id: randomUUID(),
            stage_id: "",
            journey_map_id: mapId,
            title: "Auto-Invite Inactive Users to Weekly Live Masterclass",
            description: "Connects Webinar Management to invite newly registered users to interactive product demos.",
            why_it_helps: "Live walkthroughs answer specific team questions and remove technical barriers.",
            module_target: "webinar",
            suggested_action_type: "INVITE_TO_DEMO_WEBINAR",
            evidence_type: "hypothesis",
            action_payload: { webinar_series: "getting_started" },
            expected_impact: "+20% weekly active adoption (hypothesis)",
            status: "PROPOSED",
            created_at: new Date().toISOString(),
          },
        ],
      },
      {
        stage_key: "habituation",
        stage_name: "Long-term Value & Retention",
        objective: "Customer relies on platform as a default business operating system",
        customer_actions: ["Generates regular reports", "Integrates daily business processes"],
        touchpoints: ["Executive Summary Email", "CRM Pipeline", "Billing Drawer"],
        customer_needs: ["Reliability", "Continuous performance improvements"],
        customer_thoughts: ["This tool saves our company dozens of hours every month."],
        emotion: "delighted",
        friction_points: [
          "Feature stagnation or unaddressed bugs cause creeping dissatisfaction",
        ],
        opportunities: [
          "Deliver monthly business impact digests showing time/money saved",
        ],
        findings_type: "hypothesis",
        actions: [
          {
            id: randomUUID(),
            stage_id: "",
            journey_map_id: mapId,
            title: "Configure Monthly ROI & Value Digest",
            description: "Automatically compiles business metric summaries in CRM to demonstrate ongoing platform ROI.",
            why_it_helps: "Reminds decision-makers of tangible business value ahead of renewal decisions.",
            module_target: "crm",
            suggested_action_type: "SEND_ROI_DIGEST",
            evidence_type: "hypothesis",
            action_payload: { frequency: "monthly" },
            expected_impact: "Sustained customer retention (hypothesis)",
            status: "PROPOSED",
            created_at: new Date().toISOString(),
          },
        ],
      },
    ];
  } else if (isRetention) {
    title = "Customer Retention & Churn Prevention Journey";
    journeyType = "Retention & Churn Recovery";
    summary = `Targeted intervention map to achieve: "${objective}". Detects early usage declines and applies proactive recovery steps. ${telemetrySignal}`;
    stagesData = [
      {
        stage_key: "healthy_use",
        stage_name: "Active Healthy Usage",
        objective: "Customer actively utilizes the platform and achieves expected business results",
        customer_actions: ["Logs in multiple times weekly", "Executes business tasks"],
        touchpoints: ["Product Dashboard", "Workflow Engine"],
        customer_needs: ["Reliable service", "Fast response times"],
        customer_thoughts: ["Everything is working smoothly."],
        emotion: "positive",
        friction_points: ["Gradual loss of engagement if key project finishes"],
        opportunities: ["Track baseline usage patterns to benchmark normal activity"],
        findings_type: "hypothesis",
        actions: [],
      },
      {
        stage_key: "deceleration",
        stage_name: "Early Warning (Usage Drop)",
        objective: "Detect when team logins and activities decelerate before cancellation occurs",
        customer_actions: ["Weekly logins decrease", "No new contacts or workflows created"],
        touchpoints: ["Login Gateway", "Audit Logs"],
        customer_needs: ["Re-engagement or assistance with blockers"],
        customer_thoughts: ["We haven't used this much lately. Should we cancel?"],
        emotion: "confused",
        friction_points: [
          "Accounts slip away silently without reaching out to support",
        ],
        opportunities: [
          "Automated detection of 50%+ activity drop over 14 days",
          "Proactive check-in from account manager",
        ],
        findings_type: "hypothesis",
        actions: [
          {
            id: randomUUID(),
            stage_id: "",
            journey_map_id: mapId,
            title: "Trigger Inactivity Review Task in CRM",
            description: "Flags declining accounts in Intelligent CRM and assigns an outreach check-in.",
            why_it_helps: "Engaging at-risk customers early prevents 60% of avoidable cancellations.",
            module_target: "crm",
            suggested_action_type: "SCHEDULE_ACCOUNT_CHECKIN",
            evidence_type: "hypothesis",
            action_payload: { trigger_threshold: "usage_drop_50" },
            expected_impact: "Earlier customer rescue (hypothesis)",
            status: "PROPOSED",
            created_at: new Date().toISOString(),
          },
        ],
      },
      {
        stage_key: "billing_risk",
        stage_name: "Billing Risk & Renewal Barrier",
        objective: "Handle expired cards or payment friction without interrupting customer operations",
        customer_actions: ["Receives payment retry notice", "Inspects invoice"],
        touchpoints: ["Stripe Checkout", "Invoice Email", "Billing Portal"],
        customer_needs: ["Friendly grace period", "Clear payment update link"],
        customer_thoughts: ["I don't have the corporate credit card on me today."],
        emotion: "frustrated",
        friction_points: [
          "Abrupt account lockouts anger loyal customers over simple card expirations",
        ],
        opportunities: [
          "7-day smart grace period with gentle branded reminders",
        ],
        findings_type: "hypothesis",
        actions: [
          {
            id: randomUUID(),
            stage_id: "",
            journey_map_id: mapId,
            title: "Enable 7-Day Payment Grace Flow",
            description: "Configures automated grace period and low-friction update emails in Campaigns.",
            why_it_helps: "Recovers legitimate customers whose cards expired without damaging relationship.",
            module_target: "campaign",
            suggested_action_type: "SETUP_GRACE_PERIOD",
            evidence_type: "hypothesis",
            action_payload: { grace_days: 7 },
            expected_impact: "Reduced involuntary churn (hypothesis)",
            status: "PROPOSED",
            created_at: new Date().toISOString(),
          },
        ],
      },
      {
        stage_key: "re_engagement",
        stage_name: "Re-engagement & Retention Offer",
        objective: "Resolve underlying reason for cancellation and secure renewal",
        customer_actions: ["Reviews retention proposal", "Consults with support"],
        touchpoints: ["Support Portal", "Custom Offer Page"],
        customer_needs: ["Flexible plan options", "Assistance resolving blockers"],
        customer_thoughts: ["If they can help fix this bottleneck, we will stay."],
        emotion: "neutral",
        friction_points: [
          "Rigid, inflexible contracts force customers to leave entirely",
        ],
        opportunities: [
          "Offer temporary pause option or tier adjustment instead of hard cancellation",
        ],
        findings_type: "hypothesis",
        actions: [
          {
            id: randomUUID(),
            stage_id: "",
            journey_map_id: mapId,
            title: "Present Flexible Retention Options in Billing",
            description: "Allows customers considering cancellation to pause account or switch to starter plan.",
            why_it_helps: "Preserves customer relationship and historical data rather than losing account forever.",
            module_target: "website",
            suggested_action_type: "ENABLE_PAUSE_PLAN",
            evidence_type: "hypothesis",
            action_payload: { allow_pause: true },
            expected_impact: "Higher account preservation (hypothesis)",
            status: "PROPOSED",
            created_at: new Date().toISOString(),
          },
        ],
      },
    ];
  } else if (isSupport) {
    title = "Customer Support & Service Recovery Journey";
    journeyType = "Support & Resolution";
    summary = `Resolution-focused journey map for: "${objective}". Minimizes complaint escalation and turns friction into customer loyalty. ${telemetrySignal}`;
    stagesData = [
      {
        stage_key: "issue_encounter",
        stage_name: "Issue Encounter & Frustration",
        objective: "Customer encounters a problem and seeks immediate resolution options",
        customer_actions: ["Hits unexpected error", "Searches help documentation"],
        touchpoints: ["In-App Error Prompt", "Knowledge Base"],
        customer_needs: ["Instant clarification", "Reassurance that data is safe"],
        customer_thoughts: ["Why did this fail? Did my work get saved?"],
        emotion: "frustrated",
        friction_points: ["Cryptic error messages with no path to resolution"],
        opportunities: ["Clear human-readable error explanations with 1-click help ticket"],
        findings_type: "hypothesis",
        actions: [],
      },
      {
        stage_key: "ticket_submission",
        stage_name: "Ticket Submission & AI Triage",
        objective: "Customer submits request and receives instantaneous preliminary guidance",
        customer_actions: ["Submits query via chat or contact form"],
        touchpoints: ["Help Desk Chat", "Support Ticket Form"],
        customer_needs: ["Immediate acknowledgment", "Accurate resolution estimate"],
        customer_thoughts: ["Will I have to wait 3 days for an answer?"],
        emotion: "confused",
        friction_points: ["No confirmation of receipt or generic 'We will reply soon' response"],
        opportunities: ["AI agent provides instant relevant solution while routing to human agent"],
        findings_type: "hypothesis",
        actions: [
          {
            id: randomUUID(),
            stage_id: "",
            journey_map_id: mapId,
            title: "Enable Instant AI Support Triage in CRM",
            description: "Routes inbound customer inquiries and provides suggested diagnostic steps immediately.",
            why_it_helps: "Resolves 30% of straightforward issues within seconds, lowering ticket queues.",
            module_target: "crm",
            suggested_action_type: "AUTO_TRIAGE_SUPPORT",
            evidence_type: "hypothesis",
            action_payload: { auto_suggest: true },
            expected_impact: "Faster resolution time (hypothesis)",
            status: "PROPOSED",
            created_at: new Date().toISOString(),
          },
        ],
      },
      {
        stage_key: "resolution",
        stage_name: "Resolution & Service Recovery",
        objective: "Issue is thoroughly resolved and customer confidence is restored",
        customer_actions: ["Verifies fix", "Rates experience"],
        touchpoints: ["Resolution Email", "In-App Feedback Prompt"],
        customer_needs: ["Full issue resolution", "Appreciation for their patience"],
        customer_thoughts: ["They took care of this quickly. I'm impressed."],
        emotion: "delighted",
        friction_points: ["Closing tickets prematurely before user verifies resolution"],
        opportunities: ["Follow up after 48 hours to confirm fix remains effective"],
        findings_type: "hypothesis",
        actions: [
          {
            id: randomUUID(),
            stage_id: "",
            journey_map_id: mapId,
            title: "Automate 48-Hour Resolution Verification",
            description: "Sends automated follow-up via Campaigns to ensure the customer is fully satisfied.",
            why_it_helps: "Turns a potentially negative customer experience into long-term brand loyalty.",
            module_target: "campaign",
            suggested_action_type: "SEND_SATISFACTION_CHECK",
            evidence_type: "hypothesis",
            action_payload: { delay_hours: 48 },
            expected_impact: "Improved customer satisfaction (hypothesis)",
            status: "PROPOSED",
            created_at: new Date().toISOString(),
          },
        ],
      },
    ];
  } else if (isRenewal) {
    title = "Subscription Renewal & Upsell Expansion Journey";
    journeyType = "Renewal & Expansion";
    summary = `Expansion journey map for: "${objective}". Identifies accounts approaching limits and provides clear upgrade pathways. ${telemetrySignal}`;
    stagesData = [
      {
        stage_key: "limit_approach",
        stage_name: "Approaching Plan Limits",
        objective: "Customer usage approaches tier ceilings without disrupting daily work",
        customer_actions: ["Adds 4th team member (limit 5)", "Creates more campaigns"],
        touchpoints: ["Usage Bar in Dashboard", "Team Member Drawer"],
        customer_needs: ["Clear notice before hitting hard wall"],
        customer_thoughts: ["Our business is growing. Do we need the Enterprise plan?"],
        emotion: "positive",
        friction_points: ["Hard sudden block on workflows when hitting limits"],
        opportunities: ["Soft notification with transparent pricing calculator"],
        findings_type: "hypothesis",
        actions: [
          {
            id: randomUUID(),
            stage_id: "",
            journey_map_id: mapId,
            title: "Configure Proactive Capacity Notification",
            description: "Alerts account owner at 85% capacity with transparent next-tier pricing in Website Builder.",
            why_it_helps: "Gives teams time to budget and upgrade rather than experiencing an operational stoppage.",
            module_target: "website",
            suggested_action_type: "USAGE_CAPACITY_ALERT",
            evidence_type: "hypothesis",
            action_payload: { threshold_pct: 85 },
            expected_impact: "Smoother upgrade pipeline (hypothesis)",
            status: "PROPOSED",
            created_at: new Date().toISOString(),
          },
        ],
      },
      {
        stage_key: "upgrade_consultation",
        stage_name: "Executive Briefing & Custom Plan",
        objective: "Customer reviews enterprise benefits and agrees to expanded contract",
        customer_actions: ["Attends brief call", "Reviews annual volume discount"],
        touchpoints: ["Live Demo Call", "Custom Invoice"],
        customer_needs: ["Volume discounts", "Priority support guarantees"],
        customer_thoughts: ["Does the annual tier include dedicated account support?"],
        emotion: "delighted",
        friction_points: ["Inflexible checkout that only accepts credit cards for high-value contracts"],
        opportunities: ["Support invoice/wire payment terms for larger accounts"],
        findings_type: "hypothesis",
        actions: [
          {
            id: randomUUID(),
            stage_id: "",
            journey_map_id: mapId,
            title: "Assign Expansion Opportunity to Sales in CRM",
            description: "Creates an expansion deal in CRM when usage consistently exceeds standard tier.",
            why_it_helps: "Direct sales engagement closes enterprise annual deals 3x faster.",
            module_target: "crm",
            suggested_action_type: "CREATE_EXPANSION_DEAL",
            evidence_type: "hypothesis",
            action_payload: { priority: "HIGH" },
            expected_impact: "+30% annual plan upsell (hypothesis)",
            status: "PROPOSED",
            created_at: new Date().toISOString(),
          },
        ],
      },
    ];
  } else {
    // Default & Most Common: Customer Acquisition & Conversion
    title = "SaaS Customer Acquisition & Conversion Journey";
    journeyType = "Acquisition & Conversion";
    summary = `End-to-end acquisition map designed to achieve: "${objective}". Spans initial discovery through subscription purchase and retention. ${telemetrySignal}`;
    stagesData = [
      {
        stage_key: "awareness",
        stage_name: "01. Awareness (Landing Page)",
        objective: "Prospect discovers the product and grasps the core value proposition in 10 seconds",
        customer_actions: ["Scans headline & hero banner", "Reviews features and screenshots"],
        touchpoints: ["Website Landing Page", "Search Results", "Social Post"],
        customer_needs: ["Immediate clarity on what the tool does", "Evidence of credibility"],
        customer_thoughts: ["What problem does this tool solve?", "Is this built for a business my size?"],
        emotion: "neutral",
        friction_points: [
          "Vague marketing buzzwords with no clear screenshot of the actual product",
          "Slow page load time on mobile devices causes immediate bounce",
        ],
        opportunities: [
          "Clarify hero value proposition with a 15-second product demo video",
          "Add authentic social proof and client logos above the fold",
        ],
        findings_type: "hypothesis",
        actions: [
          {
            id: randomUUID(),
            stage_id: "",
            journey_map_id: mapId,
            title: "Clarify Hero Value Proposition & Social Proof",
            description: "Updates Website Builder page with interactive live preview to reduce initial bounce rate.",
            why_it_helps: "Clear visual demonstrations increase visitor understanding and encourage deeper exploration.",
            module_target: "website",
            suggested_action_type: "OPTIMIZE_HERO_SECTION",
            evidence_type: "hypothesis",
            action_payload: { section: "hero", add_preview: true },
            expected_impact: "+18% visitor exploration rate (hypothesis)",
            status: "PROPOSED",
            created_at: new Date().toISOString(),
          },
        ],
      },
      {
        stage_key: "consideration",
        stage_name: "02. Consideration (Features & Pricing)",
        objective: "Prospect evaluates tier limits, ROI, and feasibility against alternatives",
        customer_actions: ["Examines feature comparison table", "Toggles monthly/annual billing switch"],
        touchpoints: ["Pricing Page", "Product Demo", "FAQ Section"],
        customer_needs: ["Transparent pricing", "No hidden fees or unexpected limits"],
        customer_thoughts: ["Is the Pro plan worth the extra cost?", "Will setup require technical developers?"],
        emotion: "positive",
        friction_points: [
          "Hidden plan limits or 'Contact Sales' gates for straightforward features",
          "Unanswered setup questions cause hesitation",
        ],
        opportunities: [
          "Address objections and demonstrate concrete ROI with an interactive calculator",
          "Provide live demo webinar option for prospects evaluating team deployment",
        ],
        findings_type: "hypothesis",
        actions: [
          {
            id: randomUUID(),
            stage_id: "",
            journey_map_id: mapId,
            title: "Assign High-Intent Pricing Visitors in CRM",
            description: "Automatically tracks consideration inquiries in Intelligent CRM for direct follow-up.",
            why_it_helps: "Timely answers to pre-sales questions dramatically improve conversion from pricing page.",
            module_target: "crm",
            suggested_action_type: "CAPTURE_PRICING_LEAD",
            evidence_type: "hypothesis",
            action_payload: { auto_assign: true },
            expected_impact: "+32% sales response efficiency (hypothesis)",
            status: "PROPOSED",
            created_at: new Date().toISOString(),
          },
        ],
      },
      {
        stage_key: "signup",
        stage_name: "03. Signup (Registration Form)",
        objective: "Prospect decides to start a trial and creates their account without hesitation",
        customer_actions: ["Enters email and creates password", "Submits registration"],
        touchpoints: ["Registration Form", "Welcome Email"],
        customer_needs: ["Low effort", "No credit card required upfront"],
        customer_thoughts: ["Let's see if this works as advertised.", "How soon will I see results?"],
        emotion: "delighted",
        friction_points: [
          "Lengthy registration forms asking for phone number or company address prematurely",
          "Requiring payment details before letting users see the workspace",
        ],
        opportunities: [
          "Reduce form friction: just email and password or 1-click social login",
          "Launch immediately into workspace without requiring email confirmation first",
        ],
        findings_type: "hypothesis",
        actions: [
          {
            id: randomUUID(),
            stage_id: "",
            journey_map_id: mapId,
            title: "Deploy Streamlined Low-Friction Registration Flow",
            description: "Reduces registration inputs in Website Builder to increase trial signups.",
            why_it_helps: "Every removed form field increases signup completion by an estimated 10-15%.",
            module_target: "website",
            suggested_action_type: "SIMPLIFY_REGISTRATION",
            evidence_type: "hypothesis",
            action_payload: { fields: ["email", "password"] },
            expected_impact: "+25% trial starts (hypothesis)",
            status: "PROPOSED",
            created_at: new Date().toISOString(),
          },
        ],
      },
      {
        stage_key: "activation",
        stage_name: "04. Activation (Onboarding Tour)",
        objective: "Trial user configures their workspace and experiences the first core benefit",
        customer_actions: ["Runs first workflow or creates first record", "Views analytics"],
        touchpoints: ["In-App Tour", "Starter Packs", "Workspace Canvas"],
        customer_needs: ["Clear starting direction", "Instant gratification"],
        customer_thoughts: ["This is significantly simpler than what we used previously."],
        emotion: "delighted",
        friction_points: [
          "Empty canvas paralysis where user doesn't know where to click first",
          "Jargon-heavy tooltips that confuse non-technical users",
        ],
        opportunities: [
          "Guide users to their first successful outcome in under 5 minutes with starter templates",
          "Trigger automated onboarding emails for users who didn't complete setup on Day 1",
        ],
        findings_type: "hypothesis",
        actions: [
          {
            id: randomUUID(),
            stage_id: "",
            journey_map_id: mapId,
            title: "Trigger Automated Onboarding Email Flow",
            description: "Dispatches friendly setup tips via Campaigns to users who register but haven't activated.",
            why_it_helps: "Provides helpful reminders to bring inactive signups back into the product.",
            module_target: "campaign",
            suggested_action_type: "SEND_ONBOARDING_FLOW",
            evidence_type: "hypothesis",
            action_payload: { delay_hours: 2, template: "onboarding_kickstart" },
            expected_impact: "+40% trial activation (hypothesis)",
            status: "PROPOSED",
            created_at: new Date().toISOString(),
          },
        ],
      },
      {
        stage_key: "conversion",
        stage_name: "05. Conversion (Subscription Checkout)",
        objective: "Satisfied trial user purchases paid plan at or before trial completion",
        customer_actions: ["Selects plan tier", "Enters payment method", "Confirms billing"],
        touchpoints: ["Subscription Checkout", "Stripe Invoice", "Receipt"],
        customer_needs: ["Transparent refund policy", "Receipts suitable for accounting"],
        customer_thoughts: ["Will this continue to scale as my team expands?"],
        emotion: "positive",
        friction_points: [
          "Unclear pricing transition when trial ends without warning",
          "Card declines without retry options or alternative payment methods",
        ],
        opportunities: [
          "Improve upgrade prompts and pricing clarity 3 days before trial ends",
          "Offer attractive annual billing discount incentive at checkout",
        ],
        findings_type: "hypothesis",
        actions: [
          {
            id: randomUUID(),
            stage_id: "",
            journey_map_id: mapId,
            title: "Improve Upgrade Prompts & Offer Annual Saving",
            description: "Configures timely upgrade notices and annual discounts in SaaS Billing module.",
            why_it_helps: "Transparent pricing notices build trust and annual incentives increase upfront revenue.",
            module_target: "crm",
            suggested_action_type: "SCHEDULE_CLOSING_PROMPT",
            evidence_type: "hypothesis",
            action_payload: { annual_discount_pct: 15 },
            expected_impact: "+22% paid conversion lift (hypothesis)",
            status: "PROPOSED",
            created_at: new Date().toISOString(),
          },
        ],
      },
      {
        stage_key: "retention",
        stage_name: "06. Retention (CRM & Ongoing Support)",
        objective: "Paying subscriber continues using product monthly and renews subscription",
        customer_actions: ["Uses platform weekly", "Expands team usage", "Submits feedback"],
        touchpoints: ["CRM and Email", "Billing Drawer", "Support Portal"],
        customer_needs: ["Reliability", "Attentive support when questions arise"],
        customer_thoughts: ["This has become an indispensable tool for our team."],
        emotion: "delighted",
        friction_points: [
          "Silent usage drops going unnoticed until the customer requests a refund",
          "Payment cards expiring without proactive notice",
        ],
        opportunities: [
          "Identify inactive users and offer relevant support before they consider cancellation",
          "Proactive renewal reminders with updated invoices",
        ],
        findings_type: "hypothesis",
        actions: [
          {
            id: randomUUID(),
            stage_id: "",
            journey_map_id: mapId,
            title: "Identify Inactive Users & Offer Relevant Support",
            description: "Monitors activity in CRM to notify account owners when usage declines.",
            why_it_helps: "Proactive intervention catches dissatisfaction early and preserves revenue.",
            module_target: "campaign",
            suggested_action_type: "SEND_RETENTION_CHECKIN",
            evidence_type: "hypothesis",
            action_payload: { checkin_days: 14 },
            expected_impact: "-50% preventable churn (hypothesis)",
            status: "PROPOSED",
            created_at: new Date().toISOString(),
          },
        ],
      },
    ];
  }

  // Assign stage IDs and link actions
  const fullStages: JourneyMapStage[] = stagesData.map((stg, idx) => {
    const stageId = randomUUID();
    const linkedActions = (stg.actions || []).map((act) => ({
      ...act,
      id: randomUUID(),
      stage_id: stageId,
      journey_map_id: mapId,
    }));

    return {
      ...stg,
      id: stageId,
      journey_map_id: mapId,
      order_index: idx + 1,
      actions: linkedActions,
    };
  });

  return {
    id: mapId,
    business_id: businessId,
    title,
    objective,
    journey_type: journeyType,
    summary,
    stages: fullStages,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
}

type JourneyMapMetadata = {
  summary?: string;
  stage_context?: Record<string, { customer_needs: string[]; findings_type: "hypothesis" | "data_backed" }>;
};

type DbMapRow = {
  id: string;
  business_id: string;
  title: string;
  objective: string;
  archetype: string;
  metadata: unknown;
  created_at: string;
  updated_at: string;
};

type DbStageRow = {
  id: string;
  journey_map_id: string;
  business_id: string;
  order_index: number;
  stage_key: string;
  stage_name: string;
  description: string;
  customer_actions: string[];
  customer_thoughts: string[];
  emotion: string;
  touchpoints: string[];
  pain_points: string[];
  opportunities: string[];
  created_at: string;
  updated_at: string;
};

type DbActionRow = {
  id: string;
  stage_id: string;
  journey_map_id: string;
  business_id: string;
  title: string;
  description: string;
  module_target: "crm" | "campaign" | "website" | "webinar";
  suggested_action_type: string;
  action_payload: unknown;
  expected_impact: string;
  status: "PROPOSED" | "APPROVED" | "EXECUTED" | "DISMISSED";
  idempotency_key: string | null;
  executed_at: string | null;
  created_at: string;
};

export class JourneyMapServiceError extends Error {
  constructor(public readonly code: string, message: string, public readonly status = 500) {
    super(message);
    this.name = "JourneyMapServiceError";
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function asStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

function parseMapMetadata(value: unknown): JourneyMapMetadata {
  if (!isRecord(value)) return {};
  const stageContext = isRecord(value.stage_context) ? value.stage_context : {};
  const parsedContext: JourneyMapMetadata["stage_context"] = {};

  for (const [stageKey, context] of Object.entries(stageContext)) {
    if (!isRecord(context)) continue;
    parsedContext[stageKey] = {
      customer_needs: asStringArray(context.customer_needs),
      findings_type: context.findings_type === "data_backed" ? "data_backed" : "hypothesis",
    };
  }

  return {
    summary: typeof value.summary === "string" ? value.summary : undefined,
    stage_context: parsedContext,
  };
}

function parseActionPayload(value: unknown) {
  if (!isRecord(value)) return { actionPayload: {}, supplemental: {} as Record<string, unknown> };
  const { __nexus, ...actionPayload } = value;
  return {
    actionPayload,
    supplemental: isRecord(__nexus) ? __nexus : {},
  };
}

function storedActionPayload(action: JourneyStageAction, executionResult: JourneyStageAction["execution_result"] = action.execution_result) {
  return {
    ...action.action_payload,
    __nexus: {
      why_it_helps: action.why_it_helps,
      evidence_type: action.evidence_type,
      execution_result: executionResult,
    },
  };
}

function safeError(operation: string, error: unknown): never {
  console.error(`[JOURNEY-MAP-${operation}] persistence failed`, error instanceof Error ? error.message : error);
  throw new JourneyMapServiceError("PERSISTENCE_FAILED", "Journey data could not be saved.", 503);
}

function mapAction(row: DbActionRow): JourneyStageAction {
  const { actionPayload, supplemental } = parseActionPayload(row.action_payload);
  return {
    id: row.id,
    stage_id: row.stage_id,
    journey_map_id: row.journey_map_id,
    title: row.title,
    description: row.description,
    why_it_helps: typeof supplemental.why_it_helps === "string"
      ? supplemental.why_it_helps
      : "Helps remove friction and guides the customer to the next journey step",
    module_target: row.module_target,
    suggested_action_type: row.suggested_action_type,
    evidence_type: supplemental.evidence_type === "data_backed" ? "data_backed" : "hypothesis",
    action_payload: actionPayload,
    expected_impact: row.expected_impact,
    status: row.status,
    idempotency_key: row.idempotency_key,
    executed_at: row.executed_at,
    execution_result: isRecord(supplemental.execution_result) && typeof supplemental.execution_result.message === "string"
      ? {
          message: supplemental.execution_result.message,
          target_module: typeof supplemental.execution_result.target_module === "string"
            ? supplemental.execution_result.target_module
            : "proposal",
          link: typeof supplemental.execution_result.link === "string" ? supplemental.execution_result.link : undefined,
        }
      : null,
    created_at: row.created_at,
  };
}

function mapStage(
  row: DbStageRow,
  metadata: JourneyMapMetadata,
  actions: DbActionRow[]
): JourneyMapStage {
  const supplemental = metadata.stage_context?.[row.stage_key];
  return {
    id: row.id,
    journey_map_id: row.journey_map_id,
    order_index: row.order_index,
    stage_key: row.stage_key,
    stage_name: row.stage_name,
    objective: row.description,
    customer_actions: asStringArray(row.customer_actions),
    touchpoints: asStringArray(row.touchpoints),
    customer_needs: supplemental?.customer_needs ?? [],
    customer_thoughts: asStringArray(row.customer_thoughts),
    emotion: ["delighted", "positive", "neutral", "confused", "frustrated"].includes(row.emotion)
      ? row.emotion as JourneyMapStage["emotion"]
      : "neutral",
    friction_points: asStringArray(row.pain_points),
    opportunities: asStringArray(row.opportunities),
    findings_type: supplemental?.findings_type ?? "hypothesis",
    actions: actions.filter((action) => action.stage_id === row.id).map(mapAction),
  };
}

function mapMap(row: DbMapRow, stages: DbStageRow[], actions: DbActionRow[]): CustomerJourneyMap {
  const metadata = parseMapMetadata(row.metadata);
  return {
    id: row.id,
    business_id: row.business_id,
    title: row.title,
    objective: row.objective,
    journey_type: row.archetype,
    summary: metadata.summary ?? "",
    stages: stages
      .filter((stage) => stage.journey_map_id === row.id && stage.business_id === row.business_id)
      .sort((a, b) => a.order_index - b.order_index)
      .map((stage) => mapStage(stage, metadata, actions)),
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

function assertUuid(value: string, label: string) {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)) {
    throw new JourneyMapServiceError("VALIDATION_ERROR", `${label} must be a UUID.`, 400);
  }
}

export class JourneyMapService {
  private static async getMapRow(context: OwnerContext, mapId: string): Promise<DbMapRow | null> {
    assertUuid(mapId, "Journey map ID");
    const { data, error } = await context.client
      .from("customer_journey_maps")
      .select("*")
      .eq("id", mapId)
      .eq("business_id", context.businessId)
      .maybeSingle();
    if (error) safeError("MAP_READ", error);
    return (data as DbMapRow | null) ?? null;
  }

  private static async getMapChildren(context: OwnerContext, mapId: string) {
    const map = await this.getMapRow(context, mapId);
    if (!map) return null;

    const { data: stages, error: stageError } = await context.client
      .from("journey_map_stages")
      .select("*")
      .eq("journey_map_id", map.id)
      .eq("business_id", context.businessId)
      .order("order_index", { ascending: true });
    if (stageError) safeError("STAGE_READ", stageError);

    const stageRows = (stages ?? []) as unknown as DbStageRow[];
    const stageIds = stageRows.map((stage) => stage.id);
    let actionRows: DbActionRow[] = [];
    if (stageIds.length > 0) {
      const { data: actions, error: actionError } = await context.client
        .from("journey_stage_actions")
        .select("*")
        .eq("journey_map_id", map.id)
        .eq("business_id", context.businessId)
        .in("stage_id", stageIds);
      if (actionError) safeError("ACTION_READ", actionError);
      actionRows = (actions ?? []) as unknown as DbActionRow[];
    }

    return { map, stages: stageRows, actions: actionRows };
  }

  static async getTelemetry(context: OwnerContext): Promise<NexusTelemetry> {
    const { data, error } = await context.client
      .from("crm_contacts")
      .select("stage, value")
      .eq("business_id", context.businessId);

    if (error) {
      console.error("[JOURNEY-MAP-TELEMETRY] CRM telemetry unavailable", error.message);
      throw new Error("Journey telemetry is temporarily unavailable.");
    }

    const stageBreakdown: Record<string, number> = {};
    let pipelineValue = 0;
    for (const contact of (data ?? []) as Array<{ stage?: unknown; value?: unknown }>) {
      if (typeof contact.stage === "string") stageBreakdown[contact.stage] = (stageBreakdown[contact.stage] ?? 0) + 1;
      if (typeof contact.value === "number") pipelineValue += contact.value;
    }

    return {
      crmContactsCount: data?.length ?? 0,
      crmPipelineValue: pipelineValue,
      crmStageBreakdown: stageBreakdown,
      activeWebsites: 1,
      billingMrr: 0,
      activeCampaigns: 0,
      scheduledWebinars: 0,
    };
  }

  static async generateJourneyMap(context: OwnerContext, input: GenerateJourneyMapInput): Promise<CustomerJourneyMap> {
    const telemetry = await this.getTelemetry(context);
    const newMap = buildJourneyFromObjective(input.objective, context.businessId, telemetry);
    const metadata: JourneyMapMetadata = {
      summary: newMap.summary,
      stage_context: Object.fromEntries(
        newMap.stages.map((stage) => [stage.stage_key, {
          customer_needs: stage.customer_needs,
          findings_type: stage.findings_type,
        }])
      ),
    };

    const { error: mapError } = await context.client.rpc("generate_customer_journey_map_transaction", {
      p_map: {
        id: newMap.id,
        title: newMap.title,
        objective: newMap.objective,
        journey_type: newMap.journey_type,
        target_persona: "Target Customer",
        status: "ACTIVE",
        metadata,
        stages: newMap.stages.map((stage) => ({
          ...stage,
          actions: stage.actions.map((action) => ({
            ...action,
            action_payload: storedActionPayload(action),
            idempotency_key: action.id,
          })),
        })),
      },
    });
    if (mapError) safeError("MAP_CREATE", mapError);
    const persisted = await this.getMapChildren(context, newMap.id);
    if (!persisted) throw new JourneyMapServiceError("NOT_FOUND", "Journey map was not found after saving.", 404);
    return mapMap(persisted.map, persisted.stages, persisted.actions);
  }

  static async getJourneyMaps(context: OwnerContext): Promise<CustomerJourneyMap[]> {
    const { data, error } = await context.client
      .from("customer_journey_maps")
      .select("*")
      .eq("business_id", context.businessId)
      .order("created_at", { ascending: false });
    if (error) safeError("MAP_LIST", error);

    const mapRows = (data ?? []) as unknown as DbMapRow[];
    if (mapRows.length === 0) {
      try {
        const defaultMap = await this.generateJourneyMap(context, {
          objective: "I want to convert more website visitors into trial signups.",
        });
        return [defaultMap];
      } catch (err) {
        console.warn("[JOURNEY-MAP-FALLBACK] Auto-seeding default journey via RPC failed, creating in-memory baseline:", err);
        try {
          const telemetry = await this.getTelemetry(context).catch(() => undefined);
          const memoryDefault = buildJourneyFromObjective(
            "I want to convert more website visitors into trial signups.",
            context.businessId,
            telemetry
          );
          return [memoryDefault];
        } catch {
          return [];
        }
      }
    }
    const mapIds = mapRows.map((map) => map.id);
    const { data: stages, error: stageError } = await context.client
      .from("journey_map_stages")
      .select("*")
      .eq("business_id", context.businessId)
      .in("journey_map_id", mapIds)
      .order("order_index", { ascending: true });
    if (stageError) safeError("STAGE_LIST", stageError);

    const stageRows = (stages ?? []) as unknown as DbStageRow[];
    const stageIds = stageRows.map((stage) => stage.id);
    let actionRows: DbActionRow[] = [];
    if (stageIds.length > 0) {
      const { data: actions, error: actionError } = await context.client
        .from("journey_stage_actions")
        .select("*")
        .eq("business_id", context.businessId)
        .in("journey_map_id", mapIds)
        .in("stage_id", stageIds);
      if (actionError) safeError("ACTION_LIST", actionError);
      actionRows = (actions ?? []) as unknown as DbActionRow[];
    }
    return mapRows.map((map) => mapMap(map, stageRows, actionRows));
  }

  static async getJourneyMapById(context: OwnerContext, id: string): Promise<CustomerJourneyMap | null> {
    const persisted = await this.getMapChildren(context, id);
    return persisted ? mapMap(persisted.map, persisted.stages, persisted.actions) : null;
  }

  static async updateStage(context: OwnerContext, mapId: string, stageId: string, input: UpdateStageInput): Promise<JourneyMapStage | null> {
    assertUuid(stageId, "Stage ID");
    const patch: Record<string, unknown> = {};
    if (input.stage_name !== undefined) patch.stage_name = input.stage_name;
    if (input.objective !== undefined) patch.objective = input.objective;
    if (input.customer_actions !== undefined) patch.customer_actions = input.customer_actions;
    if (input.touchpoints !== undefined) patch.touchpoints = input.touchpoints;
    if (input.customer_thoughts !== undefined) patch.customer_thoughts = input.customer_thoughts;
    if (input.emotion !== undefined) patch.emotion = input.emotion;
    if (input.customer_needs !== undefined) patch.customer_needs = input.customer_needs;
    if (input.friction_points !== undefined) patch.friction_points = input.friction_points;
    if (input.opportunities !== undefined) patch.opportunities = input.opportunities;
    if (input.findings_type !== undefined) patch.findings_type = input.findings_type;

    const { data, error } = await context.client.rpc("update_journey_stage_transaction", {
      p_map_id: mapId,
      p_stage_id: stageId,
      p_patch: patch,
    });
    if (error) safeError("STAGE_UPDATE", error);
    if (!data) return null;
    const refreshed = await this.getMapChildren(context, mapId);
    return refreshed?.stages.find((stage) => stage.id === stageId)
      ? mapStage(refreshed.stages.find((stage) => stage.id === stageId)!, parseMapMetadata(refreshed.map.metadata), refreshed.actions)
      : null;
  }

  static async addStage(context: OwnerContext, mapId: string, input: AddStageInput): Promise<JourneyMapStage | null> {
    const { data, error } = await context.client.rpc("add_journey_stage_transaction", {
      p_map_id: mapId,
      p_stage: { stage_name: input.stage_name },
    });
    if (error) safeError("STAGE_CREATE", error);
    if (!data) return null;
    const refreshed = await this.getMapChildren(context, mapId);
    const stage = refreshed?.stages.find((item) => item.id === String((data as Record<string, unknown>).id));
    return stage && refreshed
      ? mapStage(stage, parseMapMetadata(refreshed.map.metadata), refreshed.actions)
      : null;
  }

  static async deleteStage(context: OwnerContext, mapId: string, stageId: string): Promise<boolean> {
    assertUuid(stageId, "Stage ID");
    const { data, error } = await context.client.rpc("delete_journey_stage_transaction", {
      p_map_id: mapId,
      p_stage_id: stageId,
    });
    if (error) {
      if (error.message.includes("JOURNEY_LAST_STAGE")) {
        throw new JourneyMapServiceError("LAST_STAGE", "A journey map must keep at least one stage.", 409);
      }
      safeError("STAGE_DELETE", error);
    }
    return Boolean((data as { deleted?: boolean } | null)?.deleted);
  }

  static async executeAction(context: OwnerContext, mapId: string, actionId: string, decision: "approve" | "dismiss"): Promise<JourneyStageAction | null> {
    assertUuid(actionId, "Action ID");
    const { data, error } = await context.client.rpc("decide_journey_action_transaction", {
      p_map_id: mapId,
      p_action_id: actionId,
      p_decision: decision,
    });
    if (error) safeError("ACTION_UPDATE", error);
    return data ? mapAction(data as unknown as DbActionRow) : null;
  }

  static async deleteMap(context: OwnerContext, mapId: string): Promise<boolean> {
    const { data, error } = await context.client.rpc("delete_customer_journey_map_transaction", {
      p_map_id: mapId,
    });
    if (error) safeError("MAP_DELETE", error);
    return Boolean((data as { deleted?: boolean } | null)?.deleted);
  }
}
