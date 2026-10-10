import * as React from "react";
import { Button } from "@/components/ui/button";
import { VideoPlay, Add, Calendar, User, ArrowRight } from "iconsax-react";

export default function WebinarsPage() {
  const webinars = [
    {
      id: "w-1",
      title: "Scaling SaaS Operations with Autonomous Agents",
      date: "18 Oct 2026 • 18:00 IST",
      attendees: "340 Registered",
      status: "Upcoming",
      speaker: "Founder & Product Lead",
    },
    {
      id: "w-2",
      title: "Building Compliant Multi-Tenant Systems with Supabase",
      date: "04 Oct 2026 • 17:00 IST",
      attendees: "512 Attended",
      status: "Recording Ready",
      speaker: "Lead Infrastructure Architect",
    },
  ];

  return (
    <main className="p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-border/40">
        <div>
          <div className="flex items-center gap-2.5 mb-1">
            <div className="w-8 h-8 rounded-sm bg-brand-subtle flex items-center justify-center text-brand-text">
              <VideoPlay size="20" />
            </div>
            <h1 className="font-display text-page-sm md:text-page font-bold tracking-tight text-foreground">
              Webinar Management
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Host interactive workshops, capture attendee leads directly into CRM, and automate post-session follow-ups
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button variant="primary" size="md" className="gap-2 cursor-pointer shadow-sm">
            <Add size="16" className="text-brand-foreground" />
            <span>Schedule Webinar</span>
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {webinars.map((w) => (
          <div key={w.id} className="p-5 bg-card/70 border border-border/40 rounded-sm space-y-4 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-mono text-muted-foreground flex items-center gap-1">
                  <Calendar size="12" />
                  <span>{w.date}</span>
                </span>
                <span
                  className={`px-2 py-0.5 rounded-sm text-[10px] font-semibold ${
                    w.status === "Upcoming" ? "bg-brand-subtle text-brand-text" : "bg-muted text-muted-foreground"
                  }`}
                >
                  {w.status}
                </span>
              </div>
              <h3 className="font-display text-base font-bold text-foreground">{w.title}</h3>
              <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                <User size="12" />
                <span>Hosted by {w.speaker}</span>
              </p>
            </div>

            <div className="pt-3 border-t border-border/20 flex items-center justify-between text-xs">
              <span className="font-mono text-muted-foreground">{w.attendees}</span>
              <Button variant="outline" size="sm" className="h-7 text-xs gap-1 cursor-pointer bg-card">
                <span>Manage Event</span>
                <ArrowRight size="12" />
              </Button>
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
