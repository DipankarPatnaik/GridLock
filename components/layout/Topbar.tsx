import React from "react";
import { useGridLock } from "../../context/EngineContext";
import {
  Play,
  Pause,
  SkipForward,
  Plus,
  Minus,
  AlertTriangle,
  RotateCcw,
  Sun,
  Moon,
  RefreshCw,
  ChevronRight,
} from "lucide-react";

export function Topbar() {
  const {
    page,
    connection,
    snapshot,
    lastSeen,
    retry,
    theme,
    toggleTheme,
    mode,
    setMode,
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
  } = useGridLock();

  const isDeadlocked = Boolean(snapshot?.allocationGraph?.cycle?.length);
  const recoveryActive = Boolean(snapshot?.recovery?.active);

  return (
    <header className="topbar-container">
      {/* Left: Breadcrumbs & Page Identifier */}
      <div className="topbar-left">
        <div className="breadcrumb-nav">
          <span className="crumb-root">GRIDLOCK</span>
          <ChevronRight size={13} className="crumb-sep" />
          <span className="crumb-page">{page}</span>
          <span className="crumb-badge mono">
            {snapshot?.engine?.algorithm || "OS Kernel"}
          </span>
        </div>
      </div>

      {/* Center: Real-time Simulation Deck Controls */}
      <div className="topbar-center">
        <div className="sim-control-deck">
          {/* Play/Pause */}
          <button
            className={`sim-btn primary ${isRunning ? "active" : ""}`}
            onClick={togglePlay}
            title={isRunning ? "Pause Simulation" : "Resume Simulation"}
          >
            {isRunning ? <Pause size={13} /> : <Play size={13} />}
            <span>{isRunning ? "Pause" : "Play"}</span>
          </button>

          {/* Step 1 Tick */}
          <button
            className="sim-btn secondary"
            onClick={stepTick}
            title="Step Advance Single Tick"
          >
            <SkipForward size={13} />
            <span>Step</span>
          </button>

          {/* Speed Select */}
          <div className="speed-selector">
            <span className="speed-label">Rate</span>
            <select
              value={speed}
              onChange={(e) => setSpeed(Number(e.target.value))}
              className="speed-dropdown mono"
            >
              <option value={0.5}>0.5×</option>
              <option value={1}>1.0×</option>
              <option value={2}>2.0×</option>
              <option value={4}>4.0×</option>
            </select>
          </div>

          <div className="control-divider" />

          {/* Add / Remove Robot */}
          <div className="robot-controls-group">
            <button
              className="sim-btn icon-only"
              onClick={addRobot}
              title="Add Autonomous Robot to Floor"
            >
              <Plus size={13} />
            </button>
            <span className="robot-count-badge mono">
              {snapshot?.robots?.length ?? 0}
            </span>
            <button
              className="sim-btn icon-only"
              onClick={removeRobot}
              title="Remove Robot from Floor"
            >
              <Minus size={13} />
            </button>
          </div>

          <div className="control-divider" />

          {/* Scenarios & Deadlock Management */}
          {!isDeadlocked && !recoveryActive ? (
            <button
              className="sim-btn scenario-btn"
              onClick={triggerDeadlock}
              title="Inject Circular Wait Deadlock Scenario"
            >
              <AlertTriangle size={13} />
              <span>Simulate Conflict</span>
            </button>
          ) : (
            <button
              className="sim-btn recover-btn animate-pulse"
              onClick={resolveDeadlock}
              title="Execute OS Deadlock Recovery Routine"
            >
              <RotateCcw size={13} />
              <span>{recoveryActive ? "Advancing Recovery..." : "Resolve Deadlock"}</span>
            </button>
          )}

          {/* Reset */}
          <button
            className="sim-btn subtle icon-only"
            onClick={resetSimulation}
            title="Reset Simulation State"
          >
            <RefreshCw size={12} />
          </button>
        </div>
      </div>

      {/* Right: Engine Status, Tick Counter, Engine Mode & Theme */}
      <div className="topbar-right">
        {/* Tick Counter */}
        <div className="tick-counter-badge mono">
          <span className="tick-label">TICK</span>
          <strong className="tick-val">{snapshot?.engine?.tick ?? "—"}</strong>
        </div>

        {/* Engine Source Selector (Backend vs Simulation) */}
        <div className="engine-source-pill">
          <button
            className={`source-chip ${mode === "simulated" ? "active" : ""}`}
            onClick={() => setMode("simulated")}
            title="Use Built-in High Fidelity Simulation Engine"
          >
            Simulator
          </button>
          <button
            className={`source-chip ${mode === "backend" ? "active" : ""}`}
            onClick={() => setMode("backend")}
            title="Connect to Real C WebSocket Backend"
          >
            C Backend
          </button>
        </div>

        {/* Connection status badge */}
        <div className={`connection-pill ${connection}`}>
          <span className="status-dot" />
          <span className="status-text">
            {connection === "connected"
              ? "C Engine Online"
              : connection === "simulated"
                ? "Sim Active"
                : connection === "connecting"
                  ? "Connecting..."
                  : "Engine Disconnected"}
          </span>
          {connection === "disconnected" && (
            <button className="reconnect-btn" onClick={retry} title="Retry WebSocket">
              <RefreshCw size={11} />
            </button>
          )}
        </div>

        {/* Theme Mode Toggle */}
        <button
          className="theme-toggle-btn"
          onClick={toggleTheme}
          title={`Switch to ${theme === "light" ? "Dark Industrial Theme" : "Light Warm Theme"}`}
          aria-label="Toggle Theme"
        >
          {theme === "light" ? <Moon size={15} /> : <Sun size={15} />}
        </button>
      </div>
    </header>
  );
}
