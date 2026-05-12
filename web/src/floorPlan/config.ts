// Derived from the user's Roborock vacuum-generated home map (2026-05-11).
// Proportions approximate; exact dimensions are not load-bearing since the
// Room Decider works in RSSI fingerprint space, not in pixel space.
//
// Tracked rooms (5):  Living Room, Kitchen, Master Bedroom, Office, Cat Room.
// Visual-only space:  Corridor (drawn as `hallway`, short and wide — cats transit).
// Skipped:            Bathroom (per user); master-bedroom closet (folded into
//                     the Master Bedroom polygon for visual simplicity).
//
// Connectivity (matches the user's home; all adjacencies are physically modeled):
//   • Kitchen is an island on the top-left — adjacent only to Living Room (east).
//   • Living Room sits across the top-right; south edge meets both Master
//     Bedroom and the Corridor.
//   • Corridor is the central hub. Its full perimeter contacts Living Room
//     (north), Master Bedroom (west), Office (south), and Cat Room (south).
//   • Office and Cat Room sit at the bottom, sharing a wall at x=510.

export interface RoomConfig {
  name: string;
  /** SVG viewport polygon vertices [x, y] in px. */
  polygon: [number, number][];
  /** Fill color hint for heatmap overlay (dark theme). */
  color: string;
}

export interface NodeConfig {
  id: string;
  /** Approx SVG position [x, y] — placeholder until each ESP32 is named at install. */
  pos: [number, number];
}

export const floorPlanConfig = {
  viewBox: "0 0 700 620",
  rooms: [
    {
      name: "Kitchen",
      // Top-left island. Adjacent only to Living Room on the east at x=320.
      polygon: [
        [70, 90],
        [320, 90],
        [320, 290],
        [70, 290],
      ] as [number, number][],
      color: "#3a2e10",
    },
    {
      name: "Living Room",
      // Top stripe across the right two-thirds; south edge at y=330 meets
      // Master Bedroom (x=320–340) and the Corridor (x=340–590).
      polygon: [
        [320, 50],
        [660, 50],
        [660, 330],
        [320, 330],
      ] as [number, number][],
      color: "#1a2840",
    },
    {
      name: "Master Bedroom",
      // Left rectangle; north edge at y=330 meets Living Room (x=320–340)
      // briefly and east edge at x=340 meets the Corridor (y=330–420).
      polygon: [
        [40, 330],
        [340, 330],
        [340, 560],
        [40, 560],
      ] as [number, number][],
      color: "#103a32",
    },
    {
      name: "Office",
      // Bottom-center; north edge at y=420 meets the Corridor (x=370–510).
      polygon: [
        [370, 420],
        [510, 420],
        [510, 600],
        [370, 600],
      ] as [number, number][],
      color: "#1a2a20",
    },
    {
      name: "Cat Room",
      // Bottom-right; north edge at y=420 meets the Corridor (x=510–590) and
      // continues east as exterior wall to x=690.
      polygon: [
        [510, 420],
        [690, 420],
        [690, 600],
        [510, 600],
      ] as [number, number][],
      color: "#2a201a",
    },
  ] satisfies RoomConfig[],
  /**
   * Corridor — wide-but-short connector between Living Room (north), Master
   * Bedroom (west), Office (south-southwest), and Cat Room (south-southeast).
   * All four edges share polygon boundaries with their neighbors. Not tracked.
   */
  hallway: {
    polygon: [
      [340, 330],
      [590, 330],
      [590, 420],
      [340, 420],
    ] as [number, number][],
  },
  nodes: [
    { id: "node-00000001", pos: [195, 190] as [number, number] }, // Kitchen
    { id: "node-00000002", pos: [490, 190] as [number, number] }, // Living Room
    { id: "node-00000003", pos: [190, 445] as [number, number] }, // Master Bedroom
    { id: "node-00000004", pos: [440, 510] as [number, number] }, // Office
    { id: "node-00000005", pos: [600, 510] as [number, number] }, // Cat Room
    { id: "node-00000006", pos: [465, 375] as [number, number] }, // Corridor (spare)
  ] satisfies NodeConfig[],
};

export type FloorPlanConfig = typeof floorPlanConfig;
