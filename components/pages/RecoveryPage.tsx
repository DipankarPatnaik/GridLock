import React from "react";
import { Snapshot } from "../../types/gridlock";
import { useGridLock } from "../../context/EngineContext";
import {
  RotateCcw,
  CheckCircle2,
  ShieldAlert,
} from "lucide-react";

export function RecoveryPage({ data }: { data: Snapshot | null }) {
  const { resolveDeadlock, triggerDeadlock } = useGridLock();
  const recovery = data?.recovery;
  const cycle = data?.allocationGraph?.cycle || [];
  const isDeadlocked = cycle.length > 0;
  const active = Boolean(recovery?.active);
  const currentStep = recovery?.step ?? 0;

  const steps = recovery?.steps || [
    "Detect",
    "Analyze",
    "Reroute",
    "Release",
    "Verify",
    "Resume",
  ];

  const stepDescriptions = [
    "Tarjan / DFS identifies circular wait cycle in Wait-For Graph.",
    "Evaluate rollback cost matrix & identify minimum-cost victim process.",
    "Calculate topological bypass path around congested intersection.",
    "Preemptively revoke temporary lock & allocate safe holding slot.",
    "Re-evaluate DFS cycle detector to confirm strictly acyclic state.",
    "Dispatch green-light velocity trajectory commands to resumed fleet.",
  ];

  return (
    <div className="recovery-page-stack">
      {/* Page Header */}
      <div className="section-header-row">
        <div>
          <span className="section-eyebrow">AUTOMATED MITIGATION KERNEL</span>
          <h1 className="section-title">Deadlock Recovery Center</h1>
          <p className="section-desc">
            Deterministic OS resolution pipeline: victim preemption, dynamic topological rerouting, and acyclic verification.
          </p>
        </div>

        <div className="recovery-action-bar">
          {!isDeadlocked && !active ? (
            <button
              className="recovery-trigger-btn conflict"
              onClick={triggerDeadlock}
            >
              <ShieldAlert size={14} />
              <span>Simulate Conflict Cycle</span>
            </button>
          ) : (
            <button
              className="recovery-trigger-btn resolve animate-pulse"
              onClick={resolveDeadlock}
            >
              <RotateCcw size={14} />
              <span>{active ? "Advance Recovery Step →" : "Initiate OS Recovery"}</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Resolution Pipeline Stepper */}
      <section className="dashboard-card recovery-pipeline-card">
        <div className="card-header">
          <div>
            <span className="card-eyebrow">SEQUENTIAL EXECUTION PIPELINE</span>
            <h2 className="card-title">
              {active
                ? `Recovery Active · Step ${currentStep + 1} of ${steps.length}`
                : isDeadlocked
                  ? "Deadlock Detected · Ready to Execute Pipeline"
                  : "Warehouse Flow Stable · Kernel on Standby"}
            </h2>
          </div>

          <span className={`status-pill ${active ? "warning" : isDeadlocked ? "danger" : "normal"}`}>
            {active ? "Pipeline Executing" : isDeadlocked ? "Cycle Blocked" : "Standby"}
          </span>
        </div>

        {/* 6 Step Stepper */}
        <div className="stepper-track">
          {steps.map((stepName, idx) => {
            const isDone = active ? idx < currentStep : false;
            const isCurrent = active ? idx === currentStep : false;

            return (
              <div
                key={stepName}
                className={`step-node ${isDone ? "completed" : ""} ${
                  isCurrent ? "active animate-pulse" : ""
                }`}
              >
                <div className="step-circle mono">
                  {isDone ? <CheckCircle2 size={16} /> : idx + 1}
                </div>
                <div className="step-info">
                  <strong className="step-title">{stepName}</strong>
                  <span className="step-sub">{stepDescriptions[idx]}</span>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Before / After Allocation Comparison & Resolution Details */}
      <div className="recovery-details-grid">
        {/* Left: Active Conflict Breakdown */}
        <section className="dashboard-card conflict-details-card">
          <div className="card-header">
            <div>
              <span className="card-eyebrow">DIAGNOSTIC MATRIX</span>
              <h3 className="card-title">Contention Analysis</h3>
            </div>
            {isDeadlocked && <span className="danger-tag">Incident Active</span>}
          </div>

          <div className="diagnostic-body">
            <div className="diag-row">
              <span className="diag-label">Involved Processes:</span>
              <strong className="diag-val mono text-caput">
                {isDeadlocked ? "R1, R2, R3 (Circular Wait)" : "None (All Processes Free)"}
              </strong>
            </div>

            <div className="diag-row">
              <span className="diag-label">Contested Mutex Locks:</span>
              <strong className="diag-val mono">
                {isDeadlocked ? "I3 (Intersection), I4 (Intersection), I5" : "None"}
              </strong>
            </div>

            <div className="diag-row">
              <span className="diag-label">Identified Victim Process:</span>
              <strong className="diag-val mono text-amber">
                {recovery?.victimRobot || (isDeadlocked ? "R2 (Lowest priority P-2)" : "None Selected")}
              </strong>
            </div>

            <div className="diag-row">
              <span className="diag-label">Mitigation Strategy:</span>
              <span className="diag-val">
                Victim Preemption with Safe Bay WB2 Diversion (Breaks symmetry)
              </span>
            </div>
          </div>

          {/* Before & After Mutex Matrix */}
          <div className="before-after-matrix">
            <div className="matrix-col before">
              <span className="col-title mono">STATE BEFORE RECOVERY</span>
              <div className="matrix-item text-caput">R1 holds I3, wants I4</div>
              <div className="matrix-item text-caput">R2 holds I4, wants I5</div>
              <div className="matrix-item text-caput">R3 holds I5, wants I3</div>
              <small className="matrix-verdict mono text-caput">Result: CIRCULAR STALL</small>
            </div>

            <div className="matrix-col after">
              <span className="col-title mono">STATE AFTER RECOVERY</span>
              <div className="matrix-item text-emerald">R2 preempted ➔ WB2 Bay</div>
              <div className="matrix-item text-emerald">I4 allocated to R1</div>
              <div className="matrix-item text-emerald">Cycle broken ➔ Continuous Flow</div>
              <small className="matrix-verdict mono text-emerald">Result: STRICTLY ACYCLIC</small>
            </div>
          </div>
        </section>

        {/* Right: Verified Recovery Action History */}
        <section className="dashboard-card recovery-history-card">
          <div className="card-header">
            <div>
              <span className="card-eyebrow">VERIFIED AUDIT LOG</span>
              <h3 className="card-title">Recovery Incident History</h3>
            </div>
            <span className="count-badge mono">{recovery?.history?.length || 0} Actions</span>
          </div>

          <div className="history-entries-list">
            {(recovery?.history || []).map((item) => (
              <div key={item.id} className="history-entry-row">
                <div className="entry-status-icon">
                  <CheckCircle2 size={16} className="text-emerald" />
                </div>
                <div className="entry-body">
                  <div className="entry-head">
                    <strong className="entry-action">{item.action}</strong>
                    <span className="entry-time mono">{String(item.timestamp)}</span>
                  </div>
                  <p className="entry-result">{item.result}</p>
                  <div className="entry-meta mono">
                    <span>Victim: {item.victim || "R2"}</span>
                    <span className="dot-sep">•</span>
                    <span>Duration: {item.durationMs || 180}ms</span>
                    <span className="dot-sep">•</span>
                    <span>Status: Verified Safe</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
