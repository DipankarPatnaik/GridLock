import React, { useState } from "react";
import { Snapshot } from "../../types/gridlock";
import { useGridLock } from "../../context/EngineContext";
import { Boxes, Zap } from "lucide-react";

interface WarehouseCanvasProps {
  data: Snapshot | null;
  compact?: boolean;
  showInspector?: boolean;
}

export function WarehouseCanvas({
  data,
  compact = false,
  showInspector = true,
}: WarehouseCanvasProps) {
  const { selectedRobot, setSelectedRobot, selectedResource, setSelectedResource } =
    useGridLock();

  const width = data?.warehouse?.width || 24;
  const height = data?.warehouse?.height || 14;
  const cells = data?.warehouse?.cells || [];
  const robots = data?.robots || [];
  const cycleNodes = data?.allocationGraph?.cycle || [];

  const [filterLayer] = useState<"all" | "paths" | "resources">("all");

  return (
    <div className={`warehouse-canvas-wrapper ${compact ? "compact-mode" : ""}`}>
      {/* Top Map Action Bar */}
      <div className="canvas-header-bar">
        <div className="canvas-title-group">
          <div className="live-status-pill">
            <span className="live-dot" />
            <strong className="canvas-title">Zone Alpha · High-Bay Floor</strong>
          </div>
          <span className="canvas-sub mono">
            {width} × {height} GRID UNITS · 336 CELLS
          </span>
        </div>

        {/* Legend */}
        <div className="canvas-legend">
          <div className="legend-chip">
            <span className="dot moving" />
            <span>Moving</span>
          </div>
          <div className="legend-chip">
            <span className="dot waiting" />
            <span>Waiting</span>
          </div>
          <div className="legend-chip">
            <span className="dot blocked" />
            <span>Deadlocked</span>
          </div>
          <div className="legend-chip">
            <span className="dot recovering" />
            <span>Recovering</span>
          </div>
          <div className="legend-chip">
            <span className="tile-sample shelf" />
            <span>Racks</span>
          </div>
          <div className="legend-chip">
            <span className="tile-sample intersection" />
            <span>Intersections</span>
          </div>
        </div>
      </div>

      {/* Main Grid Viewport */}
      <div
        className="canvas-viewport"
        style={
          {
            "--cols": width,
            "--rows": height,
          } as React.CSSProperties
        }
      >
        {/* Floor grid container */}
        <div className="grid-floor-board">
          {cells.map((cell) => {
            const isIntersection = cell.type === "intersection";
            const isContested =
              isIntersection &&
              cycleNodes.some((nodeId) => nodeId === cell.id);
            const isSelectedRes = selectedResource === cell.id;

            return (
              <div
                key={cell.id || `${cell.x}-${cell.y}`}
                className={`cell-unit ${cell.type} ${isContested ? "cycle-deadlocked" : ""} ${
                  isSelectedRes ? "selected-resource" : ""
                }`}
                style={{
                  gridColumn: cell.x + 1,
                  gridRow: cell.y + 1,
                }}
                onClick={() => {
                  if (cell.id) setSelectedResource(cell.id);
                }}
                title={cell.label || cell.id || `${cell.type} (${cell.x},${cell.y})`}
              >
                {cell.type === "shelf" && (
                  <div className="shelf-rack">
                    <span className="shelf-slot" />
                    <span className="shelf-slot" />
                  </div>
                )}
                {cell.type === "intersection" && (
                  <div className="intersection-marker">
                    <span className="inter-id mono">{cell.id}</span>
                  </div>
                )}
                {cell.type === "charging" && (
                  <div className="charger-marker">
                    <Zap size={10} className="charger-icon" />
                    <span className="mono">{cell.id}</span>
                  </div>
                )}
                {cell.type === "dock" && (
                  <div className="dock-marker">
                    <Boxes size={11} className="dock-icon" />
                    <span className="mono">{cell.id}</span>
                  </div>
                )}
                {cell.type === "waiting_bay" && (
                  <div className="bay-marker">
                    <span className="mono">{cell.id}</span>
                  </div>
                )}
              </div>
            );
          })}

          {/* Render Autonomous Robots */}
          {robots.map((robot) => {
            const isSelected = selectedRobot?.id === robot.id;
            const inCycle = cycleNodes.includes(robot.id);
            const state = robot.state?.toLowerCase() || "idle";

            // Calculate percentage position centered on grid tile
            const leftPercent = ((robot.x + 0.5) / width) * 100;
            const topPercent = ((robot.y + 0.5) / height) * 100;

            return (
              <div
                key={robot.id}
                className={`robot-marker robot-${state} ${inCycle ? "deadlocked-cycle" : ""} ${
                  isSelected ? "selected-robot" : ""
                }`}
                style={{
                  left: `${leftPercent}%`,
                  top: `${topPercent}%`,
                  transform: `translate(-50%, -50%)`,
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedRobot(robot);
                }}
                title={`${robot.id} · ${state.toUpperCase()} · Pos: (${robot.x}, ${robot.y})`}
              >
                {/* Robot body chassis */}
                <div
                  className="robot-chassis"
                  style={{
                    transform: `rotate(${robot.heading || 0}deg)`,
                  }}
                >
                  {/* Directional Headlight Arrow */}
                  <div className="chassis-front-arrow" />
                  <div className="chassis-led" />
                  <div className="chassis-load-slot">
                    {robot.load && <span className="load-cube" />}
                  </div>
                </div>

                {/* Overhead ID Label */}
                <div className="robot-floating-badge mono">
                  <strong>{robot.id}</strong>
                </div>

                {/* State Halo Ring */}
                <div className="robot-halo-ring" />
              </div>
            );
          })}
        </div>
      </div>

      {/* Bottom Status Floor Bar */}
      <div className="canvas-footer-bar">
        <div className="footer-left mono">
          <span>COORDINATE MAPPING: TICK {data?.engine?.tick ?? "—"}</span>
          <span className="sep">•</span>
          <span>SPATIAL KERNEL: ACTIVE</span>
        </div>
        <div className="footer-right">
          <span className="occupied-stat">
            {robots.length} Robots Synchronized
          </span>
        </div>
      </div>

      {/* Selected Robot / Resource Quick Inspector Panel */}
      {showInspector && selectedRobot && (
        <div className="robot-inspector-card">
          <div className="inspector-head">
            <div className="inspector-title">
              <span className="inspector-tag mono">AGV INSPECTOR</span>
              <h3>Robot {selectedRobot.id}</h3>
            </div>
            <button
              className="inspector-close"
              onClick={() => setSelectedRobot(null)}
            >
              ×
            </button>
          </div>
          <div className="inspector-body">
            <div className="stat-grid">
              <div className="stat-item">
                <span className="stat-label">Status</span>
                <span className={`stat-val status-${selectedRobot.state?.toLowerCase()}`}>
                  {selectedRobot.state?.toUpperCase()}
                </span>
              </div>
              <div className="stat-item">
                <span className="stat-label">Position</span>
                <span className="stat-val mono">
                  ({selectedRobot.x}, {selectedRobot.y})
                </span>
              </div>
              <div className="stat-item">
                <span className="stat-label">Battery</span>
                <span className="stat-val mono">{selectedRobot.battery ?? 100}%</span>
              </div>
              <div className="stat-item">
                <span className="stat-label">Priority</span>
                <span className="stat-val mono">P-{selectedRobot.priority ?? 1}</span>
              </div>
            </div>
            <div className="inspector-detail-row">
              <span className="detail-key">Current Task:</span>
              <span className="detail-value">{selectedRobot.task || "Transit Navigation"}</span>
            </div>
            <div className="inspector-detail-row">
              <span className="detail-key">Destination:</span>
              <span className="detail-value mono">
                {selectedRobot.destination?.label || `(${selectedRobot.destination?.x}, ${selectedRobot.destination?.y})`}
              </span>
            </div>
            <div className="inspector-detail-row">
              <span className="detail-key">Held Resources:</span>
              <span className="detail-value mono">
                {selectedRobot.heldResources?.length
                  ? selectedRobot.heldResources.join(", ")
                  : "None (Free)"}
              </span>
            </div>
            {selectedRobot.waitingFor && (
              <div className="inspector-detail-row alert-row">
                <span className="detail-key text-caput">Waiting For Lock:</span>
                <span className="detail-value mono text-caput font-bold">
                  {selectedRobot.waitingFor}
                </span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
