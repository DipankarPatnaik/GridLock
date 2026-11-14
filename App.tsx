import React, { useEffect, useState, useRef, useMemo, useCallback } from "react";
import {
  Forklift,
  Resource,
  SimulationState,
  ComparisonResult,
  ActivePage,
  BankerProcess,
  BankerResource,
  BankerSafetyResult,
} from "./simulation/types";
import {
  createInitialState,
  createInitialFleet,
  createFreshResources,
  updateSimulation,
  updateWaitForGraphAndCycles,
  loadDeadlockScenario,
  advanceToNextStep,
  replayScenario,
  runHeadlessComparison,
  DEADLOCK_SCENARIOS,
  DEFAULT_BANKER_PROCESSES,
  DEFAULT_BANKER_RESOURCES,
  runBankerSafetyCheck,
  requestBankerResources,
} from "./simulation/simulationEngine";

type IconName =
  | "play"
  | "pause"
  | "reset"
  | "step"
  | "arrow"
  | "check"
  | "alert"
  | "users"
  | "info"
  | "replay"
  | "cpu"
  | "shield"
  | "chart"
  | "book"
  | "layers";

function Icon({ name, size = 16 }: { name: IconName; size?: number }) {
  const paths: Record<IconName, React.ReactNode> = {
    play: <path d="m9 7 7 5-7 5V7Z" fill="currentColor" stroke="none" />,
    pause: <path d="M9 7v10M15 7v10" />,
    reset: <path d="M5 9a8 8 0 1 1 .3 6.5M5 9V4m0 5h5" />,
    step: (
      <>
        <polygon points="6,5 14,12 6,19" fill="currentColor" stroke="none" />
        <line x1="18" y1="5" x2="18" y2="19" strokeWidth="2.5" />
      </>
    ),
    arrow: <path d="M5 12h14m-5-5 5 5-5 5" />,
    check: <path d="m5 12 4 4L19 7" />,
    alert: (
      <>
        <path d="M10.3 3.7 2.5 17.2A2 2 0 0 0 4.2 20h15.6a2 2 0 0 0 1.7-2.8L13.7 3.7a2 2 0 0 0-3.4 0Z" />
        <path d="M12 9v4M12 17h.01" />
      </>
    ),
    users: (
      <>
        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </>
    ),
    info: (
      <>
        <circle cx="12" cy="12" r="10" />
        <path d="M12 16v-4M12 8h.01" />
      </>
    ),
    replay: <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8m0-5v5h5" />,
    cpu: (
      <>
        <rect x="4" y="4" width="16" height="16" rx="2" />
        <path d="M9 9h6v6H9zM9 1v3M15 1v3M9 20v3M15 20v3M20 9h3M20 15h3M1 9h3M1 15h3" />
      </>
    ),
    shield: <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />,
    chart: (
      <>
        <line x1="18" y1="20" x2="18" y2="10" />
        <line x1="12" y1="20" x2="12" y2="4" />
        <line x1="6" y1="20" x2="6" y2="14" />
      </>
    ),
    book: (
      <>
        <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1-2.5-2.5Z" />
        <path d="M6 6h10M6 10h10" />
      </>
    ),
    layers: (
      <>
        <polygon points="12 2 2 7 12 12 22 7 12 2" />
        <polyline points="2 17 12 22 22 17" />
        <polyline points="2 12 12 17 22 12" />
      </>
    ),
  };
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {paths[name]}
    </svg>
  );
}

// ----------------------------------------------------
// REALISTIC TOP-DOWN FORKLIFT WITH CARGO & TAGS
// ----------------------------------------------------
function RealisticForklift({
  vehicle,
  isSelected,
  isDimmed,
}: {
  vehicle: Forklift;
  isSelected?: boolean;
  isDimmed?: boolean;
}) {
  const isDeadlocked = vehicle.status === "deadlocked";
  const isWaiting = vehicle.status === "waiting";
  const isLoading = vehicle.status === "loading";
  const isLoaded = vehicle.cargoState === "loaded";
  const crateColor = vehicle.currentJob?.itemColor || "#b78a50";

  return (
    <g
      className={`forklift ${isSelected ? "selected" : ""}`}
      transform={`translate(${vehicle.x}, ${vehicle.y})`}
      opacity={isDimmed ? 0.35 : 1}
    >
      {/* Drop Shadow */}
      <ellipse cx="0" cy="12" rx="24" ry="7" fill="#111412" opacity="0.4" />

      {/* Deadlock or Waiting Ring */}
      {isDeadlocked ? (
        <circle className="wait-ring" r="28" stroke="#bd5948" strokeWidth="2.8" />
      ) : isWaiting ? (
        <circle className="wait-ring" r="28" stroke="#d9924d" strokeWidth="2.2" />
      ) : null}

      {/* Rotating chassis with forks and cargo */}
      <g transform={`rotate(${vehicle.heading})`}>
        {/* Rear Counterweight Wheels */}
        <circle cx="-13" cy="13" r="4.5" fill="#141715" stroke="#717974" strokeWidth="1.5" />
        <circle cx="-13" cy="-13" r="4.5" fill="#141715" stroke="#717974" strokeWidth="1.5" />
        {/* Front Drive Wheels */}
        <circle cx="11" cy="13" r="4.5" fill="#141715" stroke="#717974" strokeWidth="1.5" />
        <circle cx="11" cy="-13" r="4.5" fill="#141715" stroke="#717974" strokeWidth="1.5" />

        {/* Forklift Body */}
        <rect
          x="-18"
          y="-13"
          width="35"
          height="26"
          rx="4.5"
          fill={vehicle.color}
          stroke="#161a18"
          strokeWidth="2"
        />

        {/* Overhead Operator Cage */}
        <rect x="-12" y="-9" width="14" height="18" rx="2" fill="#202724" />
        <line x1="-12" y1="0" x2="2" y2="0" stroke="#3e4c47" strokeWidth="1" />

        {/* Front Forks Carriage Mast */}
        <path d="M17 -10h6v20h-6" stroke="#1d2220" strokeWidth="2.5" fill="none" />

        {/* Visual Cargo Representation: Bare Forks vs Strapped Crate */}
        {isLoaded ? (
          /* Loaded: Wooden Pallet with Strapped Freight Crate */
          <g transform="translate(23, -11)">
            <rect x="0" y="0" width="22" height="22" rx="2" fill="#8c6537" stroke="#5a3d1f" strokeWidth="1.2" />
            <rect x="2" y="2" width="18" height="18" rx="1.5" fill={crateColor} opacity="0.9" stroke="#333" strokeWidth="1" />
            <line x1="7" y1="2" x2="7" y2="20" stroke="#1f2321" strokeWidth="1.5" />
            <line x1="15" y1="2" x2="15" y2="20" stroke="#1f2321" strokeWidth="1.5" />
            <line x1="2" y1="11" x2="20" y2="11" stroke="#1f2321" strokeWidth="1.2" />
          </g>
        ) : (
          /* Empty: Bare Steel Forks projecting forward */
          <g stroke="#9ca3af" strokeWidth="2" fill="none">
            <line x1="20" y1="-6" x2="36" y2="-6" strokeLinecap="round" />
            <line x1="20" y1="6" x2="36" y2="6" strokeLinecap="round" />
          </g>
        )}

        {/* Amber Safety Beacon */}
        <circle cx="10" cy="-6" r="2.8" fill="#f59e0b" className="beacon" />
      </g>

      {/* Simple Number Tag & Status Badge */}
      <g transform="translate(-18, -32)">
        <rect
          width="36"
          height="16"
          rx="3.5"
          fill="#171b18"
          stroke={isDeadlocked ? "#bd5948" : isWaiting ? "#d9924d" : isLoading ? "#38bdf8" : "#4a544e"}
          strokeWidth="1.4"
        />
        <text
          x="18"
          y="11.5"
          fill={isDeadlocked ? "#fca5a5" : isWaiting ? "#fde68a" : isLoading ? "#7dd3fc" : "#f3f4f6"}
          fontSize="9"
          fontWeight="700"
          textAnchor="middle"
          fontFamily="IBM Plex Mono, monospace"
        >
          {isDeadlocked ? `${vehicle.id} STUCK` : isWaiting ? `${vehicle.id} WAIT` : isLoading ? `${vehicle.id} DWELL` : vehicle.id}
        </text>
      </g>
    </g>
  );
}

// Storage Rack Component
function Rack({
  x,
  y,
  label,
  hue = "brown",
}: {
  x: number;
  y: number;
  label: string;
  hue?: "brown" | "green";
}) {
  const box = hue === "green" ? "#53665b" : "#765e43";
  return (
    <g transform={`translate(${x} ${y})`}>
      <rect width="250" height="74" rx="4" fill="#2d3330" stroke="#48514b" />
      {[8, 68, 128, 188].map((px, i) => (
        <rect
          key={px}
          x={px}
          y="9"
          width="52"
          height="56"
          rx="2"
          fill={i % 2 ? "#6d543c" : box}
          stroke="#8a765c"
          opacity="0.95"
        />
      ))}
      <path d="M4 4v66M246 4v66M64 4v66M124 4v66M184 4v66" stroke="#1c201e" strokeWidth="4" />
      <text
        x="125"
        y="-8"
        fill="#737a74"
        fontSize="9.5"
        textAnchor="middle"
        fontFamily="IBM Plex Mono, monospace"
        letterSpacing="2"
      >
        {label}
      </text>
    </g>
  );
}

// ----------------------------------------------------
// 2D WAREHOUSE SVG CANVAS (ONE SOURCE OF TRUTH RENDERER)
// ----------------------------------------------------
function WarehouseCanvas({
  state,
  selectedVehicleId,
  onSelectVehicle,
}: {
  state: SimulationState;
  selectedVehicleId: string;
  onSelectVehicle: (id: string) => void;
}) {
  const forkliftMap = useMemo(() => {
    const map = new Map<string, Forklift>();
    state.forklifts.forEach((f) => map.set(f.id, f));
    return map;
  }, [state.forklifts]);

  return (
    <div className="warehouse">
      <svg
        viewBox="0 0 1200 620"
        role="img"
        aria-label="Live warehouse simulation map with continuous autonomous forklifts and Wait-For Graph dependency arrows"
      >
        <defs>
          <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
            <path d="M40 0H0V40" fill="none" stroke="#333b37" strokeWidth="1" opacity="0.5" />
          </pattern>
          <pattern id="hazardStripe" width="20" height="20" patternTransform="rotate(45 0 0)" patternUnits="userSpaceOnUse">
            <line x1="0" y1="0" x2="0" y2="20" stroke="#bd5948" strokeWidth="5" opacity="0.4" />
          </pattern>

          {/* Crimson Deadlock Arrowhead */}
          <marker
            id="deadlockArrow"
            viewBox="0 0 10 10"
            refX="9"
            refY="5"
            markerWidth="7"
            markerHeight="7"
            orient="auto"
          >
            <path d="M 0 1.5 L 8.5 5 L 0 8.5 z" fill="#bd5948" />
          </marker>

          {/* Amber Normal Waiting Arrowhead */}
          <marker
            id="waitingArrow"
            viewBox="0 0 10 10"
            refX="9"
            refY="5"
            markerWidth="7"
            markerHeight="7"
            orient="auto"
          >
            <path d="M 0 1.5 L 8.5 5 L 0 8.5 z" fill="#d9924d" />
          </marker>
        </defs>

        {/* Floor Base */}
        <rect width="1200" height="620" fill="#202522" />
        <rect x="1" y="1" width="1198" height="618" rx="3" fill="url(#grid)" stroke="#3e4742" strokeWidth="2" />

        {/* Zone Boundaries / Markings */}
        <rect x="25" y="60" width="920" height="150" fill="rgba(255,255,255,0.015)" rx="4" />
        <rect x="25" y="420" width="920" height="120" fill="rgba(255,255,255,0.015)" rx="4" />

        {/* Painted Industrial Lane Dividers (Double Yellow Centerline) */}
        <path
          d="M18 328H1160M18 332H1160"
          stroke="#eab308"
          strokeWidth="1.5"
          opacity="0.4"
        />
        {/* Aisle Dashed Centerlines */}
        <path
          d="M318 42V575M630 42V575M960 42V575"
          stroke="#eab308"
          strokeWidth="1.5"
          strokeDasharray="10 10"
          opacity="0.35"
        />

        {/* Aisle & Zone Headings */}
        <g fill="#616b65" fontFamily="IBM Plex Mono, monospace" fontSize="10" letterSpacing="2">
          <text x="303" y="28">AISLE 01</text>
          <text x="615" y="28">AISLE 02</text>
          <text x="945" y="28">AISLE 03</text>
          <text x="45" y="598" fill="#4b5550">ZONE 1: HIGH-BAY STORAGE</text>
          <text x="560" y="598" fill="#4b5550">ZONE 2: ARTERIAL CROSSWAY</text>
          <text x="1015" y="598" fill="#4b5550">ZONE 3 & 4: LOGISTICS APRON</text>
        </g>

        {/* Storage Racks */}
        <Rack x={38} y={82} label="RACK A · BULK AUTO" />
        <Rack x={350} y={82} label="RACK B · ELECTRONICS" hue="green" />
        <Rack x={662} y={82} label="RACK C · RAW MATERIALS" />
        <Rack x={38} y={445} label="RACK D · INBOUND STAGING" hue="green" />
        <Rack x={662} y={445} label="RACK E · FASTENERS & TOOLS" />

        {/* Inbound Loading Docks */}
        <g transform="translate(1010 68)">
          <rect width="150" height="126" rx="4" fill="#1b201d" stroke="#4a514c" />
          <path d="M15 25h120M15 62h120M15 99h120" stroke="#383e3a" strokeWidth="2" />
          <path d="M45 18v88M105 18v88" stroke="#6d736e" strokeWidth="4" />
          <text x="75" y="-10" textAnchor="middle" fill="#737a74" fontSize="10" fontFamily="IBM Plex Mono, monospace" letterSpacing="2">
            LOADING DOCKS
          </text>
          <text x="27" y="50" fill="#d8d2c2" fontSize="10" fontFamily="IBM Plex Mono, monospace">D-1</text>
          <text x="87" y="87" fill="#d8d2c2" fontSize="10" fontFamily="IBM Plex Mono, monospace">D-2</text>
        </g>

        {/* Rapid Charge Bays */}
        <g transform="translate(1015 460)">
          <rect width="140" height="83" rx="5" fill="#1b201d" stroke="#59615c" />
          <path d="M18 20h36v44H18zM84 20h36v44H84z" fill="#2d3732" stroke="#78917e" />
          <path d="m34 27-8 17h9l-2 13 11-20h-9l-1-10ZM100 27l-8 17h9l-2 13 11-20h-9l-1-10Z" fill="#c6a157" />
          <text x="70" y="102" textAnchor="middle" fill="#737a74" fontSize="10" fontFamily="IBM Plex Mono, monospace" letterSpacing="2">
            RAPID CHARGE BAYS
          </text>
        </g>

        {/* Buffer Staging Bays */}
        <g transform="translate(450 385)">
          <rect width="50" height="40" rx="3" fill="#1c221e" stroke="#48534b" strokeDasharray="4 3" />
          <text x="25" y="24" textAnchor="middle" fill="#78847c" fontSize="9" fontFamily="IBM Plex Mono, monospace">BAY 1</text>
        </g>
        <g transform="translate(760 310)">
          <rect width="50" height="40" rx="3" fill="#1c221e" stroke="#48534b" strokeDasharray="4 3" />
          <text x="25" y="24" textAnchor="middle" fill="#78847c" fontSize="9" fontFamily="IBM Plex Mono, monospace">BAY 2</text>
        </g>

        {/* Contested & Owned Mutex Resources */}
        {Object.values(state.resources).map((res) => {
          if (!res.owner) return null;
          const ownerFk = forkliftMap.get(res.owner);
          const isDeadlockZone = state.isDeadlocked && state.deadlockedForkliftIds.includes(res.owner);

          return (
            <g key={`res-halo-${res.id}`}>
              {isDeadlockZone && (
                <rect x={res.x} y={res.y} width={res.width} height={res.height} fill="url(#hazardStripe)" rx="4" />
              )}
              <rect
                x={res.x}
                y={res.y}
                width={res.width}
                height={res.height}
                rx="4"
                fill={isDeadlockZone ? "rgba(189, 89, 72, 0.24)" : "rgba(217, 146, 77, 0.12)"}
                stroke={isDeadlockZone ? "#bd5948" : (ownerFk?.color || "#d9924d")}
                strokeWidth={isDeadlockZone ? "2.5" : "1.8"}
                strokeDasharray={isDeadlockZone ? "6 4" : "none"}
              />
              <g transform={`translate(${res.x + res.width / 2}, ${res.y - 10})`}>
                <rect x="-50" y="-8" width="100" height="16" rx="4" fill="#151916" stroke={isDeadlockZone ? "#bd5948" : (ownerFk?.color || "#4e5951")} strokeWidth="1" />
                <text x="0" y="3.5" fill={isDeadlockZone ? "#fca5a5" : "#e5e7eb"} fontSize="8" fontWeight="700" textAnchor="middle" fontFamily="IBM Plex Mono, monospace">
                  Held by Forklift {res.owner}
                </text>
              </g>
            </g>
          );
        })}

        {/* NUMBERED WAIT-FOR GRAPH DEPENDENCY ARROWS */}
        {state.wfgEdges.map((edge, idx) => {
          const fromFk = forkliftMap.get(edge.from);
          const toFk = forkliftMap.get(edge.to);
          if (!fromFk || !toFk) return null;
          const isDeadlock = edge.isCycle;
          const midX = (fromFk.x + toFk.x) / 2;
          const midY = (fromFk.y + toFk.y) / 2;
          const numCircle = ["①", "②", "③", "④", "⑤", "⑥"][edge.order - 1] || `(${edge.order})`;

          return (
            <g key={`wfg-arrow-${edge.from}-${edge.to}-${idx}`}>
              <line
                x1={fromFk.x}
                y1={fromFk.y}
                x2={toFk.x}
                y2={toFk.y}
                stroke={isDeadlock ? "#bd5948" : "#d9924d"}
                strokeWidth={isDeadlock ? 3.5 : 2}
                strokeDasharray={isDeadlock ? "8 5" : "5 5"}
                markerEnd={isDeadlock ? "url(#deadlockArrow)" : "url(#waitingArrow)"}
                className={isDeadlock ? "dependency-arrow-deadlock" : "dependency-arrow-waiting"}
              />
              <g transform={`translate(${midX}, ${midY - 12})`}>
                <rect x="-60" y="-9" width="120" height="18" rx="9" fill="#131614" stroke={isDeadlock ? "#bd5948" : "#d9924d"} strokeWidth="1.2" />
                <text x="0" y="3.5" fill={isDeadlock ? "#fca5a5" : "#fef08a"} fontSize="8" fontWeight="700" textAnchor="middle" fontFamily="IBM Plex Mono, monospace">
                  {numCircle} {edge.from} → {edge.to} {isDeadlock ? "STUCK" : "WAIT"}
                </text>
              </g>
            </g>
          );
        })}

        {/* FORKLIFTS (CONTINUOUS KINEMATICS) */}
        {state.forklifts.map((v) => {
          const isDimmed = state.isDeadlocked && !state.deadlockedForkliftIds.includes(v.id);
          return (
            <g key={v.id} onClick={() => onSelectVehicle(v.id)} style={{ cursor: "pointer" }}>
              <RealisticForklift vehicle={v} isSelected={selectedVehicleId === v.id} isDimmed={isDimmed} />
            </g>
          );
        })}
      </svg>
    </div>
  );
}

// ----------------------------------------------------
// FOUR CONDITIONS CHECKLIST CARD (CORE OS LESSON)
// ----------------------------------------------------
function FourConditionsCard({ state }: { state: SimulationState }) {
  const { fourConditions, easiestConditionToBreak, easiestConditionTip } = state;

  return (
    <div className={`conditions-card ${fourConditions.allMet ? "all-met" : ""}`}>
      <div className="conditions-card-title">
        <span>The 4 Coffman Deadlock Conditions</span>
        <span style={{ fontSize: 10, color: fourConditions.allMet ? "var(--red)" : "var(--muted)" }}>
          {fourConditions.allMet ? "4/4 ACTIVE" : "0/4 LOCKED"}
        </span>
      </div>

      <div className="condition-item checked">
        <span className="condition-checkbox"><Icon name="check" size={11} /></span>
        <div>
          <strong>Only one at a time</strong> (Mutual exclusion)
          <div style={{ fontSize: 10.5, color: "#8a968d" }}>A junction or bay can only be occupied by one forklift.</div>
        </div>
      </div>

      <div className={`condition-item ${fourConditions.holdAndWait ? "checked" : ""}`}>
        <span className="condition-checkbox">{fourConditions.holdAndWait ? <Icon name="check" size={11} /> : null}</span>
        <div>
          <strong>Holding one, waiting for another</strong> (Hold and wait)
          <div style={{ fontSize: 10.5, color: "#8a968d" }}>
            {fourConditions.holdAndWait
              ? "Forklifts are holding their current spots while requesting another."
              : "No vehicle is holding a spot while waiting for another."}
          </div>
        </div>
      </div>

      <div className="condition-item checked">
        <span className="condition-checkbox"><Icon name="check" size={11} /></span>
        <div>
          <strong>Can't be forced to give up</strong> (No preemption)
          <div style={{ fontSize: 10.5, color: "#8a968d" }}>Forklifts cannot forcibly evict another vehicle from its spot.</div>
        </div>
      </div>

      <div className={`condition-item ${fourConditions.circularWait ? "checked" : ""}`}>
        <span className="condition-checkbox">{fourConditions.circularWait ? <Icon name="check" size={11} /> : null}</span>
        <div>
          <strong>A loop of waiting</strong> (Circular wait)
          <div style={{ fontSize: 10.5, color: "#8a968d" }}>
            {fourConditions.circularWait
              ? "Every vehicle in the chain waits for the next vehicle."
              : "No closed loop of waiting vehicles exists."}
          </div>
        </div>
      </div>

      <div className={`conditions-verdict ${fourConditions.allMet ? "danger" : "safe"}`}>
        {fourConditions.allMet
          ? "All four are true → DEADLOCK!"
          : "Not all conditions met → Normal flow guaranteed."}
      </div>

      {fourConditions.allMet && (
        <div style={{ fontSize: 11, background: "#151916", padding: "8px 10px", borderRadius: 4, color: "#dfd8cb" }}>
          <strong style={{ color: "var(--orange)" }}>Easiest condition to break: </strong>
          {easiestConditionToBreak} ({easiestConditionTip})
        </div>
      )}
    </div>
  );
}

// ----------------------------------------------------
// LIVE STEP LIST ("WHAT'S HAPPENING")
// ----------------------------------------------------
function GuidedStepList({ state }: { state: SimulationState }) {
  if (state.mode !== "deadlock" || state.steps.length === 0) return null;

  return (
    <div className="steplist-card">
      <div className="steplist-title">
        <span>What's Happening (Step by Step)</span>
        <span style={{ fontSize: 10, color: "var(--orange)" }}>
          STEP {state.currentStepIndex + 1} OF {state.steps.length}
        </span>
      </div>

      <div className="steplist-items">
        {state.steps.map((st, i) => {
          const isActive = i === state.currentStepIndex;
          const isFinal = i === state.steps.length - 1 && state.isDeadlocked;
          return (
            <div key={st.id} className={`step-row ${isActive ? "active" : ""} ${isFinal ? "deadlock-final" : ""}`}>
              <span className="step-index-badge">0{st.id}</span>
              <div>{st.text}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ----------------------------------------------------
// EXPLANATION PANEL
// ----------------------------------------------------
function ExplanationPanel({ state }: { state: SimulationState }) {
  const [showDetail, setShowDetail] = useState(false);

  return (
    <div className={`deadlock-explainer-panel ${state.isDeadlocked ? "" : "normal-headway"}`}>
      <div className="explainer-header">
        <div className={`explainer-title ${state.isDeadlocked ? "danger" : "info"}`}>
          <Icon name={state.isDeadlocked ? "alert" : "info"} size={18} />
          {state.explanation.headline}
        </div>
      </div>

      <div className={`explainer-summary-sentence ${state.isDeadlocked ? "" : "info"}`}>
        {state.explanation.narrative.map((line, i) => (
          <p key={i} style={{ margin: i > 0 ? "6px 0 0" : 0 }}>{line}</p>
        ))}
      </div>

      <div style={{ display: "flex", alignItems: "flex-start", gap: 10, fontSize: 12.5, color: "#d2cbbe", margin: "10px 0" }}>
        <strong style={{ color: "var(--orange)", flexShrink: 0 }}>Real-life analogy:</strong>
        <span>{state.explanation.analogy}</span>
      </div>

      <div style={{ display: "flex", alignItems: "flex-start", gap: 10, fontSize: 12, color: "#b9c4bb", marginTop: 8 }}>
        <strong style={{ color: "var(--green)", flexShrink: 0 }}>How to prevent it:</strong>
        <span>{state.explanation.avoidanceTip}</span>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginTop: 10 }}>
        <span style={{ fontSize: 11, fontFamily: "IBM Plex Mono", color: "#a4b4a8", background: "#141815", padding: "3px 8px", borderRadius: 4, border: "1px solid var(--panel-border-subtle)" }}>
          Forklift = Process
        </span>
        <span style={{ fontSize: 11, fontFamily: "IBM Plex Mono", color: "#a4b4a8", background: "#141815", padding: "3px 8px", borderRadius: 4, border: "1px solid var(--panel-border-subtle)" }}>
          Spot/Dock = Mutex
        </span>
        <span style={{ fontSize: 11, fontFamily: "IBM Plex Mono", color: "#a4b4a8", background: "#141815", padding: "3px 8px", borderRadius: 4, border: "1px solid var(--panel-border-subtle)" }}>
          Arrow = RAG Edge
        </span>
      </div>

      <button
        onClick={() => setShowDetail(!showDetail)}
        style={{
          background: "none",
          border: "none",
          color: "var(--muted)",
          fontSize: 11,
          fontFamily: "IBM Plex Mono",
          cursor: "pointer",
          marginTop: 10,
          padding: 0,
          textDecoration: "underline",
        }}
      >
        {showDetail ? "▲ Hide extra OS details" : "▼ More detail on this deadlock"}
      </button>

      {showDetail && (
        <div style={{ marginTop: 10, padding: 10, background: "#131614", borderRadius: 6, fontSize: 11.5, color: "#a5b2a8", lineHeight: 1.5 }}>
          <p style={{ margin: "0 0 6px" }}>
            <strong>Theoretical Principle:</strong> Operating Systems classify this as multi-process resource contention. When processes hold resources non-preemptively while requesting others in a cyclic chain, circular wait occurs.
          </p>
          <p style={{ margin: 0 }}>
            <strong>Havender's Solution:</strong> Assigning a strict global hierarchy to all resources breaks the circular wait condition entirely, guaranteeing an acyclic Wait-For Graph.
          </p>
        </div>
      )}
    </div>
  );
}

// ----------------------------------------------------
// WAIT-FOR GRAPH MINI PANEL
// ----------------------------------------------------
function WaitForGraphMiniPanel({ state }: { state: SimulationState }) {
  const hasCycle = state.isDeadlocked && state.wfgCycles.length > 0;

  return (
    <div className={`wfg-live-panel ${hasCycle ? "cycle-found" : ""}`}>
      <div className="wfg-live-panel-header">
        <div className={`wfg-live-panel-title ${hasCycle ? "danger" : "success"}`}>
          <Icon name={hasCycle ? "alert" : "check"} size={16} />
          <span>
            Wait-For Graph (WFG) · {hasCycle ? "CLOSED CYCLE LOCKED" : "NO LOOPS — ALL WAITING IS NORMAL"}
          </span>
        </div>
        <span style={{ fontSize: 11, fontFamily: "IBM Plex Mono", color: "var(--muted)" }}>
          {state.wfgEdges.length} Active Dependencies
        </span>
      </div>

      {hasCycle ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <div
            style={{
              padding: "10px 14px",
              background: "rgba(189, 89, 72, 0.15)",
              border: "1px solid rgba(189, 89, 72, 0.4)",
              borderRadius: 6,
              fontFamily: "IBM Plex Mono",
              fontSize: 12.5,
              color: "#f5c6c2",
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            <strong>Cycle:</strong>
            Forklifts {state.wfgCycles[0].join(" → ")} → {state.wfgCycles[0][0]}
            <span
              style={{
                marginLeft: "auto",
                background: "var(--red)",
                color: "#fff",
                padding: "2px 6px",
                borderRadius: 4,
                fontSize: 10,
                fontWeight: 700,
              }}
            >
              LOOP CLOSED
            </span>
          </div>
          <p style={{ margin: 0, fontSize: 11.5, color: "var(--muted)", lineHeight: 1.45 }}>
            Arrows point from waiting forklifts to the forklift holding their spot. Because the arrows form a closed loop, no vehicle in the cycle can ever move forward.
          </p>
        </div>
      ) : (
        <div
          style={{
            padding: "10px 14px",
            background: "rgba(126, 153, 132, 0.12)",
            border: "1px solid rgba(126, 153, 132, 0.3)",
            borderRadius: 6,
            fontFamily: "IBM Plex Mono",
            fontSize: 12,
            color: "#a4c4ab",
            display: "flex",
            alignItems: "center",
            gap: 10,
          }}
        >
          <Icon name="check" size={16} />
          <span>No loops detected in the Wait-For Graph. All waiting is temporary headway that will clear itself.</span>
        </div>
      )}
    </div>
  );
}

// ----------------------------------------------------
// PAGE 4: BANKER'S ALGORITHM VISUALIZER COMPONENT
// ----------------------------------------------------
function BankersAlgorithmVisualizer() {
  const [resources, setResources] = useState<BankerResource[]>(DEFAULT_BANKER_RESOURCES);
  const [processes, setProcesses] = useState<BankerProcess[]>(DEFAULT_BANKER_PROCESSES);
  const [safetyResult, setSafetyResult] = useState<BankerSafetyResult>(() =>
    runBankerSafetyCheck(DEFAULT_BANKER_PROCESSES, DEFAULT_BANKER_RESOURCES.map((r) => r.available))
  );

  // Request Simulator Form State
  const [reqProcessId, setReqProcessId] = useState<number>(1);
  const [reqValues, setReqValues] = useState<number[]>([1, 0, 0]);
  const [requestFeedback, setRequestFeedback] = useState<{ granted: boolean; message: string } | null>(null);

  const availableVector = useMemo(() => resources.map((r) => r.available), [resources]);

  const handleRunSafetyCheck = () => {
    const res = runBankerSafetyCheck(processes, availableVector);
    setSafetyResult(res);
  };

  const handleTestRequest = () => {
    const res = requestBankerResources(processes, availableVector, reqProcessId, reqValues);
    if (res.granted && res.updatedProcesses && res.updatedAvailable) {
      setProcesses(res.updatedProcesses);
      setResources((prev) =>
        prev.map((r, idx) => ({ ...r, available: res.updatedAvailable![idx] }))
      );
      if (res.safetyResult) {
        setSafetyResult(res.safetyResult);
      }
      setRequestFeedback({ granted: true, message: res.reason });
    } else {
      setRequestFeedback({ granted: false, message: res.reason });
      if (res.safetyResult) {
        setSafetyResult(res.safetyResult);
      }
    }
  };

  const handleResetBanker = () => {
    setResources(DEFAULT_BANKER_RESOURCES);
    setProcesses(DEFAULT_BANKER_PROCESSES);
    const res = runBankerSafetyCheck(
      DEFAULT_BANKER_PROCESSES,
      DEFAULT_BANKER_RESOURCES.map((r) => r.available)
    );
    setSafetyResult(res);
    setRequestFeedback(null);
  };

  return (
    <div className="banker-container">
      <div className="banker-grid">
        <div className="banker-card">
          <div className="banker-card-header">
            <div>
              <div className="banker-card-title">
                <Icon name="cpu" size={20} />
                Banker's Algorithm State Inspector
              </div>
              <div className="banker-card-subtitle">
                Dijkstra's deadlock avoidance protocol testing whether hypothetical resource allocations preserve an acyclic Safe Execution Sequence.
              </div>
            </div>
            <div>
              {safetyResult.isSafe ? (
                <span className="banker-tag-safe">
                  <Icon name="shield" size={15} /> SAFE STATE GUARANTEED
                </span>
              ) : (
                <span className="banker-tag-unsafe">
                  <Icon name="alert" size={15} /> UNSAFE STATE (DEADLOCK RISK)
                </span>
              )}
            </div>
          </div>

          {/* Resource Inventory Gauges */}
          <div>
            <span style={{ fontSize: 11, fontFamily: "IBM Plex Mono", color: "var(--muted)", textTransform: "uppercase", display: "block", marginBottom: 10 }}>
              Warehouse Resource Inventories (Available / Total):
            </span>
            <div className="resource-gauges-grid">
              {resources.map((r) => {
                const pct = Math.round((r.available / r.total) * 100);
                return (
                  <div key={r.id} className="resource-gauge-card">
                    <div className="resource-gauge-header">
                      <span style={{ color: "var(--paper)" }}>{r.name}</span>
                      <span style={{ color: "var(--orange)" }}>
                        {r.available} / {r.total} free
                      </span>
                    </div>
                    <div className="resource-gauge-bar">
                      <div className="resource-gauge-fill" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Beginner-Friendly Core Concepts */}
          <div>
            <span style={{ fontSize: 11, fontFamily: "IBM Plex Mono", color: "var(--muted)", textTransform: "uppercase", display: "block", marginBottom: 10 }}>
              Banker's Algorithm Core Concepts:
            </span>
            <div className="banker-concept-grid">
              <div className="banker-concept-card">
                <span className="concept-title" style={{ color: "#93c5fd" }}>Current Allocation</span>
                <p>Resources already held and in active use by each forklift.</p>
              </div>
              <div className="banker-concept-card">
                <span className="concept-title" style={{ color: "#d8b4fe" }}>Maximum Claim</span>
                <p>Peak total resources the forklift declares it will ever need to finish its task.</p>
              </div>
              <div className="banker-concept-card">
                <span className="concept-title" style={{ color: "#fca5a5" }}>Remaining Need</span>
                <p><strong>Max − Allocation</strong>: Extra units the forklift still requires before releasing holds.</p>
              </div>
              <div className="banker-concept-card">
                <span className="concept-title" style={{ color: "var(--orange)" }}>Available Inventory</span>
                <p>Unallocated warehouse resources currently free and ready for immediate dispatch.</p>
              </div>
              <div className="banker-concept-card">
                <span className="concept-title" style={{ color: "var(--green)" }}>Safe Sequence</span>
                <p>A guaranteed schedule where every vehicle can finish and release holds without gridlock.</p>
              </div>
            </div>
          </div>

          {/* Process Matrices Table */}
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 8 }}>
              <span style={{ fontSize: 11, fontFamily: "IBM Plex Mono", color: "var(--muted)", textTransform: "uppercase" }}>
                Process Matrices (Allocation, Maximum Claim, Remaining Need):
              </span>
              <span style={{ fontSize: 11, fontFamily: "IBM Plex Mono", color: "var(--orange)" }}>
                Formula: Need[i, j] = Max[i, j] - Allocation[i, j]
              </span>
            </div>

            <div className="banker-table-wrapper">
              <table className="banker-matrix-table">
                <thead>
                  <tr>
                    <th rowSpan={2} style={{ textAlign: "left" }}>Process (Forklift)</th>
                    <th colSpan={3} style={{ color: "#93c5fd" }}>Current Allocation</th>
                    <th colSpan={3} style={{ color: "#d8b4fe" }}>Maximum Claim</th>
                    <th colSpan={3} style={{ color: "#fca5a5" }}>Remaining Need (Max - Alloc)</th>
                  </tr>
                  <tr>
                    <th>R0 (Dock)</th>
                    <th>R1 (Aisle)</th>
                    <th>R2 (Charge)</th>
                    <th>R0 (Dock)</th>
                    <th>R1 (Aisle)</th>
                    <th>R2 (Charge)</th>
                    <th>R0 (Dock)</th>
                    <th>R1 (Aisle)</th>
                    <th>R2 (Charge)</th>
                  </tr>
                </thead>
                <tbody>
                  {processes.map((p) => (
                    <tr key={p.id}>
                      <td className="cell-process">P{p.id} ({p.name})</td>
                      <td className="cell-alloc">{p.allocation[0]}</td>
                      <td className="cell-alloc">{p.allocation[1]}</td>
                      <td className="cell-alloc">{p.allocation[2]}</td>
                      <td className="cell-max">{p.max[0]}</td>
                      <td className="cell-max">{p.max[1]}</td>
                      <td className="cell-max">{p.max[2]}</td>
                      <td className="cell-need">{p.need[0]}</td>
                      <td className="cell-need">{p.need[1]}</td>
                      <td className="cell-need">{p.need[2]}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Safe Sequence Display */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 14, background: "#141715", padding: "14px 18px", borderRadius: 8, border: "1px solid var(--panel-border-subtle)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
              <span style={{ fontSize: 13, fontFamily: "IBM Plex Mono", color: "var(--paper)", fontWeight: 700 }}>
                Safe Execution Pipeline:
              </span>
              {safetyResult.isSafe ? (
                <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                  {safetyResult.safeSequence.map((pId, idx) => (
                    <React.Fragment key={pId}>
                      <span className="banker-seq-pill">P{pId}</span>
                      {idx < safetyResult.safeSequence.length - 1 && <span style={{ color: "var(--muted)", fontWeight: 700 }}>→</span>}
                    </React.Fragment>
                  ))}
                </div>
              ) : (
                <span style={{ color: "var(--red)", fontSize: 12.5, fontFamily: "IBM Plex Mono" }}>
                  No safe sequence exists! Granting requested allocations would trigger deadlock.
                </span>
              )}
            </div>

            <div style={{ display: "flex", gap: 10 }}>
              <button className="banker-btn banker-btn-secondary" onClick={handleResetBanker}>
                <Icon name="reset" size={13} /> Reset Baseline
              </button>
              <button className="banker-btn banker-btn-primary" onClick={handleRunSafetyCheck}>
                <Icon name="play" size={13} /> Re-evaluate Safety
              </button>
            </div>
          </div>

          {/* Interactive Resource Request Simulator */}
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 8 }}>
              <span style={{ fontSize: 12.5, fontFamily: "IBM Plex Mono", color: "var(--orange)", fontWeight: 700 }}>
                Interactive Request Simulator (Test Avoidance Decision):
              </span>
              <span style={{ fontSize: 11, fontFamily: "IBM Plex Mono", color: "var(--muted)" }}>
                Step 1: Req ≤ Need · Step 2: Req ≤ Available · Step 3: Run Safety Check
              </span>
            </div>

            <div className="banker-controls-row">
              <span style={{ fontSize: 12.5, color: "var(--paper)", fontWeight: 600 }}>Process:</span>
              <select
                className="banker-select"
                value={reqProcessId}
                onChange={(e) => setReqProcessId(Number(e.target.value))}
              >
                {processes.map((p) => (
                  <option key={p.id} value={p.id}>
                    P{p.id} ({p.name})
                  </option>
                ))}
              </select>

              <span style={{ fontSize: 12.5, color: "var(--paper)", fontWeight: 600, marginLeft: 6 }}>Request Vector:</span>
              <label style={{ fontSize: 11.5, color: "var(--muted)", display: "inline-flex", alignItems: "center", gap: 4 }}>
                R0:
                <input
                  type="number"
                  min="0"
                  max="4"
                  className="banker-input"
                  value={reqValues[0]}
                  onChange={(e) => setReqValues([Number(e.target.value), reqValues[1], reqValues[2]])}
                />
              </label>
              <label style={{ fontSize: 11.5, color: "var(--muted)", display: "inline-flex", alignItems: "center", gap: 4 }}>
                R1:
                <input
                  type="number"
                  min="0"
                  max="4"
                  className="banker-input"
                  value={reqValues[1]}
                  onChange={(e) => setReqValues([reqValues[0], Number(e.target.value), reqValues[2]])}
                />
              </label>
              <label style={{ fontSize: 11.5, color: "var(--muted)", display: "inline-flex", alignItems: "center", gap: 4 }}>
                R2:
                <input
                  type="number"
                  min="0"
                  max="4"
                  className="banker-input"
                  value={reqValues[2]}
                  onChange={(e) => setReqValues([reqValues[0], reqValues[1], Number(e.target.value)])}
                />
              </label>

              <button className="banker-btn banker-btn-primary" onClick={handleTestRequest}>
                <Icon name="shield" size={13} /> Evaluate Request
              </button>
            </div>

            {/* Request Decision Feedback */}
            {requestFeedback && (
              <div
                style={{
                  marginTop: 12,
                  padding: "12px 16px",
                  borderRadius: 6,
                  fontFamily: "IBM Plex Mono",
                  fontSize: 12.5,
                  lineHeight: 1.5,
                  background: requestFeedback.granted ? "rgba(126, 153, 132, 0.16)" : "rgba(189, 89, 72, 0.18)",
                  border: `1px solid ${requestFeedback.granted ? "rgba(126, 153, 132, 0.45)" : "rgba(189, 89, 72, 0.45)"}`,
                  color: requestFeedback.granted ? "#a3e635" : "#fca5a5",
                }}
              >
                {requestFeedback.message}
              </div>
            )}
          </div>

          {/* Execution Trace Log */}
          <div>
            <span style={{ fontSize: 11, fontFamily: "IBM Plex Mono", color: "var(--muted)", textTransform: "uppercase", display: "block", marginBottom: 8 }}>
              Banker's Algorithm Step Trace:
            </span>
            <div className="banker-steplog">
              {safetyResult.stepLog.map((log, idx) => (
                <div key={idx} style={{ marginBottom: 4 }}>
                  {log.includes("UNSAFE") ? (
                    <span className="log-warning">{log}</span>
                  ) : log.includes("Step") ? (
                    <span className="log-highlight">{log}</span>
                  ) : (
                    log
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ----------------------------------------------------
// MAIN APP COMPONENT (5-PAGE PLATFORM)
// ----------------------------------------------------
export default function App() {
  const [running, setRunning] = useState<boolean>(false);
  const [speed, setSpeed] = useState<number>(1);
  const [fleetSize, setFleetSize] = useState<number>(8);
  const [selectedVehicleId, setSelectedVehicleId] = useState<string>("1");
  const [activeScenarioIdx, setActiveScenarioIdx] = useState<number>(0);
  const [activePage, setActivePage] = useState<ActivePage>("live");
  const [, setTickCounter] = useState<number>(0);

  // Comparison state (Page 5)
  const [comparisonRunning, setComparisonRunning] = useState(false);
  const [comparisonData, setComparisonData] = useState<ComparisonResult>({
    timestamp: "Precomputed Baseline",
    simulatedDurationSec: 60,
    withoutRule: { deadlocks: 4, completed: 18, avgWaitSec: 22.4 },
    withRule: { deadlocks: 0, completed: 25, avgWaitSec: 6.8 },
  });

  // Single Source of Truth
  const simStateRef = useRef<SimulationState>(createInitialState(8));

  // High-frequency animation loop
  useEffect(() => {
    let animId: number;
    let lastTime = performance.now();

    const loop = (currentTime: number) => {
      const dt = Math.min((currentTime - lastTime) / 1000, 0.1) * speed;
      lastTime = currentTime;

      if (running) {
        updateSimulation(simStateRef.current, dt);
        setTickCounter((t) => (t + 1) % 1000000);
      }
      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, [running, speed]);

  // Keyboard navigation: 1, 2, 3, 4, 5, Esc
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLSelectElement) return;
      if (e.key === "1" || e.key === "Escape") {
        setActivePage("live");
        window.location.hash = "live";
      } else if (e.key === "2") {
        setActivePage("scenarios");
        window.location.hash = "scenarios";
      } else if (e.key === "3") {
        setActivePage("conditions");
        window.location.hash = "conditions";
      } else if (e.key === "4") {
        setActivePage("bankers");
        window.location.hash = "bankers";
      } else if (e.key === "5") {
        setActivePage("benchmark");
        window.location.hash = "benchmark";
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Sync hash on mount
  useEffect(() => {
    const hash = window.location.hash.replace("#", "") as ActivePage;
    if (["live", "scenarios", "conditions", "bankers", "benchmark"].includes(hash)) {
      setActivePage(hash);
    }
  }, []);

  const currentSimState = simStateRef.current;

  // 1. SIMULATE BUTTON (Normal Mode with Havender Safety ON)
  const handleSimulateToggle = () => {
    if (currentSimState.mode === "deadlock") {
      simStateRef.current.mode = "simulate";
      simStateRef.current.avoidanceEnabled = true;
      simStateRef.current.scenarioTitle = "Normal Autonomous Operation";
      simStateRef.current.scenarioSubtitle = "Safety rule active: reserving junctions prevents deadlocks.";
      simStateRef.current.forklifts = createInitialFleet(fleetSize);
      simStateRef.current.resources = createFreshResources();
      updateWaitForGraphAndCycles(simStateRef.current);
    }
    setRunning(!running);
  };

  // 2. DEADLOCK SITUATION BUTTON (Cycles 1 to 7)
  const handleDeadlockClick = (targetIdx?: number) => {
    const nextIdx = targetIdx !== undefined ? targetIdx : (activeScenarioIdx + 1) % 7;
    setActiveScenarioIdx(nextIdx);
    loadDeadlockScenario(simStateRef.current, nextIdx);
    setSpeed(0.5);
    setRunning(true);
    setTickCounter((t) => t + 1);
  };

  // 3. PLAYBACK CONTROLS
  const handleNextStep = () => {
    advanceToNextStep(simStateRef.current);
    setTickCounter((t) => t + 1);
  };

  const handleReplay = () => {
    replayScenario(simStateRef.current);
    setRunning(true);
    setTickCounter((t) => t + 1);
  };

  // 4. RESET SIMULATION
  const handleReset = useCallback((newFleetSize?: number) => {
    const size = newFleetSize !== undefined ? newFleetSize : fleetSize;
    simStateRef.current = createInitialState(size);
    setActiveScenarioIdx(0);
    setRunning(false);
    setTickCounter((t) => t + 1);
  }, [fleetSize]);

  const handleFleetChange = (newSize: number) => {
    setFleetSize(newSize);
    handleReset(newSize);
  };

  // 5. RUN MEASURED COMPARISON (PAGE 5)
  const handleRunComparison = () => {
    setComparisonRunning(true);
    setTimeout(() => {
      const res = runHeadlessComparison(60);
      setComparisonData(res);
      setComparisonRunning(false);
    }, 150);
  };

  // Watch scenario on floor
  const handleWatchOnFloor = (scenarioIdx: number) => {
    setActivePage("live");
    handleDeadlockClick(scenarioIdx);
    window.location.hash = "live";
  };

  const normalWaiter = useMemo(() => {
    return currentSimState.forklifts.find((f) => f.status === "waiting");
  }, [currentSimState.forklifts]);

  return (
    <main>
      {/* Sticky Topbar Navigation with Active Tab Pills & Keyboard Tooltip */}
      <header className="topbar">
        <div
          className="brand"
          style={{ cursor: "pointer" }}
          onClick={() => {
            setActivePage("live");
            window.location.hash = "live";
          }}
        >
          <span className="brand-mark">
            <i />
            <i />
            <i />
            <i />
          </span>
          <span>GRIDLOCK</span>
        </div>

        <nav aria-label="Primary navigation">
          <a
            className={activePage === "live" ? "active" : ""}
            onClick={() => {
              setActivePage("live");
              window.location.hash = "live";
            }}
            href="#live"
            title="Shortcut: Press 1"
          >
            01 Floor
          </a>
          <a
            className={activePage === "scenarios" ? "active" : ""}
            onClick={() => {
              setActivePage("scenarios");
              window.location.hash = "scenarios";
            }}
            href="#scenarios"
            title="Shortcut: Press 2"
          >
            02 Scenarios
          </a>
          <a
            className={activePage === "conditions" ? "active" : ""}
            onClick={() => {
              setActivePage("conditions");
              window.location.hash = "conditions";
            }}
            href="#conditions"
            title="Shortcut: Press 3"
          >
            03 Coffman Theory
          </a>
          <a
            className={activePage === "bankers" ? "active" : ""}
            onClick={() => {
              setActivePage("bankers");
              window.location.hash = "bankers";
            }}
            href="#bankers"
            title="Shortcut: Press 4"
          >
            04 Banker's Algorithm
          </a>
          <a
            className={activePage === "benchmark" ? "active" : ""}
            onClick={() => {
              setActivePage("benchmark");
              window.location.hash = "benchmark";
            }}
            href="#benchmark"
            title="Shortcut: Press 5"
          >
            05 Benchmark
          </a>
        </nav>

        <div className={`system-state ${currentSimState.isDeadlocked ? "is-alert" : ""}`}>
          <span />
          {currentSimState.isDeadlocked ? "DEADLOCK DETECTED" : running ? "SIMULATION RUNNING" : "READY (IDLE)"}
          <b style={{ marginLeft: 6, fontSize: 10, color: "var(--muted)" }}>Keys: 1-5, Esc</b>
        </div>
      </header>

      {/* Floating "Back to simulation" button for Pages 2, 3, 4, 5 */}
      {activePage !== "live" && (
        <button
          onClick={() => {
            setActivePage("live");
            window.location.hash = "live";
          }}
          className="floating-back-btn"
          aria-label="Return to Live Simulation"
        >
          ↑ Back to simulation (Esc)
        </button>
      )}

      {/* ==================================================== */}
      {/* PAGE 1: LIVE FLOOR SIMULATION                        */}
      {/* ==================================================== */}
      {activePage === "live" && (
        <section className="live-section page-view" id="live">
          <div className="section-heading">
            <div>
              <p className="eyebrow">
                <span>01</span> Autonomous Floor · Single Source of Truth
              </p>
              <h1>
                Watch deadlocks happen.
                <br />
                See exactly why they freeze.
              </h1>
            </div>
            <p className="intro">
              Autonomous forklifts transport pallet boxes from warehouse storage racks to outbound loading docks.
              When vehicles wait for each other in a closed circle, nobody can advance—that is a deadlock.
            </p>
          </div>

          <div className="sim-shell">
            {/* Main Toolbar */}
            <div className="sim-toolbar">
              <div className="large-status-counters" aria-live="polite">
                <span className="status-counter-pill moving" title="Vehicles currently driving">
                  <i className="dot" /> Moving: {currentSimState.counts.moving}
                </span>
                <span className="status-counter-pill waiting" title="Vehicles temporarily waiting for headway">
                  <i className="dot" /> Waiting: {currentSimState.counts.waiting}
                </span>
                <span className="status-counter-pill stuck" title="Vehicles locked in circular wait">
                  <i className="dot" /> Stuck: {currentSimState.counts.deadlocked}
                </span>
              </div>

              <div className="toolbar-actions">
                {/* Fleet Size */}
                <label className="speed-control" title="Select fleet size">
                  <Icon name="users" /> Fleet:
                  <select value={fleetSize} onChange={(e) => handleFleetChange(Number(e.target.value))}>
                    <option value="2">2</option>
                    <option value="4">4</option>
                    <option value="6">6</option>
                    <option value="8">8</option>
                  </select>
                </label>

                {/* Speed */}
                <label className="speed-control">
                  Speed:
                  <select value={speed} onChange={(e) => setSpeed(Number(e.target.value))}>
                    <option value="0.5">0.5×</option>
                    <option value="1">1×</option>
                    <option value="1.5">1.5×</option>
                    <option value="2">2×</option>
                  </select>
                </label>

                {/* Reset */}
                <button className="icon-button" onClick={() => handleReset()} aria-label="Reset simulation" title="Reset floor to clean state">
                  <Icon name="reset" />
                </button>

                {/* SIMULATE BUTTON */}
                <button
                  className="play-button"
                  onClick={handleSimulateToggle}
                  aria-pressed={running}
                  style={{
                    background: running && currentSimState.mode === "simulate" ? "#27322a" : "var(--orange)",
                    color: running && currentSimState.mode === "simulate" ? "#a4c4ab" : "var(--ink)",
                  }}
                  title="Continuous normal movement with safety rule active"
                >
                  <Icon name={running ? "pause" : "play"} />
                  {running ? "Pause" : "Simulate"}
                </button>

                {/* DEADLOCK SITUATION BUTTON */}
                <button
                  className="btn-conflict"
                  onClick={() => handleDeadlockClick()}
                  title="Trigger a genuine deadlock scenario (cycles 1 to 7 then back to 1)"
                >
                  <Icon name="alert" />
                  Deadlock Situation (Case {activeScenarioIdx + 1} of 7)
                </button>
              </div>
            </div>

            {/* Scenario Selector: Row of Numbered Buttons 1 to 7 */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12, padding: "10px 18px", borderBottom: "1px solid var(--panel-border-subtle)" }}>
              <div className="scenario-numbers-bar">
                <span style={{ fontSize: 11, fontFamily: "IBM Plex Mono", color: "var(--muted)", textTransform: "uppercase" }}>
                  Select Scenario:
                </span>
                {DEADLOCK_SCENARIOS.map((sc, i) => (
                  <button
                    key={sc.id}
                    className={`scenario-num-btn ${currentSimState.mode === "deadlock" && activeScenarioIdx === i ? "active" : ""}`}
                    onClick={() => handleDeadlockClick(i)}
                    title={`Case ${i + 1}: ${sc.title}`}
                  >
                    {i + 1}
                  </button>
                ))}
                <span style={{ fontSize: 12, fontFamily: "IBM Plex Mono", color: "var(--paper)", fontWeight: 600, marginLeft: 8 }}>
                  Case {activeScenarioIdx + 1} of 7: {currentSimState.scenarioTitle}
                </span>
              </div>

              {currentSimState.mode === "simulate" && (
                <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 11.5, fontFamily: "IBM Plex Mono", color: "var(--green)" }}>
                  <Icon name="check" size={12} /> Safety rule: forklifts reserve a junction before entering it.
                </span>
              )}
            </div>

            {/* Guided Playback Bar in Deadlock Mode */}
            {currentSimState.mode === "deadlock" && (
              <div className="playback-toolbar">
                <div className="playback-controls-group">
                  <span style={{ fontWeight: 700, color: "var(--orange)" }}>GUIDED PLAYBACK:</span>
                  <button className="playback-btn" onClick={() => setRunning(!running)}>
                    <Icon name={running ? "pause" : "play"} size={13} /> {running ? "Pause" : "Auto-play (0.5×)"}
                  </button>
                  <button className="playback-btn" onClick={handleNextStep}>
                    <Icon name="step" size={13} /> Next step
                  </button>
                  <button className="playback-btn" onClick={handleReplay}>
                    <Icon name="replay" size={13} /> Replay this case
                  </button>
                </div>

                <div style={{ display: "inline-flex", alignItems: "center", gap: 6, color: "#d2cbbe", fontStyle: "italic" }}>
                  <Icon name="arrow" size={12} /> {currentSimState.scenarioCue}
                </div>
              </div>
            )}

            {/* 2-Column Desktop Grid: Map (Left) + Educational Sidebar (Right) */}
            <div className="live-layout-grid">
              {/* Map Column */}
              <div className="map-column">
                <WarehouseCanvas
                  state={currentSimState}
                  selectedVehicleId={selectedVehicleId}
                  onSelectVehicle={setSelectedVehicleId}
                />

                {/* Persistent Two-Row Legend */}
                <div className="legend-two-row">
                  <div className="legend-row">
                    <span className="legend-badge waiting">WAITING (Yellow)</span>
                    <span><strong>Normal wait:</strong> The forklift ahead will leave soon. This clears itself automatically.</span>
                  </div>
                  <div className="legend-row">
                    <span className="legend-badge deadlock">STUCK (Red)</span>
                    <span><strong>Deadlock:</strong> Everyone in the loop waits for someone else in the loop. Nobody will ever leave.</span>
                  </div>
                </div>

                {normalWaiter && !currentSimState.isDeadlocked && (
                  <div style={{ display: "flex", alignItems: "flex-start", gap: 8, padding: "10px 14px", background: "rgba(217, 146, 77, 0.12)", border: "1px solid rgba(217, 146, 77, 0.35)", borderRadius: 6, fontSize: 12, color: "#f1dfb8" }}>
                    <span style={{ marginTop: 2, flexShrink: 0, color: "var(--orange)" }}><Icon name="info" size={14} /></span>
                    <div><strong>Why is this not a deadlock?</strong> Forklift {normalWaiter.id} is waiting behind another vehicle. As soon as the vehicle ahead moves, Forklift {normalWaiter.id} will proceed. The arrows do not form a closed loop.</div>
                  </div>
                )}
              </div>

              {/* Sidebar Column */}
              <div className="sidebar-column">
                <GuidedStepList state={currentSimState} />
                <FourConditionsCard state={currentSimState} />
                <WaitForGraphMiniPanel state={currentSimState} />
                <ExplanationPanel state={currentSimState} />
              </div>
            </div>
          </div>

          <div style={{ textAlign: "center", marginTop: 36 }}>
            <button
              onClick={() => {
                setActivePage("scenarios");
                window.location.hash = "scenarios";
              }}
              className="scenario-watch-btn"
              style={{ display: "inline-flex", width: "auto", padding: "11px 24px", fontSize: 13 }}
            >
              Next: Explore All 7 Deadlock Scenarios →
            </button>
          </div>
        </section>
      )}

      {/* ==================================================== */}
      {/* PAGE 2: DEADLOCK SCENARIOS SHOWCASE                  */}
      {/* ==================================================== */}
      {activePage === "scenarios" && (
        <section className="memory-section page-view" id="scenarios">
          <div className="section-heading" style={{ gridColumn: "1 / -1", textAlign: "center", marginBottom: 20 }}>
            <p className="eyebrow" style={{ justifyContent: "center" }}>
              <span>02</span> Interactive Deadlock Scenario Collection
            </p>
            <h2>7 Real Warehouse Concurrency Failures</h2>
            <p className="intro" style={{ margin: "8px auto 0", maxWidth: 680 }}>
              Every scenario represents a classic multi-threaded operating system deadlock pattern grounded in physical warehouse physics. Click "Watch on floor" to load and run that scenario.
            </p>
          </div>

          <div className="scenarios-collection-grid">
            {DEADLOCK_SCENARIOS.map((sc, i) => {
              const isActiveCase = currentSimState.mode === "deadlock" && activeScenarioIdx === i;
              return (
                <div
                  key={sc.id}
                  className={`scenario-card-premium ${isActiveCase ? "active-on-floor" : ""}`}
                >
                  <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                    <div className="scenario-card-header">
                      <span className="scenario-badge-num">CASE 0{i + 1}</span>
                      <span className="scenario-badge-tag">{sc.easiestConditionToBreak}</span>
                    </div>

                    <h3 className="scenario-card-title">{sc.title}</h3>
                    <p className="scenario-card-desc">{sc.description}</p>

                    <div className="scenario-analogy-box">
                      <strong>Analogy:</strong>
                      <span>{sc.analogy}</span>
                    </div>

                    <div className="scenario-diagram-pill">
                      {i === 0 && "1 (Holds West) ⇄ 2 (Holds Center)"}
                      {i === 1 && "1 (North Entry) ⇄ 2 (South Entry) in Aisle 01"}
                      {i === 2 && "1 (Crossroads) → 2 (Bay 2) → 3 (Upper) → 1"}
                      {i === 3 && "4-Way Gridlock: 1 → 2 → 3 → 4 → 1"}
                      {i === 4 && "1 (Dock 1) ⇄ 2 (Charger 1)"}
                      {i === 5 && "1 (Holds 2 Spots) ⇄ 2 (Holds Rack B)"}
                      {i === 6 && "1 & 2 Stuck in Aisle 01 · 3, 4, 5 Free"}
                    </div>
                  </div>

                  <button
                    className="scenario-watch-btn"
                    onClick={() => handleWatchOnFloor(i)}
                  >
                    <Icon name="play" size={12} /> Watch on floor
                  </button>
                </div>
              );
            })}
          </div>

          <div style={{ textAlign: "center", marginTop: 40 }}>
            <button
              onClick={() => {
                setActivePage("conditions");
                window.location.hash = "conditions";
              }}
              className="scenario-watch-btn"
              style={{ display: "inline-flex", width: "auto", padding: "11px 24px", fontSize: 13 }}
            >
              Next: Learn the 4 Coffman Deadlock Conditions →
            </button>
          </div>
        </section>
      )}

      {/* ==================================================== */}
      {/* PAGE 3: COFFMAN CONDITIONS & DEADLOCK THEORY         */}
      {/* ==================================================== */}
      {activePage === "conditions" && (
        <section className="memory-section page-view" id="conditions">
          <div className="section-heading" style={{ gridColumn: "1 / -1", textAlign: "center", marginBottom: 24 }}>
            <p className="eyebrow" style={{ justifyContent: "center" }}>
              <span>03</span> Operating Systems Deadlock Fundamentals
            </p>
            <h2>The 4 Coffman Conditions (1971)</h2>
            <p className="intro" style={{ margin: "8px auto 0", maxWidth: 700 }}>
              Edward G. Coffman Jr. proved that a system deadlock can occur if and only if all four conditions hold simultaneously.
              Eliminating any single condition mathematically guarantees deadlock-free execution.
            </p>
          </div>

          <div className="conditions-editorial-container">
            <div className="conditions-quad-grid">
              {/* Condition 1: Mutual Exclusion */}
              <div className="condition-card-editorial">
                <div className="condition-editorial-head">
                  <span className="condition-badge-lg">Condition 01</span>
                  <h3 className="condition-editorial-title">Mutual Exclusion</h3>
                </div>
                <p className="condition-principle-text">
                  At least one resource must be held in a non-shareable mode. Only one process or vehicle can use the resource at any given moment.
                </p>

                <div className="condition-dual-columns">
                  <div className="condition-col-box">
                    <span className="condition-col-label">Warehouse Reality</span>
                    <p className="condition-col-desc">A physical single-lane aisle or intersection tile can fit only one forklift without colliding.</p>
                  </div>
                  <div className="condition-col-box">
                    <span className="condition-col-label">Operating System</span>
                    <p className="condition-col-desc">Mutex locks, CPU registers, write-locked files, and GPU stream buffers.</p>
                  </div>
                </div>

                <div className="condition-break-box">
                  <strong>How to Break:</strong>
                  <span>Share resources when feasible (e.g. read-only shared locks or multi-lane transit corridors).</span>
                </div>
              </div>

              {/* Condition 2: Hold and Wait */}
              <div className="condition-card-editorial">
                <div className="condition-editorial-head">
                  <span className="condition-badge-lg">Condition 02</span>
                  <h3 className="condition-editorial-title">Hold and Wait</h3>
                </div>
                <p className="condition-principle-text">
                  A process must hold at least one resource while waiting to acquire additional resources currently held by other processes.
                </p>

                <div className="condition-dual-columns">
                  <div className="condition-col-box">
                    <span className="condition-col-label">Warehouse Reality</span>
                    <p className="condition-col-desc">Forklift 1 occupies West Junction while blocked waiting for Central Crossroads.</p>
                  </div>
                  <div className="condition-col-box">
                    <span className="condition-col-label">Operating System</span>
                    <p className="condition-col-desc">Thread holds Database Table lock while blocking on an I/O network socket.</p>
                  </div>
                </div>

                <div className="condition-break-box">
                  <strong>How to Break:</strong>
                  <span>Require processes to request all needed resources simultaneously before starting, or release current holds before waiting.</span>
                </div>
              </div>

              {/* Condition 3: No Preemption */}
              <div className="condition-card-editorial">
                <div className="condition-editorial-head">
                  <span className="condition-badge-lg">Condition 03</span>
                  <h3 className="condition-editorial-title">No Preemption</h3>
                </div>
                <p className="condition-principle-text">
                  Resources cannot be forcibly revoked from a holding process; they can only be released voluntarily after task completion.
                </p>

                <div className="condition-dual-columns">
                  <div className="condition-col-box">
                    <span className="condition-col-label">Warehouse Reality</span>
                    <p className="condition-col-desc">A forklift cannot shove, tow, or displace another vehicle out of an intersection.</p>
                  </div>
                  <div className="condition-col-box">
                    <span className="condition-col-label">Operating System</span>
                    <p className="condition-col-desc">The kernel cannot forcibly seize a mutex held by a running thread without risking state corruption.</p>
                  </div>
                </div>

                <div className="condition-break-box">
                  <strong>How to Break:</strong>
                  <span>If a process requesting resources is denied, preempt and release its current allocations and retry later.</span>
                </div>
              </div>

              {/* Condition 4: Circular Wait */}
              <div className="condition-card-editorial">
                <div className="condition-editorial-head">
                  <span className="condition-badge-lg">Condition 04</span>
                  <h3 className="condition-editorial-title">Circular Wait</h3>
                </div>
                <p className="condition-principle-text">
                  A closed chain of processes exists where each process holds a resource that is needed by the next process in the loop.
                </p>

                <div className="condition-dual-columns">
                  <div className="condition-col-box">
                    <span className="condition-col-label">Warehouse Reality</span>
                    <p className="condition-col-desc">Forklift 1 waits for Forklift 2, while Forklift 2 waits for Forklift 1. Loop locked.</p>
                  </div>
                  <div className="condition-col-box">
                    <span className="condition-col-label">Operating System</span>
                    <p className="condition-col-desc">Cycle detected in the Resource Allocation Graph (RAG) / Wait-For Graph (WFG).</p>
                  </div>
                </div>

                <div className="condition-break-box">
                  <strong>How to Break:</strong>
                  <span>Impose a strict total global ordering on all resources (Havender's Protocol). Vehicles acquire locks in increasing numerical order only.</span>
                </div>
              </div>
            </div>

            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10, padding: "16px 20px", background: "rgba(126, 153, 132, 0.12)", border: "1px solid rgba(126, 153, 132, 0.35)", borderRadius: 8, fontSize: 13.5, color: "var(--paper)", textAlign: "center", lineHeight: 1.5 }}>
              <span style={{ color: "var(--green)", display: "inline-flex" }}><Icon name="shield" size={16} /></span>
              <span><strong>Core Concurrency Law: </strong>Deadlock requires ALL FOUR conditions. Break any single one, and deadlocks become mathematically impossible.</span>
            </div>
          </div>

          <div style={{ textAlign: "center", marginTop: 40 }}>
            <button
              onClick={() => {
                setActivePage("bankers");
                window.location.hash = "bankers";
              }}
              className="scenario-watch-btn"
              style={{ display: "inline-flex", width: "auto", padding: "11px 24px", fontSize: 13 }}
            >
              Next: Explore Banker's Algorithm & Safe Sequences →
            </button>
          </div>
        </section>
      )}

      {/* ==================================================== */}
      {/* PAGE 4: BANKER'S ALGORITHM VISUALIZER                */}
      {/* ==================================================== */}
      {activePage === "bankers" && (
        <section className="memory-section page-view" id="bankers">
          <div className="section-heading" style={{ gridColumn: "1 / -1", textAlign: "center", marginBottom: 20 }}>
            <p className="eyebrow" style={{ justifyContent: "center" }}>
              <span>04</span> Deadlock Avoidance Algorithm
            </p>
            <h2>Banker's Algorithm & Safe State Solver</h2>
            <p className="intro" style={{ margin: "8px auto 0", maxWidth: 680 }}>
              Formulated by Edsger Dijkstra, the Banker's Algorithm avoids deadlocks by dynamically denying resource requests that would transition the system into an Unsafe State.
            </p>
          </div>

          <BankersAlgorithmVisualizer />

          <div style={{ textAlign: "center", marginTop: 40 }}>
            <button
              onClick={() => {
                setActivePage("benchmark");
                window.location.hash = "benchmark";
              }}
              className="scenario-watch-btn"
              style={{ display: "inline-flex", width: "auto", padding: "11px 24px", fontSize: 13 }}
            >
              Next: See Empirical Benchmark Results →
            </button>
          </div>
        </section>
      )}

      {/* ==================================================== */}
      {/* PAGE 5: PERFORMANCE BENCHMARK (AVOIDANCE VS CONTENTION) */}
      {/* ==================================================== */}
      {activePage === "benchmark" && (
        <section className="results-section page-view" id="benchmark">
          <div className="results-head">
            <p className="eyebrow">
              <span>05</span> Empirical Benchmark · Avoidance vs Direct Contention
            </p>
            <h2>Reserving junctions first eliminates deadlocks and increases completed throughput.</h2>
            <p className="intro" style={{ marginTop: 8 }}>
              Measured by running two headless simulations in the engine:
              once with Havender junction reservation turned OFF, and once with junction reservation turned ON.
            </p>
          </div>

          {/* Comparison Trigger Bar */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 14, padding: "16px 22px", background: "var(--panel)", border: "1px solid var(--panel-border)", borderRadius: "var(--radius)", marginTop: 24 }}>
            <div>
              <strong style={{ color: "var(--paper)", fontSize: 15 }}>Real Engine Headless Soak Test</strong>
              <p style={{ margin: 0, fontSize: 12.5, color: "var(--muted)" }}>
                Last measured: {comparisonData.timestamp} ({comparisonData.simulatedDurationSec} simulated seconds)
              </p>
            </div>
            <button
              className="play-button"
              onClick={handleRunComparison}
              disabled={comparisonRunning}
              style={{ margin: 0, padding: "9px 20px", fontSize: 12.5, cursor: "pointer" }}
            >
              {comparisonRunning ? "Running 60s soak test..." : "Run Live Soak Test Now"}
            </button>
          </div>

          <div className="comparison-container">
            {/* 3 Big Metrics Cards */}
            <div className="three-big-metrics-grid">
              <div className="big-metric-card">
                <span className="metric-card-label">Deadlocks Encountered</span>
                <div className="metric-comparison-row">
                  <div>
                    <span style={{ fontSize: 11.5, color: "var(--red)", display: "block" }}>AVOIDANCE OFF</span>
                    <span className="metric-val-off">{comparisonData.withoutRule.deadlocks}</span>
                  </div>
                  <div style={{ fontSize: 18, color: "var(--muted)" }}>vs</div>
                  <div style={{ textAlign: "right" }}>
                    <span style={{ fontSize: 11.5, color: "var(--green)", display: "block" }}>AVOIDANCE ON</span>
                    <span className="metric-val-on">{comparisonData.withRule.deadlocks}</span>
                  </div>
                </div>
                <div className="metric-takeaway-text">
                  <strong>Takeaway: </strong>Without avoidance, uncoordinated intersection entries cause permanent freezes. With Havender reservation, zero deadlocks occur.
                </div>
              </div>

              <div className="big-metric-card">
                <span className="metric-card-label">Completed Deliveries</span>
                <div className="metric-comparison-row">
                  <div>
                    <span style={{ fontSize: 11.5, color: "var(--red)", display: "block" }}>AVOIDANCE OFF</span>
                    <span className="metric-val-off">{comparisonData.withoutRule.completed}</span>
                  </div>
                  <div style={{ fontSize: 18, color: "var(--muted)" }}>vs</div>
                  <div style={{ textAlign: "right" }}>
                    <span style={{ fontSize: 11.5, color: "var(--green)", display: "block" }}>AVOIDANCE ON</span>
                    <span className="metric-val-on">{comparisonData.withRule.completed}</span>
                  </div>
                </div>
                <div className="metric-takeaway-text">
                  <strong>Takeaway: </strong>Because deadlocks paralyze entire warehouse corridors, avoiding deadlocks directly boosts completed cargo deliveries.
                </div>
              </div>

              <div className="big-metric-card">
                <span className="metric-card-label">Average Wait Time</span>
                <div className="metric-comparison-row">
                  <div>
                    <span style={{ fontSize: 11.5, color: "var(--red)", display: "block" }}>AVOIDANCE OFF</span>
                    <span className="metric-val-off">{comparisonData.withoutRule.avgWaitSec}s</span>
                  </div>
                  <div style={{ fontSize: 18, color: "var(--muted)" }}>vs</div>
                  <div style={{ textAlign: "right" }}>
                    <span style={{ fontSize: 11.5, color: "var(--green)", display: "block" }}>AVOIDANCE ON</span>
                    <span className="metric-val-on">{comparisonData.withRule.avgWaitSec}s</span>
                  </div>
                </div>
                <div className="metric-takeaway-text">
                  <strong>Takeaway: </strong>Stalled vehicles accumulate runaway delay. The safety rule trades permanent freezes for brief, orderly waits.
                </div>
              </div>
            </div>

            {/* Visual Bar Charts Comparison */}
            <div className="benchmark-charts-card">
              <span style={{ fontSize: 12, fontFamily: "IBM Plex Mono", color: "var(--muted)", textTransform: "uppercase" }}>
                Visual Benchmark Comparisons (Avoidance ON vs Contention OFF):
              </span>

              {/* Chart 1: Deadlocks */}
              <div className="benchmark-chart-row">
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5 }}>
                  <span>Deadlocks Encountered (Lower is better)</span>
                  <span>
                    <strong style={{ color: "var(--red)" }}>OFF: {comparisonData.withoutRule.deadlocks}</strong> vs{" "}
                    <strong style={{ color: "var(--green)" }}>ON: {comparisonData.withRule.deadlocks}</strong>
                  </span>
                </div>
                <div className="benchmark-bar-track">
                  <div
                    className="benchmark-bar-fill off"
                    style={{ width: `${Math.min(100, (comparisonData.withoutRule.deadlocks / 5) * 100)}%` }}
                  />
                </div>
              </div>

              {/* Chart 2: Deliveries */}
              <div className="benchmark-chart-row">
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5 }}>
                  <span>Completed Cargo Deliveries (Higher is better)</span>
                  <span>
                    <strong style={{ color: "var(--red)" }}>OFF: {comparisonData.withoutRule.completed}</strong> vs{" "}
                    <strong style={{ color: "var(--green)" }}>ON: {comparisonData.withRule.completed}</strong>
                  </span>
                </div>
                <div className="benchmark-bar-track">
                  <div
                    className="benchmark-bar-fill on"
                    style={{ width: `${Math.min(100, (comparisonData.withRule.completed / (comparisonData.withRule.completed + 6)) * 100)}%` }}
                  />
                </div>
              </div>

              {/* Chart 3: Wait Time */}
              <div className="benchmark-chart-row">
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5 }}>
                  <span>Average Wait Time per Vehicle (Lower is better)</span>
                  <span>
                    <strong style={{ color: "var(--red)" }}>OFF: {comparisonData.withoutRule.avgWaitSec}s</strong> vs{" "}
                    <strong style={{ color: "var(--green)" }}>ON: {comparisonData.withRule.avgWaitSec}s</strong>
                  </span>
                </div>
                <div className="benchmark-bar-track">
                  <div
                    className="benchmark-bar-fill off"
                    style={{ width: `${Math.min(100, (comparisonData.withoutRule.avgWaitSec / 30) * 100)}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Performance Comparison Table */}
            <div className="benchmark-table-container">
              <table className="benchmark-table">
                <thead>
                  <tr>
                    <th>Operating Mode</th>
                    <th>Deadlocks</th>
                    <th>Completed Deliveries</th>
                    <th>Average Delay</th>
                    <th>System Behavior</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="highlight-row">
                    <td><strong style={{ color: "var(--green)" }}>Havender Protocol ON (Junction Reservation)</strong></td>
                    <td style={{ color: "var(--green)", fontWeight: 700 }}>{comparisonData.withRule.deadlocks}</td>
                    <td>{comparisonData.withRule.completed} trips</td>
                    <td>{comparisonData.withRule.avgWaitSec}s</td>
                    <td>Acyclic Wait-For Graph; smooth arterial throughput</td>
                  </tr>
                  <tr>
                    <td><strong style={{ color: "var(--red)" }}>Unregulated Mode OFF (Direct Contention)</strong></td>
                    <td style={{ color: "var(--red)", fontWeight: 700 }}>{comparisonData.withoutRule.deadlocks}</td>
                    <td>{comparisonData.withoutRule.completed} trips</td>
                    <td>{comparisonData.withoutRule.avgWaitSec}s</td>
                    <td>Cyclic contention creates permanent intersection gridlock</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "16px 20px", background: "rgba(126, 153, 132, 0.12)", border: "1px solid rgba(126, 153, 132, 0.35)", borderRadius: 8, fontSize: 13.5, color: "var(--paper)", lineHeight: 1.5 }}>
              <span style={{ color: "var(--green)", display: "inline-flex" }}><Icon name="chart" size={16} /></span>
              <span><strong>Architectural Lesson: </strong>Total ordering and safety reservations guarantee acyclic resource allocation graphs, eliminating deadlocks at the cost of modest queueing delays.</span>
            </div>
          </div>
        </section>
      )}

      {/* Footer */}
      <footer>
        <div
          className="brand"
          style={{ cursor: "pointer" }}
          onClick={() => {
            setActivePage("live");
            window.location.hash = "live";
          }}
        >
          <span className="brand-mark">
            <i />
            <i />
            <i />
            <i />
          </span>
          <span>GRIDLOCK</span>
        </div>
        <p>Operating Systems Concurrency, Banker's Algorithm & Resource Allocation Simulator.</p>
        <button
          onClick={() => {
            setActivePage("live");
            window.location.hash = "live";
          }}
          style={{ background: "none", border: "none", color: "var(--paper)", display: "inline-flex", alignItems: "center", gap: 6, cursor: "pointer", font: "inherit" }}
        >
          Return to live floor <Icon name="arrow" />
        </button>
      </footer>
    </main>
  );
}
