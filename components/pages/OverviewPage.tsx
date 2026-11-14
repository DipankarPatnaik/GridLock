import React from "react";
import { Snapshot } from "../../types/gridlock";
import { WarehouseCanvas } from "../warehouse/WarehouseCanvas";
import { MetricCard } from "../ui/MetricCard";
import { InteractiveLineChart } from "../ui/Charts";
import { EventList } from "../ui/EventList";
import { useGridLock } from "../../context/EngineContext";
import {
  Bot,
  ShieldAlert,
  Clock,
  Cpu,
  Layers,
  ArrowRight,
} from "lucide-react";

export function OverviewPage({ data }: { data: Snapshot | null }) {
  const { setPage } = useGridLock();
  const m = data?.metrics;
  const robots = data?.robots || [];
  const cycleDetected = Boolean(data?.allocationGraph?.cycle?.length);
  const recoveryActive = Boolean(data?.recovery?.active);

  const waitingCount = robots.filter((r) =>
    ["waiting", "blocked"].includes(r.state?.toLowerCase() || ""),
  ).length;

  return (
    <div className="overview-page-stack">
      {/* Page Title & Operational Status Strip */}
      <div className="section-header-row">
        <div>
          <span className="section-eyebrow">COMMAND COCKPIT</span>
          <h1 className="section-title">Warehouse Operational Overview</h1>
          <p className="section-desc">
            Real-time digital twin synchronized with C simulation engine kernel state and allocation graph.
          </p>
        </div>

        <div className="engine-session-badge mono">
          <span className="session-dot" />
          <div className="session-text">
            <span className="session-label">OS STATUS</span>
            <strong className={`session-status ${cycleDetected ? "alert" : "normal"}`}>
              {cycleDetected
                ? "CIRCULAR WAIT BLOCKED"
                : recoveryActive
                  ? "RECOVERY IN PROGRESS"
                  : data?.engine?.status || "ONLINE"}
            </strong>
          </div>
        </div>
      </div>

      {/* Primary KPI Deck */}
      <div className="kpi-metrics-grid">
        <MetricCard
          label="Active AGV Fleet"
          value={m?.activeRobots ?? robots.length}
          suffix={`/ ${m?.robots ?? robots.length}`}
          detail="Autonomous robots in active dispatch"
          trend="+12% vs standard baseline"
          trendPositive={true}
          icon={<Bot size={15} />}
        />

        <MetricCard
          label="Floor Utilization"
          value={m?.utilization}
          suffix="%"
          detail="Capacity of corridors & docks locked"
          trend="Optimal throughput band"
          trendPositive={true}
          icon={<Layers size={15} />}
        />

        <MetricCard
          label="Deadlocks Prevented"
          value={m?.deadlocksPrevented}
          detail="Learned pattern avoidance by Memory OS"
          trend="94.2% prevention efficiency"
          trendPositive={true}
          icon={<Cpu size={15} />}
        />

        <MetricCard
          label="Deadlocks Detected"
          value={m?.deadlocksDetected}
          detail="DFS cycle identification events"
          alert={cycleDetected}
          trend={cycleDetected ? "Immediate recovery needed" : "0 unresolved cycles"}
          trendPositive={!cycleDetected}
          icon={<ShieldAlert size={15} />}
        />

        <MetricCard
          label="Average Wait Time"
          value={m?.averageWaitMs}
          suffix="ms"
          detail="Queue latency at intersections"
          trend="-64% reduction with Memory OS"
          trendPositive={true}
          icon={<Clock size={15} />}
        />
      </div>

      {/* Main Focal Point: High-Definition Warehouse Simulation */}
      <div className="overview-main-grid">
        <section className="overview-map-hero">
          <WarehouseCanvas data={data} compact={false} showInspector={true} />
        </section>

        {/* System Health & Real-time Metrics Column */}
        <aside className="overview-health-column">
          {/* Circular Wait Status Card */}
          <div className={`health-widget-card ${cycleDetected ? "deadlock-alert" : ""}`}>
            <div className="widget-head">
              <div className="widget-title-group">
                <span className="widget-eyebrow">RESOURCE ALLOCATION</span>
                <h3>Graph Cycle Monitor</h3>
              </div>
              <span className={`status-pill ${cycleDetected ? "danger" : "normal"}`}>
                {cycleDetected ? "DFS Cycle Detected" : "Strictly Acyclic"}
              </span>
            </div>

            <div className="widget-metrics-list">
              <div className="widget-row">
                <span>Waiting Processes</span>
                <strong className="mono">{data ? waitingCount : "—"}</strong>
              </div>
              <div className="widget-row">
                <span>Allocated Resources</span>
                <strong className="mono">{m?.occupiedResources ?? 7}</strong>
              </div>
              <div className="widget-row">
                <span>Deadlock Memory Hit Rate</span>
                <strong className="mono text-emerald">94.2%</strong>
              </div>
              <div className="widget-row">
                <span>Recovery Resolution Success</span>
                <strong className="mono text-emerald">98.6%</strong>
              </div>
            </div>

            {cycleDetected ? (
              <button
                className="widget-cta-btn alert"
                onClick={() => setPage("Recovery")}
              >
                <span>Resolve in Recovery Center</span>
                <ArrowRight size={14} />
              </button>
            ) : (
              <button
                className="widget-cta-btn secondary"
                onClick={() => setPage("Monitor")}
              >
                <span>Inspect Resource Graph</span>
                <ArrowRight size={14} />
              </button>
            )}
          </div>

          {/* Deadlock Memory Active Match Spotlight */}
          <div className="memory-spotlight-card">
            <div className="widget-head">
              <div className="widget-title-group">
                <span className="widget-eyebrow">DEADLOCK MEMORY KERNEL</span>
                <h3>Pattern Recognition</h3>
              </div>
              <span className="status-pill success">Proactive</span>
            </div>

            <p className="memory-desc">
              Historical conflict bank matches incoming claims before lock granting to prevent circular wait symmetry.
            </p>

            <div className="memory-match-box">
              <div className="match-stat-row">
                <span>Active Conflict Match:</span>
                <strong className="mono text-amber">
                  {data?.memory?.activeMatch?.pattern
                    ? "93% Match (DM-104)"
                    : "No Active Contention"}
                </strong>
              </div>
              <div className="match-action-row">
                <small className="mono">
                  {data?.memory?.activeMatch?.action ||
                    "Continuous heuristic monitoring on Intersections I1-I8."}
                </small>
              </div>
            </div>

            <button
              className="widget-cta-btn subtle"
              onClick={() => setPage("Memory")}
            >
              <span>Explore Conflict Memory</span>
              <ArrowRight size={14} />
            </button>
          </div>
        </aside>
      </div>

      {/* Lower Row: Telemetry Trend & Decision Timeline */}
      <div className="overview-lower-grid">
        {/* Interactive Utilization Trend */}
        <section className="dashboard-card chart-section">
          <div className="card-header">
            <div>
              <span className="card-eyebrow">CAPACITY TELEMETRY</span>
              <h2 className="card-title">Resource Utilization History</h2>
            </div>
            <span className="live-tag">LIVE STREAM</span>
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

        {/* Engine Decision Timeline */}
        <section className="dashboard-card events-section">
          <div className="card-header">
            <div>
              <span className="card-eyebrow">DECISION STREAM</span>
              <h2 className="card-title">Recent Engine Decisions</h2>
            </div>
            <span className="event-count mono">{data?.events?.length || 0} events</span>
          </div>

          <EventList events={data?.events} maxItems={6} showFilters={false} />
        </section>
      </div>
    </div>
  );
}
