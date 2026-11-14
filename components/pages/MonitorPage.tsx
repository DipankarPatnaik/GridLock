import React, { useState } from "react";
import { Snapshot } from "../../types/gridlock";
import { useGridLock } from "../../context/EngineContext";
import {
  ShieldAlert,
  Bot,
  Warehouse,
  ArrowRight,
  Network,
} from "lucide-react";

export function MonitorPage({ data }: { data: Snapshot | null }) {
  const { setPage } = useGridLock();
  const graph = data?.allocationGraph;
  const cycle = graph?.cycle || [];
  const nodes = graph?.nodes || [];
  const edges = graph?.edges || [];

  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [graphMode, setGraphMode] = useState<"rag" | "wfg">("rag");

  const isDeadlocked = cycle.length > 0;
  const selectedNode = nodes.find((n) => n.id === selectedNodeId);

  const robotNodes = nodes.filter((n) => n.type === "robot");
  const resourceNodes = nodes.filter((n) => n.type === "resource");
  const requestEdges = edges.filter((e) => e.type === "requests");
  const holdingEdges = edges.filter((e) => e.type === "holds");

  return (
    <div className="monitor-page-stack">
      {/* Page Header */}
      <div className="section-header-row">
        <div>
          <span className="section-eyebrow">DEPENDENCY GRAPH & DEADLOCK KERNEL</span>
          <h1 className="section-title">Resource Allocation Monitor</h1>
          <p className="section-desc">
            Bipartite Resource Allocation Graph (RAG) and Wait-For Graph with real-time Tarjan/DFS cycle detection.
          </p>
        </div>

        <div className="monitor-controls-row">
          <div className="graph-toggle-pill">
            <button
              className={`toggle-chip ${graphMode === "rag" ? "active" : ""}`}
              onClick={() => setGraphMode("rag")}
            >
              RAG View
            </button>
            <button
              className={`toggle-chip ${graphMode === "wfg" ? "active" : ""}`}
              onClick={() => setGraphMode("wfg")}
            >
              Wait-For Graph
            </button>
          </div>

          <span className={`status-pill ${isDeadlocked ? "danger" : "normal"}`}>
            {isDeadlocked ? "Circular Wait Cycle Detected" : "Strictly Acyclic (Safe)"}
          </span>
        </div>
      </div>

      {/* Info Stats Row */}
      <div className="monitor-kpi-bar">
        <div className="kpi-mini-item">
          <span className="mini-label">Processes (Robots)</span>
          <strong className="mini-val mono">{robotNodes.length}</strong>
        </div>
        <div className="kpi-mini-item">
          <span className="mini-label">Contested Resources</span>
          <strong className="mini-val mono">{resourceNodes.length}</strong>
        </div>
        <div className="kpi-mini-item">
          <span className="mini-label">Active Allocations</span>
          <strong className="mini-val mono">{holdingEdges.length}</strong>
        </div>
        <div className="kpi-mini-item">
          <span className="mini-label">Pending Requests</span>
          <strong className="mini-val mono text-amber">{requestEdges.length}</strong>
        </div>
        <div className="kpi-mini-item">
          <span className="mini-label">Detected Cycles</span>
          <strong className={`mini-val mono ${isDeadlocked ? "text-caput font-bold" : ""}`}>
            {isDeadlocked ? "1 (Critical)" : "0"}
          </strong>
        </div>
      </div>

      {/* Main Interactive Graph Stage & Inspector */}
      <div className="monitor-grid">
        <section className="dashboard-card graph-stage-card">
          <div className="card-header">
            <div className="stage-title-wrap">
              <span className="card-eyebrow">OS KERNEL GRAPH</span>
              <h3 className="card-title">
                {graphMode === "rag"
                  ? "Bipartite Resource Allocation Graph"
                  : "Direct Wait-For Process Dependency Graph"}
              </h3>
            </div>

            <div className="graph-legend-strip">
              <div className="legend-item">
                <span className="legend-node-sample robot" />
                <span>Process (Robot)</span>
              </div>
              <div className="legend-item">
                <span className="legend-node-sample resource" />
                <span>Resource (Mutex)</span>
              </div>
              <div className="legend-item">
                <span className="legend-edge-sample holds" />
                <span>Held Lock</span>
              </div>
              <div className="legend-item">
                <span className="legend-edge-sample requests" />
                <span>Claim / Request</span>
              </div>
            </div>
          </div>

          {/* SVG Graph Viewport */}
          <div className="graph-viewport-box">
            <svg className="graph-edges-svg" viewBox="0 0 100 100" preserveAspectRatio="none">
              <defs>
                <marker
                  id="arrow-hold"
                  viewBox="0 0 10 10"
                  refX="6"
                  refY="5"
                  markerWidth="6"
                  markerHeight="6"
                  orient="auto-start-reverse"
                >
                  <path d="M 0 1 L 8 5 L 0 9 z" fill="var(--primary-accent)" />
                </marker>
                <marker
                  id="arrow-req"
                  viewBox="0 0 10 10"
                  refX="6"
                  refY="5"
                  markerWidth="6"
                  markerHeight="6"
                  orient="auto-start-reverse"
                >
                  <path d="M 0 1 L 8 5 L 0 9 z" fill="var(--text-secondary)" />
                </marker>
                <marker
                  id="arrow-cycle"
                  viewBox="0 0 10 10"
                  refX="6"
                  refY="5"
                  markerWidth="7"
                  markerHeight="7"
                  orient="auto-start-reverse"
                >
                  <path d="M 0 0 L 8 5 L 0 10 z" fill="#632024" />
                </marker>
              </defs>

              {/* Render edges */}
              {edges.map((edge, idx) => {
                const fromNode = nodes.find((n) => n.id === edge.from);
                const toNode = nodes.find((n) => n.id === edge.to);
                if (!fromNode || !toNode) return null;

                const inCycle = edge.inCycle || (cycle.includes(edge.from) && cycle.includes(edge.to));
                const markerId = inCycle
                  ? "url(#arrow-cycle)"
                  : edge.type === "holds"
                    ? "url(#arrow-hold)"
                    : "url(#arrow-req)";

                return (
                  <line
                    key={edge.id || idx}
                    x1={fromNode.px ?? 50}
                    y1={fromNode.py ?? 50}
                    x2={toNode.px ?? 50}
                    y2={toNode.py ?? 50}
                    className={`graph-edge-line ${edge.type} ${inCycle ? "cycle-edge" : ""}`}
                    markerEnd={markerId}
                    vectorEffect="non-scaling-stroke"
                  />
                );
              })}
            </svg>

            {/* Render Nodes as Interactive HTML Elements */}
            {nodes.map((node) => {
              const isRobot = node.type === "robot";
              const inCycle = cycle.includes(node.id);
              const isSelected = selectedNodeId === node.id;

              return (
                <button
                  key={node.id}
                  className={`graph-node-btn ${node.type} ${inCycle ? "cycle-deadlocked animate-pulse" : ""} ${
                    isSelected ? "selected-node" : ""
                  }`}
                  style={{
                    left: `${node.px ?? 50}%`,
                    top: `${node.py ?? 50}%`,
                  }}
                  onClick={() => setSelectedNodeId(node.id)}
                  title={`${node.type?.toUpperCase()} ${node.id}`}
                >
                  <span className="node-icon">
                    {isRobot ? <Bot size={13} /> : <Warehouse size={13} />}
                  </span>
                  <span className="node-label mono">{node.label || node.id}</span>
                </button>
              );
            })}
          </div>

          {/* Cycle Explanation Banner if deadlocked */}
          {isDeadlocked && graph?.explanation && (
            <div className="cycle-analysis-card animate-pulse">
              <div className="cycle-head">
                <ShieldAlert size={18} className="text-caput" />
                <div>
                  <strong>Circular Dependency Detected by DFS Traversal</strong>
                  <p className="cycle-text">{graph.explanation}</p>
                </div>
              </div>
              <button
                className="cycle-action-btn"
                onClick={() => setPage("Recovery")}
              >
                <span>Inspect Recovery Options</span>
                <ArrowRight size={14} />
              </button>
            </div>
          )}
        </section>

        {/* Node Inspector Side Panel */}
        <aside className="monitor-inspector-panel">
          <div className="dashboard-card inspector-card">
            <div className="card-header">
              <div>
                <span className="card-eyebrow">SELECTION INSPECTION</span>
                <h3 className="card-title">
                  {selectedNode ? `${selectedNode.type?.toUpperCase()} ${selectedNode.id}` : "Graph Inspector"}
                </h3>
              </div>
            </div>

            {selectedNode ? (
              <div className="inspector-content">
                <div className="stat-grid">
                  <div className="stat-item">
                    <span className="stat-label">Node Type</span>
                    <span className="stat-val mono">{selectedNode.type}</span>
                  </div>
                  <div className="stat-item">
                    <span className="stat-label">Cycle Status</span>
                    <span className={`stat-val ${cycle.includes(selectedNode.id) ? "text-caput font-bold" : "text-emerald"}`}>
                      {cycle.includes(selectedNode.id) ? "DEADLOCKED" : "CLEAR"}
                    </span>
                  </div>
                </div>

                <div className="detail-section">
                  <h4>Held Resources</h4>
                  <div className="tag-list">
                    {edges
                      .filter((e) => e.to === selectedNode.id && e.type === "holds")
                      .map((e) => (
                        <span key={e.from} className="res-tag held mono">
                          {e.from} (Held)
                        </span>
                      ))}
                    {!edges.some((e) => e.to === selectedNode.id && e.type === "holds") && (
                      <span className="text-muted">None</span>
                    )}
                  </div>
                </div>

                <div className="detail-section">
                  <h4>Pending Requests (Waiting For)</h4>
                  <div className="tag-list">
                    {edges
                      .filter((e) => e.from === selectedNode.id && e.type === "requests")
                      .map((e) => (
                        <span key={e.to} className="res-tag req mono">
                          {e.to} (Blocked)
                        </span>
                      ))}
                    {!edges.some((e) => e.from === selectedNode.id && e.type === "requests") && (
                      <span className="text-muted">None</span>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="empty-inspector-prompt">
                <Network size={24} className="prompt-icon" />
                <strong>Select Any Node</strong>
                <p>Click any process or resource node in the graph above to inspect its mutex dependencies.</p>
              </div>
            )}
          </div>

          {/* Algorithm Reference Box */}
          <div className="dashboard-card algo-reference-card">
            <div className="card-header">
              <span className="card-eyebrow">ALGORITHM THEORY</span>
              <h4 className="card-title">Cycle Detection via DFS</h4>
            </div>
            <p className="reference-text">
              Wait-For Graph represents direct process-to-process blocking edges. A directed cycle in a single-unit resource environment is a necessary and sufficient condition for deadlock.
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}
