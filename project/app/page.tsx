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
    <div className={`max-w-7xl mx-auto px-6 lg:px-8 ${className}`}>
      {children}
    </div>
  );
}

function Section({ children, className = "", id }: { children: React.ReactNode; className?: string, id?: string }) {
  return (
    <section id={id} className={`py-20 lg:py-32 ${className}`}>
      {children}
    </section>
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
            <span className="font-display font-semibold text-lg tracking-tight">Nexus</span>
          </Link>
          <div className="hidden md:flex items-center gap-6 text-sm font-semibold text-muted-foreground">
            <Link href="#product" className="hover:text-foreground transition-colors">Platform</Link>
            <Link href="#ai-agent" className="hover:text-foreground transition-colors">AI Agent</Link>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <ThemeToggle />
          <Button variant="ghost" asChild className="hidden sm:inline-flex">
            <Link href="/login">Sign in</Link>
          </Button>
          <Button variant="primary" asChild>
            <Link href="/signup">Get started</Link>
          </Button>
        </div>
      </Container>
    </nav>
  );
}

function Hero() {
  return (
    <Section className="relative bg-background pt-20 pb-16 lg:pt-32 lg:pb-24 overflow-hidden border-b border-border">
      <Container>
        <div className="grid lg:grid-cols-12 gap-12 lg:gap-8 items-center">
          
          {/* Left: Typography and CTA */}
          <div className="lg:col-span-5 flex flex-col items-start text-left">
            <h1 className="font-display text-display-md md:text-display-lg font-bold text-balance text-foreground leading-[1.05] mb-6 tracking-tight">
              Your entire business.<br />
              <span className="text-brand-text">Working as one.</span>
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground text-pretty mb-8">
              Nexus connects your websites, customer records, billing, marketing, and AI-powered workflows into a single, intelligent workspace. No silos. No friction.
            </p>
            <div className="flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto">
              <Button size="lg" variant="primary" asChild className="w-full sm:w-auto px-8">
                <Link href="/signup">Get started</Link>
              </Button>
              <Button size="lg" variant="outline" asChild className="w-full sm:w-auto px-8 group bg-transparent">
                <Link href="/login">
                Sign in to workspace <ArrowRight size="18" className="ml-2 group-hover:translate-x-1 transition-transform" />
                </Link>
            </Button>
            </div>
          </div>

          {/* Right: Architectural Product Mockup */}
          <div className="lg:col-span-7 relative w-full lg:translate-x-6 xl:translate-x-12">
            <div className="relative rounded-xl border border-border bg-card shadow-2xl overflow-hidden flex flex-col">
              
              {/* App Header */}
              <div className="h-12 border-b border-border bg-background flex items-center px-4 justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-6 h-6 rounded-sm bg-brand/10 text-brand-text flex items-center justify-center font-display font-bold text-xs">N</div>
                  <div className="font-semibold text-xs tracking-tight">Acme Corp Workspace</div>
                  <div className="h-4 w-px bg-border mx-2 hidden sm:block" />
                  <div className="text-xs text-muted-foreground gap-4 hidden sm:flex">
                    <span className="text-foreground font-medium">Overview</span>
                    <span>Customers</span>
                    <span>Billing</span>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-48 h-7 bg-muted border border-border rounded-sm px-2 flex items-center text-[10px] text-muted-foreground hidden sm:flex">
                    Search...
                  </div>
                  <div className="w-6 h-6 rounded-sm bg-secondary border border-border flex items-center justify-center">
                     <SecurityUser size="14" className="text-foreground" />
                  </div>
                </div>
              </div>
              
              {/* Main App Canvas */}
              <div className="flex-1 grid grid-cols-1 md:grid-cols-12 bg-background">
                 
                 {/* Left Panel - KPIs and Clean Data */}
                 <div className="md:col-span-8 flex flex-col border-r border-border">
                    {/* Header */}
                    <div className="px-5 py-4 flex justify-between items-center border-b border-border">
                       <div>
                          <h2 className="font-display text-base font-bold tracking-tight">Quarterly Performance</h2>
                       </div>
                       <div className="px-2 py-0.5 border border-border rounded-sm text-[10px] uppercase font-semibold text-muted-foreground tracking-wider">Q3 2026</div>
                    </div>
                    
                    {/* Architectural KPI Row */}
                    <div className="grid grid-cols-3 divide-x divide-border border-b border-border bg-card">
                       <div className="p-4 flex flex-col gap-1">
                          <p className="text-[10px] font-semibold uppercase text-muted-foreground tracking-wider">Revenue (MRR)</p>
                          <p className="font-display text-xl font-bold tabular-nums">₹1,24,500</p>
                          <p className="text-[10px] text-status-success-fg flex items-center gap-1 mt-1 font-medium">
                            <ArrowRight size="10" className="-rotate-45" /> +14.2%
                          </p>
                       </div>
                       <div className="p-4 flex flex-col gap-1">
                          <p className="text-[10px] font-semibold uppercase text-muted-foreground tracking-wider">Active Customers</p>
                          <p className="font-display text-xl font-bold tabular-nums">1,842</p>
                          <p className="text-[10px] text-status-success-fg flex items-center gap-1 mt-1 font-medium">
                            <ArrowRight size="10" className="-rotate-45" /> +22
                          </p>
                       </div>
                       <div className="p-4 flex flex-col gap-1">
                          <p className="text-[10px] font-semibold uppercase text-muted-foreground tracking-wider">Churn Risk</p>
                          <p className="font-display text-xl font-bold tabular-nums">2.1%</p>
                          <p className="text-[10px] text-status-warning-fg flex items-center gap-1 mt-1 font-medium">
                            <ArrowRight size="10" className="-rotate-45" /> Review
                          </p>
                       </div>
                    </div>

                    {/* Table representation */}
                    <div className="flex-1 flex flex-col bg-background">
                       <div className="flex items-center px-5 py-2 border-b border-border text-[10px] font-semibold text-muted-foreground uppercase tracking-wider bg-muted/30">
                          <div className="w-5/12">Customer</div>
                          <div className="w-3/12">Status</div>
                          <div className="w-4/12 text-right">MRR</div>
                       </div>
                       <div className="flex flex-col">
                          {[
                            { name: "Globex Industries", status: "Active", amount: "₹4,200", sColor: "status-success" },
                            { name: "Initech", status: "Renewal", amount: "₹1,850", sColor: "status-warning" },
                            { name: "Soylent Corp", status: "Active", amount: "₹9,500", sColor: "status-success" }
                          ].map((row, i) => (
                            <div key={i} className="flex items-center px-5 py-3 text-sm border-b border-border/50 hover:bg-muted/30 transition-colors cursor-pointer">
                               <div className="w-5/12 font-semibold">{row.name}</div>
                               <div className="w-3/12 flex">
                                  <span className={`px-1.5 py-0.5 text-[10px] font-semibold bg-${row.sColor}-bg text-${row.sColor}-fg border border-${row.sColor}-border rounded-sm uppercase tracking-wider`}>
                                     {row.status}
                                  </span>
                               </div>
                               <div className="w-4/12 text-right tabular-nums text-muted-foreground font-medium">{row.amount}</div>
                            </div>
                          ))}
                       </div>
                    </div>
                 </div>
                 
                 {/* Right Panel - AI Workflow Context */}
                 <div className="md:col-span-4 bg-muted/10 flex flex-col border-l border-border/50 -ml-px">
                    <div className="flex items-center gap-2 text-[11px] uppercase tracking-wider font-semibold border-b border-border px-4 py-3 bg-card/50">
                       <Magicpen size="14" className="text-brand-text" />
                       AI Workflow
                    </div>
                    
                    <div className="p-4 flex flex-col gap-6">
                       <div className="flex flex-col gap-2">
                          <div className="flex items-center gap-1.5 mb-1">
                             <InfoCircle size="14" className="text-status-info-fg" />
                             <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Insight</span>
                          </div>
                          <p className="text-xs text-foreground font-medium leading-relaxed">Usage dropped 40% for <span className="font-bold">Initech</span>.</p>
                       </div>
                       
                       <div className="pt-2">
                          <div className="flex items-center gap-1.5 mb-2">
                             <Magicpen size="14" className="text-brand-text" />
                             <p className="text-[10px] font-bold uppercase text-brand-text tracking-wider">Action Required</p>
                          </div>
                          <p className="text-xs font-medium mb-3 leading-relaxed">Draft proactive check-in email with priority support offer.</p>
                          <Button variant="brand" size="sm" className="w-full text-[11px] h-7">Approve & Send</Button>
                       </div>
                       
                       <div className="opacity-60 flex flex-col gap-1.5 mt-2">
                          <div className="flex items-center gap-1.5">
                             <TickCircle size="14" className="text-status-success-fg" />
                             <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Completed</span>
                          </div>
                          <p className="text-xs">Invoice #INV-2026 reconciled.</p>
                       </div>
                    </div>
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
  visual,
  bgClass = "bg-background",
  id,
}: { 
  reversed?: boolean; 
  title: string; 
  headline: string; 
  description: string; 
  visual: React.ReactNode;
  bgClass?: string;
  id?: string;
}) {
  return (
    <Section id={id} className={`${bgClass} border-b border-border`}>
      <Container>
        <div className={`grid lg:grid-cols-2 gap-12 lg:gap-24 items-center ${reversed ? 'rtl' : ''}`}>
          <div className={reversed ? 'ltr' : ''}>
            <h2 className="text-brand-text font-semibold tracking-wider uppercase text-[11px] mb-4">{title}</h2>
            <h3 className="font-display text-page-sm md:text-page font-bold text-balance mb-6 tracking-tight">
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
        id="product"
        bgClass="bg-muted/40 dark:bg-white/[0.035]"
        title="CRM & Billing"
        headline="Customer records and revenue, seamlessly synced."
        description="Every customer interaction, invoice, and subscription change is logged to a single, immutable timeline. When a customer upgrades, billing updates automatically. When an invoice fails, the CRM flags the account."
        visual={
          <div className="bg-card border border-border shadow-xl p-0 flex flex-col">
             <div className="flex items-center justify-between border-b border-border px-6 py-5 bg-background">
                <div className="flex items-center gap-4">
                   <div className="w-10 h-10 bg-muted/20 border border-border flex items-center justify-center text-lg font-display font-bold">G</div>
                   <div>
                     <h4 className="font-semibold text-sm">Globex Industries</h4>
                     <p className="text-xs text-muted-foreground">Enterprise Plan</p>
                   </div>
                </div>
                <div className="text-right">
                   <p className="font-display font-bold text-xl tabular-nums">₹4,200<span className="text-sm text-muted-foreground font-sans font-medium">/mo</span></p>
                   <p className="text-[10px] text-status-success-fg font-bold uppercase tracking-wider">Active</p>
                </div>
             </div>
             <div className="p-6 bg-background">
                <div className="relative pl-6 space-y-6 before:absolute before:inset-y-2 before:left-2.5 before:w-px before:bg-border">
                  <div className="relative">
                     <div className="absolute -left-6 mt-1 w-2 h-2 bg-background border-2 border-status-success-fg rounded-none" />
                     <p className="text-sm font-semibold">Invoice Paid: INV-2026-04</p>
                     <p className="text-xs text-muted-foreground mt-0.5">Today at 10:42 AM via Stripe</p>
                  </div>
                  <div className="relative">
                     <div className="absolute -left-6 mt-1 w-2 h-2 bg-background border-2 border-brand rounded-none" />
                     <p className="text-sm font-semibold">Plan Upgraded</p>
                     <p className="text-xs text-muted-foreground mt-0.5">Yesterday at 3:15 PM by Jane Doe</p>
                  </div>
                </div>
             </div>
          </div>
        }
      />

      <FeatureSplit
        reversed
        bgClass="bg-background"
        title="Marketing & Analytics"
        headline="Actionable insights that drive actual campaigns."
        description="Stop exporting CSVs between your analytics and marketing tools. Nexus lets you build dynamic segments based on real-time product usage and billing data, triggering targeted email campaigns instantly."
        visual={
          <div className="border border-border shadow-xl flex flex-col bg-background">
             <div className="flex items-center justify-between px-5 py-4 border-b border-border bg-card">
                <h4 className="font-display font-bold text-sm">Campaign Builder</h4>
                <Button variant="outline" size="sm" className="h-7 text-xs rounded-sm bg-transparent">Edit Segment</Button>
             </div>
             
             <div className="p-5 border-b border-border">
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-3">Audience Criteria</p>
                <div className="flex flex-wrap gap-2 items-center mb-4">
                   <span className="px-2 py-1 bg-muted/20 border border-border text-[11px] font-semibold">Plan = Professional</span>
                   <span className="text-muted-foreground text-[10px] font-bold uppercase tracking-wider">AND</span>
                   <span className="px-2 py-1 bg-muted/20 border border-border text-[11px] font-semibold">Usage &lt; 20%</span>
                   <span className="text-muted-foreground text-[10px] font-bold uppercase tracking-wider">AND</span>
                   <span className="px-2 py-1 bg-status-warning-bg/30 border border-status-warning-border text-status-warning-fg text-[11px] font-semibold">Renewal &lt; 30 Days</span>
                </div>
                <div className="flex items-center gap-2">
                   <div className="w-1.5 h-1.5 bg-brand rounded-none" />
                   <p className="text-xs font-bold text-foreground tabular-nums">412 Users Matched</p>
                </div>
             </div>
             
             <div className="p-5 bg-muted/10">
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-3">Trigger Action</p>
                <div className="flex items-center gap-3 bg-background p-3 border border-border">
                   <Global size="18" className="text-brand-text" />
                   <div>
                      <p className="text-sm font-semibold">Send Email: Q3 Feature Highlight</p>
                      <p className="text-xs text-muted-foreground mt-0.5">Deliver immediately upon match.</p>
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
    <Section id="ai-agent" className="relative bg-muted/40 dark:bg-white/[0.035] border-b border-border overflow-hidden">
      <Container>
        <div className="text-center max-w-3xl mx-auto mb-16 lg:mb-24">
          <h2 className="text-brand-text font-semibold tracking-wider uppercase text-[11px] mb-6">The AI Business Agent</h2>
          <h2 className="font-display text-page-sm md:text-page font-bold text-balance mb-6 tracking-tight">
            An operator, not just a chatbot.
          </h2>
          <p className="text-lg text-muted-foreground text-pretty max-w-2xl mx-auto">
            The Nexus AI Agent has secure, semantic access to your entire business graph. It doesn&apos;t just answer questions—it identifies operational bottlenecks, drafts communications, and prepares workflows for your approval.
          </p>
        </div>

        {/* Architectural Workflow Container */}
        <div className="max-w-4xl mx-auto border border-border shadow-2xl flex flex-col md:flex-row bg-background">
           
           {/* Left Column: Approval Queue */}
           <div className="md:w-1/3 bg-muted/10 border-b md:border-b-0 md:border-r border-border flex flex-col">
              <div className="p-5 border-b border-border flex items-center justify-between bg-card">
                 <h4 className="font-semibold text-sm flex items-center gap-2 text-foreground">
                    <TaskSquare size="16" className="text-brand-text" />
                    Queue
                 </h4>
                 <span className="text-[10px] font-mono px-1.5 py-0.5 bg-background border border-border text-muted-foreground font-medium uppercase tracking-wider">2 Pending</span>
              </div>
              
              <div className="flex-1 flex flex-col p-4 gap-2">
                 {/* Selected / Active Item */}
                 <div className="bg-background border border-border p-4 shadow-sm cursor-pointer relative transition-all">
                    <div className="flex justify-between items-start mb-1.5">
                       <p className="text-sm font-bold text-brand-text">Retention Email</p>
                       <span className="w-1.5 h-1.5 bg-brand mt-1.5" />
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed">Drafted for 42 high-risk accounts.</p>
                 </div>
                 
                 {/* Inactive Item */}
                 <div className="bg-transparent hover:bg-background border border-border/50 hover:border-border p-4 cursor-pointer transition-colors">
                    <div className="flex justify-between items-start mb-1">
                       <p className="text-sm font-semibold text-muted-foreground">Invoice Review</p>
                    </div>
                    <p className="text-xs text-muted-foreground/80 leading-relaxed">Reviewed 14 mismatched payments.</p>
                 </div>
              </div>

              <div className="p-4 border-t border-border bg-background flex items-center gap-2 text-xs text-muted-foreground">
                 <TickCircle size="14" className="text-status-success-fg" />
                 <span className="font-medium text-[11px] uppercase tracking-wider">Zero untrusted actions</span>
              </div>
           </div>
           
           {/* Right Column: Active Workflow Detail */}
           <div className="md:w-2/3 flex flex-col bg-card/30">
              <div className="p-6 lg:p-8 border-b border-border bg-background">
                 <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                    <div>
                       <h3 className="font-display font-bold text-lg text-foreground tracking-tight">Approve Retention Campaign</h3>
                       <p className="text-xs text-muted-foreground mt-1 font-medium">Triggered by Churn Prevention Rule • Q3 Growth</p>
                    </div>
                    <div className="inline-flex items-center gap-1.5 px-2 py-1 text-[10px] font-bold uppercase tracking-wider bg-status-info-bg text-status-info-fg border border-status-info-border self-start sm:self-auto rounded-sm">
                       <span className="w-1 h-1 bg-status-info-fg animate-pulse" />
                       <span>Awaiting</span>
                    </div>
                 </div>
              </div>
              
              <div className="flex-1 p-6 lg:p-8 flex flex-col gap-6">
                 <p className="text-muted-foreground leading-relaxed text-sm">
                   Based on your instruction to <span className="text-foreground font-bold">&quot;reduce churn for Q3&quot;</span>, I analyzed usage signals and generated a personalized re-engagement email for accounts renewing in under 30 days.
                 </p>
                 
                 {/* Email Preview Clean Surface */}
                 <div className="pt-6 mt-2 border-t border-border/50">
                    <div className="flex items-center justify-between mb-4">
                       <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Draft Preview</span>
                       <span className="text-[10px] text-brand-text font-bold uppercase tracking-wider">42 Recipients</span>
                    </div>
                    <div className="pl-4 border-l border-border/50">
                       <p className="font-semibold text-foreground text-sm mb-3">Subject: Optimizing your workflow for Q3</p>
                       <p className="text-muted-foreground text-sm leading-relaxed font-sans">
                         Hi [First Name],<br/><br/>
                         I noticed your team hasn&apos;t been utilizing the new analytics dashboard. I&apos;d love to jump on a quick 15-minute call to show you how it can streamline your reporting before your upcoming renewal.<br/><br/>
                         Are you available next Tuesday?
                       </p>
                    </div>
                 </div>
                 
                 <div className="flex flex-wrap items-center gap-3 pt-2">
                    <Button variant="primary" className="px-6 h-9 text-xs rounded-sm">Approve & Execute</Button>
                    <Button variant="outline" className="h-9 text-xs rounded-sm bg-background">Edit Copy</Button>
                    <Button variant="ghost" className="text-muted-foreground hover:text-status-danger-fg transition-colors h-9 text-xs rounded-sm">Reject</Button>
                 </div>
              </div>
           </div>
        </div>
      </Container>
    </Section>
  );
}

function ValueProps() {
  return (
    <Section className="bg-background border-b border-border">
      <Container>
        <div className="text-center max-w-2xl mx-auto mb-16 lg:mb-24">
          <h2 className="font-display text-page-sm md:text-page font-bold mb-4 tracking-tight">Engineered for modern operations</h2>
          <p className="text-lg text-muted-foreground">A robust, scalable architecture replacing disjointed software with a single unified schema.</p>
        </div>
        
        {/* Architectural 3-column split, no floating cards */}
        <div className="grid md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-border border-y border-border">
          <div className="p-8 lg:p-12 flex flex-col hover:bg-muted/10 transition-colors">
            <div className="w-10 h-10 bg-muted/20 border border-border flex items-center justify-center mb-6">
              <Global size="20" className="text-foreground" />
            </div>
            <h3 className="font-display text-lg font-bold mb-3 tracking-tight">Unified Schema</h3>
            <p className="text-muted-foreground text-sm leading-relaxed">Customers, billing, and events share the same database. Eliminate costly integrations and fragile sync scripts.</p>
          </div>
          <div className="p-8 lg:p-12 flex flex-col hover:bg-muted/10 transition-colors">
            <div className="w-10 h-10 bg-brand/10 border border-brand/20 flex items-center justify-center mb-6">
              <TaskSquare size="20" className="text-brand-text" />
            </div>
            <h3 className="font-display text-lg font-bold mb-3 tracking-tight">Idempotent Workflows</h3>
            <p className="text-muted-foreground text-sm leading-relaxed">Engineered for reliability. Automated actions are strictly verified, preventing double-billing or duplicate emails.</p>
          </div>
          <div className="p-8 lg:p-12 flex flex-col hover:bg-muted/10 transition-colors">
            <div className="w-10 h-10 bg-muted/20 border border-border flex items-center justify-center mb-6">
              <SecurityUser size="20" className="text-foreground" />
            </div>
            <h3 className="font-display text-lg font-bold mb-3 tracking-tight">Strict Isolation</h3>
            <p className="text-muted-foreground text-sm leading-relaxed">Built on a secure, single-tenant data model with robust Row Level Security enforcing explicit data ownership.</p>
          </div>
        </div>
      </Container>
    </Section>
  );
}

function CTA() {
  return (
    <Section id="get-started" className="bg-brand/5 dark:bg-brand/10">
      <Container>
        <div className="text-center max-w-4xl mx-auto flex flex-col items-center">
          <h2 className="font-display text-page md:text-display-sm font-bold mb-6 text-balance text-foreground tracking-tight">
            Run your business on a better foundation.
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-10 text-pretty">
            Consolidate your stack. Automate your operations. Empower your team with an intelligent operating system built for the modern web.
          </p>
          <div className="flex flex-col sm:flex-row justify-center items-center gap-4 w-full sm:w-auto">
             <Button variant="primary" size="lg" className="w-full sm:w-auto px-10 rounded-sm">
               Get started
             </Button>
             <Button variant="outline" size="lg" className="w-full sm:w-auto px-10 rounded-sm bg-background">
               Explore platform
             </Button>
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
              <div className="w-6 h-6 bg-brand flex items-center justify-center">
                <span className="text-brand-foreground font-display font-bold text-sm leading-none">N</span>
              </div>
              <span className="font-display font-bold text-lg tracking-tight">Nexus</span>
            </Link>
            <p className="text-sm text-muted-foreground max-w-xs leading-relaxed">
              The AI-powered business operating platform. Build, manage, and scale your company in one place.
            </p>
          </div>
          <div>
            <h4 className="font-bold mb-4 text-[11px] uppercase tracking-wider text-foreground">Platform</h4>
            <ul className="space-y-3 text-sm text-muted-foreground font-medium">
              <li><Link href="#product" className="hover:text-foreground transition-colors">Features</Link></li>
              <li><Link href="#ai-agent" className="hover:text-foreground transition-colors">AI Agent</Link></li>
              <li><Link href="#" className="hover:text-foreground transition-colors">Security</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="font-bold mb-4 text-[11px] uppercase tracking-wider text-foreground">Company</h4>
            <ul className="space-y-3 text-sm text-muted-foreground font-medium">
              <li><Link href="#" className="hover:text-foreground transition-colors">About</Link></li>
              <li><Link href="#" className="hover:text-foreground transition-colors">Blog</Link></li>
              <li><Link href="#" className="hover:text-foreground transition-colors">Careers</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="font-bold mb-4 text-[11px] uppercase tracking-wider text-foreground">Legal</h4>
            <ul className="space-y-3 text-sm text-muted-foreground font-medium">
              <li><Link href="#" className="hover:text-foreground transition-colors">Privacy Policy</Link></li>
              <li><Link href="#" className="hover:text-foreground transition-colors">Terms of Service</Link></li>
            </ul>
          </div>
        </div>
        <div className="pt-8 border-t border-border flex flex-col md:flex-row justify-between items-center gap-4 text-xs font-medium text-muted-foreground uppercase tracking-wider">
          <p>© 2026 Nexus Platform Inc.</p>
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

export default async function LandingPage() {
  "use cache";
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
