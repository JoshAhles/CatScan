// Replace with LiDAR-scan-derived dimensions during Phase 6.

export interface RoomConfig {
  name: string;
  /** SVG viewport polygon vertices [x, y] in px (1 px = 1 cm at 1:50 scale). */
  polygon: [number, number][];
  /** Fill color hint for heatmap overlay. */
  color: string;
}

export interface NodeConfig {
  id: string;
  /** Approx SVG position [x, y]. */
  pos: [number, number];
}

/** Placeholder floor plan — 5 rooms, roughly a 800×600 SVG viewport. */
export const floorPlanConfig = {
  viewBox: "0 0 800 600",
  rooms: [
    {
      name: "Bedroom",
      polygon: [
        [0, 0], [280, 0], [280, 260], [0, 260],
      ] as [number, number][],
      color: "#1a2340",
    },
    {
      name: "Office",
      polygon: [
        [280, 0], [560, 0], [560, 260], [280, 260],
      ] as [number, number][],
      color: "#1a2a20",
    },
    {
      name: "Kitchen",
      polygon: [
        [560, 0], [800, 0], [800, 260], [560, 260],
      ] as [number, number][],
      color: "#2a1a20",
    },
    {
      name: "Front Room",
      polygon: [
        [0, 260], [420, 260], [420, 520], [0, 520],
      ] as [number, number][],
      color: "#1a1a2a",
    },
    {
      name: "Cat Room",
      polygon: [
        [420, 260], [800, 260], [800, 520], [420, 520],
      ] as [number, number][],
      color: "#2a2a1a",
    },
  ] satisfies RoomConfig[],
  /** Hallway strip at bottom */
  hallway: {
    polygon: [
      [0, 520], [800, 520], [800, 600], [0, 600],
    ] as [number, number][],
  },
  nodes: [
    { id: "node-00000001", pos: [140, 130] as [number, number] },
    { id: "node-00000002", pos: [420, 130] as [number, number] },
    { id: "node-00000003", pos: [680, 130] as [number, number] },
    { id: "node-00000004", pos: [140, 390] as [number, number] },
    { id: "node-00000005", pos: [610, 390] as [number, number] },
    { id: "node-00000006", pos: [400, 560] as [number, number] },
  ] satisfies NodeConfig[],
};

export type FloorPlanConfig = typeof floorPlanConfig;
