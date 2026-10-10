import * as React from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  ArrowRight,
  Magicpen,
  SecurityUser,
  Global,
  TaskSquare,
  TickCircle,
  InfoCircle
} from "iconsax-react";

import { ThemeToggle } from "@/components/ui/theme-toggle";

// --- Components ---

function Container({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`max-w-7xl mx-auto px-4 md:px-6 lg:px-8 ${className}`}>
      {children}
    </div>
  );
}

function Section({ children, className = "", id }: { children: React.ReactNode; className?: string, id?: string }) {
  return (
    <section id={id} className={`py-16 lg:py-32 ${className}`}>
      {children}
    </section>
  );
}

// Motif: Architectural connector lines
function ConnectorLines({ className = "" }: { className?: string }) {
  return (
    <div className={`absolute pointer-events-none inset-0 overflow-hidden ${className}`}>
      <svg width="100%" height="100%" className="opacity-20">
        <pattern id="grid" width="64" height="64" patternUnits="userSpaceOnUse">
          <path d="M 64 0 L 0 0 0 64" fill="none" stroke="var(--color-border)" strokeWidth="1"/>
        </pattern>
        <rect width="100%" height="100%" fill="url(#grid)" />
        <path d="M 128 0 V 500 H 800 V 1000" fill="none" stroke="var(--color-brand)" strokeWidth="1" strokeDasharray="4 4" className="opacity-50" />
        <circle cx="128" cy="128" r="4" fill="var(--color-brand)" />
        <circle cx="800" cy="500" r="4" fill="var(--color-brand)" />
      </svg>
    </div>
  );
}

// --- Sections ---

function Navbar() {
  return (
    <nav className="sticky top-0 z-50 w-full border-b border-border bg-background/90 backdrop-blur-md">
      <Container className="flex h-16 items-center justify-between">
        <div className="flex items-center gap-8">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-brand rounded-sm flex items-center justify-center">
              <span className="text-brand-foreground font-display font-bold text-xl leading-none">N</span>
            </div>
            <span className="font-display font-semibold text-lg">Nexus</span>
          </Link>
          <div className="hidden md:flex items-center gap-6 text-sm font-semibold text-muted-foreground">
            <Link href="#product" className="hover:text-foreground transition-colors">Platform</Link>
            <Link href="#ai-agent" className="hover:text-foreground transition-colors">AI Agent</Link>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <ThemeToggle />
          <Button variant="primary" asChild>
            <Link href="#get-started">Get started</Link>
          </Button>
        </div>
      </Container>
    </nav>
  );
}

function Hero() {
  return (
    <Section className="relative overflow-hidden bg-background pt-24 pb-16">
      <ConnectorLines className="top-0 left-0 w-full h-full" />
      <Container className="relative z-10">
        <div className="flex flex-col items-center text-center max-w-4xl mx-auto mb-16 lg:mb-24">
          <h1 className="font-display text-display-md md:text-display-lg lg:text-display-xl font-bold text-balance text-foreground leading-[1.05] mb-6 tracking-tight">
            Your entire business.<br />
            <span className="text-brand-text">Working as one.</span>
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground text-pretty max-w-2xl mx-auto mb-8">
            Nexus connects your websites, customer records, billing, marketing, and AI-powered workflows into a single, intelligent workspace. No silos. No friction.
          </p>
          <div className="flex flex-col sm:flex-row items-center gap-4">
            <Button size="lg" variant="primary" className="w-full sm:w-auto px-8">
              Get started
            </Button>
            <Button size="lg" variant="outline" className="w-full sm:w-auto px-8 group">
              Explore platform <ArrowRight size="18" className="ml-2 group-hover:translate-x-1 transition-transform" />
            </Button>
          </div>
        </div>

        {/* Detailed Product Mockup */}
        <div className="relative mx-auto max-w-5xl rounded-xl border border-border bg-card shadow-2xl overflow-hidden aspect-auto md:aspect-[16/10] flex flex-col">
          {/* App Header */}
          <div className="h-14 border-b border-border bg-background flex items-center px-6 justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded bg-brand/10 text-brand-text flex items-center justify-center font-display font-bold">N</div>
              <div className="font-semibold text-sm">Acme Corp Workspace</div>
              <div className="h-4 w-px bg-border mx-2" />
              <div className="text-sm text-muted-foreground flex gap-4 hidden md:flex">
                <span className="text-foreground">Overview</span>
                <span>Customers</span>
                <span>Billing</span>
                <span>Campaigns</span>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="w-64 h-8 bg-muted border border-border rounded-sm px-3 flex items-center text-xs text-muted-foreground hidden lg:flex">
                Search customers, invoices, workflows...
              </div>
              <div className="w-8 h-8 rounded-full bg-secondary border border-border flex items-center justify-center">
                 <SecurityUser size="16" className="text-foreground" />
              </div>
            </div>
          </div>
          
          {/* Main App Canvas */}
          <div className="flex-1 grid grid-cols-1 md:grid-cols-12 bg-muted/30">
             {/* Left Panel - KPIs */}
             <div className="md:col-span-8 p-6 lg:p-8 flex flex-col gap-8 bg-background border-r border-border">
                <div className="flex justify-between items-end">
                   <div>
                      <h2 className="font-display text-page-sm font-bold tracking-tight">Quarterly Performance</h2>
                      <p className="text-sm text-muted-foreground">Real-time metrics across billing and CRM.</p>
                   </div>
                   <div className="px-3 py-1 bg-secondary border border-border rounded-sm text-xs font-semibold">Q3 2026</div>
                </div>
                
                <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                   <div className="p-4 border border-border rounded-lg bg-card flex flex-col gap-1">
                      <p className="text-xs font-semibold uppercase text-muted-foreground tracking-wider">Revenue (MRR)</p>
                      <p className="font-display text-2xl font-bold tabular-nums">$124,500</p>
                      <p className="text-xs text-status-success-fg flex items-center gap-1 mt-1">
                        <ArrowRight size="12" className="-rotate-45" /> +14.2% vs last month
                      </p>
                   </div>
                   <div className="p-4 border border-border rounded-lg bg-card flex flex-col gap-1">
                      <p className="text-xs font-semibold uppercase text-muted-foreground tracking-wider">Active Customers</p>
                      <p className="font-display text-2xl font-bold tabular-nums">1,842</p>
                      <p className="text-xs text-status-success-fg flex items-center gap-1 mt-1">
                        <ArrowRight size="12" className="-rotate-45" /> +22 this week
                      </p>
                   </div>
                   <div className="p-4 border border-border rounded-lg bg-card flex flex-col gap-1 hidden lg:flex">
                      <p className="text-xs font-semibold uppercase text-muted-foreground tracking-wider">Churn Risk</p>
                      <p className="font-display text-2xl font-bold tabular-nums">2.1%</p>
                      <p className="text-xs text-status-warning-fg flex items-center gap-1 mt-1">
                        <ArrowRight size="12" className="-rotate-45" /> Action recommended
                      </p>
                   </div>
                </div>

                {/* Table representation */}
                <div className="flex-1 border border-border rounded-lg bg-card overflow-hidden flex flex-col">
                   <div className="h-10 bg-muted/50 border-b border-border flex items-center px-4 gap-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      <div className="w-1/3">Customer</div>
                      <div className="w-1/4">Status</div>
                      <div className="w-1/4 text-right">MRR</div>
                   </div>
                   <div className="flex-1 p-2 flex flex-col gap-1">
                      {[
                        { name: "Globex Industries", status: "Active", amount: "$4,200", sColor: "status-success" },
                        { name: "Initech", status: "Pending Renewal", amount: "$1,850", sColor: "status-warning" },
                        { name: "Soylent Corp", status: "Active", amount: "$9,500", sColor: "status-success" }
                      ].map((row, i) => (
                        <div key={i} className="h-12 hover:bg-accent rounded-sm flex items-center px-2 gap-4 text-sm transition-colors border border-transparent hover:border-border cursor-pointer">
                           <div className="w-1/3 font-semibold">{row.name}</div>
                           <div className="w-1/4 flex">
                              <span className={`px-2 py-0.5 rounded-xs text-xs font-semibold bg-${row.sColor}-bg text-${row.sColor}-fg border border-${row.sColor}-border`}>
                                 {row.status}
                              </span>
                           </div>
                           <div className="w-1/4 text-right tabular-nums text-muted-foreground">{row.amount}</div>
                        </div>
                      ))}
                   </div>
                </div>
             </div>
             
             {/* Right Panel - AI Workflow Context */}
             <div className="md:col-span-4 bg-sidebar p-6 flex flex-col gap-6">
                <div className="flex items-center gap-2 text-sm font-semibold border-b border-border pb-4">
                   <Magicpen size="18" className="text-brand-text" />
                   AI Workflow Assistant
                </div>
                
                <div className="flex-1 flex flex-col gap-4">
                   <div className="bg-card border border-border rounded-lg p-4 shadow-sm">
                      <div className="flex items-center gap-2 mb-3">
                         <InfoCircle size="16" className="text-status-info-fg" />
                         <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Insight</span>
                      </div>
                      <p className="text-sm font-medium mb-2">Churn risk detected for <span className="font-bold">Initech</span>.</p>
                      <p className="text-xs text-muted-foreground mb-4">Usage dropped by 40% over the last 14 days. Renewal is due in 5 days.</p>
                      
                      <div className="border border-border-strong rounded-md p-3 bg-background relative overflow-hidden">
                         <div className="absolute top-0 left-0 w-1 h-full bg-brand" />
                         <p className="text-xs font-semibold uppercase text-brand-text mb-1">Proposed Action</p>
                         <p className="text-sm font-medium mb-3">Send proactive check-in email with priority support offer.</p>
                         <Button variant="brand" size="sm" className="w-full">Approve & Send</Button>
                      </div>
                   </div>
                   
                   <div className="bg-card border border-border rounded-lg p-4 shadow-sm opacity-60">
                      <div className="flex items-center gap-2 mb-2">
                         <TickCircle size="16" className="text-status-success-fg" />
                         <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Completed</span>
                      </div>
                      <p className="text-sm">Invoice #INV-2026 for Globex reconciled.</p>
                   </div>
                </div>
             </div>
          </div>
        </div>
      </Container>
    </Section>
  );
}

function FeatureSplit({ 
  reversed = false, 
  title, 
  headline, 
  description, 
  visual 
}: { 
  reversed?: boolean; 
  title: string; 
  headline: string; 
  description: string; 
  visual: React.ReactNode 
}) {
  return (
    <Section className="bg-background">
      <Container>
        <div className={`grid lg:grid-cols-2 gap-12 lg:gap-24 items-center ${reversed ? 'rtl' : ''}`}>
          <div className={reversed ? 'ltr' : ''}>
            <h2 className="text-brand-text font-semibold tracking-wide uppercase text-sm mb-4">{title}</h2>
            <h3 className="font-display text-page-sm md:text-page font-bold text-balance mb-6">
              {headline}
            </h3>
            <p className="text-lg text-muted-foreground text-pretty mb-8">
              {description}
            </p>
          </div>
          <div className={`relative ${reversed ? 'ltr' : ''}`}>
            {visual}
          </div>
        </div>
      </Container>
    </Section>
  );
}

function Features() {
  return (
    <>
      <FeatureSplit
        title="CRM & Billing"
        headline="Customer records and revenue, perfectly synced."
        description="Every customer interaction, invoice, and subscription change is logged to a single, immutable timeline. When a customer upgrades, billing updates automatically. When an invoice fails, the CRM flags the account."
        visual={
          <div className="bg-card border border-border rounded-xl shadow-lg p-6 flex flex-col gap-4 relative">
             <ConnectorLines className="scale-150 origin-center opacity-30 -z-10" />
             <div className="flex items-center justify-between border-b border-border pb-4">
                <div className="flex items-center gap-4">
                   <div className="w-12 h-12 bg-secondary rounded-full flex items-center justify-center text-xl font-display font-bold">G</div>
                   <div>
                     <h4 className="font-semibold">Globex Industries</h4>
                     <p className="text-xs text-muted-foreground">globex.com • Enterprise Plan</p>
                   </div>
                </div>
                <div className="text-right">
                   <p className="font-display font-bold text-xl tabular-nums">$4,200/mo</p>
                   <p className="text-xs text-status-success-fg font-semibold">Active Subscription</p>
                </div>
             </div>
             <div className="space-y-3 pt-2">
                <div className="flex gap-4 items-start">
                   <div className="mt-1 w-2 h-2 rounded-full bg-status-success-fg ring-4 ring-status-success-bg" />
                   <div>
                      <p className="text-sm font-semibold">Invoice Paid: INV-2026-04</p>
                      <p className="text-xs text-muted-foreground">Today at 10:42 AM via Stripe</p>
                   </div>
                </div>
                <div className="w-0.5 h-6 bg-border ml-1 -mt-2 -mb-2" />
                <div className="flex gap-4 items-start">
                   <div className="mt-1 w-2 h-2 rounded-full bg-brand ring-4 ring-brand-subtle" />
                   <div>
                      <p className="text-sm font-semibold">Plan Upgraded</p>
                      <p className="text-xs text-muted-foreground">Yesterday at 3:15 PM by Jane Doe</p>
                   </div>
                </div>
             </div>
          </div>
        }
      />

      <FeatureSplit
        reversed
        title="Marketing & Analytics"
        headline="Actionable insights that drive actual campaigns."
        description="Stop exporting CSVs between your analytics and marketing tools. Nexus lets you build dynamic segments based on real-time product usage and billing data, triggering targeted email campaigns instantly."
        visual={
          <div className="bg-sidebar border border-border rounded-xl shadow-lg p-6 flex flex-col gap-6 relative">
             <div className="flex items-center justify-between">
                <h4 className="font-display font-bold text-lg">Campaign Builder</h4>
                <Button variant="outline" size="sm">Edit Segment</Button>
             </div>
             
             <div className="bg-background border border-border-strong rounded-md p-4">
                <p className="text-xs font-semibold uppercase text-muted-foreground mb-3">Audience Criteria</p>
                <div className="flex flex-wrap gap-2 mb-4">
                   <span className="px-2 py-1 bg-secondary border border-border rounded-xs text-xs font-medium">Plan = Professional</span>
                   <span className="text-muted-foreground text-xs font-semibold py-1">AND</span>
                   <span className="px-2 py-1 bg-secondary border border-border rounded-xs text-xs font-medium">Usage &lt; 20%</span>
                   <span className="text-muted-foreground text-xs font-semibold py-1">AND</span>
                   <span className="px-2 py-1 bg-status-warning-bg border border-status-warning-border text-status-warning-fg rounded-xs text-xs font-medium">Renewal &lt; 30 Days</span>
                </div>
                <p className="text-sm font-bold text-foreground mb-1 tabular-nums">412 Users Matched</p>
             </div>
             
             <div className="bg-card border border-border rounded-md p-4">
                <p className="text-xs font-semibold uppercase text-muted-foreground mb-3">Trigger Action</p>
                <div className="flex items-center gap-3 bg-muted/50 p-3 rounded-sm border border-border">
                   <Global size="20" className="text-brand-text" />
                   <div>
                      <p className="text-sm font-semibold">Send Email: Q3 Feature Highlight</p>
                      <p className="text-xs text-muted-foreground">Deliver immediately upon match.</p>
                   </div>
                </div>
             </div>
          </div>
        }
      />
    </>
  );
}

function AIAgentSection() {
  return (
    <Section id="ai-agent" className="relative bg-background border-t border-border overflow-hidden">
      {/* Subtle ambient glow behind the workflow card in dark mode */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[350px] bg-brand/10 dark:bg-brand/15 blur-[120px] rounded-full pointer-events-none -z-10" />

      <Container>
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-brand-subtle/80 dark:bg-brand/10 text-brand-text border border-brand/20 dark:border-brand/30 rounded-full text-xs font-semibold uppercase tracking-wider mb-6 shadow-xs">
            <Magicpen size="15" className="text-brand-text" />
            <span>The AI Business Agent</span>
          </div>
          <h2 className="font-display text-page-sm md:text-page font-bold text-balance mb-6">
            An operator, not just a chatbot.
          </h2>
          <p className="text-lg text-muted-foreground text-pretty max-w-2xl mx-auto">
            The Nexus AI Agent has secure, semantic access to your entire business graph. It doesn&apos;t just answer questions—it identifies operational bottlenecks, drafts communications, and prepares workflows for your approval.
          </p>
        </div>

        {/* Elevated Workflow Container */}
        <div className="max-w-4xl mx-auto bg-card border border-border/80 dark:border-white/10 rounded-2xl shadow-xl dark:shadow-[0_20px_50px_rgba(0,0,0,0.6)] overflow-hidden flex flex-col md:flex-row transition-all duration-300">
           {/* Left Column: Approval Queue */}
           <div className="md:w-1/3 bg-muted/20 dark:bg-black/40 p-6 border-b md:border-b-0 md:border-r border-border/70 dark:border-white/5 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-5">
                   <h4 className="font-semibold text-sm flex items-center gap-2 text-foreground">
                      <TaskSquare size="18" className="text-brand-text" />
                      Approval Queue
                   </h4>
                   <span className="text-[11px] font-mono px-1.5 py-0.5 rounded bg-muted dark:bg-white/10 text-muted-foreground font-medium">2 pending</span>
                </div>
                <div className="space-y-2.5">
                   {/* Selected / Active Item */}
                   <div className="bg-background dark:bg-card border border-brand/40 dark:border-brand/50 rounded-xl p-3.5 shadow-xs cursor-pointer relative overflow-hidden transition-all">
                      <div className="absolute top-0 left-0 w-1 h-full bg-brand" />
                      <div className="flex justify-between items-start mb-1.5 pl-1">
                         <p className="text-sm font-semibold text-foreground">Retention Email</p>
                         <span className="w-2 h-2 rounded-full bg-brand shadow-[0_0_8px_var(--color-brand)] mt-1" />
                      </div>
                      <p className="text-xs text-muted-foreground pl-1 leading-relaxed">Drafted for 42 high-risk accounts.</p>
                   </div>
                   
                   {/* Inactive Item */}
                   <div className="bg-transparent hover:bg-background/50 dark:hover:bg-white/5 border border-border/50 dark:border-white/5 rounded-xl p-3.5 cursor-pointer transition-colors">
                      <div className="flex justify-between items-start mb-1">
                         <p className="text-sm font-medium text-muted-foreground">Invoice Reconciliation</p>
                      </div>
                      <p className="text-xs text-muted-foreground/80">Reviewed 14 mismatched payments.</p>
                   </div>
                </div>
              </div>

              <div className="pt-6 mt-6 border-t border-border/50 dark:border-white/5 flex items-center gap-2 text-xs text-muted-foreground">
                 <TickCircle size="14" className="text-status-success-fg" />
                 <span>Zero untrusted actions without review</span>
              </div>
           </div>
           
           {/* Right Column: Active Workflow Detail */}
           <div className="md:w-2/3 p-6 md:p-8 flex flex-col gap-6 bg-card dark:bg-black/20">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/70 dark:border-white/5 pb-5">
                 <div>
                    <h3 className="font-display font-bold text-lg text-foreground tracking-tight">Approve Retention Campaign</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">Triggered by Churn Prevention Rule • Q3 Growth</p>
                 </div>
                 <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider bg-status-info-bg text-status-info-fg border border-status-info-border self-start sm:self-auto">
                    <span className="w-1.5 h-1.5 rounded-full bg-status-info-fg animate-pulse" />
                    <span>Awaiting Approval</span>
                 </div>
              </div>
              
              <div className="bg-muted/40 dark:bg-white/[0.03] p-4 rounded-xl border border-border/60 dark:border-white/5 text-sm space-y-4">
                 <p className="text-muted-foreground leading-relaxed text-xs sm:text-sm">
                   Based on your instruction to <span className="text-foreground font-semibold">&quot;reduce churn for Q3&quot;</span>, I analyzed usage signals and generated a personalized re-engagement email for accounts renewing in under 30 days.
                 </p>
                 
                 {/* Email Preview Card */}
                 <div className="bg-background dark:bg-black/50 p-4 rounded-lg border border-border/80 dark:border-white/10 shadow-xs">
                    <div className="flex items-center justify-between border-b border-border/60 dark:border-white/5 pb-2.5 mb-3">
                       <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Email Preview</span>
                       <span className="text-[11px] text-brand-text font-medium">To: 42 recipients</span>
                    </div>
                    <p className="font-semibold text-foreground text-sm mb-2">Subject: Optimizing your workflow for Q3</p>
                    <p className="text-muted-foreground text-xs sm:text-sm leading-relaxed font-sans">
                      Hi [First Name],<br/><br/>
                      I noticed your team hasn&apos;t been utilizing the new analytics dashboard. I&apos;d love to jump on a quick 15-minute call to show you how it can streamline your reporting before your upcoming renewal.<br/><br/>
                      Are you available next Tuesday?
                    </p>
                 </div>
              </div>
              
              <div className="flex flex-wrap items-center gap-3 pt-1">
                 <Button variant="primary" className="px-6 shadow-sm">Approve & Execute</Button>
                 <Button variant="outline" className="dark:border-white/15 dark:hover:bg-white/5">Edit Copy</Button>
                 <Button variant="ghost" className="text-muted-foreground hover:text-status-danger-fg transition-colors">Reject</Button>
              </div>
           </div>
        </div>
      </Container>
    </Section>
  );
}

function ValueProps() {
  return (
    <Section className="bg-background">
      <Container>
        <div className="text-center max-w-2xl mx-auto mb-16">
          <h2 className="font-display text-page-sm md:text-page font-bold mb-4">Engineered for modern operations</h2>
          <p className="text-lg text-muted-foreground">A robust, scalable architecture replacing disjointed software with a single unified schema.</p>
        </div>
        <div className="grid md:grid-cols-3 gap-8">
          <div className="border border-border bg-card p-8 rounded-xl shadow-sm">
            <div className="w-12 h-12 rounded-sm bg-secondary flex items-center justify-center mb-6">
              <Global size="24" className="text-foreground" />
            </div>
            <h3 className="font-display text-xl font-bold mb-3">Unified Schema</h3>
            <p className="text-muted-foreground">Customers, billing, and events share the same database. Eliminate costly integrations and fragile sync scripts.</p>
          </div>
          <div className="border border-border bg-card p-8 rounded-xl shadow-sm">
            <div className="w-12 h-12 rounded-sm bg-brand-subtle flex items-center justify-center mb-6">
              <TaskSquare size="24" className="text-brand-text" />
            </div>
            <h3 className="font-display text-xl font-bold mb-3">Idempotent Workflows</h3>
            <p className="text-muted-foreground">Engineered for reliability. Automated actions are strictly verified, preventing double-billing or duplicate emails.</p>
          </div>
          <div className="border border-border bg-card p-8 rounded-xl shadow-sm">
            <div className="w-12 h-12 rounded-sm bg-secondary flex items-center justify-center mb-6">
              <SecurityUser size="24" className="text-foreground" />
            </div>
            <h3 className="font-display text-xl font-bold mb-3">Strict Isolation</h3>
            <p className="text-muted-foreground">Built on a secure, single-tenant data model with robust Row Level Security enforcing explicit data ownership.</p>
          </div>
        </div>
      </Container>
    </Section>
  );
}

function CTA() {
  return (
    <Section id="get-started" className="bg-background border-t border-border">
      <Container>
        <div className="relative bg-card border border-border shadow-xl rounded-2xl p-12 md:p-16 lg:p-24 text-center max-w-5xl mx-auto flex flex-col items-center overflow-hidden">
          <ConnectorLines className="opacity-40" />
          <div className="relative z-10">
            <h2 className="font-display text-page-sm md:text-page font-bold mb-6 text-balance text-foreground">
              Run your business on a better foundation.
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-10 text-pretty">
              Consolidate your stack. Automate your operations. Empower your team with an intelligent operating system built for the modern web.
            </p>
            <div className="flex flex-col sm:flex-row justify-center items-center gap-4">
               <Button variant="primary" size="lg" className="w-full sm:w-auto px-10">
                 Get started
               </Button>
               <Button variant="outline" size="lg" className="w-full sm:w-auto px-10">
                 Explore platform
               </Button>
            </div>
          </div>
        </div>
      </Container>
    </Section>
  );
}

function Footer() {
  return (
    <footer className="bg-background border-t border-border py-12">
      <Container>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-8 mb-12">
          <div className="col-span-2 lg:col-span-2">
            <Link href="/" className="flex items-center gap-2 mb-4">
              <div className="w-6 h-6 bg-brand rounded-sm flex items-center justify-center">
                <span className="text-brand-foreground font-display font-bold text-sm leading-none">N</span>
              </div>
              <span className="font-display font-bold text-lg">Nexus</span>
            </Link>
            <p className="text-sm text-muted-foreground max-w-xs">
              The AI-powered business operating platform. Build, manage, and scale your company in one place.
            </p>
          </div>
          <div>
            <h4 className="font-semibold mb-4 text-sm uppercase tracking-wide">Platform</h4>
            <ul className="space-y-3 text-sm text-muted-foreground">
              <li><Link href="#product" className="hover:text-foreground transition-colors">Features</Link></li>
              <li><Link href="#ai-agent" className="hover:text-foreground transition-colors">AI Agent</Link></li>
              <li><Link href="#" className="hover:text-foreground transition-colors">Security</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold mb-4 text-sm uppercase tracking-wide">Company</h4>
            <ul className="space-y-3 text-sm text-muted-foreground">
              <li><Link href="#" className="hover:text-foreground transition-colors">About</Link></li>
              <li><Link href="#" className="hover:text-foreground transition-colors">Blog</Link></li>
              <li><Link href="#" className="hover:text-foreground transition-colors">Careers</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold mb-4 text-sm uppercase tracking-wide">Legal</h4>
            <ul className="space-y-3 text-sm text-muted-foreground">
              <li><Link href="#" className="hover:text-foreground transition-colors">Privacy Policy</Link></li>
              <li><Link href="#" className="hover:text-foreground transition-colors">Terms of Service</Link></li>
            </ul>
          </div>
        </div>
        <div className="pt-8 border-t border-border flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-muted-foreground">
          <p>© 2026 Nexus Platform Inc. All rights reserved.</p>
          <div className="flex gap-6">
            <Link href="#" className="hover:text-foreground transition-colors">Twitter</Link>
            <Link href="#" className="hover:text-foreground transition-colors">LinkedIn</Link>
            <Link href="#" className="hover:text-foreground transition-colors">GitHub</Link>
          </div>
        </div>
      </Container>
    </footer>
  );
}

// --- Main Page ---

export default function LandingPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1">
        <Hero />
        <Features />
        <AIAgentSection />
        <ValueProps />
        <CTA />
      </main>
      <Footer />
    </div>
  );
}
