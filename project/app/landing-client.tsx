"use client";

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
import { motion } from "framer-motion";
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
    <motion.nav 
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      className="sticky top-0 z-50 w-full border-b border-border bg-background/80 backdrop-blur-md"
    >
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
    </motion.nav>
  );
}

function Hero() {
  return (
    <Section className="relative bg-background pt-16 pb-20 lg:pt-28 lg:pb-32 overflow-hidden border-b border-border">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,var(--brand-subtle)_0%,transparent_50%)] opacity-30 pointer-events-none" />
      <Container className="relative z-10">
        <div className="grid lg:grid-cols-12 gap-12 lg:gap-8 items-center">
          
          {/* Left Column: Text & CTA */}
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            className="lg:col-span-5 flex flex-col items-start text-left"
          >
            <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl font-bold text-foreground leading-[1.08] tracking-tight mb-6">
              Your entire business.<br />
              <span className="text-brand-text">Working as one.</span>
            </h1>
            <p className="text-lg text-muted-foreground leading-relaxed mb-8 max-w-xl">
              Connect your customer records, billing, marketing campaigns, and autonomous AI workflows into a single workspace. No silos. No manual sync.
            </p>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full sm:w-auto mb-8">
              <Button size="lg" variant="primary" asChild className="px-8 h-12 text-base font-semibold shadow-md hover:-translate-y-0.5 transition-transform">
                <Link href="/signup">Get started free</Link>
              </Button>
              <Button size="lg" variant="outline" asChild className="px-6 h-12 text-base font-semibold group bg-background hover:bg-muted transition-colors">
                <Link href="/login">
                  Sign in <ArrowRight size="18" className="ml-2 group-hover:translate-x-1 transition-transform" />
                </Link>
              </Button>
            </div>
            <div className="flex items-center gap-6 text-xs text-muted-foreground font-medium pt-2 border-t border-border/50 w-full">
              <span className="flex items-center gap-1.5">
                <TickCircle size="14" className="text-brand-text" /> Single-tenant security
              </span>
              <span className="flex items-center gap-1.5">
                <TickCircle size="14" className="text-brand-text" /> Real-time sync
              </span>
            </div>
          </motion.div>

          {/* Right Column: Interactive App Design */}
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.7, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="lg:col-span-7 relative"
          >
            <div className="relative rounded-xl border border-border bg-card shadow-2xl overflow-hidden flex flex-col group hover:border-border-strong transition-colors duration-300">
              {/* App Header */}
              <div className="h-11 border-b border-border bg-background flex items-center px-4 justify-between relative z-10">
                <div className="flex items-center gap-3">
                  <div className="w-5 h-5 rounded-sm bg-brand/10 text-brand-text flex items-center justify-center font-display font-bold text-[11px]">N</div>
                  <div className="font-semibold text-xs tracking-tight text-foreground">Acme Workspace</div>
                  <div className="h-3 w-px bg-border mx-1 hidden sm:block" />
                  <div className="text-[11px] text-muted-foreground gap-3 hidden sm:flex">
                    <span className="text-foreground font-semibold">Overview</span>
                    <span>CRM</span>
                    <span>Billing</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="px-2 py-0.5 rounded-sm bg-muted text-[10px] text-muted-foreground font-medium hidden sm:block">
                    Live
                  </div>
                  <div className="w-5 h-5 rounded-sm bg-secondary border border-border flex items-center justify-center">
                    <SecurityUser size="12" className="text-foreground" />
                  </div>
                </div>
              </div>
              
              {/* Main App Canvas */}
              <div className="flex-1 grid grid-cols-1 md:grid-cols-12 bg-background relative z-10">
                {/* Left Panel - Metrics & Table */}
                <div className="md:col-span-7 flex flex-col border-r border-border">
                  <div className="grid grid-cols-2 divide-x divide-border border-b border-border bg-card/60">
                    <div className="p-3.5 flex flex-col gap-0.5">
                      <p className="text-[9px] font-semibold uppercase text-muted-foreground tracking-wider">Revenue (MRR)</p>
                      <p className="font-display text-lg font-bold tabular-nums text-foreground">₹1,24,500</p>
                      <p className="text-[9px] text-status-success-fg flex items-center gap-0.5 font-medium">
                        <ArrowRight size="9" className="-rotate-45" /> +14.2%
                      </p>
                    </div>
                    <div className="p-3.5 flex flex-col gap-0.5">
                      <p className="text-[9px] font-semibold uppercase text-muted-foreground tracking-wider">Active Accounts</p>
                      <p className="font-display text-lg font-bold tabular-nums text-foreground">1,842</p>
                      <p className="text-[9px] text-status-success-fg flex items-center gap-0.5 font-medium">
                        <ArrowRight size="9" className="-rotate-45" /> +22
                      </p>
                    </div>
                  </div>

                  <div className="flex-1 flex flex-col bg-background">
                    <div className="flex items-center px-4 py-1.5 border-b border-border text-[9px] font-semibold text-muted-foreground uppercase tracking-wider bg-muted/20">
                      <div className="w-6/12">Customer</div>
                      <div className="w-3/12">Status</div>
                      <div className="w-3/12 text-right">MRR</div>
                    </div>
                    <div className="flex flex-col">
                      {[
                        { name: "Globex Corp", status: "Active", amount: "₹4,200", sColor: "status-success" },
                        { name: "Initech", status: "Renewal", amount: "₹1,850", sColor: "status-warning" },
                        { name: "Soylent Corp", status: "Active", amount: "₹9,500", sColor: "status-success" }
                      ].map((row, i) => (
                        <div key={i} className="flex items-center px-4 py-2.5 text-xs border-b border-border/40 hover:bg-muted/20 transition-colors">
                          <div className="w-6/12 font-medium text-foreground truncate pr-2">{row.name}</div>
                          <div className="w-3/12 flex">
                            <span className={`px-1.5 py-0.5 text-[9px] font-semibold bg-${row.sColor}-bg text-${row.sColor}-fg border border-${row.sColor}-border rounded-xs uppercase tracking-wider`}>
                              {row.status}
                            </span>
                          </div>
                          <div className="w-3/12 text-right tabular-nums text-muted-foreground font-medium">{row.amount}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
                
                {/* Right Panel - AI Workflow Context */}
                <div className="md:col-span-5 bg-muted/5 flex flex-col">
                  <div className="flex items-center gap-2 text-[10px] uppercase tracking-wider font-semibold border-b border-border px-3.5 py-2.5 bg-card/40 text-foreground">
                    <Magicpen size="13" className="text-brand-text" />
                    AI Workflow
                  </div>
                  
                  <div className="p-3.5 flex flex-col gap-4">
                    <div>
                      <div className="flex items-center gap-1 mb-1">
                        <InfoCircle size="12" className="text-status-info-fg" />
                        <span className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">Churn Alert</span>
                      </div>
                      <p className="text-xs text-foreground font-medium leading-relaxed">Usage dropped 40% for <span className="font-bold">Initech</span>.</p>
                    </div>
                    
                    <div className="pt-2 border-t border-border/50">
                      <p className="text-[9px] font-bold uppercase text-brand-text tracking-wider mb-1.5">Action Proposed</p>
                      <p className="text-[11px] text-muted-foreground font-medium mb-3 leading-snug">Draft check-in with priority support offer.</p>
                      <Button variant="brand" size="sm" className="w-full text-[10px] h-6 font-semibold">
                        Approve & Execute
                      </Button>
                    </div>
                    
                    <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground pt-1 border-t border-border/50">
                      <TickCircle size="12" className="text-status-success-fg" />
                      <span>Invoice #INV-2026 reconciled</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>

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
          <motion.div 
            initial={{ opacity: 0, x: reversed ? 40 : -40 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            className={reversed ? 'ltr' : ''}
          >
            <h2 className="text-brand-text font-semibold tracking-wider uppercase text-[11px] mb-4">{title}</h2>
            <h3 className="font-display text-page-sm md:text-page font-bold text-balance mb-6 tracking-tight">
              {headline}
            </h3>
            <p className="text-lg text-muted-foreground text-pretty mb-8">
              {description}
            </p>
          </motion.div>
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            whileInView={{ opacity: 1, scale: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.8, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className={`relative ${reversed ? 'ltr' : ''}`}
          >
            {visual}
          </motion.div>
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
          <div className="bg-card border border-border shadow-xl p-0 flex flex-col group relative overflow-hidden">
             {/* Magic UI Border Beam effect */}
             <div className="absolute inset-0 bg-gradient-to-tr from-brand/0 via-brand/20 to-brand/0 opacity-0 group-hover:opacity-100 transition-opacity duration-1000" style={{ backgroundSize: '200% 200%', animation: 'moveBg 5s ease infinite' }} />
             
             <div className="flex items-center justify-between border-b border-border px-6 py-5 bg-background relative z-10">
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
             <div className="p-6 bg-background relative z-10">
                <div className="relative pl-6 space-y-6 before:absolute before:inset-y-2 before:left-2.5 before:w-px before:bg-border">
                  <motion.div initial={{ x: -10, opacity: 0 }} whileInView={{ x: 0, opacity: 1 }} transition={{ delay: 0.3 }} className="relative">
                     <div className="absolute -left-6 mt-1 w-2 h-2 bg-background border-2 border-status-success-fg rounded-none" />
                     <p className="text-sm font-semibold">Invoice Paid: INV-2026-04</p>
                     <p className="text-xs text-muted-foreground mt-0.5">Today at 10:42 AM via Stripe</p>
                  </motion.div>
                  <motion.div initial={{ x: -10, opacity: 0 }} whileInView={{ x: 0, opacity: 1 }} transition={{ delay: 0.5 }} className="relative">
                     <div className="absolute -left-6 mt-1 w-2 h-2 bg-background border-2 border-brand rounded-none" />
                     <p className="text-sm font-semibold">Plan Upgraded</p>
                     <p className="text-xs text-muted-foreground mt-0.5">Yesterday at 3:15 PM by Jane Doe</p>
                  </motion.div>
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
          <div className="border border-border shadow-xl flex flex-col bg-background hover:-translate-y-1 transition-transform duration-500">
             <div className="flex items-center justify-between px-5 py-4 border-b border-border bg-card">
                <h4 className="font-display font-bold text-sm">Campaign Builder</h4>
                <Button variant="outline" size="sm" className="h-7 text-xs rounded-sm bg-transparent">Edit Segment</Button>
             </div>
             
             <div className="p-5 border-b border-border">
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-3">Audience Criteria</p>
                <div className="flex flex-wrap gap-2 items-center mb-4">
                   <motion.span initial={{ scale: 0.9 }} whileInView={{ scale: 1 }} className="px-2 py-1 bg-muted/20 border border-border text-[11px] font-semibold">Plan = Professional</motion.span>
                   <span className="text-muted-foreground text-[10px] font-bold uppercase tracking-wider">AND</span>
                   <motion.span initial={{ scale: 0.9 }} whileInView={{ scale: 1 }} transition={{ delay: 0.1 }} className="px-2 py-1 bg-muted/20 border border-border text-[11px] font-semibold">Usage &lt; 20%</motion.span>
                   <span className="text-muted-foreground text-[10px] font-bold uppercase tracking-wider">AND</span>
                   <motion.span initial={{ scale: 0.9 }} whileInView={{ scale: 1 }} transition={{ delay: 0.2 }} className="px-2 py-1 bg-status-warning-bg/30 border border-status-warning-border text-status-warning-fg text-[11px] font-semibold">Renewal &lt; 30 Days</motion.span>
                </div>
                <div className="flex items-center gap-2">
                   <motion.div animate={{ scale: [1, 1.2, 1] }} transition={{ repeat: Infinity, duration: 2 }} className="w-1.5 h-1.5 bg-brand rounded-none" />
                   <p className="text-xs font-bold text-foreground tabular-nums">412 Users Matched</p>
                </div>
             </div>
             
             <div className="p-5 bg-muted/10">
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-3">Trigger Action</p>
                <div className="flex items-center gap-3 bg-background p-3 border border-border group">
                   <Global size="18" className="text-brand-text group-hover:rotate-12 transition-transform" />
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
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,var(--brand-subtle)_0%,transparent_50%)] opacity-20 pointer-events-none" />
      <Container>
        <motion.div 
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="text-center max-w-3xl mx-auto mb-16 lg:mb-24 relative z-10"
        >
          <h2 className="text-brand-text font-semibold tracking-wider uppercase text-[11px] mb-6">The AI Business Agent</h2>
          <h2 className="font-display text-page-sm md:text-page font-bold text-balance mb-6 tracking-tight">
            An operator, not just a chatbot.
          </h2>
          <p className="text-lg text-muted-foreground text-pretty max-w-2xl mx-auto">
            The Nexus AI Agent has secure, semantic access to your entire business graph. It doesn&apos;t just answer questions—it identifies operational bottlenecks, drafts communications, and prepares workflows for your approval.
          </p>
        </motion.div>

        {/* Architectural Workflow Container */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="max-w-4xl mx-auto border border-border shadow-2xl flex flex-col md:flex-row bg-background relative z-10"
        >
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
                 <div className="bg-background border border-border p-4 shadow-sm cursor-pointer relative transition-all">
                    <div className="flex justify-between items-start mb-1.5">
                       <p className="text-sm font-bold text-brand-text">Retention Email</p>
                       <motion.span animate={{ opacity: [1, 0.4, 1] }} transition={{ repeat: Infinity, duration: 1.5 }} className="w-1.5 h-1.5 bg-brand mt-1.5" />
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed">Drafted for 42 high-risk accounts.</p>
                 </div>
                 
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
                       <motion.span animate={{ opacity: [1, 0.2, 1] }} transition={{ repeat: Infinity, duration: 1.5 }} className="w-1 h-1 bg-status-info-fg" />
                       <span>Awaiting</span>
                    </div>
                 </div>
              </div>
              
              <div className="flex-1 p-6 lg:p-8 flex flex-col gap-6">
                 <p className="text-muted-foreground leading-relaxed text-sm">
                   Based on your instruction to <span className="text-foreground font-bold">&quot;reduce churn for Q3&quot;</span>, I analyzed usage signals and generated a personalized re-engagement email for accounts renewing in under 30 days.
                 </p>
                 
                 <motion.div 
                   initial={{ opacity: 0, y: 10 }}
                   whileInView={{ opacity: 1, y: 0 }}
                   transition={{ delay: 0.4 }}
                   className="pt-6 mt-2 border-t border-border/50"
                 >
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
                 </motion.div>
                 
                 <div className="flex flex-wrap items-center gap-3 pt-2">
                    <Button variant="primary" className="px-6 h-9 text-xs rounded-sm hover:scale-105 transition-transform">Approve & Execute</Button>
                    <Button variant="outline" className="h-9 text-xs rounded-sm bg-background hover:bg-muted transition-colors">Edit Copy</Button>
                    <Button variant="ghost" className="text-muted-foreground hover:text-status-danger-fg transition-colors h-9 text-xs rounded-sm">Reject</Button>
                 </div>
              </div>
           </div>
        </motion.div>
      </Container>
    </Section>
  );
}

function ValueProps() {
  return (
    <Section className="bg-background border-b border-border">
      <Container>
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          className="text-center max-w-2xl mx-auto mb-16 lg:mb-24"
        >
          <h2 className="font-display text-page-sm md:text-page font-bold mb-4 tracking-tight">Engineered for modern operations</h2>
          <p className="text-lg text-muted-foreground">A robust, scalable architecture replacing disjointed software with a single unified schema.</p>
        </motion.div>
        
        <div className="grid md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-border border-y border-border">
          {[
            {
              icon: <Global size="20" className="text-foreground" />,
              title: "Unified Schema",
              desc: "Customers, billing, and events share the same database. Eliminate costly integrations and fragile sync scripts."
            },
            {
              icon: <TaskSquare size="20" className="text-brand-text" />,
              title: "Idempotent Workflows",
              desc: "Engineered for reliability. Automated actions are strictly verified, preventing double-billing or duplicate emails.",
              highlight: true
            },
            {
              icon: <SecurityUser size="20" className="text-foreground" />,
              title: "Strict Isolation",
              desc: "Built on a secure, single-tenant data model with robust Row Level Security enforcing explicit data ownership."
            }
          ].map((item, idx) => (
            <motion.div 
              key={idx}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 0.5, delay: idx * 0.1 }}
              className="p-8 lg:p-12 flex flex-col hover:bg-muted/10 transition-colors group"
            >
              <div className={`w-10 h-10 border flex items-center justify-center mb-6 transition-transform group-hover:scale-110 ${item.highlight ? 'bg-brand/10 border-brand/20' : 'bg-muted/20 border-border'}`}>
                {item.icon}
              </div>
              <h3 className="font-display text-lg font-bold mb-3 tracking-tight">{item.title}</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">{item.desc}</p>
            </motion.div>
          ))}
        </div>
      </Container>
    </Section>
  );
}

function CTA() {
  return (
    <Section id="get-started" className="bg-brand/5 dark:bg-brand/10 relative overflow-hidden border-b border-border">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,var(--brand-subtle)_0%,transparent_70%)] opacity-30 pointer-events-none" />
      <Container className="relative z-10">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, type: "spring" }}
          className="text-center max-w-4xl mx-auto flex flex-col items-center"
        >
          <h2 className="font-display text-page md:text-display-sm font-bold mb-6 text-balance text-foreground tracking-tight">
            Run your business on a better foundation.
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-10 text-pretty">
            Consolidate your stack. Automate your operations. Empower your team with an intelligent operating system built for the modern web.
          </p>
          <div className="flex flex-col sm:flex-row justify-center items-center gap-4 w-full sm:w-auto">
             <Button variant="primary" size="lg" className="w-full sm:w-auto px-10 rounded-sm hover:scale-105 transition-transform shadow-[0_0_20px_var(--brand-subtle)]">
               Get started
             </Button>
             <Button variant="outline" size="lg" className="w-full sm:w-auto px-10 rounded-sm bg-background hover:bg-muted transition-colors">
               Explore platform
             </Button>
          </div>
        </motion.div>
      </Container>
    </Section>
  );
}

function Footer() {
  return (
    <footer className="bg-background border-t border-border py-12 relative z-10">
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

export function LandingClient() {
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
