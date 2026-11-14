import React, { useState } from "react";

interface LineChartProps {
  data: Array<{ timestamp?: string; tick?: number; value: number }>;
  color?: string;
  unit?: string;
  height?: number;
}

export function InteractiveLineChart({
  data,
  color = "var(--primary-accent)",
  unit = "%",
  height = 140,
}: LineChartProps) {
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  if (!data.length) {
    return (
      <div className="chart-empty-placeholder">
        <span>Awaiting telemetry stream...</span>
      </div>
    );
  }

  const values = data.map((d) => d.value);
  const min = Math.min(...values, 0);
  const max = Math.max(...values, 100);
  const range = Math.max(max - min, 1);

  const points = data.map((d, index) => {
    const x = (index / Math.max(data.length - 1, 1)) * 100;
    const y = 90 - ((d.value - min) / range) * 80;
    return { x, y, ...d };
  });

  const polylineStr = points.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
  const areaPathStr = `0,95 ${polylineStr} 100,95`;

  const activePoint = hoverIndex !== null ? points[hoverIndex] : points[points.length - 1];

  return (
    <div className="interactive-chart-box" style={{ height }}>
      {/* Top Value Display */}
      <div className="chart-meta-row">
        <span className="chart-active-tag mono">
          {activePoint?.tick !== undefined ? `TICK ${activePoint.tick}` : activePoint?.timestamp || "Latest"}
        </span>
        <span className="chart-active-val mono">
          <strong>{activePoint?.value ?? 0}</strong>
          <small>{unit}</small>
        </span>
      </div>

      <div className="chart-svg-wrap">
        <svg
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          className="chart-svg"
          onMouseLeave={() => setHoverIndex(null)}
        >
          <defs>
            <linearGradient id="chartGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="var(--primary-accent)" stopOpacity="0.28" />
              <stop offset="100%" stopColor="var(--primary-accent)" stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* Grid reference lines */}
          <line x1="0" y1="20" x2="100" y2="20" className="chart-gridline" />
          <line x1="0" y1="50" x2="100" y2="50" className="chart-gridline" />
          <line x1="0" y1="80" x2="100" y2="80" className="chart-gridline" />

          {/* Area fill */}
          <polygon points={areaPathStr} fill="url(#chartGradient)" />

          {/* Stroke path */}
          <polyline
            points={polylineStr}
            fill="none"
            stroke="var(--primary-accent)"
            strokeWidth="2.2"
            vectorEffect="non-scaling-stroke"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Active Hover Point */}
          {activePoint && (
            <circle
              cx={activePoint.x}
              cy={activePoint.y}
              r="3.5"
              className="chart-focus-dot"
            />
          )}

          {/* Invisible hover trigger columns */}
          {points.map((p, i) => (
            <rect
              key={i}
              x={p.x - 100 / (points.length * 2)}
              y="0"
              width={100 / points.length}
              height="100"
              fill="transparent"
              onMouseEnter={() => setHoverIndex(i)}
            />
          ))}
        </svg>
      </div>
    </div>
  );
}

interface MultiBarChartProps {
  categories: string[];
  series: Array<{ name: string; values: number[]; color: string }>;
}

export function MultiBarChart({ categories, series }: MultiBarChartProps) {
  return (
    <div className="multi-bar-container">
      <div className="bar-legend">
        {series.map((s) => (
          <div key={s.name} className="legend-item">
            <span className="legend-dot" style={{ backgroundColor: s.color }} />
            <span>{s.name}</span>
          </div>
        ))}
      </div>

      <div className="bar-groups-grid">
        {categories.map((cat, catIdx) => (
          <div key={cat} className="bar-category-column">
            <div className="bar-pillars">
              {series.map((s) => {
                const val = s.values[catIdx] ?? 0;
                const max = Math.max(...s.values, 100);
                const heightPct = Math.min(100, Math.max(8, (val / max) * 100));

                return (
                  <div key={s.name} className="pillar-wrap">
                    <span className="pillar-val mono">{val}</span>
                    <div
                      className="pillar-fill"
                      style={{
                        height: `${heightPct}%`,
                        backgroundColor: s.color,
                      }}
                      title={`${s.name} (${cat}): ${val}`}
                    />
                  </div>
                );
              })}
            </div>
            <span className="bar-cat-label">{cat}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

interface DonutChartProps {
  data: Array<{ label: string; count: number; color: string }>;
}

export function DonutChart({ data }: DonutChartProps) {
  const total = data.reduce((acc, d) => acc + d.count, 0) || 1;
  let accumulatedAngle = 0;

  const slices = data.map((d) => {
    const fraction = d.count / total;
    const strokeDasharray = `${fraction * 100} ${100 - fraction * 100}`;
    const strokeDashoffset = -accumulatedAngle;
    accumulatedAngle += fraction * 100;
    return { ...d, fraction, strokeDasharray, strokeDashoffset };
  });

  return (
    <div className="donut-chart-wrap">
      <div className="donut-svg-box">
        <svg viewBox="0 0 42 42" className="donut-svg">
          <circle cx="21" cy="21" r="15.915" fill="transparent" stroke="var(--border-muted)" strokeWidth="4.5" />
          {slices.map((slice, i) => (
            <circle
              key={i}
              cx="21"
              cy="21"
              r="15.915"
              fill="transparent"
              stroke={slice.color}
              strokeWidth="4.5"
              strokeDasharray={slice.strokeDasharray}
              strokeDashoffset={slice.strokeDashoffset}
              strokeLinecap="round"
            />
          ))}
        </svg>
        <div className="donut-center-label">
          <strong className="mono">{total}</strong>
          <span>UNITS</span>
        </div>
      </div>

      <div className="donut-legend-col">
        {data.map((d) => (
          <div key={d.label} className="donut-legend-row">
            <span className="legend-indicator" style={{ backgroundColor: d.color }} />
            <span className="legend-name">{d.label}</span>
            <strong className="legend-count mono">{d.count}</strong>
          </div>
        ))}
      </div>
    </div>
  );
}
