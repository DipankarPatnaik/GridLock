export type Page = "Overview" | "Warehouse" | "Monitor" | "Memory" | "Recovery" | "Analytics";
export type Connection = "connecting" | "connected" | "disconnected" | "simulated";
export type ThemeMode = "light" | "dark";

export type RobotState = "idle" | "moving" | "waiting" | "blocked" | "recovering" | "reserved";

export type Robot = {
  id: string;
  x: number;
  y: number;
  heading?: number; // degrees 0, 90, 180, 270
  state?: RobotState | string;
  destination?: { x: number; y: number; label?: string };
  path?: Array<{ x: number; y: number }>;
  heldResources?: string[];
  waitingFor?: string;
  battery?: number; // 0 - 100
  task?: string;
  load?: string | null;
  priority?: number;
};

export type LayoutCellType =
  | "shelf"
  | "path"
  | "intersection"
  | "charging"
  | "dock"
  | "waiting_bay"
  | "obstacle";

export type LayoutCell = {
  x: number;
  y: number;
  type: LayoutCellType | string;
  id?: string;
  label?: string;
  occupiedBy?: string | null;
  reservedBy?: string | null;
  isDeadlocked?: boolean;
};

export type Resource = {
  id: string;
  name: string;
  type: "intersection" | "pathway" | "dock" | "charger";
  location: { x: number; y: number };
  heldBy: string | null;
  waitingQueue: string[];
  isContested?: boolean;
};

export type EngineEventType =
  | "request"
  | "allocated"
  | "released"
  | "waiting"
  | "deadlock"
  | "recovery_started"
  | "recovery_completed"
  | "memory_match"
  | "prevention_applied"
  | "info";

export type EngineEvent = {
  id: string;
  timestamp: string | number;
  type: EngineEventType | string;
  message: string;
  robotId?: string;
  resourceId?: string;
  location?: string;
  severity?: "normal" | "warning" | "critical" | "success";
};

export type GraphNode = {
  id: string;
  type: "robot" | "resource";
  label?: string;
  x?: number; // percentage 0 - 100
  y?: number;
  px?: number;
  py?: number;
  state?: string;
  heldCount?: number;
  waitingCount?: number;
};

export type GraphEdge = {
  id?: string;
  from: string;
  to: string;
  type: "holds" | "requests"; // holds = resource -> robot, requests = robot -> resource
  inCycle?: boolean;
};

export type Incident = {
  id: string;
  timestamp: string;
  intersection: string;
  involvedRobots: string[];
  resourcesInvolved: string[];
  pattern: string;
  resolution: string;
  recoveryAction: string;
  match?: number; // confidence percentage 0 - 100
  resolvedAt?: string;
  preventedRecurrenceCount?: number;
};

export type RecoveryStep = {
  index: number;
  name: string;
  description: string;
  status: "pending" | "active" | "completed";
};

export type RecoveryState = {
  active: boolean;
  incidentId?: string;
  step: number;
  steps: string[];
  stepDetails?: RecoveryStep[];
  victimRobot?: string;
  deadlockedRobots?: string[];
  alternativeRoute?: Array<{ x: number; y: number }>;
  before?: Record<string, number | string>;
  after?: Record<string, number | string>;
  history: Array<{
    id: string;
    timestamp: string | number;
    action: string;
    result: string;
    victim?: string;
    durationMs?: number;
    resourcesFreed?: string[];
  }>;
};

export type AnalyticsSeries = {
  name: string;
  values: number[];
  color?: string;
};

export type Snapshot = {
  engine?: {
    version?: string;
    tick?: number;
    status?: string;
    uptimeSeconds?: number;
    mode?: "live" | "simulated";
    algorithm?: string;
  };
  metrics?: {
    robots: number;
    activeRobots?: number;
    idleRobots?: number;
    occupiedResources?: number;
    deadlocksDetected: number;
    deadlocksPrevented: number;
    averageWaitMs: number;
    utilization: number;
    throughput: number;
    recoverySuccessRate?: number;
  };
  warehouse?: {
    width: number;
    height: number;
    cells: LayoutCell[];
    resources?: Resource[];
  };
  robots?: Robot[];
  events?: EngineEvent[];
  allocationGraph?: {
    nodes: GraphNode[];
    edges: GraphEdge[];
    cycle?: string[]; // array of node IDs participating in circular wait
    explanation?: string;
  };
  memory?: {
    incidents: Incident[];
    activeMatch?: {
      incidentId?: string;
      pattern: string;
      confidence: number;
      action: string;
      intersection?: string;
      timestamp?: string;
    };
    heatmap?: number[]; // grid cell hit counts
    preventionRate?: number;
  };
  recovery?: RecoveryState;
  analytics?: {
    labels: string[];
    series: AnalyticsSeries[];
    strategyComparison?: {
      strategies: string[];
      deadlocks: number[];
      avgWait: number[];
      throughput: number[];
    };
  };
  history?: Array<{
    timestamp: string;
    tick?: number;
    utilization: number;
    waitMs: number;
    deadlocks: number;
    throughput?: number;
  }>;
};
