import React, { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { Button, Form as BForm } from "@themesberg/react-bootstrap";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faChartColumn,
  faChartLine,
  faChartArea,
  faLayerGroup,
  faDownload,
} from "@fortawesome/free-solid-svg-icons";

// Lazy-load Chart.js chunk to avoid blocking initial dashboard render.
const DashboardChartCanvas = React.lazy(() => import("./DashboardChartCanvas"));

const premiumShadows = {
  id: "premiumShadows",
  beforeDatasetDraw(chart, args) {
    const dataset = chart.data.datasets?.[args.index];
    if (!dataset) return;
    const { ctx } = chart;
    ctx.save();
    if (dataset.type === "bar") {
      ctx.shadowColor = "rgba(0, 0, 0, 0.55)";
      ctx.shadowBlur = 14;
      ctx.shadowOffsetY = 6;
    } else if (dataset.type === "line") {
      ctx.shadowColor = "rgba(0, 0, 0, 0.40)";
      ctx.shadowBlur = 10;
      ctx.shadowOffsetY = 4;
    }
  },
  afterDatasetDraw(chart) {
    chart.ctx.restore();
  },
};

function readCssRgbTriplet(varName, fallback = "0, 200, 140") {
  if (typeof window === "undefined" || typeof document === "undefined") return fallback;
  const raw = getComputedStyle(document.documentElement)
    .getPropertyValue(varName)
    .trim();
  // Expect "r, g, b"
  if (!raw) return fallback;
  const parts = raw.split(",").map((p) => p.trim());
  if (parts.length !== 3) return fallback;
  const nums = parts.map((p) => Number(p));
  if (nums.some((n) => !Number.isFinite(n))) return fallback;
  return `${nums[0]}, ${nums[1]}, ${nums[2]}`;
}

function rgbaFromTriplet(triplet, alpha) {
  return `rgba(${triplet}, ${alpha})`;
}

function getVerticalGradient(chart, key, stops) {
  const { ctx, chartArea } = chart;
  if (!chartArea) return stops?.[0]?.color || "rgba(234,250,245,0.75)";
  const cacheKey = `${key}:${chartArea.top}:${chartArea.bottom}`;
  chart.$gsGradients = chart.$gsGradients || {};
  if (chart.$gsGradients[cacheKey]) return chart.$gsGradients[cacheKey];
  const g = ctx.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);
  stops.forEach((s) => g.addColorStop(s.stop, s.color));
  chart.$gsGradients[cacheKey] = g;
  return g;
}

const defaultOptions = {
  responsive: true,
  maintainAspectRatio: false,
  animation: false,
  plugins: {
    legend: { display: false },
    tooltip: {
      enabled: true,
      mode: "index",
      intersect: false,
      animation: false,
      displayColors: false,
      padding: 12,
      backgroundColor: "rgba(18, 18, 18, 0.92)",
      borderColor: (ctx) =>
        rgbaFromTriplet(readCssRgbTriplet("--gs-cta-rgb"), 0.22),
      borderWidth: 1,
      titleColor: "rgba(234,250,245,0.92)",
      bodyColor: "rgba(234,250,245,0.88)",
      cornerRadius: 12,
    },
  },
  interaction: { mode: "index", intersect: false },
  scales: {
    x: {
      ticks: {
        color: "rgba(234,250,245,0.85)",
        font: {
          family: "Inter, system-ui, -apple-system, Segoe UI, Roboto, Arial",
          size: 12,
          weight: "600",
        },
        maxRotation: 0,
      },
      grid: { display: false },
      border: { display: false },
    },
    y: {
      ticks: {
        color: "rgba(234,250,245,0.85)",
        font: {
          family: "Inter, system-ui, -apple-system, Segoe UI, Roboto, Arial",
          size: 12,
          weight: "600",
        },
      },
      grid: { color: "rgba(255,255,255,0.06)" },
      border: { display: false },
    },
  },
  elements: {
    point: { radius: 0, hoverRadius: 3 },
    line: { borderJoinStyle: "round", borderCapStyle: "round" },
  },
};

const VIZ_MODES = {
  COMBO: "combo",
  BARS: "bars",
  LINE: "line",
  AREA: "area",
};

function movingAverage(values, windowSize = 3) {
  const out = [];
  for (let i = 0; i < values.length; i++) {
    const start = Math.max(0, i - windowSize + 1);
    const slice = values.slice(start, i + 1);
    const avg =
      slice.reduce((sum, v) => sum + (Number.isFinite(v) ? v : 0), 0) /
      Math.max(1, slice.length);
    out.push(Math.round(avg * 100) / 100);
  }
  return out;
}

function indexTo100(values) {
  const first = values.find((v) => Number.isFinite(v) && v !== 0);
  if (!first) return values;
  return values.map((v) => (Number.isFinite(v) ? (v / first) * 100 : 0));
}

export default function DataVizPanel({
  title,
  metricOptions,
  selectedMetricId,
  onChangeMetricId,
  labels,
  values,
  isLoading,
  enableDemo = true,
  demoSeed = "dashboard",
}) {
  const chartRef = useRef(null);
  const [vizMode, setVizMode] = useState(VIZ_MODES.COMBO);
  const [showTrend, setShowTrend] = useState(true);
  const [normalize, setNormalize] = useState(false);
  const [chartChunkReady, setChartChunkReady] = useState(false);
  const lowPower =
    typeof document !== "undefined" &&
    document.documentElement.classList.contains("gs-low-power");

  // Load the heavy Chart.js chunk when the browser is idle, so scrolling/typing stays snappy.
  useEffect(() => {
    let cancelled = false;
    const ric = window.requestIdleCallback;
    const cic = window.cancelIdleCallback;
    if (typeof ric === "function") {
      const id = ric(() => {
        if (!cancelled) setChartChunkReady(true);
      }, { timeout: 1200 });
      return () => {
        cancelled = true;
        if (typeof cic === "function") cic(id);
      };
    }
    const id = window.setTimeout(() => {
      if (!cancelled) setChartChunkReady(true);
    }, 80);
    return () => {
      cancelled = true;
      window.clearTimeout(id);
    };
  }, []);

  const demoInfo = useMemo(() => {
    const safeValues = Array.isArray(values) ? values : [];
    const numeric = safeValues.map((v) => Number(v ?? 0));
    const hasAnyNonZero = numeric.some((n) => Number.isFinite(n) && n !== 0);
    const shouldUseDemo =
      enableDemo &&
      (!numeric.length || !hasAnyNonZero) &&
      Array.isArray(labels) &&
      labels.length > 0;

    if (!shouldUseDemo) return { usingDemo: false, values: numeric };

    // Deterministic “demo” series so it looks consistent and not random-jumpy.
    const seedStr = `${demoSeed}:${selectedMetricId || "metric"}`;
    let seed = 0;
    for (let i = 0; i < seedStr.length; i++) seed = (seed * 31 + seedStr.charCodeAt(i)) >>> 0;

    const demo = labels.map((_, idx) => {
      // pseudo-random 0..1
      const x = Math.sin((seed + 1) * 0.0001 + idx * 1.37) * 10000;
      const r = x - Math.floor(x);
      // shape: slight trend + noise
      const base = 18 + idx * 6;
      const value = base + r * 28;
      return Math.round(value);
    });

    return { usingDemo: true, values: demo };
  }, [demoSeed, enableDemo, isLoading, labels, selectedMetricId, values]);

  const series = useMemo(() => {
    const base = (demoInfo.values || []).map((v) => Number(v ?? 0));
    const scaled = normalize ? indexTo100(base) : base;
    const trend = showTrend ? movingAverage(scaled, 3) : null;
    return { base: scaled, trend };
  }, [demoInfo.values, normalize, showTrend]);

  const chartData = useMemo(() => {
    const safeValues = series.base;
    const trendValues = series.trend;

    const datasets = [];

    const barDataset = {
      type: "bar",
      label: `${title} (bars)`,
      data: safeValues,
      backgroundColor: (ctx) =>
        getVerticalGradient(ctx.chart, "bars", [
          { stop: 0, color: "rgba(234,250,245,0.82)" },
          { stop: 1, color: "rgba(234,250,245,0.22)" },
        ]),
      borderColor: "rgba(255,255,255,0.18)",
      borderWidth: 1,
      borderRadius: 999,
      borderSkipped: false,
      maxBarThickness: 18,
      categoryPercentage: 0.55,
      barPercentage: 0.55,
      hoverBackgroundColor: (ctx) =>
        getVerticalGradient(ctx.chart, "barsHover", [
          { stop: 0, color: "rgba(255,255,255,0.92)" },
          { stop: 1, color: "rgba(234,250,245,0.30)" },
        ]),
    };

    // In "Line" / "Area" modes, keep a very subtle bar layer so the chart doesn't feel empty.
    const ghostBars = {
      ...barDataset,
      label: `${title} (ghost bars)`,
      backgroundColor: (ctx) =>
        getVerticalGradient(ctx.chart, `ghostBars:${vizMode}`, [
          { stop: 0, color: "rgba(234,250,245,0.16)" },
          { stop: 1, color: "rgba(234,250,245,0.04)" },
        ]),
      borderWidth: 0,
      maxBarThickness: 14,
      barPercentage: 0.5,
    };

    const lineDataset = {
      type: "line",
      label: `${title} (line)`,
      data: safeValues,
      borderColor: (ctx) =>
        getVerticalGradient(ctx.chart, "line", [
          { stop: 0, color: "rgba(234,250,245,0.42)" },
          { stop: 1, color: "rgba(234,250,245,0.18)" },
        ]),
      backgroundColor: "rgba(255,255,255,0.00)",
      borderWidth: 2.75,
      cubicInterpolationMode: "monotone",
      tension: 0.38,
      fill: false,
      pointRadius: vizMode === VIZ_MODES.LINE ? 2.5 : 0,
      pointHoverRadius: vizMode === VIZ_MODES.LINE ? 4 : 3,
      pointBackgroundColor: "rgba(234,250,245,0.85)",
      pointBorderColor: "rgba(0,0,0,0.35)",
      pointBorderWidth: 2,
    };

    const areaDataset = {
      ...lineDataset,
      label: `${title} (area)`,
      borderColor: (ctx) =>
        rgbaFromTriplet(readCssRgbTriplet("--gs-cta-rgb"), 0.50),
      backgroundColor: (ctx) =>
        getVerticalGradient(ctx.chart, "areaFill", (() => {
          const triplet = readCssRgbTriplet("--gs-cta-rgb");
          return [
            { stop: 0, color: rgbaFromTriplet(triplet, 0.28) },
            { stop: 1, color: rgbaFromTriplet(triplet, 0.02) },
          ];
        })()),
      fill: true,
      pointRadius: vizMode === VIZ_MODES.AREA ? 2.5 : lineDataset.pointRadius,
      pointHoverRadius: vizMode === VIZ_MODES.AREA ? 4 : lineDataset.pointHoverRadius,
    };

    if (vizMode === VIZ_MODES.BARS) datasets.push(barDataset);
    else if (vizMode === VIZ_MODES.LINE) {
      datasets.push(ghostBars);
      datasets.push(lineDataset);
    } else if (vizMode === VIZ_MODES.AREA) {
      datasets.push(ghostBars);
      datasets.push(areaDataset);
    }
    else {
      // COMBO
      datasets.push(barDataset);
      datasets.push(lineDataset);
    }

    if (trendValues) {
      datasets.push({
        type: "line",
        label: "Trend",
        data: trendValues,
        borderColor: (ctx) =>
          rgbaFromTriplet(readCssRgbTriplet("--gs-cta-rgb"), 0.55),
        borderWidth: 2,
        cubicInterpolationMode: "monotone",
        tension: 0.35,
        pointRadius: 0,
        fill: false,
      });
    }

    return {
      labels,
      datasets,
    };
  }, [labels, series.base, series.trend, title, vizMode]);

  const handleDownloadPng = () => {
    const instance = chartRef.current;
    const chart = instance?.chart || instance; // react-chartjs-2 versions differ
    const url = chart?.toBase64Image?.();
    if (!url) return;
    const a = document.createElement("a");
    a.href = url;
    a.download = `${title}-${selectedMetricId || "metric"}.png`;
    a.click();
  };

  return (
    <div className="dashboard-viz-panel">
      <div className="dashboard-viz-panel__controls">
        <div className="dashboard-viz-panel__toolbar">
          <div className="dashboard-viz-panel__metric">
            <div className="dashboard-viz-panel__label">Select metric</div>
            <BForm.Select
              className="dashboard-viz-panel__select"
              value={selectedMetricId}
              onChange={(e) => onChangeMetricId(e.target.value)}
              disabled={isLoading || !metricOptions?.length}
            >
              {metricOptions?.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </BForm.Select>
          </div>

          <div className="dashboard-viz-panel__style">
            <div className="dashboard-viz-panel__label">Chart style</div>
            <div className="dashboard-viz-icon-group" role="group" aria-label="Chart style">
              <button
                type="button"
                className={`dashboard-viz-icon-btn ${vizMode === VIZ_MODES.COMBO ? "is-active" : ""}`}
                onClick={() => setVizMode(VIZ_MODES.COMBO)}
                disabled={isLoading}
                aria-pressed={vizMode === VIZ_MODES.COMBO}
                title="Combo"
              >
                <FontAwesomeIcon icon={faLayerGroup} />
              </button>
              <button
                type="button"
                className={`dashboard-viz-icon-btn ${vizMode === VIZ_MODES.BARS ? "is-active" : ""}`}
                onClick={() => setVizMode(VIZ_MODES.BARS)}
                disabled={isLoading}
                aria-pressed={vizMode === VIZ_MODES.BARS}
                title="Bars"
              >
                <FontAwesomeIcon icon={faChartColumn} />
              </button>
              <button
                type="button"
                className={`dashboard-viz-icon-btn ${vizMode === VIZ_MODES.LINE ? "is-active" : ""}`}
                onClick={() => setVizMode(VIZ_MODES.LINE)}
                disabled={isLoading}
                aria-pressed={vizMode === VIZ_MODES.LINE}
                title="Line"
              >
                <FontAwesomeIcon icon={faChartLine} />
              </button>
              <button
                type="button"
                className={`dashboard-viz-icon-btn ${vizMode === VIZ_MODES.AREA ? "is-active" : ""}`}
                onClick={() => setVizMode(VIZ_MODES.AREA)}
                disabled={isLoading}
                aria-pressed={vizMode === VIZ_MODES.AREA}
                title="Area"
              >
                <FontAwesomeIcon icon={faChartArea} />
              </button>
            </div>
          </div>

          <div className="dashboard-viz-panel__right">
            <div className="dashboard-viz-panel__right-group" role="group" aria-label="Options">
              <div className="dashboard-viz-panel__toggles">
                <BForm.Check
                  className="dashboard-viz-switch"
                  type="switch"
                  id={`${title}-trend`}
                  label="Trend"
                  checked={showTrend}
                  onChange={(e) => setShowTrend(e.target.checked)}
                  disabled={isLoading}
                />
                <BForm.Check
                  className="dashboard-viz-switch"
                  type="switch"
                  id={`${title}-normalize`}
                  label="Index 100"
                  checked={normalize}
                  onChange={(e) => setNormalize(e.target.checked)}
                  disabled={isLoading}
                />
              </div>

              <div className="dashboard-viz-panel__divider" aria-hidden="true" />

              <div className="dashboard-viz-panel__actions">
                <Button
                  className="dashboard-viz-panel__download"
                  variant="secondary"
                  onClick={handleDownloadPng}
                  disabled={!chartRef.current}
                >
                  <FontAwesomeIcon icon={faDownload} />
                  <span>PNG</span>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="dashboard-viz-panel__chart">
        {demoInfo.usingDemo && (
          <div className="dashboard-viz-panel__badge">Demo</div>
        )}
        <Suspense fallback={<div className="dashboard-viz-panel__chart-skeleton" aria-hidden="true" />}>
          {chartChunkReady ? (
            <DashboardChartCanvas
              ref={chartRef}
              type="bar"
              data={chartData}
              options={defaultOptions}
              plugins={lowPower ? [] : [premiumShadows]}
            />
          ) : (
            <div className="dashboard-viz-panel__chart-skeleton" aria-hidden="true" />
          )}
        </Suspense>
      </div>
    </div>
  );
}


