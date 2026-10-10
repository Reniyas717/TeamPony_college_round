import test from "node:test";
import assert from "node:assert/strict";
import { computeLinearRegression } from "../lib/analytics/linear-regression";
import {
  DataEvidenceTypeSchema,
  AnalyticsDashboardPayload,
} from "../lib/validations/analytics";
import { AnalyticsService } from "../services/analytics.service";

test("Nexus Machine Learning & Integrated Analytics Intelligence Suite", async (t) => {
  const testBusinessId = "00000000-0000-0000-0000-000000000001";

  await t.test("1. computeLinearRegression handles empty or minimal data gracefully", () => {
    const emptyResult = computeLinearRegression([], 7);
    assert.strictEqual(emptyResult.points.length, 0);
    assert.strictEqual(emptyResult.slope, 0);
    assert.strictEqual(emptyResult.rSquared, 0);

    const singleResult = computeLinearRegression([{ x: 1, y: 10, label: "Day 1" }], 3);
    assert.strictEqual(singleResult.points.length, 4); // 1 historical + 3 projected
    assert.strictEqual(singleResult.slope, 0);
  });

  await t.test("2. computeLinearRegression solves perfect linear data (y = 2x + 5) with R² = 1.0", () => {
    // 5 points: (0, 5), (1, 7), (2, 9), (3, 11), (4, 13)
    const points = [
      { x: 0, y: 5, label: "Day 0" },
      { x: 1, y: 7, label: "Day 1" },
      { x: 2, y: 9, label: "Day 2" },
      { x: 3, y: 11, label: "Day 3" },
      { x: 4, y: 13, label: "Day 4" },
    ];

    const result = computeLinearRegression(points, 3);
    assert.strictEqual(result.points.length, 8); // 5 historical + 3 projected
    assert.strictEqual(Math.round(result.slope * 100) / 100, 2);
    assert.strictEqual(Math.round(result.intercept * 100) / 100, 5);
    assert.strictEqual(Math.round(result.rSquared * 100) / 100, 1);

    // Verify projected points
    const proj1 = result.points[5];
    assert.strictEqual(proj1.isProjected, true);
    assert.strictEqual(proj1.x, 5);
    assert.strictEqual(Math.round(proj1.y), 15); // 2*5 + 5 = 15

    const proj2 = result.points[6];
    assert.strictEqual(proj2.isProjected, true);
    assert.strictEqual(proj2.x, 6);
    assert.strictEqual(Math.round(proj2.y), 17); // 2*6 + 5 = 17
  });

  await t.test("3. computeLinearRegression computes valid confidence intervals for non-trivial trends", () => {
    const points = [
      { x: 1, y: 12, label: "Day 1" },
      { x: 2, y: 15, label: "Day 2" },
      { x: 3, y: 14, label: "Day 3" },
      { x: 4, y: 18, label: "Day 4" },
      { x: 5, y: 22, label: "Day 5" },
    ];

    const result = computeLinearRegression(points, 2);
    assert.ok(result.rSquared > 0.8, `Expected R² > 0.8, got ${result.rSquared}`);
    assert.ok(result.standardError >= 0);

    // Check confidence bounds on projected points
    const proj = result.points[5];
    assert.strictEqual(proj.isProjected, true);
    assert.ok(proj.confidenceHigh !== undefined);
    assert.ok(proj.confidenceLow !== undefined);
    assert.ok(proj.confidenceHigh! >= proj.y);
    assert.ok(proj.confidenceLow! <= proj.y);
  });

  await t.test("4. DataEvidenceTypeSchema strictly distinguishes verified facts from hypotheses", () => {
    assert.strictEqual(DataEvidenceTypeSchema.safeParse("OBSERVED_MEASUREMENT").success, true);
    assert.strictEqual(DataEvidenceTypeSchema.safeParse("STATISTICAL_HYPOTHESIS").success, true);
    assert.strictEqual(DataEvidenceTypeSchema.safeParse("SIMULATED_MOCK").success, false);
    assert.strictEqual(DataEvidenceTypeSchema.safeParse("GUESS").success, false);
  });

  await t.test("5. AnalyticsService compiles unified payload with single-tenant isolation", async () => {
    const payload = await AnalyticsService.getDashboardData(testBusinessId);

    assert.ok(payload);
    assert.strictEqual(payload.businessId, testBusinessId);
    assert.ok(payload.summaryMetrics.length >= 4);

    // Verify every metric has evidence provenance
    for (const metric of payload.summaryMetrics) {
      assert.ok(metric.id);
      assert.ok(metric.label);
      assert.ok(metric.value);
      assert.ok(["OBSERVED_MEASUREMENT", "STATISTICAL_HYPOTHESIS"].includes(metric.evidenceType));
      assert.ok(metric.evidenceSource.length > 0);
    }

    // Verify OLS models exist
    assert.ok(payload.leadAcquisitionModel);
    assert.ok(payload.leadAcquisitionModel.points.length > 0);
    assert.ok(payload.revenueForecastModel);
    assert.ok(payload.revenueForecastModel.points.length > 0);

    // Verify funnel stages have verified counts
    assert.ok(payload.funnelStages.length >= 4);
    for (const stage of payload.funnelStages) {
      assert.strictEqual(stage.evidenceType, "OBSERVED_MEASUREMENT");
      assert.ok(stage.count >= 0);
    }

    // Verify Remotion Executive Briefing synthesis
    assert.ok(payload.executiveVideoBriefing);
    assert.strictEqual(payload.executiveVideoBriefing.fps, 30);
    assert.ok(payload.executiveVideoBriefing.scenes.length >= 4);
    assert.ok(payload.executiveVideoBriefing.totalFrames > 0);
  });
});
