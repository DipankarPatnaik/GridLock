import React from "react";
import { useGridLock } from "../../context/EngineContext";
import { Sliders, X, Check } from "lucide-react";

export function SimConfigModal() {
  const {
    showConfigModal,
    setShowConfigModal,
    speed,
    setSpeed,
    addRobot,
    removeRobot,
    snapshot,
  } = useGridLock();

  if (!showConfigModal) return null;

  return (
    <div className="modal-overlay" onClick={() => setShowConfigModal(false)}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <div className="modal-title-wrap">
            <Sliders size={18} className="text-amber" />
            <h3>Simulation Engine Configuration</h3>
          </div>
          <button
            className="modal-close-btn"
            onClick={() => setShowConfigModal(false)}
          >
            <X size={18} />
          </button>
        </div>

        <div className="modal-body">
          <div className="form-group">
            <label>Tick Simulation Speed</label>
            <div className="speed-pills-row">
              {[0.5, 1, 2, 4].map((s) => (
                <button
                  key={s}
                  className={`pill-btn ${speed === s ? "active" : ""}`}
                  onClick={() => setSpeed(s)}
                >
                  {s}×
                </button>
              ))}
            </div>
            <small>Controls the frequency of simulation coordinate updates and graph re-evaluations.</small>
          </div>

          <div className="form-group">
            <label>AGV Fleet Size ({snapshot?.robots?.length ?? 5} Robots)</label>
            <div className="fleet-adjust-row">
              <button className="fleet-btn" onClick={removeRobot}>
                - Remove AGV
              </button>
              <button className="fleet-btn primary" onClick={addRobot}>
                + Add AGV
              </button>
            </div>
          </div>

          <div className="form-group">
            <label>Deadlock Memory Sensitivity Threshold</label>
            <div className="range-wrap">
              <input type="range" min="70" max="98" defaultValue="88" className="slider" />
              <span className="mono">88% Match Minimum</span>
            </div>
            <small>Heuristic threshold required before proactive waiting bay diversion is triggered.</small>
          </div>

          <div className="form-group">
            <label>Graph Cycle Traversal Algorithm</label>
            <select className="select-input mono" defaultValue="dfs">
              <option value="dfs">Tarjan's Strongly Connected Components (DFS)</option>
              <option value="matrix">Transitive Closure Reachability Matrix</option>
            </select>
          </div>
        </div>

        <div className="modal-footer">
          <button
            className="modal-action-btn primary"
            onClick={() => setShowConfigModal(false)}
          >
            Apply & Close
          </button>
        </div>
      </div>
    </div>
  );
}
