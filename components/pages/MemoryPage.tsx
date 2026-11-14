import React, { useState } from "react";
import { Snapshot } from "../../types/gridlock";
import {
  Cpu,
  ChevronDown,
  ChevronUp,
  Flame,
} from "lucide-react";

export function MemoryPage({ data }: { data: Snapshot | null }) {
  const incidents = data?.memory?.incidents || [];
  const activeMatch = data?.memory?.activeMatch;
  const heatmap = data?.memory?.heatmap || [];
  const [expandedId, setExpandedId] = useState<string | null>(incidents[0]?.id || null);

  return (
    <div className="memory-page-stack">
      {/* Page Header */}
      <div className="section-header-row">
        <div>
          <span className="section-eyebrow">SIGNATURE INNOVATION</span>
          <h1 className="section-title">Adaptive Deadlock Memory</h1>
          <p className="section-desc">
            Pattern recognition engine that records historical conflict signatures and proactively prevents recurring circular waiting.
          </p>
        </div>

        <div className="memory-metric-badge">
          <span className="badge-label">PREVENTION EFFICIENCY</span>
          <strong className="badge-val mono text-emerald">94.2%</strong>
        </div>
      </div>

      {/* Pattern Recognition Active Match Hero Banner */}
      <section className="active-pattern-hero">
        <div className="hero-head">
          <div className="hero-icon-box">
            <Cpu size={24} className="text-amber" />
          </div>
          <div className="hero-title-group">
            <div className="hero-tag-row">
              <span className="hero-tag">HEURISTIC PATTERN MATCHER</span>
              <span className="confidence-pill mono">
                {activeMatch ? `${activeMatch.confidence}% Match Confidence` : "Monitoring Inbound Claims"}
              </span>
            </div>
            <h2 className="hero-title">
              {activeMatch ? activeMatch.pattern : "Standby Heuristic Evaluation"}
            </h2>
          </div>
        </div>

        <div className="hero-body-grid">
          <div className="pattern-step-col">
            <span className="step-num mono">01</span>
            <div className="step-content">
              <strong>Inbound Resource Request</strong>
              <p>Robot requests contested mutex on high-density transit corridors.</p>
            </div>
          </div>

          <div className="pattern-step-col">
            <span className="step-num mono">02</span>
            <div className="step-content">
              <strong>Deadlock Memory Lookup</strong>
              <p>Signature compared against stored topological circular wait vectors.</p>
            </div>
          </div>

          <div className="pattern-step-col active">
            <span className="step-num mono">03</span>
            <div className="step-content">
              <strong>Adaptive Prevention Action</strong>
              <p>{activeMatch?.action || "Automatic yield & safe bay holding when collision threshold exceeded."}</p>
            </div>
          </div>
        </div>
      </section>

      {/* Main Memory Layout: Incident Timeline & Spatial Heatmap */}
      <div className="memory-main-grid">
        {/* Left: Spatial Heatmap & Prevention Stats */}
        <div className="memory-left-col">
          {/* Spatial Conflict Heatmap */}
          <div className="dashboard-card heatmap-card">
            <div className="card-header">
              <div className="heatmap-title-wrap">
                <Flame size={16} className="text-amber" />
                <div>
                  <span className="card-eyebrow">SPATIAL CONFLICT DENSITY</span>
                  <h3 className="card-title">Intersection Contention Heatmap</h3>
                </div>
              </div>
              <span className="heatmap-legend-tag mono">High Risk: I3, I4, I5</span>
            </div>

            <div className="heatmap-canvas-grid">
              {heatmap.map((hits, idx) => {
                const opacity = Math.min(0.95, Math.max(0.08, hits * 0.12));
                const isHot = hits >= 4;
                return (
                  <div
                    key={idx}
                    className={`heatmap-cell ${isHot ? "hot-spot" : ""}`}
                    style={{
                      backgroundColor: isHot
                        ? `rgba(99, 32, 36, ${opacity})`
                        : `rgba(201, 149, 86, ${opacity})`,
                    }}
                    title={`Grid Cell #${idx} · Incidents: ${hits}`}
                  />
                );
              })}
            </div>

            <div className="heatmap-footer-notes">
              <div className="hotspot-pill">
                <strong>I3 (North Hub):</strong> 42 Historical Contested Claims
              </div>
              <div className="hotspot-pill">
                <strong>I4 (Center Crossway):</strong> 38 Contested Claims
              </div>
            </div>
          </div>

          {/* Prevention Efficacy Stats */}
          <div className="dashboard-card stats-card">
            <div className="card-header">
              <span className="card-eyebrow">BENCHMARK IMPACT</span>
              <h3 className="card-title">Memory OS vs Blind Allocation</h3>
            </div>
            <div className="stats-comparison-list">
              <div className="stat-comparison-row">
                <span>Avoided Circular Waits</span>
                <strong className="mono text-emerald">29 Incidents</strong>
              </div>
              <div className="stat-comparison-row">
                <span>Average Recovery Overhead Saved</span>
                <strong className="mono">680 ms / event</strong>
              </div>
              <div className="stat-comparison-row">
                <span>False-Positive Stall Rate</span>
                <strong className="mono text-amber">1.4% (Ultra-Low)</strong>
              </div>
            </div>
          </div>
        </div>

        {/* Right: Chronological Incident Archive */}
        <section className="dashboard-card incidents-archive-card">
          <div className="card-header">
            <div>
              <span className="card-eyebrow">CONFLICT SIGNATURE DATABASE</span>
              <h3 className="card-title">Historical Incident Archive</h3>
            </div>
            <span className="count-badge mono">{incidents.length} Learned Signatures</span>
          </div>

          <div className="incident-items-list">
            {incidents.map((inc) => {
              const isExpanded = expandedId === inc.id;

              return (
                <article
                  key={inc.id}
                  className={`incident-entry ${isExpanded ? "expanded" : ""}`}
                  onClick={() => {
                    setExpandedId(isExpanded ? null : inc.id);
                    setSelectedIncident(inc);
                  }}
                >
                  <div className="incident-header-row">
                    <div className="incident-id-box mono">
                      <strong>{inc.id}</strong>
                    </div>

                    <div className="incident-summary-col">
                      <strong className="incident-pattern">{inc.pattern}</strong>
                      <div className="incident-sub-row mono">
                        <span>Loc: {inc.intersection}</span>
                        <span className="dot-sep">•</span>
                        <span>Robots: {inc.involvedRobots.join(", ")}</span>
                        <span className="dot-sep">•</span>
                        <span>Time: {inc.timestamp}</span>
                      </div>
                    </div>

                    <div className="incident-expand-col">
                      <span className="prevented-count mono">
                        {inc.preventedRecurrenceCount ?? 0}× Prevented
                      </span>
                      {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="incident-expanded-details">
                      <div className="details-grid">
                        <div className="detail-box">
                          <span className="detail-label">Resources Involved:</span>
                          <strong className="mono">{inc.resourcesInvolved.join(", ")}</strong>
                        </div>
                        <div className="detail-box">
                          <span className="detail-label">Stored Resolution:</span>
                          <strong>{inc.resolution}</strong>
                        </div>
                        <div className="detail-box">
                          <span className="detail-label">Avoidance Strategy:</span>
                          <span className="mono text-emerald">{inc.recoveryAction}</span>
                        </div>
                      </div>
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        </section>
      </div>
    </div>
  );
}
