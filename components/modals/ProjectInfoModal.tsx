import React from "react";
import { useGridLock } from "../../context/EngineContext";
import { Info, X, Cpu, GitGraph, ShieldCheck, Database, Layers } from "lucide-react";

export function ProjectInfoModal() {
  const { showProjectModal, setShowProjectModal } = useGridLock();

  if (!showProjectModal) return null;

  return (
    <div className="modal-overlay" onClick={() => setShowProjectModal(false)}>
      <div className="modal-card wide" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <div className="modal-title-wrap">
            <Info size={18} className="text-amber" />
            <h3>GridLock Architecture & OS Theory Reference</h3>
          </div>
          <button
            className="modal-close-btn"
            onClick={() => setShowProjectModal(false)}
          >
            <X size={18} />
          </button>
        </div>

        <div className="modal-body viva-content">
          <section className="viva-section">
            <h4>1. System Architecture & C Core Integration</h4>
            <p>
              GridLock is an Operating Systems project designed to model resource competition in autonomous multi-robot warehouse systems.
              All core OS algorithms—Wait-For Graph generation, DFS cycle detection, resource mutex management, and Deadlock Memory caching—are specified and calculated by the C engine. The frontend serves as a high-fidelity visual digital twin.
            </p>
          </section>

          <section className="viva-section">
            <h4>2. The Four Coffman Conditions in Warehouse Robotics</h4>
            <div className="coffman-grid">
              <div className="coffman-item">
                <strong>1. Mutual Exclusion</strong>
                <p>Only one robot can occupy a physical intersection or narrow pathway slot at any given time.</p>
              </div>
              <div className="coffman-item">
                <strong>2. Hold and Wait</strong>
                <p>A robot currently holding its pathway segment claims and waits for an intersection lock.</p>
              </div>
              <div className="coffman-item">
                <strong>3. No Preemption</strong>
                <p>Physical robots cannot be evaporated or forcibly displaced without a controlled recovery routing step.</p>
              </div>
              <div className="coffman-item">
                <strong>4. Circular Wait</strong>
                <p>Robot R1 waits for R2; R2 waits for R3; R3 waits for R1, closing a directed cycle in the Wait-For Graph.</p>
              </div>
            </div>
          </section>

          <section className="viva-section">
            <h4>3. GridLock's Signature Contribution: Deadlock Memory</h4>
            <p>
              Unlike traditional Banker's Algorithm (which suffers from conservative false-positive locks and low throughput) or pure Detection/Recovery (which incurs painful physical rollback latency), <strong>Deadlock Memory</strong> maintains an adaptive hash of historical conflict topology signatures:
            </p>
            <div className="code-pill mono">
              ConflictSignature = Hash(Intersection_ID, Robot_Priorities, Approach_Angle_Delta, Contested_Mutexes)
            </div>
            <p>
              When a newly requested claim matches a historical conflict signature above the confidence threshold, the OS applies a proactive asymmetric speed delay or routes the lower-priority robot into a safe waiting bay (WB1-WB4), completely averting the cycle before deadlock can materialize.
            </p>
          </section>

          <section className="viva-section">
            <h4>4. Recovery Strategy: Minimum-Cost Victim Preemption</h4>
            <p>
              When an unpredicted deadlock occurs, the recovery engine calculates a victim selection score:
              <br />
              <code className="mono">Cost(R) = (Held_Resources * Weight) + (Priority * Weight) - Distance_To_Safe_Bay</code>
              <br />
              The lowest-cost robot is selected as victim, allocated a reroute detour through a safe bypass corridor, and the held lock is transferred to break the cycle.
            </p>
          </section>
        </div>

        <div className="modal-footer">
          <button
            className="modal-action-btn primary"
            onClick={() => setShowProjectModal(false)}
          >
            Close Reference
          </button>
        </div>
      </div>
    </div>
  );
}
