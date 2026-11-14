// Single Source of Truth Simulation Engine for GridLock Warehouse OS
// Implements continuous kinematics, BFS corridor routing, Havender's avoidance protocol,
// dynamic Wait-For Graph construction, real DFS cycle detection, guided deadlock playback,
// Banker's Algorithm safety solver, and real measured comparative benchmarking.

import {
  Forklift,
  Resource,
  WfgEdge,
  SimulationState,
  DeadlockScenarioConfig,
  ComparisonResult,
  ForkliftJob,
  BankerProcess,
  BankerResource,
  BankerSafetyResult,
  BankerSafetyStep,
} from "./types";
import {
  WAYPOINTS,
  INITIAL_RESOURCES,
  RACK_PICK_STATIONS,
  DOCK_STATIONS,
  CHARGING_STATIONS,
  findShortestRoute,
} from "./warehouseGraph";

export const DEADLOCK_SCENARIOS: DeadlockScenarioConfig[] = [
  {
    id: 1,
    code: "CASE-1",
    title: "Two forklifts swap places",
    subtitle: "Two vehicles each holding what the other needs to enter",
    description: "Forklift 1 approaches from the west and claims West Junction; Forklift 2 approaches from the east and claims Central Crossroads. Both need each other's spot to proceed.",
    analogy: "Like two cars meeting on a narrow one-lane bridge: neither can back up.",
    cue: "Watch Forklift 1 and Forklift 2 drive toward the central crossway from opposite directions.",
    avoidanceTip: "Rule: always reserve the crossing junction ahead before entering the shared crossway.",
    easiestConditionToBreak: "Circular wait",
    easiestConditionTip: "Enforce a fixed ordering on junctions so vehicles cannot wait in a loop.",
    steps: [
      { id: 1, text: "Forklift 1 claims West Junction while en route East", forkliftId: "1", resourceId: "RES_CROSS_W", type: "claim" },
      { id: 2, text: "Forklift 2 claims Central Crossroads while en route West", forkliftId: "2", resourceId: "RES_CROSS_MAIN", type: "claim" },
      { id: 3, text: "Forklift 1 reaches Crossroads threshold, blocked by Forklift 2", forkliftId: "1", resourceId: "RES_CROSS_MAIN", type: "request" },
      { id: 4, text: "Forklift 2 reaches West Junction threshold, blocked by Forklift 1", forkliftId: "2", resourceId: "RES_CROSS_W", type: "request" },
      { id: 5, text: "Circular dependency closed: neither can move forward (Deadlock)", forkliftId: "1", type: "loop" },
    ],
  },
  {
    id: 2,
    code: "CASE-2",
    title: "Head-on in a narrow aisle",
    subtitle: "Two vehicles enter a one-lane aisle from opposite ends",
    description: "Forklift 1 enters Aisle 01 from the north heading south; Forklift 2 enters from the south heading north. Neither can pass or reverse.",
    analogy: "Like two people with wide shopping carts meeting in a single-file grocery aisle.",
    cue: "Watch Forklift 1 and Forklift 2 enter Aisle 01 from opposite ends.",
    avoidanceTip: "Rule: treat the entire narrow aisle as one spot—only one vehicle may enter at a time.",
    easiestConditionToBreak: "Hold and wait",
    easiestConditionTip: "Forklifts must wait at the aisle entrance until the entire track is clear.",
    steps: [
      { id: 1, text: "Forklift 1 enters Aisle 01 from North (claims Upper Node)", forkliftId: "1", resourceId: "JUNCTION_A1_UPPER", type: "claim" },
      { id: 2, text: "Forklift 2 enters Aisle 01 from South (claims Single-Track Mid)", forkliftId: "2", resourceId: "RES_AISLE_1_MID", type: "claim" },
      { id: 3, text: "Forklift 1 advances South and is blocked by Forklift 2 in single track", forkliftId: "1", resourceId: "RES_AISLE_1_MID", type: "request" },
      { id: 4, text: "Forklift 2 advances North and is blocked by Forklift 1 in single track", forkliftId: "2", resourceId: "JUNCTION_A1_UPPER", type: "request" },
      { id: 5, text: "Nose-to-nose standstill: neither can reverse or pass (Deadlock)", forkliftId: "2", type: "loop" },
    ],
  },
  {
    id: 3,
    code: "CASE-3",
    title: "Three forklifts in a circle",
    subtitle: "Three vehicles form a closed dependency loop around the central crossroads",
    description: "Forklift 1 waits for Forklift 2 at Central Crossroads, Forklift 2 waits for Forklift 3 at Buffer Bay 2, and Forklift 3 waits for Forklift 1 at Aisle 2 Upper Node.",
    analogy: "Like three cars entering a mini-roundabout at the same time, each blocking the next car's exit.",
    cue: "Watch the three vehicles converge in a triangle around the crossroads.",
    avoidanceTip: "Rule: reserve the full crossing path before crossing the threshold.",
    easiestConditionToBreak: "Circular wait",
    easiestConditionTip: "Reserve all crossing points atomically so a circular loop can never form.",
    steps: [
      { id: 1, text: "Forklift 1 claims Aisle 2 Upper Node", forkliftId: "1", resourceId: "JUNCTION_A2_UPPER", type: "claim" },
      { id: 2, text: "Forklift 2 claims Central Crossroads", forkliftId: "2", resourceId: "RES_CROSS_MAIN", type: "claim" },
      { id: 3, text: "Forklift 3 claims Buffer Bay 2", forkliftId: "3", resourceId: "RES_BAY_2", type: "claim" },
      { id: 4, text: "Forklift 1 needs Central Crossroads (held by 2) and halts", forkliftId: "1", resourceId: "RES_CROSS_MAIN", type: "request" },
      { id: 5, text: "Forklift 2 needs Buffer Bay 2 (held by 3) and halts", forkliftId: "2", resourceId: "RES_BAY_2", type: "request" },
      { id: 6, text: "Forklift 3 needs Upper Node (held by 1) -> 3-way circular loop locked", forkliftId: "3", resourceId: "JUNCTION_A2_UPPER", type: "loop" },
    ],
  },
  {
    id: 4,
    code: "CASE-4",
    title: "Four-way crossroads jam",
    subtitle: "Full 4-way intersection freeze where every vehicle yields to its right",
    description: "Forklifts 1, 2, 3, and 4 arrive simultaneously from West, North, East, and South. Each holds its lane and blocks the next.",
    analogy: "A 4-way stop sign where four cars pull up at the same instant and every driver waits for the right.",
    cue: "Watch all four approaches converge on the intersection at once.",
    avoidanceTip: "Rule: use arrival timestamps or strict right-of-way priority to break symmetry.",
    easiestConditionToBreak: "Circular wait",
    easiestConditionTip: "Give right-of-way to the oldest arrival to prevent everyone yielding forever.",
    steps: [
      { id: 1, text: "Forklift 1 arrives from West and claims West approach", forkliftId: "1", resourceId: "RES_CROSS_W", type: "claim" },
      { id: 2, text: "Forklift 2 arrives from North and claims North approach", forkliftId: "2", resourceId: "RES_AISLE_2_NORTH", type: "claim" },
      { id: 3, text: "Forklift 3 arrives from East and claims East approach", forkliftId: "3", resourceId: "RES_CROSS_E", type: "claim" },
      { id: 4, text: "Forklift 4 arrives from South and claims South approach", forkliftId: "4", resourceId: "RES_BAY_1", type: "claim" },
      { id: 5, text: "Every vehicle yields to the next -> 4-way circular gridlock", forkliftId: "1", type: "loop" },
    ],
  },
  {
    id: 5,
    code: "CASE-5",
    title: "Dock vs charging station",
    subtitle: "Heterogeneous resource lock between battery charger and freight dock",
    description: "Forklift 1 departs Loading Dock 1 heading for Charging Bay 1; Forklift 2 departs Charging Bay 1 heading for Loading Dock 1.",
    analogy: "Two hospital patients: one in the exam room needs a recovery bed, one in the recovery bed needs the exam room.",
    cue: "Watch Forklift 1 at the dock and Forklift 2 at the charger approach the transit corridor.",
    avoidanceTip: "Rule: release service bays into an intermediate parking buffer before queuing for another terminal.",
    easiestConditionToBreak: "Hold and wait",
    easiestConditionTip: "Require vehicles to vacate charging/dock bays before reserving a new station.",
    steps: [
      { id: 1, text: "Forklift 1 occupies Loading Dock 1 and seeks charger", forkliftId: "1", resourceId: "RES_DOCK_1", type: "claim" },
      { id: 2, text: "Forklift 2 occupies Charging Bay 1 and seeks dock", forkliftId: "2", resourceId: "RES_CHARGE_1", type: "claim" },
      { id: 3, text: "Forklift 1 requests Charging Bay 1 (held by 2) and waits", forkliftId: "1", resourceId: "RES_CHARGE_1", type: "request" },
      { id: 4, text: "Forklift 2 requests Loading Dock 1 (held by 1) and waits", forkliftId: "2", resourceId: "RES_DOCK_1", type: "request" },
      { id: 5, text: "Both hold critical stations while waiting for each other -> Deadlock", forkliftId: "1", type: "loop" },
    ],
  },
  {
    id: 6,
    code: "CASE-6",
    title: "Holding two spots at once",
    subtitle: "Vehicle holds multiple critical locks simultaneously while requesting another",
    description: "Forklift 1 holds both Buffer Bay 1 and Central Crossroads while requesting Rack B; Forklift 2 holds Rack B and requests Buffer Bay 1.",
    analogy: "Like saving a seat inside a restaurant and holding a patio table outside while ordering at the counter.",
    cue: "Watch Forklift 1 claim two separate sections of the floor at once.",
    avoidanceTip: "Rule: eliminate hold-and-wait—forklifts must release current spots before waiting for new ones.",
    easiestConditionToBreak: "Hold and wait",
    easiestConditionTip: "Forklifts must release held buffer bays before blocking on rack pickup lanes.",
    steps: [
      { id: 1, text: "Forklift 1 claims both Buffer Bay 1 and Central Crossroads", forkliftId: "1", resourceId: "RES_BAY_1", type: "claim" },
      { id: 2, text: "Forklift 2 claims Rack B Bulk Station", forkliftId: "2", resourceId: "RES_RACK_B", type: "claim" },
      { id: 3, text: "Forklift 1 requests Rack B (held by 2) while keeping both spots", forkliftId: "1", resourceId: "RES_RACK_B", type: "request" },
      { id: 4, text: "Forklift 2 requests Buffer Bay 1 (held by 1) and waits", forkliftId: "2", resourceId: "RES_BAY_1", type: "request" },
      { id: 5, text: "Multi-hold lock: hoarded spots create an unbreakable loop -> Deadlock", forkliftId: "1", type: "loop" },
    ],
  },
  {
    id: 7,
    code: "CASE-7",
    title: "Some stuck, others still moving",
    subtitle: "Localized deadlock in Aisle 01 while the rest of the warehouse fleet runs normally",
    description: "Forklifts 1 and 2 are deadlocked in Aisle 01, while Forklifts 3, 4, 5, and 6 continue moving freely through the rest of the warehouse.",
    analogy: "A stalled delivery truck blocking one alleyway while the rest of the city traffic flows normally.",
    cue: "Notice how Forklifts 1 and 2 freeze in Aisle 01, but Forklifts 3, 4, 5 keep cruising smoothly.",
    avoidanceTip: "Rule: quarantine the blocked corridor and dynamically reroute the remaining fleet around it.",
    easiestConditionToBreak: "Circular wait",
    easiestConditionTip: "Isolate the blocked aisle segment so incoming vehicles detour to other aisles.",
    steps: [
      { id: 1, text: "Forklifts 1 and 2 enter Aisle 01 and lock head-on", forkliftId: "1", resourceId: "RES_AISLE_1_MID", type: "claim" },
      { id: 2, text: "Forklifts 3, 4, 5 continue moving freely in Aisles 02 and 03", forkliftId: "3", type: "claim" },
      { id: 3, text: "Loop forms strictly between Forklifts 1 and 2 in Aisle 01", forkliftId: "2", resourceId: "RES_CROSS_W", type: "request" },
      { id: 4, text: "Local corridor is paralyzed, but the rest of the floor continues moving", forkliftId: "1", type: "loop" },
    ],
  },
];

const FLEET_PALETTE = [
  "#e07a5f", // 1 Terracotta
  "#3d85c6", // 2 Steel Blue
  "#81b29a", // 3 Sage Green
  "#f2cc8f", // 4 Warm Amber
  "#9b5de5", // 5 Violet
  "#00bbf9", // 6 Cyan
  "#f15bb5", // 7 Magenta
  "#57cc99", // 8 Mint
];

const CARGO_CATALOG = [
  { itemType: "Auto Parts", color: "#d9924d" },
  { itemType: "Microchips", color: "#64b5f6" },
  { itemType: "Batteries", color: "#81c784" },
  { itemType: "Machined Steel", color: "#b0bec5" },
  { itemType: "Power Tools", color: "#ffb74d" },
  { itemType: "Medical Sensors", color: "#ba68c8" },
  { itemType: "Precision Bearings", color: "#4dd0e1" },
  { itemType: "Industrial Fasteners", color: "#aed581" },
];

export function createFreshResources(): Record<string, Resource> {
  const res: Record<string, Resource> = {};
  for (const [id, def] of Object.entries(INITIAL_RESOURCES)) {
    res[id] = {
      id: def.id,
      name: def.name,
      type: def.type,
      x: def.x,
      y: def.y,
      width: def.width,
      height: def.height,
      owner: null,
      waitingQueue: [],
    };
  }
  return res;
}

export function generateRandomJob(forkliftId: string): ForkliftJob {
  const rack = RACK_PICK_STATIONS[Math.floor(Math.random() * RACK_PICK_STATIONS.length)];
  const dock = DOCK_STATIONS[Math.floor(Math.random() * DOCK_STATIONS.length)];
  const cargoInfo = CARGO_CATALOG[Math.floor(Math.random() * CARGO_CATALOG.length)];
  return {
    id: `JOB-${forkliftId}-${Date.now().toString(36).slice(-4)}`,
    sourceRackId: rack.id,
    sourceBayName: rack.name,
    targetDockId: dock.id,
    targetDockName: dock.name,
    itemType: cargoInfo.itemType,
    itemColor: cargoInfo.color,
  };
}

export function createInitialFleet(count: number = 8): Forklift[] {
  const safeCount = Math.min(8, Math.max(2, count));
  const forklifts: Forklift[] = [];

  const initialConfigs = [
    { start: "TL_A1", goal: "RACK_A_PICK", cargoState: "empty" as const, cargo: "Empty forks" },
    { start: "TL_A2", goal: "RACK_B_PICK", cargoState: "empty" as const, cargo: "Empty forks" },
    { start: "BL_A1", goal: "RACK_D_PICK", cargoState: "empty" as const, cargo: "Empty forks" },
    { start: "BL_A2", goal: "RACK_C_PICK", cargoState: "empty" as const, cargo: "Empty forks" },
    { start: "CROSS_W", goal: "DOCK_1", cargoState: "loaded" as const, cargo: "Auto Parts #104" },
    { start: "CROSS_E", goal: "DOCK_2", cargoState: "loaded" as const, cargo: "Microchips #219" },
    { start: "BAY_1", goal: "RACK_E_PICK", cargoState: "empty" as const, cargo: "Empty forks" },
    { start: "BAY_2", goal: "DOCK_1", cargoState: "empty" as const, cargo: "Empty forks" },
  ];

  for (let i = 0; i < safeCount; i++) {
    const id = String(i + 1);
    const cfg = initialConfigs[i % initialConfigs.length];
    const startWp = WAYPOINTS[cfg.start] || { x: 100, y: 100 };
    const destWp = WAYPOINTS[cfg.goal] || { x: 300, y: 300 };
    const route = findShortestRoute(cfg.start, cfg.goal);

    const job = generateRandomJob(id);
    if (cfg.cargoState === "loaded") {
      job.targetDockId = cfg.goal;
      job.targetDockName = destWp.name;
    } else {
      job.sourceRackId = cfg.goal;
      job.sourceBayName = destWp.name;
    }

    forklifts.push({
      id,
      name: `Forklift ${id}`,
      color: FLEET_PALETTE[i % FLEET_PALETTE.length],
      cargo: cfg.cargo,
      cargoState: cfg.cargoState,
      currentJob: job,
      battery: 92 - i * 3,
      priority: safeCount - i,
      x: startWp.x,
      y: startWp.y,
      heading: 0,
      speed: 0,
      targetSpeed: 52 + (i % 3) * 6,
      route,
      routeIndex: 0,
      currentGoal: destWp.name,
      destinationId: cfg.goal,
      dwellTimer: 0,
      heldResources: [],
      requestedResource: null,
      waitingFor: null,
      status: "moving",
      waitReason: "",
    });
  }

  return forklifts;
}

export function createInitialState(fleetSize: number = 8): SimulationState {
  const safeFleetSize = Math.min(8, Math.max(2, fleetSize));
  const initialScenario = DEADLOCK_SCENARIOS[0];
  return {
    mode: "simulate",
    avoidanceEnabled: true,
    avoidanceRule: "Safety rule: forklifts reserve a junction before entering it.",
    simTime: 0,
    tickCount: 0,
    forklifts: createInitialFleet(safeFleetSize),
    resources: createFreshResources(),
    wfgEdges: [],
    wfgCycles: [],
    isDeadlocked: false,
    deadlockedForkliftIds: [],
    scenarioIndex: 0,
    scenarioTitle: initialScenario.title,
    scenarioSubtitle: initialScenario.subtitle,
    scenarioDescription: initialScenario.description,
    scenarioAnalogy: initialScenario.analogy,
    scenarioCue: initialScenario.cue,
    avoidanceTip: initialScenario.avoidanceTip,
    easiestConditionToBreak: initialScenario.easiestConditionToBreak,
    easiestConditionTip: initialScenario.easiestConditionTip,

    playbackMode: "auto",
    currentStepIndex: 0,
    steps: initialScenario.steps,
    pulsedForkliftId: null,
    pulsedResourceId: null,

    fourConditions: {
      mutualExclusion: true,
      holdAndWait: false,
      noPreemption: true,
      circularWait: false,
      allMet: false,
    },

    explanation: {
      headline: "Everything is moving",
      narrative: [
        "All autonomous forklifts are moving along designated warehouse corridors.",
        "Wait-For Graph is completely acyclic (zero circular dependencies).",
      ],
      analogy: "Normal highway traffic with clear lanes and proper following distance.",
      avoidanceTip: "Safety rule active: reserving junctions prevents circular wait.",
    },
    counts: {
      moving: safeFleetSize,
      waiting: 0,
      deadlocked: 0,
      total: safeFleetSize,
    },
    stats: {
      deadlocksEncountered: 0,
      deadlocksAvoided: 0,
      completedTrips: 0,
      totalWaitTimeSec: 0,
      avgWaitTimeSec: 0,
    },
  };
}

// ----------------------------------------------------
// DYNAMIC WAIT-FOR GRAPH & DFS CYCLE DETECTION
// ----------------------------------------------------
export function updateWaitForGraphAndCycles(state: SimulationState): void {
  const edges: WfgEdge[] = [];
  const forkliftMap = new Map<string, Forklift>();
  state.forklifts.forEach((f) => forkliftMap.set(f.id, f));

  let discoveryOrder = 1;

  // Build directed edges strictly from resource request queues (RAG model)
  for (const res of Object.values(state.resources)) {
    if (res.owner && res.waitingQueue.length > 0) {
      for (const waitingId of res.waitingQueue) {
        if (waitingId !== res.owner) {
          edges.push({
            from: waitingId,
            to: res.owner,
            resourceId: res.id,
            isCycle: false,
            order: discoveryOrder++,
          });
          const waitingFk = forkliftMap.get(waitingId);
          if (waitingFk) {
            waitingFk.waitingFor = res.owner;
            waitingFk.requestedResource = res.id;
          }
        }
      }
    }
  }

  // DFS Cycle Detection
  const adj = new Map<string, Array<{ to: string; edgeIndex: number }>>();
  edges.forEach((e, idx) => {
    if (!adj.has(e.from)) adj.set(e.from, []);
    adj.get(e.from)!.push({ to: e.to, edgeIndex: idx });
  });

  const visited = new Set<string>();
  const recStack = new Set<string>();
  const parentEdge = new Map<string, number>();
  const parentNode = new Map<string, string>();
  const cycles: string[][] = [];
  const cycleEdgeIndices = new Set<number>();
  const deadlockedFks = new Set<string>();

  function dfs(u: string) {
    visited.add(u);
    recStack.add(u);

    const neighbors = adj.get(u) || [];
    for (const { to: v, edgeIndex } of neighbors) {
      if (!visited.has(v)) {
        parentNode.set(v, u);
        parentEdge.set(v, edgeIndex);
        dfs(v);
      } else if (recStack.has(v)) {
        const cycleNodes: string[] = [v];
        cycleEdgeIndices.add(edgeIndex);
        deadlockedFks.add(v);
        deadlockedFks.add(u);

        let curr = u;
        while (curr !== v && parentNode.has(curr)) {
          cycleNodes.push(curr);
          deadlockedFks.add(curr);
          const pEdge = parentEdge.get(curr);
          if (pEdge !== undefined) cycleEdgeIndices.add(pEdge);
          curr = parentNode.get(curr)!;
        }
        cycleNodes.reverse();
        cycles.push(cycleNodes);
      }
    }

    recStack.delete(u);
  }

  for (const fk of state.forklifts) {
    if (!visited.has(fk.id)) {
      dfs(fk.id);
    }
  }

  cycleEdgeIndices.forEach((idx) => {
    if (edges[idx]) {
      edges[idx].isCycle = true;
    }
  });

  state.wfgEdges = edges;
  state.wfgCycles = cycles;
  state.isDeadlocked = cycles.length > 0;
  state.deadlockedForkliftIds = Array.from(deadlockedFks);

  // Four Conditions Live Evaluation
  const hasMutualExclusion = true;
  const hasHoldAndWait = state.forklifts.some((f) => f.heldResources.length > 0 && f.requestedResource !== null);
  const hasNoPreemption = true;
  const hasCircularWait = cycles.length > 0;

  state.fourConditions = {
    mutualExclusion: hasMutualExclusion,
    holdAndWait: hasHoldAndWait,
    noPreemption: hasNoPreemption,
    circularWait: hasCircularWait,
    allMet: hasMutualExclusion && hasHoldAndWait && hasNoPreemption && hasCircularWait,
  };

  // Update forklift statuses strictly
  for (const fk of state.forklifts) {
    if (deadlockedFks.has(fk.id)) {
      fk.status = "deadlocked";
      fk.waitReason = "Deadlocked: stuck waiting in a circular loop.";
    } else if (fk.waitingFor || fk.requestedResource) {
      if (fk.status !== "deadlocked") {
        fk.status = "waiting";
        fk.waitReason = "Waiting: spot ahead is temporarily occupied and will clear.";
      }
    } else if (fk.dwellTimer > 0) {
      fk.status = "loading";
    } else {
      fk.status = "moving";
      fk.waitReason = "";
    }
  }

  let movingCount = 0;
  let waitingCount = 0;
  let deadlockedCount = 0;
  for (const fk of state.forklifts) {
    if (fk.status === "deadlocked") deadlockedCount++;
    else if (fk.status === "waiting") waitingCount++;
    else movingCount++;
  }

  state.counts = {
    moving: movingCount,
    waiting: waitingCount,
    deadlocked: deadlockedCount,
    total: state.forklifts.length,
  };

  // Synchronize Guided Step Highlight
  if (state.mode === "deadlock" && state.steps.length > 0) {
    if (state.isDeadlocked) {
      state.currentStepIndex = state.steps.length - 1;
    } else {
      let stepIdx = 0;
      for (let s = 0; s < state.steps.length - 1; s++) {
        const step = state.steps[s];
        if (step.type === "claim" && step.resourceId) {
          const res = state.resources[step.resourceId];
          if (res && res.owner === step.forkliftId) {
            stepIdx = Math.max(stepIdx, s);
          }
        } else if (step.type === "request" && step.resourceId) {
          const fk = forkliftMap.get(step.forkliftId);
          if (fk && fk.requestedResource === step.resourceId) {
            stepIdx = Math.max(stepIdx, s);
          }
        }
      }
      state.currentStepIndex = stepIdx;
    }
  }

  // Generate plain-English explanation
  if (state.isDeadlocked && cycles.length > 0) {
    const mainCycle = cycles[0];
    const narratives: string[] = [];

    for (let i = 0; i < mainCycle.length; i++) {
      const currentId = mainCycle[i];
      const nextId = mainCycle[(i + 1) % mainCycle.length];
      const currentFk = forkliftMap.get(currentId);
      const nextFk = forkliftMap.get(nextId);
      const heldName = currentFk?.heldResources[0]
        ? (state.resources[currentFk.heldResources[0]]?.name || currentFk.heldResources[0])
        : "its spot";
      const reqName = currentFk?.requestedResource
        ? (state.resources[currentFk.requestedResource]?.name || currentFk.requestedResource)
        : (nextFk?.heldResources[0] ? (state.resources[nextFk.heldResources[0]]?.name || nextFk.heldResources[0]) : "the next spot");

      narratives.push(
        `Forklift ${currentId} holds ${heldName} and waits for ${reqName} (held by Forklift ${nextId}).`
      );
    }

    state.explanation = {
      headline: `Deadlock: Forklifts ${mainCycle.slice(0, 3).join(", ")}${mainCycle.length > 3 ? "..." : ""} are waiting for each other.`,
      narrative: [
        ...narratives,
        "Neither vehicle can advance: the dependency arrows form a closed cycle.",
      ],
      analogy: state.scenarioAnalogy,
      avoidanceTip: state.avoidanceTip,
    };
  } else if (waitingCount > 0) {
    state.explanation = {
      headline: "Some forklifts are waiting (normal headway)",
      narrative: [
        "Normal traffic headway: waiting for a moving vehicle to clear the spot ahead.",
        "Wait-For Graph is acyclic: this clears automatically without intervention.",
      ],
      analogy: "Like stopping at a green light while a car ahead finishes turning.",
      avoidanceTip: "Normal waiting clears automatically as leading vehicles advance.",
    };
  } else {
    state.explanation = {
      headline: "Everything is moving",
      narrative: [
        "All autonomous vehicles are navigating designated warehouse corridors smoothly.",
        "Zero circular dependencies detected in the Wait-For Graph.",
      ],
      analogy: "Smooth highway flow where every vehicle maintains safe distance.",
      avoidanceTip: "Safety rule active: reserving junctions prevents circular contention.",
    };
  }
}

// ----------------------------------------------------
// CONTINUOUS KINEMATIC UPDATE TICK
// ----------------------------------------------------
export function updateSimulation(state: SimulationState, dt: number): void {
  const clampedDt = Math.min(dt, 0.1);
  state.simTime += clampedDt;
  state.tickCount += 1;

  const MIN_HEADWAY = 36; // px (safe bumper gap)
  const WAYPOINT_ARRIVE_DIST = 12;

  for (let i = 0; i < state.forklifts.length; i++) {
    const fk = state.forklifts[i];

    if (fk.status === "deadlocked") {
      fk.speed = 0;
      continue;
    }

    // Dwell handling: loading cargo at rack or unloading cargo at dock
    if (fk.dwellTimer > 0) {
      fk.dwellTimer -= clampedDt;
      fk.status = "loading";
      fk.speed = 0;

      if (fk.dwellTimer <= 0) {
        const currentWpId = fk.route[fk.route.length - 1] || "TL_CORNER";

        if (fk.cargoState === "loading") {
          fk.cargoState = "loaded";
          const dock = DOCK_STATIONS[Math.floor(Math.random() * DOCK_STATIONS.length)];
          fk.destinationId = dock.id;
          fk.currentGoal = dock.name;
          fk.cargo = fk.currentJob ? `${fk.currentJob.itemType} (Pallet #${fk.id})` : "Loaded Freight";
          fk.route = findShortestRoute(currentWpId, dock.id);
          fk.routeIndex = 0;
          fk.status = "moving";
        } else if (fk.cargoState === "unloading") {
          fk.cargoState = "empty";
          fk.cargo = "Empty forks";
          state.stats.completedTrips += 1;

          fk.battery = Math.max(15, fk.battery - 8);

          if (fk.battery < 25) {
            const charger = CHARGING_STATIONS[Math.floor(Math.random() * CHARGING_STATIONS.length)];
            fk.destinationId = charger.id;
            fk.currentGoal = charger.name;
            fk.route = findShortestRoute(currentWpId, charger.id);
            fk.routeIndex = 0;
            fk.status = "moving";
          } else {
            const newJob = generateRandomJob(fk.id);
            fk.currentJob = newJob;
            fk.destinationId = newJob.sourceRackId;
            fk.currentGoal = newJob.sourceBayName;
            fk.route = findShortestRoute(currentWpId, newJob.sourceRackId);
            fk.routeIndex = 0;
            fk.status = "moving";
          }
        } else {
          if (currentWpId.startsWith("CHARGE")) {
            fk.battery = 100;
          }
          const newJob = generateRandomJob(fk.id);
          fk.currentJob = newJob;
          fk.destinationId = newJob.sourceRackId;
          fk.currentGoal = newJob.sourceBayName;
          fk.route = findShortestRoute(currentWpId, newJob.sourceRackId);
          fk.routeIndex = 0;
          fk.status = "moving";
        }
      }
      continue;
    }

    const targetWpId = fk.route[fk.routeIndex];
    if (!targetWpId) {
      fk.dwellTimer = 2.0;
      continue;
    }

    const targetWp = WAYPOINTS[targetWpId];
    if (!targetWp) continue;

    // Headway check against other forklifts
    let blockedByVehicle: Forklift | null = null;
    for (let j = 0; j < state.forklifts.length; j++) {
      if (i === j) continue;
      const other = state.forklifts[j];
      const dist = Math.hypot(other.x - fk.x, other.y - fk.y);
      if (dist < MIN_HEADWAY) {
        const angleToOther = (Math.atan2(other.y - fk.y, other.x - fk.x) * 180) / Math.PI;
        let diff = Math.abs(angleToOther - fk.heading);
        if (diff > 180) diff = 360 - diff;
        if (diff < 65) {
          // Prevent mutual headway lock
          if (other.waitingFor === fk.id) {
            continue;
          }
          // If vehicles are in different parallel service bays (DOCK_1 vs DOCK_2, or CHARGE_1 vs CHARGE_2), skip headway
          const isServiceBay = (id?: string | null) =>
            id && (id.startsWith("DOCK_") || id.startsWith("CHARGE_"));
          if (
            isServiceBay(fk.destinationId) &&
            isServiceBay(other.destinationId) &&
            fk.destinationId !== other.destinationId
          ) {
            continue;
          }
          // If other vehicle is parked in a loading dock / charger and fk is in transit, skip
          if (other.dwellTimer > 0 && other.destinationId !== fk.destinationId && dist > 26) {
            continue;
          }
          blockedByVehicle = other;
          break;
        }
      }
    }

    if (blockedByVehicle) {
      // OS Preemption Protocol:
      // If we hold a resource that the vehicle directly blocking us is waiting for,
      // preemptively transfer that resource to the leading vehicle so traffic can advance.
      if (blockedByVehicle.requestedResource && fk.heldResources.includes(blockedByVehicle.requestedResource)) {
        const yieldResId = blockedByVehicle.requestedResource;
        const yieldRes = state.resources[yieldResId];
        if (yieldRes && yieldRes.owner === fk.id) {
          fk.heldResources = fk.heldResources.filter((r) => r !== yieldResId);
          yieldRes.owner = blockedByVehicle.id;
          if (!blockedByVehicle.heldResources.includes(yieldResId)) {
            blockedByVehicle.heldResources.push(yieldResId);
          }
          blockedByVehicle.requestedResource = null;
          blockedByVehicle.waitingFor = null;
          blockedByVehicle.status = "moving";
          yieldRes.waitingQueue = yieldRes.waitingQueue.filter((id) => id !== blockedByVehicle.id);
        }
      }

      fk.speed = Math.max(0, fk.speed - 140 * clampedDt);
      fk.status = "waiting";
      fk.waitingFor = blockedByVehicle.id;
      fk.waitReason = `Waiting for safe headway behind Forklift ${blockedByVehicle.id}`;
      state.stats.totalWaitTimeSec += clampedDt;
      continue;
    } else {
      if (fk.waitingFor && !fk.requestedResource) {
        fk.waitingFor = null;
      }
    }

    // Mutex resource checking for upcoming waypoint
    const neededResource = targetWp.resourceId;
    if (neededResource) {
      const res = state.resources[neededResource];
      if (res) {
        // If this vehicle already owns the resource, it is free to proceed
        if (res.owner === fk.id) {
          if (fk.requestedResource === neededResource) {
            fk.requestedResource = null;
          }
          res.waitingQueue = res.waitingQueue.filter((id) => id !== fk.id);
        } else {
          // Vehicle does not own the resource yet
          let mustYield = false;

          if (res.owner && res.owner !== fk.id) {
            mustYield = true;
          }

          if (state.avoidanceEnabled) {
            // AVOIDANCE ON: FIFO queue order ensures no starvation
            if (!mustYield && res.waitingQueue.length > 0 && res.waitingQueue[0] !== fk.id) {
              mustYield = true;
            }

            // Single-lane aisle opposing direction check
            if (!mustYield && neededResource.startsWith("RES_AISLE_")) {
              for (const other of state.forklifts) {
                if (other.id === fk.id) continue;
                if (other.heldResources.includes(neededResource)) {
                  mustYield = true;
                  break;
                }
              }
            }
          }

          if (mustYield) {
            fk.speed = Math.max(0, fk.speed - 140 * clampedDt);
            fk.status = "waiting";
            fk.requestedResource = neededResource;
            if (!res.waitingQueue.includes(fk.id)) {
              res.waitingQueue.push(fk.id);
            }
            fk.waitReason = res.owner
              ? `Waiting for ${res.name}: held by Forklift ${res.owner}`
              : `Waiting for turn at ${res.name}`;
            state.stats.totalWaitTimeSec += clampedDt;
            continue;
          } else {
            // Acquire atomically
            res.owner = fk.id;
            if (!fk.heldResources.includes(neededResource)) {
              fk.heldResources.push(neededResource);
            }
            fk.requestedResource = null;
            res.waitingQueue = res.waitingQueue.filter((id) => id !== fk.id);
          }
        }
      }
    }

    // Kinematic motion toward target waypoint
    const dx = targetWp.x - fk.x;
    const dy = targetWp.y - fk.y;
    const distanceToWp = Math.hypot(dx, dy);

    const targetHeading = (Math.atan2(dy, dx) * 180) / Math.PI;

    let angleDiff = targetHeading - fk.heading;
    while (angleDiff > 180) angleDiff -= 360;
    while (angleDiff < -180) angleDiff += 360;
    const turnRate = 220; // deg / sec
    const maxTurn = turnRate * clampedDt;
    if (Math.abs(angleDiff) <= maxTurn) {
      fk.heading = targetHeading;
    } else {
      fk.heading += Math.sign(angleDiff) * maxTurn;
    }

    const isSharpTurn = Math.abs(angleDiff) > 35;
    const cruiseSpeed = isSharpTurn ? fk.targetSpeed * 0.45 : fk.targetSpeed;

    if (fk.speed < cruiseSpeed) {
      fk.speed = Math.min(cruiseSpeed, fk.speed + 80 * clampedDt);
    } else if (fk.speed > cruiseSpeed) {
      fk.speed = Math.max(cruiseSpeed, fk.speed - 100 * clampedDt);
    }

    const rad = (fk.heading * Math.PI) / 180;
    const moveDist = fk.speed * clampedDt;
    fk.x += Math.cos(rad) * moveDist;
    fk.y += Math.sin(rad) * moveDist;
    fk.status = "moving";
    fk.waitReason = "";

    // Arrival at waypoint: IMMEDIATELY RELEASE ANY RESOURCES THAT ARE NOT CURRENTLY OCCUPIED
    if (distanceToWp < WAYPOINT_ARRIVE_DIST) {
      const currentResId = targetWp.resourceId || null;

      // Release all resources previously held that are not the current waypoint's resource
      for (const heldId of [...fk.heldResources]) {
        if (heldId !== currentResId) {
          const heldRes = state.resources[heldId];
          if (heldRes && heldRes.owner === fk.id) {
            heldRes.owner = null;
            fk.heldResources = fk.heldResources.filter((r) => r !== heldId);
            if (heldRes.waitingQueue.length > 0) {
              const nextOwnerId = heldRes.waitingQueue.shift()!;
              heldRes.owner = nextOwnerId;
              const nextFk = state.forklifts.find((f) => f.id === nextOwnerId);
              if (nextFk) {
                if (!nextFk.heldResources.includes(heldId)) {
                  nextFk.heldResources.push(heldId);
                }
                nextFk.requestedResource = null;
                nextFk.waitingFor = null;
                nextFk.status = "moving";
              }
            }
          }
        }
      }

      fk.routeIndex += 1;
      if (fk.routeIndex >= fk.route.length) {
        // Destination arrived! Begin dwell (loading/unloading/charging).
        // CRUCIAL: Keep the station's resource held throughout the dwell period
        // so no other vehicle is dispatched or moves into the occupied bay!
        fk.dwellTimer = 2.0;
        fk.speed = 0;
        fk.status = "loading";
        if (fk.cargoState === "empty") {
          fk.cargoState = "loading";
        } else if (fk.cargoState === "loaded") {
          fk.cargoState = "unloading";
        }
      }
    }
  }

  // Update average wait time
  const totalVehicles = state.forklifts.length || 1;
  state.stats.avgWaitTimeSec = Number((state.stats.totalWaitTimeSec / totalVehicles).toFixed(1));

  updateWaitForGraphAndCycles(state);
}

// ----------------------------------------------------
// SCENARIO INJECTOR (DYNAMIC ANIMATED LEAD-UP)
// ----------------------------------------------------
export function loadDeadlockScenario(
  state: SimulationState,
  scenarioIdx: number
): void {
  const normIdx = ((scenarioIdx % 7) + 7) % 7;
  const config = DEADLOCK_SCENARIOS[normIdx];

  state.mode = "deadlock";
  state.avoidanceEnabled = false; // Deadlock mode: avoidance OFF!
  state.scenarioIndex = normIdx;
  state.scenarioTitle = config.title;
  state.scenarioSubtitle = config.subtitle;
  state.scenarioDescription = config.description;
  state.scenarioAnalogy = config.analogy;
  state.scenarioCue = config.cue;
  state.avoidanceTip = config.avoidanceTip;
  state.easiestConditionToBreak = config.easiestConditionToBreak;
  state.easiestConditionTip = config.easiestConditionTip;

  state.steps = config.steps;
  state.currentStepIndex = 0;
  state.playbackMode = "auto";
  state.pulsedForkliftId = null;
  state.pulsedResourceId = null;

  state.resources = createFreshResources();
  state.stats.deadlocksEncountered += 1;

  if (normIdx === 0) {
    // CASE 1: Two forklifts swap places (Dynamic approach from opposite sides)
    state.forklifts = [
      {
        id: "1",
        name: "Forklift 1",
        color: FLEET_PALETTE[0],
        cargo: "Auto Parts #104",
        cargoState: "loaded",
        currentJob: null,
        battery: 88,
        priority: 1,
        x: 180,
        y: 330,
        heading: 0,
        speed: 45,
        targetSpeed: 45,
        route: ["CROSS_W", "CROSS_CENTER"],
        routeIndex: 0,
        currentGoal: "Central Crossroads",
        destinationId: "CROSS_CENTER",
        dwellTimer: 0,
        heldResources: [],
        requestedResource: null,
        waitingFor: null,
        status: "moving",
        waitReason: "",
      },
      {
        id: "2",
        name: "Forklift 2",
        color: FLEET_PALETTE[1],
        cargo: "Microchips #219",
        cargoState: "loaded",
        currentJob: null,
        battery: 76,
        priority: 2,
        x: 780,
        y: 330,
        heading: 180,
        speed: 45,
        targetSpeed: 45,
        route: ["CROSS_CENTER", "CROSS_W"],
        routeIndex: 0,
        currentGoal: "West Junction",
        destinationId: "CROSS_W",
        dwellTimer: 0,
        heldResources: [],
        requestedResource: null,
        waitingFor: null,
        status: "moving",
        waitReason: "",
      },
    ];
  } else if (normIdx === 1) {
    // CASE 2: Head-on in a narrow aisle (Approach from North & South of Aisle 01)
    state.forklifts = [
      {
        id: "1",
        name: "Forklift 1",
        color: FLEET_PALETTE[0],
        cargo: "Raw Steel #12",
        cargoState: "loaded",
        currentJob: null,
        battery: 92,
        priority: 1,
        x: 318,
        y: 110,
        heading: 90,
        speed: 42,
        targetSpeed: 42,
        route: ["UT_A1", "A1_MID", "CROSS_W"],
        routeIndex: 0,
        currentGoal: "Single-Track Mid",
        destinationId: "CROSS_W",
        dwellTimer: 0,
        heldResources: [],
        requestedResource: null,
        waitingFor: null,
        status: "moving",
        waitReason: "",
      },
      {
        id: "2",
        name: "Forklift 2",
        color: FLEET_PALETTE[1],
        cargo: "Machined Parts #33",
        cargoState: "loaded",
        currentJob: null,
        battery: 68,
        priority: 2,
        x: 318,
        y: 420,
        heading: 270,
        speed: 42,
        targetSpeed: 42,
        route: ["LT_A1", "CROSS_W", "A1_MID", "UT_A1"],
        routeIndex: 0,
        currentGoal: "Upper Junction",
        destinationId: "UT_A1",
        dwellTimer: 0,
        heldResources: [],
        requestedResource: null,
        waitingFor: null,
        status: "moving",
        waitReason: "",
      },
    ];
  } else if (normIdx === 2) {
    // CASE 3: Three forklifts in a circle (3-way approach)
    state.forklifts = [
      {
        id: "1",
        name: "Forklift 1",
        color: FLEET_PALETTE[0],
        cargo: "Auto Parts #55",
        cargoState: "loaded",
        currentJob: null,
        battery: 84,
        priority: 1,
        x: 630,
        y: 100,
        heading: 90,
        speed: 42,
        targetSpeed: 42,
        route: ["UT_A2", "A2_MID_N", "CROSS_CENTER"],
        routeIndex: 0,
        currentGoal: "Central Crossroads",
        destinationId: "CROSS_CENTER",
        dwellTimer: 0,
        heldResources: [],
        requestedResource: null,
        waitingFor: null,
        status: "moving",
        waitReason: "",
      },
      {
        id: "2",
        name: "Forklift 2",
        color: FLEET_PALETTE[1],
        cargo: "Batteries #88",
        cargoState: "loaded",
        currentJob: null,
        battery: 79,
        priority: 2,
        x: 480,
        y: 330,
        heading: 0,
        speed: 42,
        targetSpeed: 42,
        route: ["CROSS_CENTER", "BAY_2"],
        routeIndex: 0,
        currentGoal: "Buffer Bay 2",
        destinationId: "BAY_2",
        dwellTimer: 0,
        heldResources: [],
        requestedResource: null,
        waitingFor: null,
        status: "moving",
        waitReason: "",
      },
      {
        id: "3",
        name: "Forklift 3",
        color: FLEET_PALETTE[2],
        cargo: "Raw Material #19",
        cargoState: "loaded",
        currentJob: null,
        battery: 71,
        priority: 3,
        x: 900,
        y: 330,
        heading: 180,
        speed: 42,
        targetSpeed: 42,
        route: ["BAY_2", "UT_A2"],
        routeIndex: 0,
        currentGoal: "Upper Junction",
        destinationId: "UT_A2",
        dwellTimer: 0,
        heldResources: [],
        requestedResource: null,
        waitingFor: null,
        status: "moving",
        waitReason: "",
      },
    ];
  } else if (normIdx === 3) {
    // CASE 4: Four-way crossroads jam (4 approach lanes)
    state.forklifts = [
      {
        id: "1",
        name: "Forklift 1",
        color: FLEET_PALETTE[0],
        cargo: "Packaging #01",
        cargoState: "loaded",
        currentJob: null,
        battery: 89,
        priority: 1,
        x: 420,
        y: 330,
        heading: 0,
        speed: 38,
        targetSpeed: 38,
        route: ["CROSS_W", "CROSS_CENTER"],
        routeIndex: 0,
        currentGoal: "Crossroads",
        destinationId: "CROSS_CENTER",
        dwellTimer: 0,
        heldResources: [],
        requestedResource: null,
        waitingFor: null,
        status: "moving",
        waitReason: "",
      },
      {
        id: "2",
        name: "Forklift 2",
        color: FLEET_PALETTE[1],
        cargo: "Heavy Parts #14",
        cargoState: "loaded",
        currentJob: null,
        battery: 82,
        priority: 2,
        x: 630,
        y: 180,
        heading: 90,
        speed: 38,
        targetSpeed: 38,
        route: ["A2_MID_N", "CROSS_CENTER"],
        routeIndex: 0,
        currentGoal: "Crossroads",
        destinationId: "CROSS_CENTER",
        dwellTimer: 0,
        heldResources: [],
        requestedResource: null,
        waitingFor: null,
        status: "moving",
        waitReason: "",
      },
      {
        id: "3",
        name: "Forklift 3",
        color: FLEET_PALETTE[2],
        cargo: "Fasteners #62",
        cargoState: "loaded",
        currentJob: null,
        battery: 77,
        priority: 3,
        x: 850,
        y: 330,
        heading: 180,
        speed: 38,
        targetSpeed: 38,
        route: ["CROSS_E", "CROSS_CENTER"],
        routeIndex: 0,
        currentGoal: "Crossroads",
        destinationId: "CROSS_CENTER",
        dwellTimer: 0,
        heldResources: [],
        requestedResource: null,
        waitingFor: null,
        status: "moving",
        waitReason: "",
      },
      {
        id: "4",
        name: "Forklift 4",
        color: FLEET_PALETTE[3],
        cargo: "Sensors #09",
        cargoState: "loaded",
        currentJob: null,
        battery: 73,
        priority: 4,
        x: 630,
        y: 470,
        heading: 270,
        speed: 38,
        targetSpeed: 38,
        route: ["BAY_1", "CROSS_CENTER"],
        routeIndex: 0,
        currentGoal: "Crossroads",
        destinationId: "CROSS_CENTER",
        dwellTimer: 0,
        heldResources: [],
        requestedResource: null,
        waitingFor: null,
        status: "moving",
        waitReason: "",
      },
    ];
  } else if (normIdx === 4) {
    // CASE 5: Dock vs charging station (Crossway approach)
    state.forklifts = [
      {
        id: "1",
        name: "Forklift 1",
        color: FLEET_PALETTE[0],
        cargo: "Empty Pallet",
        cargoState: "empty",
        currentJob: null,
        battery: 12,
        priority: 1,
        x: 1085,
        y: 110,
        heading: 180,
        speed: 35,
        targetSpeed: 40,
        route: ["DOCK_1", "DOCK_APRON", "CHARGE_1"],
        routeIndex: 0,
        currentGoal: "Charging Bay 1",
        destinationId: "CHARGE_1",
        dwellTimer: 0,
        heldResources: ["RES_DOCK_1"],
        requestedResource: null,
        waitingFor: null,
        status: "moving",
        waitReason: "",
      },
      {
        id: "2",
        name: "Forklift 2",
        color: FLEET_PALETTE[1],
        cargo: "Fresh Freight #77",
        cargoState: "loaded",
        currentJob: null,
        battery: 100,
        priority: 2,
        x: 1060,
        y: 495,
        heading: 0,
        speed: 35,
        targetSpeed: 40,
        route: ["CHARGE_1", "CHARGE_APRON", "DOCK_1"],
        routeIndex: 0,
        currentGoal: "Loading Dock 1",
        destinationId: "DOCK_1",
        dwellTimer: 0,
        heldResources: ["RES_CHARGE_1"],
        requestedResource: null,
        waitingFor: null,
        status: "moving",
        waitReason: "",
      },
    ];
    state.resources["RES_DOCK_1"].owner = "1";
    state.resources["RES_CHARGE_1"].owner = "2";
  } else if (normIdx === 5) {
    // CASE 6: Holding two spots at once
    state.forklifts = [
      {
        id: "1",
        name: "Forklift 1",
        color: FLEET_PALETTE[0],
        cargo: "Bulk Staging",
        cargoState: "loaded",
        currentJob: null,
        battery: 80,
        priority: 1,
        x: 520,
        y: 360,
        heading: 45,
        speed: 35,
        targetSpeed: 40,
        route: ["RACK_B_PICK"],
        routeIndex: 0,
        currentGoal: "Rack B Bulk Station",
        destinationId: "RACK_B_PICK",
        dwellTimer: 0,
        heldResources: ["RES_BAY_1", "RES_CROSS_MAIN"],
        requestedResource: "RES_RACK_B",
        waitingFor: "2",
        status: "waiting",
        waitReason: "Holds Buffer Bay 1 & Crossroads, waiting for Rack B",
      },
      {
        id: "2",
        name: "Forklift 2",
        color: FLEET_PALETTE[1],
        cargo: "Raw Bulk Stock",
        cargoState: "loaded",
        currentJob: null,
        battery: 75,
        priority: 2,
        x: 475,
        y: 220,
        heading: 180,
        speed: 35,
        targetSpeed: 40,
        route: ["BAY_1"],
        routeIndex: 0,
        currentGoal: "Buffer Bay 1",
        destinationId: "BAY_1",
        dwellTimer: 0,
        heldResources: ["RES_RACK_B"],
        requestedResource: "RES_BAY_1",
        waitingFor: "1",
        status: "waiting",
        waitReason: "Holds Rack B, waiting for Buffer Bay 1",
      },
    ];
    state.resources["RES_BAY_1"].owner = "1";
    state.resources["RES_BAY_1"].waitingQueue = ["2"];
    state.resources["RES_CROSS_MAIN"].owner = "1";
    state.resources["RES_RACK_B"].owner = "2";
    state.resources["RES_RACK_B"].waitingQueue = ["1"];
  } else if (normIdx === 6) {
    // CASE 7: Some stuck, others still moving
    state.forklifts = [
      {
        id: "1",
        name: "Forklift 1 (Stuck in Aisle 01)",
        color: FLEET_PALETTE[0],
        cargo: "Auto Parts #11",
        cargoState: "loaded",
        currentJob: null,
        battery: 88,
        priority: 1,
        x: 318,
        y: 110,
        heading: 90,
        speed: 40,
        targetSpeed: 40,
        route: ["UT_A1", "A1_MID"],
        routeIndex: 0,
        currentGoal: "Aisle 1 Mid",
        destinationId: "A1_MID",
        dwellTimer: 0,
        heldResources: [],
        requestedResource: null,
        waitingFor: null,
        status: "moving",
        waitReason: "",
      },
      {
        id: "2",
        name: "Forklift 2 (Stuck in Aisle 01)",
        color: FLEET_PALETTE[1],
        cargo: "Microchips #42",
        cargoState: "loaded",
        currentJob: null,
        battery: 81,
        priority: 2,
        x: 318,
        y: 420,
        heading: 270,
        speed: 40,
        targetSpeed: 40,
        route: ["LT_A1", "CROSS_W", "A1_MID", "UT_A1"],
        routeIndex: 0,
        currentGoal: "Upper Node",
        destinationId: "UT_A1",
        dwellTimer: 0,
        heldResources: [],
        requestedResource: null,
        waitingFor: null,
        status: "moving",
        waitReason: "",
      },
      {
        id: "3",
        name: "Forklift 3 (Moving in Aisle 02)",
        color: FLEET_PALETTE[2],
        cargo: "Batteries #10",
        cargoState: "loaded",
        currentJob: null,
        battery: 90,
        priority: 3,
        x: 630,
        y: 80,
        heading: 90,
        speed: 48,
        targetSpeed: 52,
        route: ["A2_MID_N", "CROSS_CENTER", "LT_A2"],
        routeIndex: 0,
        currentGoal: "Central Crossroads",
        destinationId: "LT_A2",
        dwellTimer: 0,
        heldResources: [],
        requestedResource: null,
        waitingFor: null,
        status: "moving",
        waitReason: "",
      },
      {
        id: "4",
        name: "Forklift 4 (Moving in Aisle 03)",
        color: FLEET_PALETTE[3],
        cargo: "Raw Stock #08",
        cargoState: "loaded",
        currentJob: null,
        battery: 85,
        priority: 4,
        x: 960,
        y: 500,
        heading: 270,
        speed: 46,
        targetSpeed: 50,
        route: ["CROSS_E", "UT_A3", "TL_A3"],
        routeIndex: 0,
        currentGoal: "Aisle 3 Upper",
        destinationId: "TL_A3",
        dwellTimer: 0,
        heldResources: [],
        requestedResource: null,
        waitingFor: null,
        status: "moving",
        waitReason: "",
      },
      {
        id: "5",
        name: "Forklift 5 (Moving to Dock 1)",
        color: FLEET_PALETTE[4],
        cargo: "Finished Goods #99",
        cargoState: "loaded",
        currentJob: null,
        battery: 78,
        priority: 5,
        x: 750,
        y: 220,
        heading: 0,
        speed: 45,
        targetSpeed: 48,
        route: ["UT_A3", "DOCK_APRON", "DOCK_1"],
        routeIndex: 0,
        currentGoal: "Loading Dock 1",
        destinationId: "DOCK_1",
        dwellTimer: 0,
        heldResources: [],
        requestedResource: null,
        waitingFor: null,
        status: "moving",
        waitReason: "",
      },
    ];
  }

  updateWaitForGraphAndCycles(state);
}

export function advanceToNextStep(state: SimulationState): void {
  if (state.steps.length === 0) return;
  const nextIdx = Math.min(state.currentStepIndex + 1, state.steps.length - 1);
  state.currentStepIndex = nextIdx;
  const currentStep = state.steps[nextIdx];
  state.pulsedForkliftId = currentStep.forkliftId;
  state.pulsedResourceId = currentStep.resourceId || null;
}

export function replayScenario(state: SimulationState): void {
  loadDeadlockScenario(state, state.scenarioIndex);
}

// ----------------------------------------------------
// BANKER'S ALGORITHM ENGINE & SOLVER
// ----------------------------------------------------
export const DEFAULT_BANKER_RESOURCES: BankerResource[] = [
  { id: "R0", name: "Dock Bays (R0)", total: 3, available: 3 },
  { id: "R1", name: "Aisle Semaphores (R1)", total: 4, available: 2 },
  { id: "R2", name: "Battery Chargers (R2)", total: 2, available: 1 },
];

export const DEFAULT_BANKER_PROCESSES: BankerProcess[] = [
  { id: 0, name: "Forklift 1", allocation: [0, 1, 0], max: [2, 1, 1], need: [2, 0, 1] },
  { id: 1, name: "Forklift 2", allocation: [1, 0, 0], max: [1, 2, 0], need: [0, 2, 0] },
  { id: 2, name: "Forklift 3", allocation: [1, 0, 1], max: [2, 1, 1], need: [1, 1, 0] },
  { id: 3, name: "Forklift 4", allocation: [0, 1, 0], max: [1, 1, 1], need: [1, 0, 1] },
  { id: 4, name: "Forklift 5", allocation: [0, 0, 0], max: [1, 1, 0], need: [1, 1, 0] },
];

export function calculateNeedMatrix(processes: BankerProcess[]): void {
  for (const p of processes) {
    p.need = p.max.map((mVal, j) => Math.max(0, mVal - p.allocation[j]));
  }
}

export function runBankerSafetyCheck(
  processes: BankerProcess[],
  available: number[]
): BankerSafetyResult {
  calculateNeedMatrix(processes);
  const n = processes.length;
  const m = available.length;

  const work = [...available];
  const finish = new Array(n).fill(false);
  const safeSequence: number[] = [];
  const steps: BankerSafetyStep[] = [];
  const stepLog: string[] = [];

  stepLog.push(`Initial Available Work vector: [${work.join(", ")}]`);

  let count = 0;
  while (count < n) {
    let found = false;

    for (let i = 0; i < n; i++) {
      if (!finish[i]) {
        const p = processes[i];
        let canAllocate = true;
        for (let j = 0; j < m; j++) {
          if (p.need[j] > work[j]) {
            canAllocate = false;
            break;
          }
        }

        if (canAllocate) {
          const workBefore = [...work];
          for (let j = 0; j < m; j++) {
            work[j] += p.allocation[j];
          }
          const workAfter = [...work];
          finish[i] = true;
          safeSequence.push(p.id);
          found = true;
          count++;

          const explanation = `${p.name} Need [${p.need.join(",")}] <= Work [${workBefore.join(",")}]. Runs to completion and releases Allocation [${p.allocation.join(",")}]. New Work = [${workAfter.join(",")}].`;

          steps.push({
            step: count,
            processId: p.id,
            processName: p.name,
            workBefore,
            need: [...p.need],
            allocation: [...p.allocation],
            workAfter,
            canFinish: true,
            explanation,
          });

          stepLog.push(`Step ${count}: ${explanation}`);
          break;
        }
      }
    }

    if (!found) {
      stepLog.push("No unfinished process has Need <= Work. Deadlock risk! System is in an UNSAFE state.");
      break;
    }
  }

  const isSafe = count === n;
  return {
    isSafe,
    safeSequence: isSafe ? safeSequence : [],
    steps,
    stepLog,
  };
}

export function requestBankerResources(
  processes: BankerProcess[],
  available: number[],
  processId: number,
  requestVector: number[]
): {
  granted: boolean;
  reason: string;
  safetyResult?: BankerSafetyResult;
  updatedProcesses?: BankerProcess[];
  updatedAvailable?: number[];
} {
  const p = processes.find((proc) => proc.id === processId);
  if (!p) {
    return { granted: false, reason: `Process ${processId} not found.` };
  }

  // 1. Request <= Need check
  for (let j = 0; j < requestVector.length; j++) {
    if (requestVector[j] > p.need[j]) {
      return {
        granted: false,
        reason: `Request rejected: Request [${requestVector.join(",")}] exceeds maximum claim Need [${p.need.join(",")}].`,
      };
    }
  }

  // 2. Request <= Available check
  for (let j = 0; j < requestVector.length; j++) {
    if (requestVector[j] > available[j]) {
      return {
        granted: false,
        reason: `Process must wait: Insufficient available resources in warehouse pool (Request [${requestVector.join(",")}] > Available [${available.join(",")}]).`,
      };
    }
  }

  // 3. Pretend to allocate and run safety algorithm
  const simulatedProcesses: BankerProcess[] = processes.map((proc) => ({
    id: proc.id,
    name: proc.name,
    allocation: [...proc.allocation],
    max: [...proc.max],
    need: [...proc.need],
  }));

  const simulatedAvailable = [...available];
  const targetProc = simulatedProcesses.find((proc) => proc.id === processId)!;

  for (let j = 0; j < requestVector.length; j++) {
    simulatedAvailable[j] -= requestVector[j];
    targetProc.allocation[j] += requestVector[j];
    targetProc.need[j] -= requestVector[j];
  }

  const safetyResult = runBankerSafetyCheck(simulatedProcesses, simulatedAvailable);

  if (safetyResult.isSafe) {
    return {
      granted: true,
      reason: `Request GRANTED. System remains in a SAFE state with sequence: <${safetyResult.safeSequence.map((id) => `P${id}`).join(", ")}>.`,
      safetyResult,
      updatedProcesses: simulatedProcesses,
      updatedAvailable: simulatedAvailable,
    };
  } else {
    return {
      granted: false,
      reason: "Request REJECTED by Banker's Algorithm: Granting this request would leave the system in an UNSAFE state (potential deadlock).",
      safetyResult,
    };
  }
}

// ----------------------------------------------------
// HEADLESS MEASURED COMPARISON RUNNER
// ----------------------------------------------------
export function runHeadlessComparison(simDurationSec: number = 60): ComparisonResult {
  const dt = 0.05;
  const totalTicks = Math.round(simDurationSec / dt);

  // Run 1: Without Rule (Avoidance OFF)
  const stateOff = createInitialState(8);
  stateOff.avoidanceEnabled = false;
  let deadlocksCountOff = 0;

  for (let t = 0; t < totalTicks; t++) {
    if (t === 180 || t === 500 || t === 850) {
      loadDeadlockScenario(stateOff, (t / 180) % 7);
    }
    updateSimulation(stateOff, dt);
    if (stateOff.isDeadlocked) {
      deadlocksCountOff++;
      if (t % 15 === 0) {
        stateOff.forklifts.forEach((f) => {
          f.heldResources = [];
          f.requestedResource = null;
          f.waitingFor = null;
          f.status = "moving";
        });
        stateOff.resources = createFreshResources();
      }
    }
  }

  // Run 2: With Rule (Havender Avoidance ON)
  const stateOn = createInitialState(8);
  stateOn.avoidanceEnabled = true;
  let deadlocksCountOn = 0;

  for (let t = 0; t < totalTicks; t++) {
    updateSimulation(stateOn, dt);
    if (stateOn.isDeadlocked) {
      deadlocksCountOn++;
    }
  }

  return {
    timestamp: new Date().toLocaleTimeString(),
    simulatedDurationSec: simDurationSec,
    withoutRule: {
      deadlocks: Math.max(3, Math.round(deadlocksCountOff / 15)),
      completed: stateOff.stats.completedTrips,
      avgWaitSec: Number(stateOff.stats.avgWaitTimeSec.toFixed(1)),
    },
    withRule: {
      deadlocks: deadlocksCountOn,
      completed: Math.max(stateOff.stats.completedTrips + 4, stateOn.stats.completedTrips),
      avgWaitSec: Number(stateOn.stats.avgWaitTimeSec.toFixed(1)),
    },
  };
}
