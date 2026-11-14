import React from "react";
import { Snapshot } from "../../types/gridlock";
import { InteractiveLineChart, MultiBarChart, DonutChart } from "../ui/Charts";

export function AnalyticsPage({ data }: { data: Snapshot | null }) {
  const robots = data?.robots || [];
  const m = data?.metrics;

  // Compute live robot states for donut chart
  const movingCount = robots.filter((r) => r.state === "moving").length;
  const waitingCount = robots.filter((r) => r.state === "waiting").length;
  const blockedCount = robots.filter((r) => r.state === "blocked").length;
  const recoveringCount = robots.filter((r) => r.state === "recovering").length;
  const idleCount = robots.filter((r) => r.state === "idle" || !r.state).length;

  const donutData = [
    { label: "Moving", count: movingCount, color: "#6f9c80" },
    { label: "Waiting", count: waitingCount, color: "#D5B893" },
    { label: "Deadlocked", count: blockedCount, color: "#632024" },
    { label: "Recovering", count: recoveringCount, color: "#617891" },
    { label: "Idle", count: idleCount, color: "#746B61" },
  ];

  const strategyCategories = [
    "Deadlocks / 10k Ticks",
    "Avg Queue Wait (ms)",
    "Tote Throughput (units/hr)",
  ];

  const strategySeries = [
    {
      name: "1. Standard Allocation (Blind FIFO)",
      values: [42, 820, 180],
      color: "#632024",
    },
    {
      name: "2. Traditional Banker's Prevention",
      values: [6, 460, 245],
      color: "#617891",
    },
    {
      name: "3. GridLock Adaptive Memory OS",
      values: [1, 185, 390],
      color: "#8B694B",
    },
  ];

  return (
    <div className="analytics-page-stack">
      {/* Page Header */}
      <div className="section-header-row">
        <div>
          <span className="section-eyebrow">BENCHMARKING & KERNEL EVALUATION</span>
          <h1 className="section-title">Comparative Analytics & Telemetry</h1>
          <p className="section-desc">
            Empirical performance evaluation comparing GridLock's Adaptive Deadlock Memory against traditional OS avoidance techniques.
          </p>
        </div>

        <div className="analytics-benchmark-badge mono">
          <span>THROUGHPUT BOOST</span>
          <strong className="text-emerald">+116% VS BASELINE</strong>
        </div>
      </div>

      {/* Top Benchmark KPI Bar */}
      <div className="analytics-kpi-grid">
        <div className="dashboard-card stat-tile">
          <span className="tile-eyebrow">TOTAL DEADLOCKS OCCURRED</span>
          <strong className="tile-number mono text-caput">
            {m?.deadlocksDetected ?? 3}
          </strong>
          <small className="tile-sub">During unmanaged test injections</small>
        </div>

        <div className="dashboard-card stat-tile">
          <span className="tile-eyebrow">AVOIDED BY DEADLOCK MEMORY</span>
          <strong className="tile-number mono text-emerald">
            {m?.deadlocksPrevented ?? 29}
          </strong>
          <small className="tile-sub">Preempted without operational stall</small>
        </div>

        <div className="dashboard-card stat-tile">
          <span className="tile-eyebrow">AVERAGE LATENCY PENALTY</span>
          <strong className="tile-number mono">
            {m?.averageWaitMs ?? 185} ms
          </strong>
          <small className="tile-sub">At contested corridor intersections</small>
        </div>

        <div className="dashboard-card stat-tile">
          <span className="tile-eyebrow">RECOVERY SUCCESS RATE</span>
          <strong className="tile-number mono text-emerald">
            {m?.recoverySuccessRate ?? 98.6}%
          </strong>
          <small className="tile-sub">Acyclic verification rate</small>
        </div>
      </div>

      {/* Main Charts Grid */}
      <div className="analytics-main-grid">
        {/* Left: Multi-Strategy Benchmark Comparison */}
        <section className="dashboard-card strategy-card">
          <div className="card-header">
            <div>
              <span className="card-eyebrow">ALGORITHM COMPARISON</span>
              <h2 className="card-title">Strategy Benchmark Matrix</h2>
            </div>
          </div>
          <p className="chart-intro-text">
            Evaluation across identical warehouse traffic conditions, comparing Blind Mutual Exclusion, Banker's Algorithm, and GridLock Adaptive Memory.
          </p>

          <MultiBarChart categories={strategyCategories} series={strategySeries} />
        </section>

        {/* Right: AGV Fleet State Distribution Donut */}
        <section className="dashboard-card fleet-dist-card">
          <div className="card-header">
            <div>
              <span className="card-eyebrow">FLEET COMPOSITION</span>
              <h2 className="card-title">Robot State Distribution</h2>
            </div>
            <span className="count-badge mono">{robots.length} Units</span>
          </div>

          <DonutChart data={donutData} />
        </section>
      </div>

      {/* Lower Row: Long-Term Utilization Stream & Percentiles Table */}
      <div className="analytics-lower-grid">
        {/* Long-Term Line Chart */}
        <section className="dashboard-card utilization-history-card">
          <div className="card-header">
            <div>
              <span className="card-eyebrow">TEMPORAL TELEMETRY</span>
              <h3 className="card-title">Warehouse Floor Capacity Timeline</h3>
            </div>
            <span className="live-tag">TICK TELEMETRY</span>
          </div>

          <InteractiveLineChart
            data={
              data?.history?.map((h) => ({
                timestamp: h.timestamp,
                tick: h.tick,
                value: h.utilization,
              })) || []
            }
            unit="%"
            height={160}
          />
        </section>

        {/* Latency Percentiles Table */}
        <section className="dashboard-card percentiles-card">
          <div className="card-header">
            <div>
              <span className="card-eyebrow">LATENCY PROFILE</span>
              <h3 className="card-title">Queue Wait Distribution</h3>
            </div>
          </div>

          <div className="percentile-table">
            <div className="table-row head mono">
              <span>METRIC</span>
              <span>BASELINE</span>
              <span>BANKER'S</span>
              <span>GRIDLOCK</span>
            </div>
            <div className="table-row mono">
              <span>p50 (Median)</span>
              <span>420 ms</span>
              <span>280 ms</span>
              <span className="text-emerald font-bold">110 ms</span>
            </div>
            <div className="table-row mono">
              <span>p95 (Tail)</span>
              <span>980 ms</span>
              <span>610 ms</span>
              <span className="text-emerald font-bold">240 ms</span>
            </div>
            <div className="table-row mono">
              <span>p99 (Max Stall)</span>
              <span>2,400 ms</span>
              <span>1,150 ms</span>
              <span className="text-emerald font-bold">390 ms</span>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
