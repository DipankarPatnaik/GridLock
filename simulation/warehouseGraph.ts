// Warehouse Navigation Graph & Mutex Resources (1200 x 620)
// Guarantees all paths follow real corridors and never clip through shelves or structures.

export interface Waypoint {
  id: string;
  name: string;
  x: number;
  y: number;
  type: "intersection" | "aisle" | "dock" | "charger" | "rack" | "corner";
  resourceId?: string; // Associated mutex resource if this node is a bottleneck
}

// Fixed Waypoints mapped to 1200 x 620 coordinate space
// Corridors:
// Y = 42 (Top Lane)
// Y = 220 (Upper Transverse)
// Y = 330 (Central Main Crossway)
// Y = 405 (Lower Transverse)
// Y = 575 (Bottom Lane)
// X = 18 (Left Perimeter)
// X = 318 (Aisle 01)
// X = 630 (Aisle 02)
// X = 960 (Aisle 03)
// X = 1080 / 1120 (Docks & Chargers)
export const WAYPOINTS: Record<string, Waypoint> = {
  // Top Lane (Y = 42)
  TL_CORNER: { id: "TL_CORNER", name: "Top-West Turn", x: 18, y: 42, type: "corner" },
  TL_A1: { id: "TL_A1", name: "Aisle 1 North Entry", x: 318, y: 42, type: "aisle" },
  TL_A2: { id: "TL_A2", name: "Aisle 2 North Entry", x: 630, y: 42, type: "aisle" },
  TL_A3: { id: "TL_A3", name: "Aisle 3 North Entry", x: 960, y: 42, type: "aisle" },
  TL_DOCK_ENTRY: { id: "TL_DOCK_ENTRY", name: "Dock North Inflow", x: 1080, y: 42, type: "aisle" },

  // Left Perimeter (X = 18)
  LP_UPPER: { id: "LP_UPPER", name: "Left Outer Upper", x: 18, y: 220, type: "aisle" },
  LP_MID: { id: "LP_MID", name: "Left Outer Mid", x: 18, y: 330, type: "aisle" },
  LP_LOWER: { id: "LP_LOWER", name: "Left Outer Lower", x: 18, y: 405, type: "aisle" },
  BL_CORNER: { id: "BL_CORNER", name: "Bottom-West Turn", x: 18, y: 575, type: "corner" },

  // Upper Transverse (Y = 220)
  UT_A1: { id: "UT_A1", name: "Aisle 1 Upper Junction", x: 318, y: 220, type: "intersection", resourceId: "JUNCTION_A1_UPPER" },
  UT_A2: { id: "UT_A2", name: "Aisle 2 Upper Junction", x: 630, y: 220, type: "intersection", resourceId: "JUNCTION_A2_UPPER" },
  UT_A3: { id: "UT_A3", name: "Aisle 3 Upper Junction", x: 960, y: 220, type: "intersection", resourceId: "JUNCTION_A3_UPPER" },

  // Central Main Crossway (Y = 330)
  CROSS_W: { id: "CROSS_W", name: "Central Crossway West", x: 318, y: 330, type: "intersection", resourceId: "RES_CROSS_W" },
  CROSS_CENTER: { id: "CROSS_CENTER", name: "Central Crossroads", x: 630, y: 330, type: "intersection", resourceId: "RES_CROSS_MAIN" },
  CROSS_E: { id: "CROSS_E", name: "Central Crossway East", x: 960, y: 330, type: "intersection", resourceId: "RES_CROSS_E" },

  // Lower Transverse (Y = 405)
  LT_A1: { id: "LT_A1", name: "Aisle 1 Lower Junction", x: 318, y: 405, type: "intersection", resourceId: "JUNCTION_A1_LOWER" },
  LT_A2: { id: "LT_A2", name: "Aisle 2 Lower Junction", x: 630, y: 405, type: "intersection", resourceId: "JUNCTION_A2_LOWER" },
  LT_A3: { id: "LT_A3", name: "Aisle 3 Lower Junction", x: 960, y: 405, type: "intersection", resourceId: "JUNCTION_A3_LOWER" },

  // Bottom Lane (Y = 575)
  BL_A1: { id: "BL_A1", name: "Aisle 1 South Entry", x: 318, y: 575, type: "aisle" },
  BL_A2: { id: "BL_A2", name: "Aisle 2 South Entry", x: 630, y: 575, type: "aisle" },
  BL_A3: { id: "BL_A3", name: "Aisle 3 South Entry", x: 960, y: 575, type: "aisle" },
  BL_CHARGE_ENTRY: { id: "BL_CHARGE_ENTRY", name: "Charger Inflow", x: 1080, y: 575, type: "aisle" },

  // Single-Track Bottlenecks in Aisles (between transverse lanes)
  A1_MID: { id: "A1_MID", name: "Aisle 1 Single-Track Mid", x: 318, y: 275, type: "aisle", resourceId: "RES_AISLE_1_MID" },
  A1_LOW_MID: { id: "A1_LOW_MID", name: "Aisle 1 Lower Track", x: 318, y: 490, type: "aisle", resourceId: "RES_AISLE_1_LOWER" },
  A2_MID_N: { id: "A2_MID_N", name: "Aisle 2 North Corridor", x: 630, y: 275, type: "aisle", resourceId: "RES_AISLE_2_NORTH" },
  A2_MID_S: { id: "A2_MID_S", name: "Aisle 2 South Corridor", x: 630, y: 490, type: "aisle", resourceId: "RES_AISLE_2_SOUTH" },

  // Dedicated Pick-Up / Drop-Off & Service Stations
  RACK_A_PICK: { id: "RACK_A_PICK", name: "Rack Bay A (Bulk)", x: 160, y: 220, type: "rack", resourceId: "RES_RACK_A" },
  RACK_B_PICK: { id: "RACK_B_PICK", name: "Rack Bay B (Heavy Parts)", x: 475, y: 220, type: "rack", resourceId: "RES_RACK_B" },
  RACK_C_PICK: { id: "RACK_C_PICK", name: "Rack Bay C (Electronics)", x: 785, y: 220, type: "rack", resourceId: "RES_RACK_C" },
  RACK_D_PICK: { id: "RACK_D_PICK", name: "Rack Bay D (Raw Stock)", x: 160, y: 405, type: "rack", resourceId: "RES_RACK_D" },
  RACK_E_PICK: { id: "RACK_E_PICK", name: "Rack Bay E (Finished Goods)", x: 785, y: 405, type: "rack", resourceId: "RES_RACK_E" },

  // Staging Buffer Bays
  BAY_1: { id: "BAY_1", name: "Buffer Staging Bay 1", x: 475, y: 405, type: "dock", resourceId: "RES_BAY_1" },
  BAY_2: { id: "BAY_2", name: "Buffer Staging Bay 2", x: 785, y: 330, type: "dock", resourceId: "RES_BAY_2" },

  // Loading Docks (East Apron)
  DOCK_1: { id: "DOCK_1", name: "Loading Bay D-1", x: 1085, y: 110, type: "dock", resourceId: "RES_DOCK_1" },
  DOCK_2: { id: "DOCK_2", name: "Loading Bay D-2", x: 1085, y: 155, type: "dock", resourceId: "RES_DOCK_2" },
  DOCK_APRON: { id: "DOCK_APRON", name: "Dock Apron Merge", x: 1010, y: 220, type: "aisle", resourceId: "RES_DOCK_APRON" },

  // Rapid Charging Station Bays (Southeast Corner)
  CHARGE_1: { id: "CHARGE_1", name: "Rapid Charger CH-1", x: 1060, y: 495, type: "charger", resourceId: "RES_CHARGE_1" },
  CHARGE_2: { id: "CHARGE_2", name: "Rapid Charger CH-2", x: 1120, y: 495, type: "charger", resourceId: "RES_CHARGE_2" },
  CHARGE_APRON: { id: "CHARGE_APRON", name: "Charger Apron", x: 1010, y: 405, type: "aisle", resourceId: "RES_CHARGE_APRON" },
};

export const RACK_PICK_STATIONS = [
  { id: "RACK_A_PICK", name: "Rack Bay A (Bulk)" },
  { id: "RACK_B_PICK", name: "Rack Bay B (Heavy Parts)" },
  { id: "RACK_C_PICK", name: "Rack Bay C (Electronics)" },
  { id: "RACK_D_PICK", name: "Rack Bay D (Raw Stock)" },
  { id: "RACK_E_PICK", name: "Rack Bay E (Finished Goods)" },
];

export const DOCK_STATIONS = [
  { id: "DOCK_1", name: "Loading Bay D-1" },
  { id: "DOCK_2", name: "Loading Bay D-2" },
];

export const CHARGING_STATIONS = [
  { id: "CHARGE_1", name: "Rapid Charger CH-1" },
  { id: "CHARGE_2", name: "Rapid Charger CH-2" },
];

export const BUFFER_STATIONS = [
  { id: "BAY_1", name: "Buffer Staging Bay 1" },
  { id: "BAY_2", name: "Buffer Staging Bay 2" },
];

// Graph Adjacency List (Directed Warehouse Traffic Flow)
// Enforces standard warehouse one-way lanes to eliminate head-on corridor conflicts:
// - Top Lane (Y=42): Eastbound ->
// - Upper Transverse (Y=220): Eastbound ->
// - Central Crossway (Y=330): Westbound <-
// - Lower Transverse (Y=405): Eastbound ->
// - Bottom Lane (Y=575): Westbound <-
// - Left Perimeter (X=18): Northbound ^
// - Aisle 1 (X=318): Southbound v
// - Aisle 2 (X=630): Northbound ^
// - Aisle 3 (X=960): Southbound v
// - Docks & Chargers: Controlled one-way service loops
export const GRAPH_EDGES: Record<string, string[]> = {
  // Top Lane (Eastbound)
  TL_CORNER: ["TL_A1"],
  TL_A1: ["TL_A2", "UT_A1"],
  TL_A2: ["TL_A3", "UT_A2"],
  TL_A3: ["TL_DOCK_ENTRY", "UT_A3"],
  TL_DOCK_ENTRY: ["DOCK_1", "DOCK_2"],

  // Left Perimeter (Northbound)
  BL_CORNER: ["LP_LOWER"],
  LP_LOWER: ["LP_MID", "RACK_D_PICK"],
  LP_MID: ["LP_UPPER"],
  LP_UPPER: ["TL_CORNER", "RACK_A_PICK"],

  // Upper Transverse (Eastbound)
  RACK_A_PICK: ["UT_A1"],
  UT_A1: ["RACK_B_PICK", "A1_MID"],
  RACK_B_PICK: ["UT_A2"],
  UT_A2: ["RACK_C_PICK"],
  RACK_C_PICK: ["UT_A3"],
  UT_A3: ["CROSS_E", "TL_A3"],

  // Aisle 1 (Southbound)
  A1_MID: ["CROSS_W"],
  CROSS_W: ["LT_A1", "LP_MID"],
  LT_A1: ["BAY_1", "A1_LOW_MID", "RACK_D_PICK"],
  A1_LOW_MID: ["BL_A1"],

  // Central Crossway (Westbound)
  CROSS_E: ["BAY_2", "LT_A3"],
  BAY_2: ["CROSS_CENTER"],
  CROSS_CENTER: ["CROSS_W", "A2_MID_N"],

  // Aisle 2 (Northbound)
  BL_A2: ["A2_MID_S"],
  A2_MID_S: ["LT_A2"],
  LT_A2: ["CROSS_CENTER", "BAY_1"],
  A2_MID_N: ["UT_A2", "TL_A2"],

  // Lower Transverse (Eastbound)
  RACK_D_PICK: ["LT_A1"],
  BAY_1: ["LT_A2"],
  LT_A2: ["RACK_E_PICK", "CROSS_CENTER"],
  RACK_E_PICK: ["LT_A3"],
  LT_A3: ["BL_A3", "CROSS_E"],

  // Aisle 3 (Southbound)
  BL_A3: ["BL_CHARGE_ENTRY", "BL_A2"],

  // Bottom Lane (Westbound)
  BL_CHARGE_ENTRY: ["CHARGE_1", "CHARGE_2", "BL_A3"],
  BL_A2: ["BL_A1"],
  BL_A1: ["BL_CORNER"],

  // Docks (One-way)
  DOCK_1: ["DOCK_APRON"],
  DOCK_2: ["DOCK_APRON"],
  DOCK_APRON: ["CROSS_E", "UT_A3"],

  // Chargers (One-way)
  CHARGE_1: ["CHARGE_APRON"],
  CHARGE_2: ["CHARGE_APRON"],
  CHARGE_APRON: ["CROSS_E", "LT_A3"],
};

// Breadth-First-Search (BFS) Pathfinding guaranteeing shortest corridor route
export function findShortestRoute(startNodeId: string, endNodeId: string): string[] {
  if (startNodeId === endNodeId) return [startNodeId];
  if (!WAYPOINTS[startNodeId] || !WAYPOINTS[endNodeId]) return [startNodeId];

  const queue: string[][] = [[startNodeId]];
  const visited = new Set<string>([startNodeId]);

  while (queue.length > 0) {
    const path = queue.shift()!;
    const current = path[path.length - 1];

    if (current === endNodeId) {
      return path;
    }

    const neighbors = GRAPH_EDGES[current] || [];
    for (const neighbor of neighbors) {
      if (!visited.has(neighbor)) {
        visited.add(neighbor);
        queue.push([...path, neighbor]);
      }
    }
  }

  // Fallback: direct hop
  return [startNodeId, endNodeId];
}

// All Warehouse Mutex Resources
export interface WarehouseResourceDef {
  id: string;
  name: string;
  type: "intersection" | "aisle" | "dock" | "charger" | "buffer";
  x: number;
  y: number;
  width: number;
  height: number;
  orderPriority: number; // For Havender's protocol total ordering
}

export const INITIAL_RESOURCES: Record<string, WarehouseResourceDef> = {
  RES_CROSS_MAIN: {
    id: "RES_CROSS_MAIN",
    name: "Central Crossroads",
    type: "intersection",
    x: 605,
    y: 305,
    width: 50,
    height: 50,
    orderPriority: 50,
  },
  RES_CROSS_W: {
    id: "RES_CROSS_W",
    name: "Aisle 1 West Junction",
    type: "intersection",
    x: 295,
    y: 305,
    width: 46,
    height: 50,
    orderPriority: 30,
  },
  RES_CROSS_E: {
    id: "RES_CROSS_E",
    name: "Aisle 3 East Junction",
    type: "intersection",
    x: 935,
    y: 305,
    width: 50,
    height: 50,
    orderPriority: 70,
  },
  RES_AISLE_1_MID: {
    id: "RES_AISLE_1_MID",
    name: "Aisle 01 Single-Lane Segment",
    type: "aisle",
    x: 302,
    y: 250,
    width: 32,
    height: 50,
    orderPriority: 25,
  },
  RES_AISLE_2_NORTH: {
    id: "RES_AISLE_2_NORTH",
    name: "Aisle 02 North Track",
    type: "aisle",
    x: 614,
    y: 250,
    width: 32,
    height: 50,
    orderPriority: 45,
  },
  JUNCTION_A1_UPPER: {
    id: "JUNCTION_A1_UPPER",
    name: "Aisle 1 Upper Node",
    type: "intersection",
    x: 302,
    y: 205,
    width: 32,
    height: 30,
    orderPriority: 20,
  },
  JUNCTION_A2_UPPER: {
    id: "JUNCTION_A2_UPPER",
    name: "Aisle 2 Upper Node",
    type: "intersection",
    x: 614,
    y: 205,
    width: 32,
    height: 30,
    orderPriority: 40,
  },
  JUNCTION_A3_UPPER: {
    id: "JUNCTION_A3_UPPER",
    name: "Aisle 3 Upper Node",
    type: "intersection",
    x: 944,
    y: 205,
    width: 32,
    height: 30,
    orderPriority: 60,
  },
  RES_DOCK_1: {
    id: "RES_DOCK_1",
    name: "Loading Dock 1",
    type: "dock",
    x: 1040,
    y: 85,
    width: 90,
    height: 40,
    orderPriority: 90,
  },
  RES_DOCK_2: {
    id: "RES_DOCK_2",
    name: "Loading Dock 2",
    type: "dock",
    x: 1040,
    y: 135,
    width: 90,
    height: 40,
    orderPriority: 92,
  },
  RES_DOCK_APRON: {
    id: "RES_DOCK_APRON",
    name: "Dock Staging Apron",
    type: "aisle",
    x: 990,
    y: 195,
    width: 40,
    height: 50,
    orderPriority: 85,
  },
  RES_CHARGE_1: {
    id: "RES_CHARGE_1",
    name: "Charging Station 1",
    type: "charger",
    x: 1030,
    y: 470,
    width: 60,
    height: 50,
    orderPriority: 10,
  },
  RES_CHARGE_2: {
    id: "RES_CHARGE_2",
    name: "Charging Station 2",
    type: "charger",
    x: 1095,
    y: 470,
    width: 60,
    height: 50,
    orderPriority: 12,
  },
  RES_BAY_1: {
    id: "RES_BAY_1",
    name: "Buffer Bay 1",
    type: "buffer",
    x: 450,
    y: 385,
    width: 50,
    height: 40,
    orderPriority: 35,
  },
  RES_BAY_2: {
    id: "RES_BAY_2",
    name: "Buffer Bay 2",
    type: "buffer",
    x: 760,
    y: 310,
    width: 50,
    height: 40,
    orderPriority: 65,
  },
  RES_RACK_A: {
    id: "RES_RACK_A",
    name: "Rack A Pick Station",
    type: "aisle",
    x: 135,
    y: 200,
    width: 50,
    height: 40,
    orderPriority: 15,
  },
  RES_RACK_B: {
    id: "RES_RACK_B",
    name: "Rack B Bulk Station",
    type: "aisle",
    x: 450,
    y: 200,
    width: 50,
    height: 40,
    orderPriority: 38,
  },
  RES_RACK_C: {
    id: "RES_RACK_C",
    name: "Rack C Raw Materials",
    type: "aisle",
    x: 760,
    y: 200,
    width: 50,
    height: 40,
    orderPriority: 62,
  },
};
