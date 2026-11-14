// Unified Simulation Types for GridLock Warehouse OS
// Single source of truth for continuous kinematics, mutual exclusion resources,
// Wait-For Graph cycle detection, Banker's Algorithm, and educational OS demonstrations.

export type ForkliftStatus = "moving" | "waiting" | "deadlocked" | "loading";
export type CargoState = "empty" | "loading" | "loaded" | "unloading";
export type ActivePage = "live" | "scenarios" | "conditions" | "bankers" | "benchmark";

export interface ForkliftJob {
  id: string;
  sourceRackId: string;
  sourceBayName: string;
  targetDockId: string;
  targetDockName: string;
  itemType: string;
  itemColor: string;
}

export interface Forklift {
  id: string; // "1", "2", "3"...
  name: string;
  color: string;
  cargo: string;
  cargoState: CargoState;
  currentJob: ForkliftJob | null;
  battery: number;
  priority: number;

  // Kinematics (continuous physics)
  x: number;
  y: number;
  heading: number; // degrees: 0 = East, 90 = South, 180 = West, 270 = North
  speed: number;   // px / sec
  targetSpeed: number;

  // Pathfinding & Route
  route: string[];       // sequence of waypoint IDs
  routeIndex: number;    // current target waypoint index in route
  currentGoal: string;   // friendly destination name
  destinationId: string; // destination node ID
  dwellTimer: number;    // seconds to wait at destination (loading/unloading)

  // Resource Management & OS State
  heldResources: string[];          // Resource IDs currently owned
  requestedResource: string | null; // Resource ID waiting for (if any)
  waitingFor: string | null;        // ID of the forklift currently blocking this one
  status: ForkliftStatus;
  waitReason: string;               // Plain-English reason for waiting
}

export type ResourceType = "intersection" | "aisle" | "dock" | "charger" | "buffer";

export interface Resource {
  id: string;
  name: string;
  type: ResourceType;
  x: number;
  y: number;
  width: number;
  height: number;
  owner: string | null;         // Forklift ID holding this resource (null if free)
  waitingQueue: string[];       // Forklift IDs waiting to acquire this resource
}

export interface WfgEdge {
  from: string;        // Waiting Forklift ID ("1", "2"...)
  to: string;          // Owner Forklift ID ("1", "2"...)
  resourceId: string;  // Resource being waited for
  isCycle: boolean;    // true if this edge participates in an active deadlock cycle
  order: number;       // Chronological order of discovery (1, 2, 3...)
}

export interface ScenarioStep {
  id: number;
  text: string;
  forkliftId: string;
  resourceId?: string;
  type: "claim" | "request" | "loop";
}

export interface DeadlockScenarioConfig {
  id: number;
  code: string;
  title: string;              // Plain words: e.g. "Two forklifts swap places"
  subtitle: string;
  description: string;
  analogy: string;            // Real-life analogy
  cue: string;                // Cue before freeze
  avoidanceTip: string;       // How to prevent it
  easiestConditionToBreak: string; // "Circular wait" | "Hold and wait" | "Mutual exclusion" | "No preemption"
  easiestConditionTip: string;     // Specific explanation of which condition to break
  steps: ScenarioStep[];      // Guided step milestones
}

export interface FourConditionsState {
  mutualExclusion: boolean; // Spot can only be used by 1 forklift at a time
  holdAndWait: boolean;     // Forklift holds a spot while waiting for another
  noPreemption: boolean;    // Forklifts cannot be forced to give up a spot
  circularWait: boolean;    // The waiting forms a closed loop
  allMet: boolean;          // True iff all 4 conditions are met -> Deadlock!
}

// Banker's Algorithm Types
export interface BankerProcess {
  id: number;
  name: string;
  allocation: number[]; // [A, B, C]
  max: number[];        // [A, B, C]
  need: number[];       // [A, B, C]
}

export interface BankerResource {
  id: string;
  name: string;
  total: number;
  available: number;
}

export interface BankerSafetyStep {
  step: number;
  processId: number;
  processName: string;
  workBefore: number[];
  need: number[];
  allocation: number[];
  workAfter: number[];
  canFinish: boolean;
  explanation: string;
}

export interface BankerSafetyResult {
  isSafe: boolean;
  safeSequence: number[];
  steps: BankerSafetyStep[];
  stepLog: string[];
}

export interface ComparisonRunData {
  deadlocks: number;
  completed: number;
  avgWaitSec: number;
}

export interface ComparisonResult {
  timestamp: string;
  simulatedDurationSec: number;
  withoutRule: ComparisonRunData;
  withRule: ComparisonRunData;
}

export interface SimulationState {
  mode: "simulate" | "deadlock" | "paused";
  avoidanceEnabled: boolean;
  avoidanceRule: string;
  simTime: number; // simulated seconds elapsed
  tickCount: number;

  // Entities
  forklifts: Forklift[];
  resources: Record<string, Resource>;

  // Wait-For Graph (Built strictly from resource claims & queues)
  wfgEdges: WfgEdge[];
  wfgCycles: string[][]; // array of cycle loops, e.g. [["2", "1"]]
  isDeadlocked: boolean;
  deadlockedForkliftIds: string[];

  // Deadlock Scenario State
  scenarioIndex: number; // 0 to 6 (Cases 1 to 7)
  scenarioTitle: string;
  scenarioSubtitle: string;
  scenarioDescription: string;
  scenarioAnalogy: string;
  scenarioCue: string;
  avoidanceTip: string;
  easiestConditionToBreak: string;
  easiestConditionTip: string;

  // Guided Playback State
  playbackMode: "auto" | "step" | "paused";
  currentStepIndex: number;
  steps: ScenarioStep[];
  pulsedForkliftId: string | null;
  pulsedResourceId: string | null;

  // Four Conditions Checklist (Live state evaluation)
  fourConditions: FourConditionsState;

  // Real-time Explanation Generated From State
  explanation: {
    headline: string;
    narrative: string[];
    analogy: string;
    avoidanceTip: string;
  };

  // Live Counts
  counts: {
    moving: number;
    waiting: number;
    deadlocked: number;
    total: number;
  };

  // Real Stats
  stats: {
    deadlocksEncountered: number;
    deadlocksAvoided: number;
    completedTrips: number;
    totalWaitTimeSec: number;
    avgWaitTimeSec: number;
  };
}
