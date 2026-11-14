import React from "react";
import { Snapshot } from "../../types/gridlock";
import { WarehouseCanvas } from "../warehouse/WarehouseCanvas";
import { EventList } from "../ui/EventList";
import { useGridLock } from "../../context/EngineContext";
import {
  Play,
  Pause,
  SkipForward,
  Plus,
  Minus,
  AlertTriangle,
  RotateCcw,
  RefreshCw,
} from "lucide-react";

export function WarehousePage({ data }: { data: Snapshot | null }) {
  const {
    isRunning,
    togglePlay,
    stepTick,
    speed,
    setSpeed,
    addRobot,
    removeRobot,
    triggerDeadlock,
    resolveDeadlock,
    resetSimulation,
    selectedRobot,
    setSelectedRobot,
    selectedResource,
    setSelectedResource,
  } = useGridLock();

  const robots = data?.robots || [];
  const resources = data?.warehouse?.resources || [];
  const cycleDetected = Boolean(data?.allocationGraph?.cycle?.length);
  const recoveryActive = Boolean(data?.recovery?.active);

  return (
    <div className="warehouse-page-stack">
      {/* Page Header */}
      <div className="section-header-row">
        <div>
          <span className="section-eyebrow">SPATIAL DIGITAL TWIN</span>
          <h1 className="section-title">Warehouse Simulation Floor</h1>
          <p className="section-desc">
            Autonomous mobile robot transit corridors, resource contention zones, and dynamic mutex allocation.
          </p>
        </div>

        {/* Extended Control Toolbar */}
        <div className="extended-controls-bar">
          <button
            className={`ctrl-btn primary ${isRunning ? "active" : ""}`}
            onClick={togglePlay}
          >
            {isRunning ? <Pause size={14} /> : <Play size={14} />}
            <span>{isRunning ? "Pause" : "Start"}</span>
          </button>

          <button className="ctrl-btn" onClick={stepTick} title="Advance 1 Tick">
            <SkipForward size={14} />
            <span>Tick</span>
          </button>

          <label className="speed-wrap mono">
            <span>Rate</span>
            <select
              value={speed}
              onChange={(e) => setSpeed(Number(e.target.value))}
              className="speed-dropdown"
            >
              <option value={0.5}>0.5×</option>
              <option value={1}>1.0×</option>
              <option value={2}>2.0×</option>
              <option value={4}>4.0×</option>
            </select>
          </label>

          <button className="ctrl-btn" onClick={addRobot}>
            <Plus size={14} />
            <span>Robot</span>
          </button>

          <button className="ctrl-btn" onClick={removeRobot}>
            <Minus size={14} />
          </button>

          {!cycleDetected && !recoveryActive ? (
            <button
              className="ctrl-btn conflict-btn"
              onClick={triggerDeadlock}
            >
              <AlertTriangle size={14} />
              <span>Deadlock Scenario</span>
            </button>
          ) : (
            <button
              className="ctrl-btn resolve-btn animate-pulse"
              onClick={resolveDeadlock}
            >
              <RotateCcw size={14} />
              <span>{recoveryActive ? "Recovering..." : "Resolve Deadlock"}</span>
            </button>
          )}

          <button className="ctrl-btn icon-only" onClick={resetSimulation}>
            <RefreshCw size={13} />
          </button>
        </div>
      </div>

      {/* Main Simulation Viewport */}
      <div className="warehouse-main-grid">
        <section className="warehouse-map-panel">
          <WarehouseCanvas data={data} compact={false} showInspector={true} />
        </section>

        {/* Side Rail: Resource Allocations & Active Events */}
        <aside className="warehouse-side-panel">
          {/* Active AGV Fleet Manifest */}
          <div className="dashboard-card fleet-manifest-card">
            <div className="card-header">
              <div>
                <span className="card-eyebrow">FLEET TELEMETRY</span>
                <h3 className="card-title">Active Robots</h3>
              </div>
              <span className="count-tag mono">{robots.length} Units</span>
            </div>

            <div className="fleet-list-scroll">
              {robots.map((r) => {
                const isSelected = selectedRobot?.id === r.id;
                const state = r.state?.toLowerCase() || "idle";

                return (
                  <div
                    key={r.id}
                    className={`fleet-row ${isSelected ? "selected" : ""}`}
                    onClick={() => setSelectedRobot(r)}
                  >
                    <div className="robot-id-col">
                      <span className={`status-pip ${state}`} />
                      <strong className="mono">{r.id}</strong>
                    </div>

                    <div className="robot-task-col">
                      <span className="task-name">{r.task || "Transit"}</span>
                      <small className="coords mono">
                        Pos: ({r.x}, {r.y}) · P-{r.priority ?? 1}
                      </small>
                    </div>

                    <div className="robot-status-col">
                      <span className={`state-badge ${state}`}>
                        {r.state?.toUpperCase()}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Engine Event Stream with Filters */}
          <div className="dashboard-card warehouse-events-card">
            <div className="card-header">
              <div>
                <span className="card-eyebrow">ACTIVITY LOG</span>
                <h3 className="card-title">Engine Event Log</h3>
              </div>
            </div>

            <EventList events={data?.events} maxItems={8} showFilters={true} />
          </div>
        </aside>
      </div>
    </div>
  );
}
