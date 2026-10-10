import { z } from "zod";
import type { LinearRegressionResult } from "../analytics/linear-regression";

/**
 * Data classification: Distinguish verified database observations from statistical models/hypotheses.
 */
export const DataEvidenceTypeSchema = z.enum([
  "OBSERVED_MEASUREMENT",
  "STATISTICAL_HYPOTHESIS",
]);
export type DataEvidenceType = z.infer<typeof DataEvidenceTypeSchema>;

/**
 * Single KPI Metric Card.
 */
export interface MetricCardData {
  id: string;
  label: string;
  value: string;
  rawValue: number;
  unit?: string;
  changeDescription: string;
  trendDirection: "up" | "down" | "neutral";
  evidenceType: DataEvidenceType;
  evidenceSource: string;
  confidenceScore?: number; // 0.0 - 1.0 (for hypotheses)
}

/**
 * Funnel Stage Measurement.
 */
export interface FunnelStageData {
  stageKey: string;
  stageName: string;
  count: number;
  conversionPct: number;
  dropoffPct: number;
  evidenceType: DataEvidenceType;
  provenance: string;
}

/**
 * Marketing Channel Breakdown.
 */
export interface ChannelBreakdownData {
  channel: string;
  label: string;
  leadsCount: number;
  customersCount: number;
  conversionRate: number;
  revenueInr: number;
  evidenceType: DataEvidenceType;
}

/**
 * Remotion-style Video Briefing Scene.
 */
export interface VideoSceneData {
  id: string;
  title: string;
  subtitle: string;
  highlightValue: string;
  highlightLabel: string;
  insight: string;
  evidenceBadge: string;
  durationFrames: number; // e.g. 90 frames = 3 seconds at 30fps
}

/**
 * Unified Analytics Dashboard Payload.
 */
export interface AnalyticsDashboardPayload {
  lastUpdated: string;
  businessId: string;
  summaryMetrics: MetricCardData[];
  leadAcquisitionModel: LinearRegressionResult;
  revenueForecastModel: LinearRegressionResult;
  funnelStages: FunnelStageData[];
  channelPerformance: ChannelBreakdownData[];
  executiveVideoBriefing: {
    totalDurationSeconds: number;
    fps: number;
    totalFrames: number;
    scenes: VideoSceneData[];
  };
}
