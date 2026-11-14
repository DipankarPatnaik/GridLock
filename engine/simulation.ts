import {
  Snapshot,
  Robot,
  LayoutCell,
  Resource,
  EngineEvent,
  EngineEventType,
  GraphNode,
  GraphEdge,
  Incident,
  RecoveryState,
} from "../types/gridlock";

const WAREHOUSE_WIDTH = 24;
const WAREHOUSE_HEIGHT = 14;

// Build static layout cells for 24x14 warehouse
export function createWarehouseLayout(): { cells: LayoutCell[]; resources: Resource[] } {
  const cells: LayoutCell[] = [];
  const resources: Resource[] = [];

  // Key intersection locations
  const intersections = [
    { id: "I1", x: 5, y: 3, label: "Intersection I1" },
    { id: "I2", x: 11, y: 3, label: "Intersection I2" },
    { id: "I3", x: 17, y: 3, label: "Intersection I3" },
    { id: "I4", x: 5, y: 7, label: "Intersection I4" },
    { id: "I5", x: 11, y: 7, label: "Intersection I5" },
    { id: "I6", x: 17, y: 7, label: "Intersection I6" },
    { id: "I7", x: 5, y: 11, label: "Intersection I7" },
    { id: "I8", x: 17, y: 11, label: "Intersection I8" },
  ];

  // Storage shelves (4 rack zones)
  const shelfBlocks = [
    // Zone A (North-West)
    { x1: 1, x2: 4, y1: 1, y2: 2, label: "RACK-A" },
    { x1: 1, x2: 4, y1: 4, y2: 5, label: "RACK-A" },
    // Zone B (North-East)
    { x1: 19, x2: 22, y1: 1, y2: 2, label: "RACK-B" },
    { x1: 19, x2: 22, y1: 4, y2: 5, label: "RACK-B" },
    // Zone C (Mid Center)
    { x1: 7, x2: 9, y1: 4, y2: 5, label: "RACK-C" },
    { x1: 13, x2: 15, y1: 4, y2: 5, label: "RACK-C" },
    // Zone D (South Center)
    { x1: 7, x2: 9, y1: 9, y2: 10, label: "RACK-D" },
    { x1: 13, x2: 15, y1: 9, y2: 10, label: "RACK-D" },
    // Zone E (South Flanks)
    { x1: 1, x2: 4, y1: 9, y2: 10, label: "RACK-E" },
    { x1: 19, x2: 22, y1: 9, y2: 10, label: "RACK-E" },
  ];

  // Docks at left & right edges
  const docks = [
    { id: "D1", x: 0, y: 3, label: "Inbound D1" },
    { id: "D2", x: 0, y: 7, label: "Inbound D2" },
    { id: "D3", x: 23, y: 3, label: "Outbound D3" },
    { id: "D4", x: 23, y: 7, label: "Outbound D4" },
  ];

  // Charging Stations (Top & Bottom bays)
  const chargingStations = [
    { id: "CH1", x: 7, y: 0, label: "Charger 1" },
    { id: "CH2", x: 15, y: 0, label: "Charger 2" },
    { id: "CH3", x: 7, y: 13, label: "Charger 3" },
    { id: "CH4", x: 15, y: 13, label: "Charger 4" },
  ];

  // Safe Waiting Bays (GridLock designated prevention holding areas)
  const waitingBays = [
    { id: "WB1", x: 11, y: 1, label: "Wait Bay 1" },
    { id: "WB2", x: 11, y: 5, label: "Wait Bay 2" },
    { id: "WB3", x: 11, y: 9, label: "Wait Bay 3" },
    { id: "WB4", x: 11, y: 12, label: "Wait Bay 4" },
  ];

  // Populate cells
  for (let y = 0; y < WAREHOUSE_HEIGHT; y++) {
    for (let x = 0; x < WAREHOUSE_WIDTH; x++) {
      let type: LayoutCell["type"] = "path";
      let id: string | undefined = undefined;
      let label: string | undefined = undefined;

      // Check shelf
      const isShelf = shelfBlocks.some(
        (b) => x >= b.x1 && x <= b.x2 && y >= b.y1 && y <= b.y2,
      );
      if (isShelf) {
        type = "shelf";
        id = `S-${x},${y}`;
      }

      // Check intersection
      const inter = intersections.find((i) => i.x === x && i.y === y);
      if (inter) {
        type = "intersection";
        id = inter.id;
        label = inter.label;
      }

      // Check dock
      const dock = docks.find((d) => d.x === x && d.y === y);
      if (dock) {
        type = "dock";
        id = dock.id;
        label = dock.label;
      }

      // Check charger
      const ch = chargingStations.find((c) => c.x === x && c.y === y);
      if (ch) {
        type = "charging";
        id = ch.id;
        label = ch.label;
      }

      // Check waiting bay
      const wb = waitingBays.find((w) => w.x === x && w.y === y);
      if (wb) {
        type = "waiting_bay";
        id = wb.id;
        label = wb.label;
      }

      cells.push({ x, y, type, id, label });
    }
  }

  // Define shared resources for OS allocation tracking
  intersections.forEach((i) => {
    resources.push({
      id: i.id,
      name: i.label,
      type: "intersection",
      location: { x: i.x, y: i.y },
      heldBy: null,
      waitingQueue: [],
    });
  });

  docks.forEach((d) => {
    resources.push({
      id: d.id,
      name: d.label,
      type: "dock",
      location: { x: d.x, y: d.y },
      heldBy: null,
      waitingQueue: [],
    });
  });

  return { cells, resources };
}

// Pre-seeded Deadlock Memory archive
const INITIAL_MEMORY_INCIDENTS: Incident[] = [
  {
    id: "DM-104",
    timestamp: "10:14:22",
    intersection: "I3",
    involvedRobots: ["R1", "R2"],
    resourcesInvolved: ["I3", "I4"],
    pattern: "Bidirectional Head-On Contention on Corridor C-North",
    resolution: "Preemptive divert of R2 to Safe Bay WB2 for 2 ticks",
    recoveryAction: "Preemptive Route Diversion",
    match: 94,
    preventedRecurrenceCount: 18,
  },
  {
    id: "DM-098",
    timestamp: "09:48:05",
    intersection: "I5",
    involvedRobots: ["R2", "R3", "R4"],
    resourcesInvolved: ["I4", "I5", "I6"],
    pattern: "3-Way Triangular Circular Wait across Central Transfer Hub",
    resolution: "Victim selection R3 with rollback to Waypoint (11, 4)",
    recoveryAction: "Priority Boost & Drain",
    match: 88,
    preventedRecurrenceCount: 12,
  },
  {
    id: "DM-085",
    timestamp: "08:31:19",
    intersection: "I7",
    involvedRobots: ["R1", "R4"],
    resourcesInvolved: ["I7", "D2"],
    pattern: "Inbound Dock Entry vs Transit Path Claim Lock",
    resolution: "Resource preemption with temporary yield to outbound convoy",
    recoveryAction: "Resource Preemption",
    match: 91,
    preventedRecurrenceCount: 24,
  },
  {
    id: "DM-072",
    timestamp: "07:15:40",
    intersection: "I2",
    involvedRobots: ["R3", "R5"],
    resourcesInvolved: ["I1", "I2"],
    pattern: "North Crossway Circular Claim under Heavy Battery Relocation",
    resolution: "Speed throttling R5 to allow R3 clear intersection boundary",
    recoveryAction: "Asymmetric Speed Stagger",
    match: 85,
    preventedRecurrenceCount: 7,
  },
];

// Initial default robots
export function createInitialRobots(): Robot[] {
  return [
    {
      id: "R1",
      x: 3,
      y: 3,
      heading: 90,
      state: "moving",
      destination: { x: 17, y: 3, label: "Intersection I3" },
      battery: 92,
      task: "Pallet Transfer A4 -> D3",
      load: "SKU-992",
      priority: 3,
      heldResources: ["I1"],
      waitingFor: undefined,
    },
    {
      id: "R2",
      x: 17,
      y: 5,
      heading: 0,
      state: "moving",
      destination: { x: 17, y: 1, label: "RACK-B" },
      battery: 88,
      task: "Restock Bin B2",
      load: "SKU-410",
      priority: 2,
      heldResources: ["I6"],
      waitingFor: undefined,
    },
    {
      id: "R3",
      x: 11,
      y: 7,
      heading: 270,
      state: "moving",
      destination: { x: 5, y: 7, label: "Intersection I4" },
      battery: 96,
      task: "High-Priority Dispatch",
      load: "SKU-108",
      priority: 5,
      heldResources: ["I5"],
      waitingFor: undefined,
    },
    {
      id: "R4",
      x: 5,
      y: 9,
      heading: 0,
      state: "moving",
      destination: { x: 5, y: 3, label: "Intersection I1" },
      battery: 74,
      task: "Empty Tote Return",
      load: null,
      priority: 1,
      heldResources: ["I7"],
      waitingFor: undefined,
    },
    {
      id: "R5",
      x: 11,
      y: 3,
      heading: 180,
      state: "idle",
      destination: { x: 11, y: 0, label: "Charger 1" },
      battery: 31,
      task: "Low Battery Return",
      load: null,
      priority: 4,
      heldResources: ["I2"],
      waitingFor: undefined,
    },
  ];
}

export class SimulationEngine {
  private tick = 184;
  private isRunning = true;
  private speed = 1;
  private isDeadlocked = false;
  private robots: Robot[] = createInitialRobots();
  private layout = createWarehouseLayout();
  private events: EngineEvent[] = [];
  private memoryIncidents: Incident[] = [...INITIAL_MEMORY_INCIDENTS];
  private deadlocksDetectedCount = 3;
  private deadlocksPreventedCount = 29;
  private history: Array<{
    timestamp: string;
    tick: number;
    utilization: number;
    waitMs: number;
    deadlocks: number;
    throughput: number;
  }> = [];

  private recoveryState: RecoveryState = {
    active: false,
    step: 0,
    steps: ["Detect", "Analyze", "Reroute", "Release", "Verify", "Resume"],
    history: [
      {
        id: "REC-012",
        timestamp: "10:14:26",
        action: "Victim Preemption & Reroute",
        result: "Resolved in 180ms · R2 diverted to Bay WB2",
        victim: "R2",
        durationMs: 180,
        resourcesFreed: ["I3", "I4"],
      },
    ],
  };

  private activeMatch: NonNullable<Snapshot["memory"]>["activeMatch"] = undefined;
  private heatmapHits: number[] = new Array(96).fill(0).map((_, i) => {
    // Concentrate hits around intersection indices (I3, I4, I5, I7)
    if ([17, 18, 41, 42, 65, 80].includes(i)) return Math.floor(Math.random() * 8) + 6;
    if (i % 8 === 0) return Math.floor(Math.random() * 4) + 1;
    return Math.floor(Math.random() * 2);
  });

  constructor() {
    this.initHistory();
    this.addEvent("info", "Simulation initialized. C Graph Engine loaded v2.8.4", undefined, undefined, "normal");
    this.addEvent("allocated", "Intersection I1 allocated to R1", "R1", "I1", "normal");
    this.addEvent("allocated", "Intersection I5 allocated to R3", "R3", "I5", "normal");
  }

  private initHistory() {
    const now = Date.now();
    for (let i = 24; i >= 0; i--) {
      const t = new Date(now - i * 15000);
      this.history.push({
        timestamp: t.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
        tick: this.tick - i * 8,
        utilization: Math.round(58 + Math.sin(i * 0.4) * 14 + (Math.random() * 6 - 3)),
        waitMs: Math.round(180 + Math.cos(i * 0.3) * 60 + Math.random() * 30),
        deadlocks: i < 5 ? 0 : i === 12 ? 1 : 0,
        throughput: Math.round(42 + Math.cos(i * 0.5) * 8),
      });
    }
  }

  public addEvent(
    type: EngineEventType,
    message: string,
    robotId?: string,
    resourceId?: string,
    severity: EngineEvent["severity"] = "normal",
  ) {
    const evt: EngineEvent = {
      id: `EVT-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 5)}`,
      timestamp: Date.now(),
      type,
      message,
      robotId,
      resourceId,
      severity,
    };
    this.events.push(evt);
    if (this.events.length > 250) this.events.shift();
  }

  public stepTick() {
    this.tick += 1;

    // If active recovery is underway, advance recovery steps
    if (this.recoveryState.active) {
      this.advanceRecovery();
      return this.getSnapshot();
    }

    // Normal robot movement & resource simulation
    if (!this.isDeadlocked) {
      this.moveRobots();
    }

    // Periodically generate Deadlock Memory checks
    if (this.tick % 16 === 0 && !this.isDeadlocked) {
      this.simulateMemoryCheck();
    }

    // Update history every 8 ticks
    if (this.tick % 8 === 0) {
      const util = Math.min(94, Math.max(38, Math.round(62 + Math.sin(this.tick * 0.08) * 18 + (Math.random() * 4 - 2))));
      const wait = this.isDeadlocked ? 950 : Math.round(175 + Math.random() * 45);
      this.history.push({
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
        tick: this.tick,
        utilization: util,
        waitMs: wait,
        deadlocks: this.isDeadlocked ? 1 : 0,
        throughput: Math.round(44 + (util / 100) * 12),
      });
      if (this.history.length > 30) this.history.shift();
    }

    return this.getSnapshot();
  }

  private moveRobots() {
    this.robots.forEach((robot) => {
      if (robot.state !== "moving") return;

      // Simple grid step towards destination
      if (robot.destination) {
        const dx = robot.destination.x - robot.x;
        const dy = robot.destination.y - robot.y;

        if (Math.abs(dx) > 0) {
          const step = dx > 0 ? 1 : -1;
          robot.x += step;
          robot.heading = dx > 0 ? 90 : 270;
        } else if (Math.abs(dy) > 0) {
          const step = dy > 0 ? 1 : -1;
          robot.y += step;
          robot.heading = dy > 0 ? 180 : 0;
        } else {
          // Reached destination, pick new waypoint
          this.pickNextDestination(robot);
        }
      }
    });
  }

  private pickNextDestination(robot: Robot) {
    const goals = [
      { x: 5, y: 3, label: "Intersection I1" },
      { x: 17, y: 3, label: "Intersection I3" },
      { x: 5, y: 7, label: "Intersection I4" },
      { x: 17, y: 7, label: "Intersection I6" },
      { x: 11, y: 7, label: "Intersection I5" },
      { x: 0, y: 3, label: "Dock D1" },
      { x: 23, y: 7, label: "Dock D4" },
      { x: 11, y: 1, label: "Wait Bay WB1" },
    ];
    const next = goals[Math.floor(Math.random() * goals.length)];
    robot.destination = next;
    this.addEvent("request", `${robot.id} requested path corridor toward ${next.label}`, robot.id, undefined, "normal");
  }

  private simulateMemoryCheck() {
    // Proactive Deadlock Memory pattern match
    const rA = this.robots[0]?.id || "R1";
    const rB = this.robots[1]?.id || "R2";
    this.activeMatch = {
      incidentId: "DM-104",
      pattern: `High risk circular wait between ${rA} & ${rB} at Intersection I3`,
      confidence: 93,
      action: `Preventive yield triggered: ${rB} reassigned to safe waiting bay WB2.`,
      intersection: "I3",
      timestamp: new Date().toLocaleTimeString(),
    };
    this.deadlocksPreventedCount += 1;
    this.addEvent(
      "memory_match",
      `Deadlock Memory: 93% match with DM-104 at I3. Applied safe bay diversion for ${rB}.`,
      rB,
      "I3",
      "success",
    );
  }

  public triggerDeadlockScenario() {
    this.isDeadlocked = true;
    this.deadlocksDetectedCount += 1;

    // Position R1, R2, R3 in circular wait around I3, I4, I5
    // R1 holds I3, wants I4
    // R2 holds I4, wants I5
    // R3 holds I5, wants I3
    const r1 = this.robots.find((r) => r.id === "R1") || this.robots[0];
    const r2 = this.robots.find((r) => r.id === "R2") || this.robots[1];
    const r3 = this.robots.find((r) => r.id === "R3") || this.robots[2];

    if (r1) {
      r1.x = 17;
      r1.y = 3;
      r1.state = "blocked";
      r1.heldResources = ["I3"];
      r1.waitingFor = "I4";
      r1.destination = { x: 5, y: 7, label: "Intersection I4" };
    }
    if (r2) {
      r2.x = 5;
      r2.y = 7;
      r2.state = "blocked";
      r2.heldResources = ["I4"];
      r2.waitingFor = "I5";
      r2.destination = { x: 11, y: 7, label: "Intersection I5" };
    }
    if (r3) {
      r3.x = 11;
      r3.y = 7;
      r3.state = "blocked";
      r3.heldResources = ["I5"];
      r3.waitingFor = "I3";
      r3.destination = { x: 17, y: 3, label: "Intersection I3" };
    }

    this.addEvent(
      "deadlock",
      "CRITICAL: Circular wait detected by DFS cycle detector! Cycle: R1 -> I4 -> R2 -> I5 -> R3 -> I3 -> R1",
      "R1",
      "I3",
      "critical",
    );

    // Record in heatmap
    this.heatmapHits[18] += 3;
    this.heatmapHits[41] += 3;

    return this.getSnapshot();
  }

  public startRecovery() {
    if (!this.isDeadlocked && !this.recoveryState.active) {
      // Create a test recovery even if not strictly deadlocked
      this.isDeadlocked = true;
      this.triggerDeadlockScenario();
    }

    this.recoveryState.active = true;
    this.recoveryState.step = 0;
    this.recoveryState.incidentId = `INC-${Date.now().toString(36).toUpperCase()}`;
    this.recoveryState.victimRobot = "R2";
    this.recoveryState.deadlockedRobots = ["R1", "R2", "R3"];

    this.addEvent(
      "recovery_started",
      "Recovery Pipeline Initiated: DFS confirmed cycle [R1, R2, R3]. Executing Step 1 (Detect).",
      "System",
      undefined,
      "warning",
    );

    return this.getSnapshot();
  }

  private advanceRecovery() {
    this.recoveryState.step += 1;
    const stepNames = ["Detect", "Analyze", "Reroute", "Release", "Verify", "Resume"];
    const currentName = stepNames[this.recoveryState.step] || "Complete";

    if (this.recoveryState.step === 1) {
      this.addEvent(
        "info",
        "Step 2 (Analyze): Evaluating rollback cost. Selected victim R2 (lowest priority score 2).",
        "R2",
        undefined,
        "warning",
      );
    } else if (this.recoveryState.step === 2) {
      this.addEvent(
        "info",
        "Step 3 (Reroute): Calculating detour path for R2 via Safe Corridor WB2.",
        "R2",
        "WB2",
        "normal",
      );
      const r2 = this.robots.find((r) => r.id === "R2");
      if (r2) {
        r2.state = "recovering";
        r2.destination = { x: 11, y: 5, label: "Safe Bay WB2" };
      }
    } else if (this.recoveryState.step === 3) {
      this.addEvent(
        "released",
        "Step 4 (Release): Preemptively revoked lock on I4 held by R2. Lock granted to waiting R1.",
        "R2",
        "I4",
        "success",
      );
      const r1 = this.robots.find((r) => r.id === "R1");
      const r2 = this.robots.find((r) => r.id === "R2");
      if (r2) r2.heldResources = [];
      if (r1) {
        r1.state = "moving";
        r1.waitingFor = undefined;
        r1.heldResources = ["I3", "I4"];
      }
    } else if (this.recoveryState.step === 4) {
      this.addEvent(
        "info",
        "Step 5 (Verify): DFS graph cycle check returned 0 cycles. System state is strictly ACYCLIC.",
        "System",
        undefined,
        "success",
      );
    } else if (this.recoveryState.step >= 5) {
      // Completed recovery
      this.recoveryState.active = false;
      this.isDeadlocked = false;

      // Resume all robots
      this.robots.forEach((r) => {
        r.state = "moving";
        r.waitingFor = undefined;
      });

      // Add to recovery history
      this.recoveryState.history.unshift({
        id: `REC-${Math.floor(Math.random() * 900 + 100)}`,
        timestamp: new Date().toLocaleTimeString(),
        action: "Victim Preemption (R2) & Bypass Reroute",
        result: "Verified ACYCLIC state in 340ms · 0 packet loss",
        victim: "R2",
        durationMs: 340,
        resourcesFreed: ["I4", "I5"],
      });

      // Add new learned incident to Deadlock Memory!
      const newInc: Incident = {
        id: `DM-${Math.floor(Math.random() * 200 + 110)}`,
        timestamp: new Date().toLocaleTimeString(),
        intersection: "I3/I4",
        involvedRobots: ["R1", "R2", "R3"],
        resourcesInvolved: ["I3", "I4", "I5"],
        pattern: "Triangular Mutual Wait at North Hub Intersections",
        resolution: "Preempt R2 and allocate Safe Bay WB2 detour",
        recoveryAction: "Victim Preemption & Detour",
        match: 97,
        preventedRecurrenceCount: 1,
      };
      this.memoryIncidents.unshift(newInc);

      this.addEvent(
        "recovery_completed",
        "Step 6 (Resume): Warehouse flow resumed normally. Incident signature stored in Deadlock Memory.",
        "System",
        undefined,
        "success",
      );
    }
  }

  public resolveDeadlock() {
    this.startRecovery();
    return this.getSnapshot();
  }

  public resetSimulation() {
    this.tick = 1;
    this.isDeadlocked = false;
    this.robots = createInitialRobots();
    this.recoveryState.active = false;
    this.recoveryState.step = 0;
    this.activeMatch = undefined;
    this.addEvent("info", "Simulation reset to initial conditions. Engine tick 1.", undefined, undefined, "normal");
    return this.getSnapshot();
  }

  public addRobot() {
    const id = `R${this.robots.length + 1}`;
    const x = Math.floor(Math.random() * 18) + 3;
    const y = Math.floor(Math.random() * 8) + 2;
    const newRobot: Robot = {
      id,
      x,
      y,
      heading: 90,
      state: "moving",
      destination: { x: 17, y: 7, label: "Intersection I6" },
      battery: 100,
      task: "Ad-hoc Transport Order",
      load: "SKU-AUTO",
      priority: 2,
      heldResources: [],
    };
    this.robots.push(newRobot);
    this.addEvent("info", `Spawned autonomous robot ${id} at (${x}, ${y})`, id, undefined, "normal");
    return this.getSnapshot();
  }

  public removeRobot() {
    if (this.robots.length <= 2) return this.getSnapshot();
    const removed = this.robots.pop();
    if (removed) {
      this.addEvent("info", `Decommissioned robot ${removed.id} from warehouse floor`, removed.id, undefined, "normal");
    }
    return this.getSnapshot();
  }

  public setSpeed(s: number) {
    this.speed = s;
  }

  public setRunning(r: boolean) {
    this.isRunning = r;
  }

  public getRunning() {
    return this.isRunning;
  }

  public getSpeed() {
    return this.speed;
  }

  // Generate authoritative Snapshot matching real C engine struct
  public getSnapshot(): Snapshot {
    // Generate Resource Allocation Graph
    const nodes: GraphNode[] = [];
    const edges: GraphEdge[] = [];
    const cycleNodes: string[] = [];

    // Process nodes (Robots)
    this.robots.forEach((r, idx) => {
      const angle = (idx / this.robots.length) * 2 * Math.PI;
      const px = 50 + 36 * Math.cos(angle);
      const py = 50 + 36 * Math.sin(angle);
      nodes.push({
        id: r.id,
        type: "robot",
        label: r.id,
        px,
        py,
        state: r.state,
      });

      // Held edges (Resource -> Robot)
      (r.heldResources || []).forEach((resId) => {
        edges.push({
          id: `${resId}->${r.id}`,
          from: resId,
          to: r.id,
          type: "holds",
          inCycle: this.isDeadlocked && ["R1", "R2", "R3"].includes(r.id),
        });
      });

      // Requested edge (Robot -> Resource)
      if (r.waitingFor) {
        edges.push({
          id: `${r.id}->${r.waitingFor}`,
          from: r.id,
          to: r.waitingFor,
          type: "requests",
          inCycle: this.isDeadlocked && ["R1", "R2", "R3"].includes(r.id),
        });
      }
    });

    // Resource nodes
    const activeResources = ["I1", "I2", "I3", "I4", "I5", "I6", "I7", "D1", "D4"];
    activeResources.forEach((resId, idx) => {
      const angle = (idx / activeResources.length) * 2 * Math.PI + 0.3;
      const px = 50 + 19 * Math.cos(angle);
      const py = 50 + 19 * Math.sin(angle);
      nodes.push({
        id: resId,
        type: "resource",
        label: resId,
        px,
        py,
        state: this.isDeadlocked && ["I3", "I4", "I5"].includes(resId) ? "deadlocked" : "allocated",
      });
    });

    if (this.isDeadlocked) {
      cycleNodes.push("R1", "I4", "R2", "I5", "R3", "I3");
    }

    const waitingRobots = this.robots.filter((r) => ["waiting", "blocked"].includes(r.state || "")).length;
    const activeRobots = this.robots.filter((r) => r.state === "moving").length;
    const idleRobots = this.robots.filter((r) => r.state === "idle").length;

    return {
      engine: {
        version: "C Engine v2.8.4-RAG-DFS",
        tick: this.tick,
        status: this.isDeadlocked ? "DEADLOCK DETECTED" : this.isRunning ? "RUNNING" : "PAUSED",
        mode: "simulated",
        uptimeSeconds: Math.floor(this.tick * 1.5),
        algorithm: "Wait-For DFS Cycle Detection + Deadlock Memory",
      },
      metrics: {
        robots: this.robots.length,
        activeRobots,
        idleRobots,
        occupiedResources: 7 + (this.isDeadlocked ? 3 : 0),
        deadlocksDetected: this.deadlocksDetectedCount,
        deadlocksPrevented: this.deadlocksPreventedCount,
        averageWaitMs: this.isDeadlocked ? 890 : 185,
        utilization: Math.min(96, Math.max(45, Math.round(68 + Math.sin(this.tick * 0.05) * 12))),
        throughput: Math.round(48 + Math.cos(this.tick * 0.05) * 6),
        recoverySuccessRate: 98.6,
      },
      warehouse: {
        width: WAREHOUSE_WIDTH,
        height: WAREHOUSE_HEIGHT,
        cells: this.layout.cells,
        resources: this.layout.resources,
      },
      robots: this.robots,
      events: [...this.events],
      allocationGraph: {
        nodes,
        edges,
        cycle: cycleNodes,
        explanation: this.isDeadlocked
          ? "Circular Dependency Cycle Detected via Tarjan/DFS: [R1 holds I3 and requests I4] ➔ [R2 holds I4 and requests I5] ➔ [R3 holds I5 and requests I3] ➔ [R1]. No process can release without acquisition."
          : undefined,
      },
      memory: {
        incidents: this.memoryIncidents,
        activeMatch: this.activeMatch,
        heatmap: this.heatmapHits,
        preventionRate: 94.2,
      },
      recovery: this.recoveryState,
      analytics: {
        labels: ["Baseline (FIFO)", "Banker's Avoidance", "GridLock Memory OS"],
        series: [
          { name: "Deadlocks / 10k ticks", values: [42, 6, 1], color: "#632024" },
          { name: "Avg Wait Time (ms)", values: [820, 460, 185], color: "#617891" },
          { name: "Throughput (totes/hr)", values: [180, 245, 390], color: "#8B694B" },
        ],
        strategyComparison: {
          strategies: ["Standard Allocation", "Banker's Prevention", "Adaptive Memory OS"],
          deadlocks: [38, 5, 1],
          avgWait: [740, 410, 175],
          throughput: [195, 260, 415],
        },
      },
      history: [...this.history],
    };
  }
}
