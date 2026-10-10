/**
 * Ordinary Least Squares (OLS) Linear Regression & Predictive Forecasting Engine
 *
 * Computes:
 * - Slope (m) & Y-intercept (c) for y = mx + c
 * - Coefficient of Determination (R²)
 * - Pearson Correlation Coefficient (r)
 * - Standard Error of the Estimate (SE)
 * - 95% Confidence / Prediction Interval bounds
 * - Multi-step future forecast with explicit projection markers
 */

export interface RegressionDataPoint {
  x: number;
  y: number;
  label: string;
}

export interface ProjectedPoint {
  x: number;
  y: number;
  label: string;
  isProjected: boolean;
  confidenceLow?: number;
  confidenceHigh?: number;
}

export interface LinearRegressionResult {
  slope: number;
  intercept: number;
  rSquared: number;
  correlation: number;
  standardError: number;
  formula: string;
  points: ProjectedPoint[];
  summary: string;
}

/**
 * Perform Ordinary Least Squares Linear Regression with forward projections.
 */
export function computeLinearRegression(
  historicalData: RegressionDataPoint[],
  forecastSteps: number = 7,
  stepLabelGenerator?: (stepIndex: number, lastLabel: string) => string
): LinearRegressionResult {
  const n = historicalData.length;

  if (n === 0) {
    return {
      slope: 0,
      intercept: 0,
      rSquared: 0,
      correlation: 0,
      standardError: 0,
      formula: "y = 0",
      points: [],
      summary: "Insufficient data points for regression modeling.",
    };
  }

  if (n === 1) {
    const single = historicalData[0];
    const points: ProjectedPoint[] = [
      { x: single.x, y: single.y, label: single.label, isProjected: false },
    ];
    for (let i = 1; i <= forecastSteps; i++) {
      points.push({
        x: single.x + i,
        y: single.y,
        label: stepLabelGenerator ? stepLabelGenerator(i, single.label) : `+${i}d`,
        isProjected: true,
      });
    }
    return {
      slope: 0,
      intercept: single.y,
      rSquared: 1.0,
      correlation: 1.0,
      standardError: 0,
      formula: `y = ${single.y}`,
      points,
      summary: "Constant baseline projected forward.",
    };
  }

  // Calculate sums
  let sumX = 0;
  let sumY = 0;
  let sumXY = 0;
  let sumX2 = 0;
  let sumY2 = 0;

  for (const pt of historicalData) {
    sumX += pt.x;
    sumY += pt.y;
    sumXY += pt.x * pt.y;
    sumX2 += pt.x * pt.x;
    sumY2 += pt.y * pt.y;
  }

  const denominator = n * sumX2 - sumX * sumX;
  const slope = denominator === 0 ? 0 : (n * sumXY - sumX * sumY) / denominator;
  const intercept = (sumY - slope * sumX) / n;

  // Mean values
  const meanX = sumX / n;
  const meanY = sumY / n;

  // Sum of squares for R²
  let ssTotal = 0;
  let ssResidual = 0;
  let sumDeviationProduct = 0;
  let sumDevX2 = 0;
  let sumDevY2 = 0;

  for (const pt of historicalData) {
    const yPred = slope * pt.x + intercept;
    ssTotal += Math.pow(pt.y - meanY, 2);
    ssResidual += Math.pow(pt.y - yPred, 2);

    const devX = pt.x - meanX;
    const devY = pt.y - meanY;
    sumDeviationProduct += devX * devY;
    sumDevX2 += devX * devX;
    sumDevY2 += devY * devY;
  }

  const rSquared = ssTotal === 0 ? 1 : Math.max(0, Math.min(1, 1 - ssResidual / ssTotal));
  const correlation =
    sumDevX2 * sumDevY2 === 0
      ? 0
      : sumDeviationProduct / Math.sqrt(sumDevX2 * sumDevY2);

  const degreesOfFreedom = Math.max(1, n - 2);
  const standardError = Math.sqrt(ssResidual / degreesOfFreedom);

  // Generate historical points with regression fit
  const points: ProjectedPoint[] = historicalData.map((pt) => ({
    x: pt.x,
    y: pt.y,
    label: pt.label,
    isProjected: false,
  }));

  // Extrapolate forward forecast points with 95% prediction interval
  const lastPoint = historicalData[n - 1];
  for (let step = 1; step <= forecastSteps; step++) {
    const nextX = lastPoint.x + step;
    const projectedY = Math.max(0, Math.round((slope * nextX + intercept) * 10) / 10);

    // Prediction interval width increases as x moves further from meanX
    const leverage = sumDevX2 === 0 ? 1 : Math.pow(nextX - meanX, 2) / sumDevX2;
    const marginOfError = 1.96 * standardError * Math.sqrt(1 + 1 / n + leverage);

    const nextLabel = stepLabelGenerator
      ? stepLabelGenerator(step, lastPoint.label)
      : `Day ${nextX}`;

    points.push({
      x: nextX,
      y: projectedY,
      label: nextLabel,
      isProjected: true,
      confidenceLow: Math.max(0, Math.round((projectedY - marginOfError) * 10) / 10),
      confidenceHigh: Math.round((projectedY + marginOfError) * 10) / 10,
    });
  }

  const roundedSlope = Math.round(slope * 100) / 100;
  const roundedIntercept = Math.round(intercept * 100) / 100;
  const formula = `y = ${roundedSlope}x ${roundedIntercept >= 0 ? "+" : "-"} ${Math.abs(roundedIntercept)}`;

  let summary = "";
  if (rSquared >= 0.85) {
    summary = `Strong linear fit (R²=${Math.round(rSquared * 100)}%). Growth rate is approximately ${roundedSlope >= 0 ? "+" : ""}${roundedSlope} units per period.`;
  } else if (rSquared >= 0.5) {
    summary = `Moderate statistical correlation (R²=${Math.round(rSquared * 100)}%). Predictions carry moderate variance across intervals.`;
  } else {
    summary = `Emerging trend (R²=${Math.round(rSquared * 100)}%). Historical variance is high; project conservatively.`;
  }

  return {
    slope: roundedSlope,
    intercept: roundedIntercept,
    rSquared: Math.round(rSquared * 1000) / 1000,
    correlation: Math.round(correlation * 1000) / 1000,
    standardError: Math.round(standardError * 100) / 100,
    formula,
    points,
    summary,
  };
}
