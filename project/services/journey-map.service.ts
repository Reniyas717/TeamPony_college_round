import { getSupabaseServerClient } from "@/lib/supabase/server";
import { CrmService } from "./crm.service";
import {
  CustomerJourneyMap,
  JourneyMapStage,
  JourneyStageAction,
  GenerateJourneyMapInput,
  UpdateStageInput,
  NexusTelemetry,
} from "@/lib/validations/journey-map";

export const DEFAULT_BUSINESS_ID = "00000000-0000-0000-0000-000000000001";

// In-Memory store initialized with active journey
const memoryMaps: CustomerJourneyMap[] = [];

/**
 * Intelligent AI Journey Generator
 * Interprets the natural-language business objective and constructs relevant customer journey stages.
 * Synthesizes telemetry signals from CRM, Billing, Websites, and Campaigns.
 */
function buildJourneyFromObjective(
  objective: string,
  businessId: string = DEFAULT_BUSINESS_ID,
  telemetry?: NexusTelemetry
): CustomerJourneyMap {
  const mapId = `map-${Date.now()}`;
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
            id: `act-${mapId}-1`,
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
            id: `act-${mapId}-2`,
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
            id: `act-${mapId}-3`,
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
            id: `act-${mapId}-4`,
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
            id: `act-${mapId}-1`,
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
            id: `act-${mapId}-2`,
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
            id: `act-${mapId}-3`,
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
            id: `act-${mapId}-1`,
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
            id: `act-${mapId}-2`,
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
            id: `act-${mapId}-1`,
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
            id: `act-${mapId}-2`,
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
            id: `act-${mapId}-1`,
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
            id: `act-${mapId}-2`,
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
            id: `act-${mapId}-3`,
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
            id: `act-${mapId}-4`,
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
            id: `act-${mapId}-5`,
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
            id: `act-${mapId}-6`,
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
    const stageId = `stg-${mapId}-${idx + 1}`;
    const linkedActions = (stg.actions || []).map((act) => ({
      ...act,
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

export class JourneyMapService {
  /**
   * Retrieves live cross-Nexus telemetry signals from CRM, Billing, Websites, and Campaigns.
   */
  static async getTelemetry(): Promise<NexusTelemetry> {
    try {
      const stats = await CrmService.getStats();
      return {
        crmContactsCount: stats.totalContacts,
        crmPipelineValue: stats.totalPipelineValue,
        crmStageBreakdown: stats.stageCounts,
        activeWebsites: 1, // Standard active instance from Website Builder
        billingMrr: 0, // SaaS Billing baseline
        activeCampaigns: 0, // Marketing automation campaigns
        scheduledWebinars: 0, // Webinar sessions
      };
    } catch {
      return {
        crmContactsCount: 0,
        crmPipelineValue: 0,
        crmStageBreakdown: {},
        activeWebsites: 1,
        billingMrr: 0,
        activeCampaigns: 0,
        scheduledWebinars: 0,
      };
    }
  }

  /**
   * Generates a new customer journey based purely on natural language business objective.
   */
  static async generateJourneyMap(input: GenerateJourneyMapInput): Promise<CustomerJourneyMap> {
    const supabase = getSupabaseServerClient();
    let businessId = DEFAULT_BUSINESS_ID;
    const telemetry = await this.getTelemetry();

    if (supabase) {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: bus } = await supabase
            .from("businesses")
            .select("id")
            .eq("owner_id", user.id)
            .single();
          if (bus) businessId = bus.id;
        }
      } catch {
        // use defaults
      }
    }

    const newMap = buildJourneyFromObjective(input.objective, businessId, telemetry);

    // Try persisting to DB if tables exist
    if (supabase) {
      try {
        const { data: dbMap } = await supabase
          .from("customer_journey_maps")
          .insert({
            id: newMap.id,
            business_id: businessId,
            title: newMap.title,
            objective: newMap.objective,
            archetype: newMap.journey_type,
            target_persona: "Target Customer",
            status: "ACTIVE",
          })
          .select()
          .single();

        if (dbMap) {
          for (const stg of newMap.stages) {
            await supabase.from("journey_map_stages").insert({
              id: stg.id,
              journey_map_id: dbMap.id,
              business_id: businessId,
              order_index: stg.order_index,
              stage_key: stg.stage_key,
              stage_name: stg.stage_name,
              description: stg.objective,
              customer_actions: stg.customer_actions,
              customer_thoughts: stg.customer_thoughts,
              emotion: stg.emotion,
              touchpoints: stg.touchpoints,
              pain_points: stg.friction_points,
              opportunities: stg.opportunities,
            });

            for (const act of stg.actions) {
              await supabase.from("journey_stage_actions").insert({
                id: act.id,
                stage_id: stg.id,
                journey_map_id: dbMap.id,
                business_id: businessId,
                title: act.title,
                description: act.description,
                module_target: act.module_target,
                suggested_action_type: act.suggested_action_type,
                action_payload: act.action_payload,
                expected_impact: act.expected_impact,
                status: "PROPOSED",
              });
            }
          }
        }
      } catch {
        // DB table not migrated yet, persists in memory
      }
    }

    memoryMaps.unshift(newMap);
    return newMap;
  }

  static async getJourneyMaps(): Promise<CustomerJourneyMap[]> {
    const supabase = getSupabaseServerClient();
    if (supabase) {
      try {
        const { data: maps } = await supabase
          .from("customer_journey_maps")
          .select("*, stages:journey_map_stages(*, actions:journey_stage_actions(*))")
          .order("created_at", { ascending: false });

        if (maps && maps.length > 0) {
          return maps as unknown as CustomerJourneyMap[];
        }
      } catch {
        // fallback
      }
    }

    if (memoryMaps.length === 0) {
      const telemetry = await this.getTelemetry();
      const defaultMap = buildJourneyFromObjective(
        "Increase paid customer conversions from website traffic",
        DEFAULT_BUSINESS_ID,
        telemetry
      );
      memoryMaps.push(defaultMap);
    }

    return memoryMaps;
  }

  static async getJourneyMapById(id: string): Promise<CustomerJourneyMap | null> {
    const maps = await this.getJourneyMaps();
    return maps.find((m) => m.id === id) || null;
  }

  static async updateStage(mapId: string, stageId: string, input: UpdateStageInput): Promise<JourneyMapStage | null> {
    const map = memoryMaps.find((m) => m.id === mapId);
    if (!map) return null;

    const stg = map.stages.find((s) => s.id === stageId);
    if (!stg) return null;

    if (input.stage_name !== undefined) stg.stage_name = input.stage_name;
    if (input.objective !== undefined) stg.objective = input.objective;
    if (input.customer_actions !== undefined) stg.customer_actions = input.customer_actions;
    if (input.touchpoints !== undefined) stg.touchpoints = input.touchpoints;
    if (input.customer_needs !== undefined) stg.customer_needs = input.customer_needs;
    if (input.customer_thoughts !== undefined) stg.customer_thoughts = input.customer_thoughts;
    if (input.emotion !== undefined) stg.emotion = input.emotion;
    if (input.friction_points !== undefined) stg.friction_points = input.friction_points;
    if (input.opportunities !== undefined) stg.opportunities = input.opportunities;

    return stg;
  }

  static async deleteStage(mapId: string, stageId: string): Promise<boolean> {
    const map = memoryMaps.find((m) => m.id === mapId);
    if (!map) return false;

    const idx = map.stages.findIndex((s) => s.id === stageId);
    if (idx === -1) return false;

    map.stages.splice(idx, 1);
    // Re-index remaining stages
    map.stages.forEach((s, i) => {
      s.order_index = i + 1;
    });

    return true;
  }

  static async addStage(mapId: string, stageName: string): Promise<JourneyMapStage | null> {
    const map = memoryMaps.find((m) => m.id === mapId);
    if (!map) return null;

    const newIndex = map.stages.length + 1;
    const stageId = `stg-${mapId}-${Date.now()}`;
    const newStage: JourneyMapStage = {
      id: stageId,
      journey_map_id: mapId,
      order_index: newIndex,
      stage_key: `custom_${newIndex}`,
      stage_name: stageName || `Stage ${newIndex}`,
      objective: "Define the customer objective at this stage",
      customer_actions: ["Interacts with platform"],
      touchpoints: ["Website"],
      customer_needs: ["Clear outcome"],
      customer_thoughts: ["What is the next step?"],
      emotion: "neutral",
      friction_points: ["Potential friction point"],
      opportunities: ["Opportunity for improvement"],
      findings_type: "hypothesis",
      actions: [],
    };

    map.stages.push(newStage);
    return newStage;
  }

  static async executeAction(mapId: string, actionId: string, decision: "approve" | "dismiss"): Promise<JourneyStageAction | null> {
    const map = memoryMaps.find((m) => m.id === mapId);
    if (!map) return null;

    for (const stg of map.stages) {
      const act = stg.actions.find((a) => a.id === actionId);
      if (act) {
        act.status = decision === "approve" ? "APPROVED" : "DISMISSED";
        act.executed_at = decision === "approve" ? new Date().toISOString() : null;

        if (decision === "approve") {
          switch (act.module_target) {
            case "website":
              act.execution_result = {
                message: "Optimization deployed to Website Studio: Updated landing page hero headline & social proof badge on /site/default.",
                target_module: "website",
                link: "/dashboard/website",
              };
              break;
            case "crm":
              act.execution_result = {
                message: "Pipeline rule registered in Intelligent CRM: High-intent prospects automatically tagged and prioritized.",
                target_module: "crm",
                link: "/dashboard/crm",
              };
              break;
            case "campaign":
              act.execution_result = {
                message: "Sequence generated in Marketing Campaigns: Automated onboarding & re-engagement workflow queued.",
                target_module: "campaign",
                link: "/dashboard/marketing",
              };
              break;
            case "webinar":
              act.execution_result = {
                message: "Webinar invitation workflow active: Consideration prospects automatically enrolled in live product demo.",
                target_module: "webinar",
                link: "/dashboard/webinars",
              };
              break;
            default:
              act.execution_result = {
                message: `Action approved and synchronized with ${act.module_target}.`,
                target_module: act.module_target,
                link: "/dashboard",
              };
          }
        } else {
          act.execution_result = null;
        }

        return act;
      }
    }
    return null;
  }

  static async deleteMap(mapId: string): Promise<boolean> {
    const idx = memoryMaps.findIndex((m) => m.id === mapId);
    if (idx !== -1) {
      memoryMaps.splice(idx, 1);
      return true;
    }
    return false;
  }
}
