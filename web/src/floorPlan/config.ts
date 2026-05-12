// Derived from the user's Roborock vacuum-generated home map (2026-05-11).
// Proportions approximate; exact dimensions are not load-bearing since the
// Room Decider works in RSSI fingerprint space, not in pixel space.
//
// Tracked rooms (5):  Living Room, Kitchen, Master Bedroom, Office, Cat Room.
// Visual-only space:  Corridor (drawn as `hallway`).
// Skipped:            Bathroom (per user); master-bedroom closet (folded into
//                     Master Bedroom polygon for visual simplicity).
//
// Connectivity (matches the user's home):
//   • Kitchen is an island on the top-left — adjacent only to Living Room.
//     It does NOT touch Master Bedroom (the closet between them has a wall).
//   • Living Room sits across the top-right and feeds into the Corridor below.
//   • Corridor is the central hub. It touches Living Room (north), Master
//     Bedroom (west), Office (south), and Cat Room (south).
//   • Office and Cat Room sit at the bottom, sharing a wall.
//
// House aspect is close to square (~830×870 in the Roborock map); using a
// 700×620 SVG viewBox for breathing room around the dashboard chrome.

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
      // Top-left island. Bounded on the west by the "Cliff No-Go Zone".
      // Adjacent only to Living Room on the east at x=320.
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
      // Top stripe across the right two-thirds. South edge feeds into Corridor.
      polygon: [
        [320, 50],
        [660, 50],
        [660, 290],
        [320, 290],
      ] as [number, number][],
      color: "#1a2840",
    },
    {
      name: "Master Bedroom",
      // Left rectangle, slightly south of Kitchen (gap = closet/wall, not drawn).
      // East edge meets Corridor at x=340 from y=320 to y=450.
      polygon: [
        [40, 320],
        [340, 320],
        [340, 560],
        [40, 560],
      ] as [number, number][],
      color: "#103a32",
    },
    {
      name: "Office",
      // Bottom-center; "Josh office" in the Roborock map.
      polygon: [
        [370, 450],
        [510, 450],
        [510, 600],
        [370, 600],
      ] as [number, number][],
      color: "#1a2a20",
    },
    {
      name: "Cat Room",
      // Bottom-right; "Jade office" in the Roborock map.
      polygon: [
        [510, 450],
        [690, 450],
        [690, 600],
        [510, 600],
      ] as [number, number][],
      color: "#2a201a",
    },
  ] satisfies RoomConfig[],
  /**
   * Corridor — wide-but-short connector strip between Living Room (north) and
   * the Office/Cat Room boundary (south). Width matches the original ~250 px
   * span; height reduced to ~90 px because cats transit through rather than
   * dwell. Doors to Master Bedroom (west) and the four connected rooms are
   * implicit in the small gaps around the polygon. Not a tracked room.
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
    // Placeholder positions in each room's approximate center. Real chip-derived
    // IDs (node-XXXXXXXX) and outlet-precise positions take over at install.
    { id: "node-00000001", pos: [195, 190] as [number, number] }, // Kitchen
    { id: "node-00000002", pos: [490, 170] as [number, number] }, // Living Room
    { id: "node-00000003", pos: [190, 440] as [number, number] }, // Master Bedroom
    { id: "node-00000004", pos: [440, 525] as [number, number] }, // Office
    { id: "node-00000005", pos: [600, 525] as [number, number] }, // Cat Room
    { id: "node-00000006", pos: [465, 375] as [number, number] }, // Corridor (spare)
  ] satisfies NodeConfig[],
};

export type FloorPlanConfig = typeof floorPlanConfig;
