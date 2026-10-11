"use client";

import * as React from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  CustomerJourneyMap,
  JourneyMapStage,
  NexusTelemetry,
} from "@/lib/validations/journey-map";
import {
  TrendUp,
  Danger,
  Flash,
  ArrowRight,
  TickCircle,
  Global,
  VideoPlay,
  Card as CardIcon,
  DirectSend,
  SecurityUser,
  Magicpen,
  Refresh,
  Edit2,
  Trash,
  Add,
  CloseCircle,
  ArrowDown2,
} from "iconsax-react";

interface IntelligenceClientProps {
  initialJourneyMaps: CustomerJourneyMap[];
  initialTelemetry: NexusTelemetry;
  user?: {
    username: string;
    email?: string;
    workspaceName?: string;
  };
}

export default function IntelligenceClient({
  initialJourneyMaps,
  initialTelemetry,
}: IntelligenceClientProps) {
  const [maps, setMaps] = React.useState<CustomerJourneyMap[]>(initialJourneyMaps);
  const [selectedMapId, setSelectedMapId] = React.useState<string>(
    initialJourneyMaps[0]?.id || ""
  );

  const currentMap = maps.find((m) => m.id === selectedMapId) || maps[0] || null;
  const [selectedStageId, setSelectedStageId] = React.useState<string | null>(
    currentMap?.stages[0]?.id || null
  );

  // New Journey Creation Dialog
  const [showCreateModal, setShowCreateModal] = React.useState(false);
  const [objectiveInput, setObjectiveInput] = React.useState("");
  const [generating, setGenerating] = React.useState(false);

  // Stage Editing State
  const [isEditingStage, setIsEditingStage] = React.useState(false);
  const [editStageName, setEditStageName] = React.useState("");
  const [editObjective, setEditObjective] = React.useState("");
  const [actionProcessingId, setActionProcessingId] = React.useState<string | null>(null);

  const activeStage =
    currentMap?.stages.find((s) => s.id === selectedStageId) ||
    currentMap?.stages[0] ||
    null;

  // Simple, practical goal suggestions for quick start
  const quickGoals = [
    {
      title: "Increase Website Signups",
      prompt: "I want to convert more website visitors into trial signups.",
    },
    {
      title: "Onboard New Users",
      prompt: "Help me onboard new customers and guide them to their first success in 5 minutes.",
    },
    {
      title: "Win Back Inactive Users",
      prompt: "Reduce customer churn and retain inactive subscribers before cancellation.",
    },
  ];

  // Stage selection
  const handleSelectStage = (stageId: string) => {
    setSelectedStageId(stageId);
    setIsEditingStage(false);
  };

  // Switch map
  const handleSelectMap = (id: string) => {
    setSelectedMapId(id);
    const target = maps.find((m) => m.id === id);
    if (target?.stages[0]) {
      setSelectedStageId(target.stages[0].id);
    }
    setIsEditingStage(false);
  };

  // Generate new journey
  const handleGenerateJourney = async (promptText?: string) => {
    const prompt = (promptText || objectiveInput).trim();
    if (!prompt) return;

    setGenerating(true);
    try {
      const res = await fetch("/api/journey-maps/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ objective: prompt }),
      });
      const json = await res.json();
      if (res.ok && json.data) {
        setMaps((prev) => [json.data, ...prev]);
        setSelectedMapId(json.data.id);
        setSelectedStageId(json.data.stages[0]?.id || null);
        setShowCreateModal(false);
        setObjectiveInput("");
      }
    } catch {
      // ignore
    } finally {
      setGenerating(false);
    }
  };

  // Action execution & dispatch
  const handleActionApproval = async (
    mapId: string,
    actionId: string,
    decision: "approve" | "dismiss"
  ) => {
    setActionProcessingId(actionId);
    try {
      const res = await fetch(`/api/journey-maps/${mapId}/actions/${actionId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ decision }),
      });
      const json = await res.json();
      if (res.ok && json.data) {
        setMaps((prev) =>
          prev.map((m) => {
            if (m.id !== mapId) return m;
            return {
              ...m,
              stages: m.stages.map((stg) => ({
                ...stg,
                actions: stg.actions.map((act) =>
                  act.id === actionId
                    ? {
                        ...act,
                        status: json.data.status,
                        executed_at: json.data.executed_at,
                        execution_result: json.data.execution_result,
                      }
                    : act
                ),
              })),
            };
          })
        );
      }
    } catch {
      // ignore
    } finally {
      setActionProcessingId(null);
    }
  };

  // Open inline editor
  const handleOpenEditStage = (stage: JourneyMapStage) => {
    setSelectedStageId(stage.id);
    setEditStageName(stage.stage_name);
    setEditObjective(stage.objective);
    setIsEditingStage(true);
  };

  // Save stage edits
  const handleSaveStageEdits = () => {
    if (!currentMap || !selectedStageId) return;

    setMaps((prev) =>
      prev.map((m) => {
        if (m.id !== currentMap.id) return m;
        return {
          ...m,
          stages: m.stages.map((stg) => {
            if (stg.id !== selectedStageId) return stg;
            return {
              ...stg,
              stage_name: editStageName.trim() || stg.stage_name,
              objective: editObjective.trim() || stg.objective,
            };
          }),
        };
      })
    );
    setIsEditingStage(false);
  };

  // Delete an entire customer journey map
  const [isDeletingMap, setIsDeletingMap] = React.useState(false);

  const handleDeleteJourney = async (mapId: string) => {
    if (!confirm("Are you sure you want to delete this customer journey?")) return;
    setIsDeletingMap(true);
    try {
      await fetch(`/api/journey-maps/${mapId}`, { method: "DELETE" });
      const remaining = maps.filter((m) => m.id !== mapId);
      setMaps(remaining);
      if (remaining.length > 0) {
        setSelectedMapId(remaining[0].id);
        setSelectedStageId(remaining[0].stages[0]?.id || null);
      } else {
        setSelectedMapId("");
        setSelectedStageId(null);
      }
    } catch {
      // ignore
    } finally {
      setIsDeletingMap(false);
      setDropdownOpen(false);
    }
  };

  // Delete a stage
  const handleDeleteStage = (stageId: string) => {
    if (!currentMap || currentMap.stages.length <= 1) return;

    setMaps((prev) =>
      prev.map((m) => {
        if (m.id !== currentMap.id) return m;
        const filtered = m.stages.filter((s) => s.id !== stageId);
        filtered.forEach((s, idx) => {
          s.order_index = idx + 1;
        });
        return { ...m, stages: filtered };
      })
    );
    if (selectedStageId === stageId) {
      setSelectedStageId(currentMap.stages[0]?.id || null);
    }
  };

  // Add a new stage
  const handleAddNewStage = () => {
    if (!currentMap) return;
    const newIdx = currentMap.stages.length + 1;
    const newStageId = `stg-${currentMap.id}-${Date.now()}`;
    const newStage: JourneyMapStage = {
      id: newStageId,
      journey_map_id: currentMap.id,
      order_index: newIdx,
      stage_key: `stage_${newIdx}`,
      stage_name: `New Step ${newIdx}`,
      objective: "Describe what happens at this step",
      customer_actions: ["Customer interacts with the platform"],
      touchpoints: ["Website"],
      customer_needs: ["Clear instructions"],
      customer_thoughts: ["What do I do next?"],
      emotion: "neutral",
      friction_points: ["Where users might get stuck"],
      opportunities: ["How to guide them to the next step"],
      findings_type: "hypothesis",
      actions: [],
    };

    setMaps((prev) =>
      prev.map((m) => {
        if (m.id !== currentMap.id) return m;
        return { ...m, stages: [...m.stages, newStage] };
      })
    );
    setSelectedStageId(newStageId);
    handleOpenEditStage(newStage);
  };

  const getModuleBadge = (mod: string) => {
    switch (mod) {
      case "website":
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-brand">
            <Global size="12" /> Website Studio
          </span>
        );
      case "campaign":
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
            <DirectSend size="12" /> Marketing Campaign
          </span>
        );
      case "webinar":
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-sky-600 dark:text-sky-400">
            <VideoPlay size="12" /> Webinar
          </span>
        );
      case "crm":
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-foreground">
            <SecurityUser size="12" /> CRM Pipeline
          </span>
        );
      default:
        return (
          <span className="text-[11px] text-muted-foreground">
            {mod}
          </span>
        );
    }
  };

  // Custom Dropdown State
  const [dropdownOpen, setDropdownOpen] = React.useState(false);
  const dropdownRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border/40">
        <div>
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="font-display text-2xl font-bold tracking-tight text-foreground">
              Customer Journey
            </h1>

            {/* Custom Designed Dropdown */}
            {maps.length > 0 && (
              <div className="relative inline-block text-left" ref={dropdownRef}>
                <button
                  type="button"
                  onClick={() => setDropdownOpen((prev) => !prev)}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-border/70 bg-card hover:bg-accent text-xs font-medium text-foreground shadow-2xs transition-colors cursor-pointer"
                  aria-haspopup="true"
                  aria-expanded={dropdownOpen}
                >
                  <span className="truncate max-w-[260px]">{currentMap?.title}</span>
                  <ArrowDown2
                    size="13"
                    className={`text-muted-foreground transition-transform duration-200 ${
                      dropdownOpen ? "rotate-180 text-foreground" : ""
                    }`}
                  />
                </button>

                {dropdownOpen && (
                  <div className="absolute left-0 mt-1.5 w-72 rounded-xl bg-popover border border-border shadow-md py-1.5 z-40 focus:outline-hidden animate-in fade-in-50 zoom-in-95 duration-100">
                    <div className="px-3 py-1 text-[10px] font-mono font-bold uppercase tracking-wider text-muted-foreground border-b border-border/40">
                      Switch Active Journey
                    </div>
                    <div className="max-h-60 overflow-y-auto py-1">
                      {maps.map((m) => {
                        const isCurrent = m.id === selectedMapId;
                        return (
                          <div
                            key={m.id}
                            className={`w-full flex items-center justify-between gap-2 px-3 py-2 text-xs transition-colors ${
                              isCurrent
                                ? "bg-accent font-semibold text-foreground"
                                : "text-muted-foreground hover:bg-accent/60 hover:text-foreground"
                            }`}
                          >
                            <button
                              type="button"
                              onClick={() => {
                                handleSelectMap(m.id);
                                setDropdownOpen(false);
                              }}
                              className="flex-1 text-left truncate cursor-pointer flex items-center gap-1.5"
                            >
                              <span className="truncate">{m.title}</span>
                              {isCurrent && (
                                <TickCircle size="14" className="text-brand shrink-0" />
                              )}
                            </button>

                            {/* Delete map from dropdown */}
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteJourney(m.id);
                              }}
                              disabled={isDeletingMap}
                              className="text-muted-foreground hover:text-destructive p-1 rounded transition-colors cursor-pointer shrink-0"
                              title="Delete this journey"
                            >
                              <Trash size="12" />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Direct Delete Current Journey Action Button */}
            {currentMap && (
              <button
                type="button"
                onClick={() => handleDeleteJourney(currentMap.id)}
                disabled={isDeletingMap}
                className="p-1.5 rounded-lg border border-border/60 hover:border-destructive/40 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors cursor-pointer"
                title="Delete active journey"
                aria-label="Delete active journey"
              >
                <Trash size="14" />
              </button>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            See how your visitors turn into paying customers and take action on drop-off points.
          </p>
        </div>

        <Button
          variant="primary"
          size="sm"
          onClick={() => setShowCreateModal(true)}
          className="gap-1.5 text-xs h-8 px-3 rounded-lg shadow-2xs self-start sm:self-auto cursor-pointer"
        >
          <Magicpen size="14" />
          <span>New Journey Plan</span>
        </Button>
      </div>

      {/* Main Stepper / Pipeline View */}
      {currentMap && (
        <div className="space-y-6">
          {/* Stepper Strip */}
          <div className="p-4 rounded-xl bg-card border border-border/60 shadow-2xs">
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-border/30">
              <span className="text-xs font-semibold text-foreground">
                Funnel Steps ({currentMap.stages.length})
              </span>
              <span className="text-[11px] text-muted-foreground">
                Click any step to see details and recommendations
              </span>
            </div>

            {/* Stepper Nodes */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2.5">
              {currentMap.stages.map((stage, idx) => {
                const isSelected = selectedStageId === stage.id;
                const hasActions = stage.actions && stage.actions.length > 0;

                return (
                  <button
                    key={stage.id}
                    type="button"
                    onClick={() => handleSelectStage(stage.id)}
                    className={`text-left p-3 rounded-lg border transition-all cursor-pointer relative ${
                      isSelected
                        ? "border-brand bg-brand/5 ring-1 ring-brand/30 shadow-xs"
                        : "border-border/60 bg-muted/20 hover:bg-muted/40 hover:border-border"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span
                        className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-sm ${
                          isSelected
                            ? "bg-brand text-white"
                            : "bg-muted text-muted-foreground"
                        }`}
                      >
                        {idx + 1}
                      </span>
                      {hasActions && (
                        <span className="w-2 h-2 rounded-full bg-brand" title="Has suggested action" />
                      )}
                    </div>

                    <h2 className="font-display text-xs font-semibold text-foreground line-clamp-1">
                      {stage.stage_name}
                    </h2>

                    <p className="text-[11px] text-muted-foreground line-clamp-1 mt-0.5">
                      {stage.touchpoints[0] || "Website"}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Active Step Details & Actions (2 Columns) */}
          {activeStage && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Step Details (7 Cols) */}
              <div className="lg:col-span-7 p-5 rounded-xl bg-card border border-border/60 shadow-2xs space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-border/30">
                  <div>
                    <span className="text-[10px] font-mono font-bold uppercase text-muted-foreground">
                      Step {activeStage.order_index} of {currentMap.stages.length}
                    </span>
                    <h2 className="font-display text-base font-bold text-foreground">
                      {activeStage.stage_name}
                    </h2>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleOpenEditStage(activeStage)}
                      className="text-xs h-7 px-2.5 rounded-md cursor-pointer"
                    >
                      <Edit2 size="12" />
                      <span>Edit</span>
                    </Button>
                    {currentMap.stages.length > 1 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteStage(activeStage.id)}
                        className="text-xs h-7 px-2 text-destructive hover:bg-destructive/10 rounded-md cursor-pointer"
                        title="Remove step"
                      >
                        <Trash size="12" />
                      </Button>
                    )}
                  </div>
                </div>

                {isEditingStage ? (
                  /* Inline Edit Mode */
                  <div className="space-y-3 pt-1">
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-foreground">
                        Step Name
                      </label>
                      <input
                        type="text"
                        value={editStageName}
                        onChange={(e) => setEditStageName(e.target.value)}
                        className="w-full text-xs bg-background p-2 rounded-md border border-border focus:border-brand focus:outline-hidden"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-medium text-foreground">
                        What happens at this step?
                      </label>
                      <textarea
                        rows={2}
                        value={editObjective}
                        onChange={(e) => setEditObjective(e.target.value)}
                        className="w-full text-xs bg-background p-2 rounded-md border border-border focus:border-brand focus:outline-hidden"
                      />
                    </div>

                    <div className="flex justify-end gap-2 pt-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setIsEditingStage(false)}
                        className="text-xs h-7 rounded-md cursor-pointer"
                      >
                        Cancel
                      </Button>
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={handleSaveStageEdits}
                        className="text-xs h-7 rounded-md cursor-pointer"
                      >
                        Save
                      </Button>
                    </div>
                  </div>
                ) : (
                  /* Standard Step Inspection */
                  <div className="space-y-4 pt-1">
                    <div className="space-y-1">
                      <span className="text-xs font-semibold text-foreground">
                        Customer Objective
                      </span>
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        {activeStage.objective}
                      </p>
                    </div>

                    {/* Bottleneck / Friction */}
                    {activeStage.friction_points.length > 0 && (
                      <div className="p-3.5 rounded-lg bg-destructive/5 border border-destructive/20 space-y-1">
                        <span className="text-xs font-semibold text-destructive flex items-center gap-1.5">
                          <Danger size="13" />
                          <span>Potential Drop-off Reason</span>
                        </span>
                        <p className="text-xs text-foreground/90 leading-relaxed">
                          {activeStage.friction_points[0]}
                        </p>
                      </div>
                    )}

                    {/* Improvement Lever */}
                    {activeStage.opportunities.length > 0 && (
                      <div className="p-3.5 rounded-lg bg-brand/5 border border-brand/20 space-y-1">
                        <span className="text-xs font-semibold text-brand flex items-center gap-1.5">
                          <Flash size="13" />
                          <span>How to Improve Conversion</span>
                        </span>
                        <p className="text-xs text-foreground/90 leading-relaxed">
                          {activeStage.opportunities[0]}
                        </p>
                      </div>
                    )}

                    {/* Touchpoint tags */}
                    <div className="pt-2 flex items-center gap-2 text-xs text-muted-foreground">
                      <span>Touchpoints:</span>
                      <div className="flex flex-wrap gap-1.5">
                        {activeStage.touchpoints.map((tp, i) => (
                          <span
                            key={i}
                            className="px-2 py-0.5 rounded-md bg-muted text-foreground text-[11px]"
                          >
                            {tp}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Connected Recommended Action (5 Cols) */}
              <div className="lg:col-span-5 p-5 rounded-xl bg-card border border-border/60 shadow-2xs space-y-4">
                <div className="pb-3 border-b border-border/30">
                  <h2 className="font-display text-sm font-semibold text-foreground">
                    Recommended Fix
                  </h2>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Actions you can take in Nexus to fix drop-offs at this step.
                  </p>
                </div>

                {activeStage.actions && activeStage.actions.length > 0 ? (
                  <div className="space-y-3">
                    {activeStage.actions.map((act) => {
                      const isApproved = act.status === "APPROVED";
                      const result = act.execution_result;

                      return (
                        <div
                          key={act.id}
                          className="p-4 rounded-lg bg-muted/20 border border-border/60 space-y-3"
                        >
                          <div className="flex items-center justify-between">
                            {getModuleBadge(act.module_target)}
                            {isApproved && (
                              <span className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                                <TickCircle size="12" /> Active
                              </span>
                            )}
                          </div>

                          <div>
                            <h3 className="text-xs font-semibold text-foreground">
                              {act.title}
                            </h3>
                            <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                              {act.description}
                            </p>
                          </div>

                          {/* Approval / Result */}
                          {isApproved && result ? (
                            <div className="p-2.5 rounded-md bg-emerald-500/10 border border-emerald-500/20 text-xs space-y-1">
                              <p className="text-emerald-800 dark:text-emerald-300">
                                {result.message}
                              </p>
                              {result.link && (
                                <Link
                                  href={result.link}
                                  className="inline-flex items-center gap-1 font-semibold text-brand hover:underline"
                                >
                                  <span>
                                    Open in{" "}
                                    {act.module_target === "website"
                                      ? "Website Studio"
                                      : act.module_target === "crm"
                                      ? "Intelligent CRM"
                                      : act.module_target === "campaign"
                                      ? "Marketing Campaigns"
                                      : act.module_target === "webinar"
                                      ? "Webinars"
                                      : "Dashboard"}
                                  </span>
                                  <ArrowRight size="11" />
                                </Link>
                              )}
                            </div>
                          ) : (
                            <Button
                              variant="primary"
                              size="sm"
                              disabled={actionProcessingId === act.id}
                              onClick={() =>
                                handleActionApproval(currentMap.id, act.id, "approve")
                              }
                              className="w-full text-xs h-8 rounded-lg cursor-pointer"
                            >
                              <span>
                                {actionProcessingId === act.id
                                  ? "Applying..."
                                  : "Apply Recommended Action"}
                              </span>
                            </Button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="p-6 text-center text-xs text-muted-foreground bg-muted/20 rounded-lg border border-border/40">
                    <p>No automatic fix configured for this step.</p>
                    <p className="mt-1">
                      You can customize actions directly by editing the step.
                    </p>
                  </div>
                )}

                <div className="pt-2 border-t border-border/30">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleAddNewStage}
                    className="w-full text-xs h-8 rounded-lg gap-1.5 cursor-pointer"
                  >
                    <Add size="14" />
                    <span>Add Another Step</span>
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Empty State when no journeys exist */}
      {!currentMap && (
        <div className="p-8 sm:p-12 rounded-xl bg-card border border-border/60 shadow-2xs text-center space-y-6 max-w-2xl mx-auto my-8 animate-in fade-in-50 duration-200">
          <div className="w-12 h-12 rounded-xl bg-brand/10 text-brand flex items-center justify-center mx-auto shadow-2xs">
            <Magicpen size="24" />
          </div>
          <div className="space-y-2">
            <h2 className="font-display text-lg font-bold text-foreground">
              No Active Customer Journeys
            </h2>
            <p className="text-xs text-muted-foreground leading-relaxed max-w-md mx-auto">
              Create a customer journey map to visualize each step your visitors take, identify conversion drop-offs, and deploy automated fixes.
            </p>
          </div>

          {/* Quick Start Buttons */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-left pt-2">
            {quickGoals.map((g, i) => (
              <button
                key={i}
                type="button"
                onClick={() => handleGenerateJourney(g.prompt)}
                disabled={generating}
                className="p-3.5 rounded-lg border border-border/70 bg-muted/20 hover:bg-brand/5 hover:border-brand/40 text-xs transition cursor-pointer flex flex-col justify-between gap-2"
              >
                <p className="font-semibold text-foreground">{g.title}</p>
                <span className="text-[10px] text-brand font-medium flex items-center gap-1">
                  <span>Start this &rarr;</span>
                </span>
              </button>
            ))}
          </div>

          <div className="pt-2">
            <Button
              variant="primary"
              size="sm"
              onClick={() => setShowCreateModal(true)}
              className="gap-1.5 text-xs h-9 px-4 rounded-lg shadow-xs cursor-pointer"
            >
              <Add size="14" />
              <span>Create Custom Journey</span>
            </Button>
          </div>
        </div>
      )}

      {/* Simplified New Journey Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-xl shadow-lg max-w-lg w-full p-6 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-border/40">
              <h2 className="font-display text-base font-bold text-foreground">
                Create Customer Journey
              </h2>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="text-muted-foreground hover:text-foreground cursor-pointer"
              >
                <CloseCircle size="18" />
              </button>
            </div>

            <p className="text-xs text-muted-foreground">
              Choose a quick goal or describe what you want to improve in plain English.
            </p>

            {/* 3 Quick Goals */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {quickGoals.map((g, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => handleGenerateJourney(g.prompt)}
                  disabled={generating}
                  className="p-3 text-left rounded-lg border border-border/60 bg-muted/20 hover:bg-brand/5 hover:border-brand/40 text-xs transition cursor-pointer"
                >
                  <p className="font-semibold text-foreground">{g.title}</p>
                </button>
              ))}
            </div>

            {/* Custom Prompt */}
            <div className="space-y-2 pt-2">
              <label className="text-xs font-medium text-foreground">
                Or type a custom goal
              </label>
              <textarea
                rows={3}
                value={objectiveInput}
                onChange={(e) => setObjectiveInput(e.target.value)}
                placeholder="e.g. Help me convert webinar attendees into paid consulting clients..."
                className="w-full text-xs bg-background p-3 rounded-lg border border-border focus:border-brand focus:outline-hidden"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowCreateModal(false)}
                className="text-xs h-8 rounded-lg cursor-pointer"
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                disabled={generating || !objectiveInput.trim()}
                onClick={() => handleGenerateJourney()}
                className="text-xs h-8 rounded-lg cursor-pointer gap-1.5"
              >
                {generating ? (
                  <>
                    <Refresh size="14" className="animate-spin" />
                    <span>Generating...</span>
                  </>
                ) : (
                  <>
                    <Magicpen size="14" />
                    <span>Generate Journey</span>
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
